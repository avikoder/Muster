import { useState, useMemo } from 'react'
import { db } from '../lib/db'
import { DIVISIONS, roster, prettyDate, to12h } from '../lib/roster'
import { buildAndSave, exportName } from '../lib/exportXlsx'

export default function RecordsScreen({ sessions, toast }) {
  const [filter, setFilter] = useState('All')
  const [busy, setBusy] = useState(false)

  const shown = useMemo(() => {
    const list = filter === 'All' ? sessions : sessions.filter((s) => s.division === filter)
    return [...list].sort((a, b) => (b.date + b.start).localeCompare(a.date + a.start))
  }, [sessions, filter])

  const periods = shown.reduce((n, s) => n + s.periods, 0)

  async function doExport() {
    if (!sessions.length) return
    setBusy(true)
    try {
      const divisions = filter === 'All' ? DIVISIONS : [filter]
      const data = filter === 'All' ? sessions : sessions.filter((s) => s.division === filter)
      const result = await buildAndSave(data, divisions, exportName(divisions))
      if (result === 'downloaded') toast('Workbook downloaded.')
      else if (result === 'shared') toast('Workbook sent to share sheet.')
    } catch (err) {
      toast('Export failed: ' + err.message)
    } finally {
      setBusy(false)
    }
  }

  async function remove(s) {
    if (!confirm(`Delete ${s.division} · ${s.subject} · ${prettyDate(s.date)} ${s.start}? This cannot be undone.`)) return
    await db.sessions.delete(s.id)
    toast('Session deleted.')
  }

  return (
    <>
      <div style={{ display: 'flex', gap: 6, padding: '12px 12px 0' }}>
        {['All', ...DIVISIONS].map((d) => (
          <button key={d} className="chip" aria-pressed={filter === d} onClick={() => setFilter(d)}>
            {d}
          </button>
        ))}
      </div>

      <div className="card">
        <div className="stat">
          <span className="k">Sessions recorded</span>
          <span className="v">{shown.length}</span>
        </div>
        <div className="stat">
          <span className="k">Periods held</span>
          <span className="v">{periods}</span>
        </div>
        <div className="stat">
          <span className="k">Students on roll</span>
          <span className="v">
            {filter === 'All'
              ? DIVISIONS.reduce((n, d) => n + roster[d].length, 0)
              : roster[filter].length}
          </span>
        </div>
      </div>

      {shown.length === 0 ? (
        <div className="empty">
          <h3>Nothing recorded yet</h3>
          <p>Take a roll call and it will be listed here, ready to export.</p>
        </div>
      ) : (
        <div className="card">
          {shown.map((s) => {
            const strength = roster[s.division].length
            return (
              <div className="sessionrow" key={s.id}>
                <div style={{ minWidth: 0 }}>
                  <div className="when">
                    {prettyDate(s.date)} · {to12h(s.start)}
                  </div>
                  <div className="meta">
                    <span className={`badge ${s.type}`}>{s.type === 'lab' ? `Lab · ${s.periods}h` : 'Theory · 1h'}</span>{' '}
                    {s.division} · {s.subject}
                  </div>
                </div>
                <div className="right">
                  <div className="score">
                    {s.present.length}
                    <span className="of">/{strength}</span>
                  </div>
                  <button
                    className="btn sm ghost-red"
                    style={{ marginTop: 4, padding: '4px 8px', fontSize: 11 }}
                    onClick={() => remove(s)}
                  >
                    Delete
                  </button>
                </div>
              </div>
            )
          })}
        </div>
      )}

      <div className="actionbar">
        <div className="inner">
          <button className="btn primary green" onClick={doExport} disabled={busy || !shown.length}>
            {busy ? 'Building workbook…' : `Export ${filter} to Excel`}
          </button>
        </div>
      </div>
    </>
  )
}
