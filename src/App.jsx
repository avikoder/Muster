import { useState, useEffect, useCallback } from 'react'
import { useLiveQuery } from 'dexie-react-hooks'
import { db, getSetting, setSetting } from './lib/db'
import { today, defaultStart, hasBatches, batchesOf } from './lib/roster'
import { snapshotIfDue, isExportDue, runExport, BACKUP_HOUR } from './lib/backup'
import TakeScreen from './components/TakeScreen'
import RecordsScreen from './components/RecordsScreen'
import Toast from './components/Toast'

const blankDraft = () => ({
  division: 'SY-A',
  date: today(),
  start: defaultStart('theory'),
  type: 'theory',
  batch: null,
  subject: ''
})

export default function App() {
  const [tab, setTab] = useState('take')
  const [message, setMessage] = useState('')
  const [present, setPresent] = useState(() => new Set())
  const [draft, setDraft] = useState(blankDraft)
  const [editing, setEditing] = useState(null)
  const [exporting, setExporting] = useState(false)

  const sessions = useLiveQuery(() => db.sessions.toArray(), [], [])
  const subjects = useLiveQuery(async () => (await getSetting('subjects', [])) || [], [], [])
  const lastExportDate = useLiveQuery(async () => (await getSetting('lastExportDate', null)), [], null)

  const toast = useCallback((m) => setMessage(m), [])

  const patch = useCallback((p) => {
    setDraft((d) => {
      const next = { ...d, ...p }
      const batched = hasBatches(next.division) && next.type === 'lab'
      if (!batched) {
        next.batch = null
      } else if (p.division || !next.batch || !batchesOf(next.division).some((b) => b.id === next.batch)) {
        // Entering a lab, or changing division, defaults to the first batch and
        // keeps the batch valid for whichever division is now selected.
        next.batch = batchesOf(next.division)[0].id
      }
      return next
    })
    // Any change to who is being marked clears the ticks.
    if (p.division || p.type || p.batch) setPresent(new Set())
  }, [])

  // On open, once a day after 7 PM, quietly freeze a restore point. A closed PWA
  // gets no CPU, so this is the earliest a daily backup can honestly happen.
  useEffect(() => {
    snapshotIfDue().catch(() => {})
  }, [])

  // Restore the last division/subject so the next lecture is one tap away. The
  // remembered kind decides the slot list, so re-derive the start against it.
  useEffect(() => {
    ;(async () => {
      const last = await getSetting('lastDraft', null)
      if (last) {
        setDraft((d) => ({
          ...d,
          division: last.division,
          subject: last.subject,
          type: last.type,
          start: defaultStart(last.type)
        }))
      }
    })()
  }, [])

  const onSaved = useCallback(
    async (subject) => {
      const known = (await getSetting('subjects', [])) || []
      if (subject && !known.includes(subject)) await setSetting('subjects', [subject, ...known].slice(0, 12))
      await setSetting('lastDraft', { division: draft.division, subject, type: draft.type })
    },
    [draft]
  )

  const startEdit = useCallback((s) => {
    setEditing(s)
    setDraft({
      division: s.division,
      date: s.date,
      start: s.start,
      type: s.type,
      batch: s.batch || null,
      subject: s.subject
    })
    setPresent(new Set(s.present))
    setTab('take')
    window.scrollTo(0, 0)
  }, [])

  const cancelEdit = useCallback(() => {
    setEditing(null)
    setPresent(new Set())
    setDraft(blankDraft())
    ;(async () => {
      const last = await getSetting('lastDraft', null)
      if (last) setDraft((d) => ({ ...d, division: last.division, subject: last.subject, type: last.type, start: defaultStart(last.type) }))
    })()
    setTab('records')
  }, [])

  async function exportNow() {
    setExporting(true)
    try {
      const result = await runExport(sessions)
      if (result === 'downloaded') toast('Daily backup downloaded.')
      else if (result === 'shared') toast('Daily backup sent to share sheet.')
    } catch (err) {
      toast('Export failed: ' + err.message)
    } finally {
      setExporting(false)
    }
  }

  const dueForBackup = isExportDue(lastExportDate, sessions.length) && !editing

  return (
    <div className="app">
      <header className="masthead">
        <div>
          <h1>Muster</h1>
          <div className="sub">Roll call · VU Comp Engg</div>
        </div>
        <nav className="tabs" role="tablist">
          <button
            className="tab"
            role="tab"
            aria-selected={tab === 'take'}
            onClick={() => {
              if (editing) cancelEdit()
              setTab('take')
            }}
          >
            {editing ? 'Editing' : 'Take'}
          </button>
          <button className="tab" role="tab" aria-selected={tab === 'records'} onClick={() => setTab('records')}>
            Records
          </button>
        </nav>
      </header>

      {dueForBackup && (
        <div className="duebanner" role="status">
          <div>
            <b>Daily backup due</b>
            <span> · it’s past {BACKUP_HOUR % 12 || 12} PM and today isn’t exported yet</span>
          </div>
          <button className="btn sm" onClick={exportNow} disabled={exporting}>
            {exporting ? 'Exporting…' : 'Export now'}
          </button>
        </div>
      )}

      <main className="main">
        {tab === 'take' ? (
          <TakeScreen
            draft={draft}
            patch={patch}
            present={present}
            setPresent={setPresent}
            sessions={sessions}
            subjects={subjects}
            toast={toast}
            onSaved={onSaved}
            editing={editing}
            onCancelEdit={cancelEdit}
          />
        ) : (
          <RecordsScreen sessions={sessions} toast={toast} onEdit={startEdit} lastExportDate={lastExportDate} />
        )}
      </main>

      <Toast message={message} onDone={() => setMessage('')} />
    </div>
  )
}
