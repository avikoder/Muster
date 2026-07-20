import { roster, prettyDate, shortDate, periodOf, isScheduled, batchSize, PERIODS } from './roster'

const DAY = ['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat']

function dayOf(iso) {
  const [y, m, d] = iso.split('-').map(Number)
  return DAY[new Date(y, m - 1, d).getDay()]
}

function sortSessions(list) {
  return [...list].sort((a, b) => (a.date + a.start).localeCompare(b.date + b.start))
}

/**
 * Per-division sheet: students down the side, sessions across the top.
 * Header block is three rows — date / time + type / subject — so a column is
 * identifiable at a glance without a lookup.
 */
function divisionSheet(XLSX, division, sessions) {
  const list = sortSessions(sessions.filter((s) => s.division === division))
  const students = roster[division]
  const nCols = 3 + list.length + 3
  const rows = []

  rows.push([`MUSTER — ${division}`])
  rows.push([
    list.length
      ? `${list.length} session${list.length > 1 ? 's' : ''} · ${list.reduce((n, s) => n + s.periods, 0)} periods held · exported ${prettyDate(new Date().toISOString().slice(0, 10))}`
      : 'No sessions recorded'
  ])
  rows.push([])

  rows.push(['Roll', 'PRN', 'Name', ...list.map((s) => shortDate(s.date)), 'Periods attended', 'Periods held', 'Attendance %'])
  rows.push(['', '', '', ...list.map((s) => {
    const p = periodOf(s.start, s.type)
    return p ? `P${p}` : '—'
  })])
  rows.push(['', '', '', ...list.map((s) => `${s.start} ${s.type === 'lab' ? 'LAB' : 'TH'}${s.batch ? ' ' + s.batch : ''}`)])
  rows.push(['', '', '', ...list.map((s) => s.subject || '—')])

  for (const st of students) {
    // A student outside a lab's batch was not scheduled, so the cell is blank —
    // it counts as neither present nor absent, and not toward their held total.
    const marks = list.map((s) => (isScheduled(s, st.roll) ? (s.present.includes(st.roll) ? 'P' : 'A') : ''))
    const got = list.reduce((n, s) => n + (isScheduled(s, st.roll) && s.present.includes(st.roll) ? s.periods : 0), 0)
    const held = list.reduce((n, s) => n + (isScheduled(s, st.roll) ? s.periods : 0), 0)
    const pct = held ? Math.round((got / held) * 1000) / 10 : ''
    rows.push([st.roll, st.prn, st.name, ...marks, got, held, pct])
  }

  const ws = XLSX.utils.aoa_to_sheet(rows)

  ws['!cols'] = [
    { wch: 5 },
    { wch: 15 },
    { wch: 30 },
    ...list.map(() => ({ wch: 10 })),
    { wch: 16 },
    { wch: 12 },
    { wch: 13 }
  ]

  const last = nCols - 1
  const H0 = 3 // first header row (0-based)
  const H1 = 6 // last header row — date / period / time+kind / subject
  ws['!merges'] = [
    { s: { r: 0, c: 0 }, e: { r: 0, c: Math.max(2, last) } },
    { s: { r: 1, c: 0 }, e: { r: 1, c: Math.max(2, last) } },
    { s: { r: H0, c: 0 }, e: { r: H1, c: 0 } },
    { s: { r: H0, c: 1 }, e: { r: H1, c: 1 } },
    { s: { r: H0, c: 2 }, e: { r: H1, c: 2 } },
    { s: { r: H0, c: last - 2 }, e: { r: H1, c: last - 2 } },
    { s: { r: H0, c: last - 1 }, e: { r: H1, c: last - 1 } },
    { s: { r: H0, c: last }, e: { r: H1, c: last } }
  ]
  ws['!autofilter'] = {
    ref: XLSX.utils.encode_range({ s: { r: H1, c: 0 }, e: { r: H1 + students.length, c: last } })
  }

  return ws
}

function sessionsSheet(XLSX, sessions) {
  const rows = [
    ['Division', 'Date', 'Day', 'Period', 'Start', 'End', 'Type', 'Batch', 'Periods', 'Subject', 'Present', 'Absent', 'Strength', '%']
  ]
  for (const s of sortSessions(sessions)) {
    // For a batch lab, strength is the batch size, not the whole division.
    const strength = s.batch ? batchSize(s.division, s.batch) : roster[s.division].length
    const present = s.present.length
    rows.push([
      s.division,
      s.date,
      dayOf(s.date),
      periodOf(s.start, s.type) || '—',
      s.start,
      s.end,
      s.type === 'lab' ? 'Lab' : 'Theory',
      s.batch || '—',
      s.periods,
      s.subject || '—',
      present,
      strength - present,
      strength,
      strength ? Math.round((present / strength) * 1000) / 10 : 0
    ])
  }
  const ws = XLSX.utils.aoa_to_sheet(rows)
  ws['!cols'] = [
    { wch: 8 }, { wch: 11 }, { wch: 5 }, { wch: 8 }, { wch: 7 }, { wch: 7 },
    { wch: 8 }, { wch: 7 }, { wch: 8 }, { wch: 24 }, { wch: 9 }, { wch: 8 }, { wch: 9 }, { wch: 7 }
  ]
  ws['!autofilter'] = { ref: XLSX.utils.encode_range({ s: { r: 0, c: 0 }, e: { r: rows.length - 1, c: 13 } }) }
  return ws
}

function logSheet(XLSX, sessions) {
  const rows = [['Division', 'Date', 'Period', 'Start', 'Type', 'Batch', 'Periods', 'Subject', 'Roll', 'PRN', 'Name', 'Status']]
  for (const s of sortSessions(sessions)) {
    // Only the students who were part of the session get a row.
    for (const st of roster[s.division].filter((x) => isScheduled(s, x.roll))) {
      rows.push([
        s.division, s.date, periodOf(s.start, s.type) || '—', s.start,
        s.type === 'lab' ? 'Lab' : 'Theory',
        s.batch || '—',
        s.periods, s.subject || '—',
        st.roll, st.prn, st.name,
        s.present.includes(st.roll) ? 'Present' : 'Absent'
      ])
    }
  }
  const ws = XLSX.utils.aoa_to_sheet(rows)
  ws['!cols'] = [
    { wch: 8 }, { wch: 11 }, { wch: 8 }, { wch: 7 }, { wch: 8 }, { wch: 7 }, { wch: 8 },
    { wch: 24 }, { wch: 6 }, { wch: 15 }, { wch: 30 }, { wch: 9 }
  ]
  ws['!autofilter'] = { ref: XLSX.utils.encode_range({ s: { r: 0, c: 0 }, e: { r: rows.length - 1, c: 11 } }) }
  return ws
}

/** SheetJS is ~400 kB, so it loads only when an export is actually asked for. */
export async function buildAndSave(sessions, divisions, filename) {
  const XLSX = await import('xlsx')
  const wb = XLSX.utils.book_new()
  for (const d of divisions) {
    XLSX.utils.book_append_sheet(wb, divisionSheet(XLSX, d, sessions), d)
  }
  XLSX.utils.book_append_sheet(wb, sessionsSheet(XLSX, sessions), 'Sessions')
  XLSX.utils.book_append_sheet(wb, logSheet(XLSX, sessions), 'Raw log')
  return saveWorkbook(XLSX, wb, filename)
}

/**
 * iOS in standalone mode is unreliable with anchor downloads, so offer the
 * share sheet first when the browser can take a file, and fall back to a
 * plain download everywhere else.
 */
async function saveWorkbook(XLSX, wb, filename) {
  const out = XLSX.write(wb, { bookType: 'xlsx', type: 'array' })
  const blob = new Blob([out], {
    type: 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet'
  })
  const file = new File([blob], filename, { type: blob.type })

  if (navigator.canShare && navigator.canShare({ files: [file] })) {
    try {
      await navigator.share({ files: [file], title: filename })
      return 'shared'
    } catch (err) {
      if (err && err.name === 'AbortError') return 'cancelled'
    }
  }

  const url = URL.createObjectURL(blob)
  const a = document.createElement('a')
  a.href = url
  a.download = filename
  document.body.appendChild(a)
  a.click()
  a.remove()
  setTimeout(() => URL.revokeObjectURL(url), 4000)
  return 'downloaded'
}

export function exportName(divisions) {
  const stamp = new Date().toISOString().slice(0, 10)
  const tag = divisions.length === 1 ? divisions[0] : 'All'
  return `Muster_Attendance_${tag}_${stamp}.xlsx`
}

export { PERIODS }
