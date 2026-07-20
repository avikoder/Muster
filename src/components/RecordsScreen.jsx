import { useState, useMemo } from 'react'
import { useLiveQuery } from 'dexie-react-hooks'
import { db } from '../lib/db'
import { DIVISIONS, roster, prettyDate, to12h, periodOf, batchSize } from '../lib/roster'
import { runExport, listBackups, restoreBackup, BACKUP_HOUR } from '../lib/backup'

function relDay(iso) {
  const t = new Date().toISOString().slice(0, 10)
  if (iso === t) return 'today'
  const y = new Date(Date.now() - 86400000).toISOString().slice(0, 10)
  if (iso === y) return 'yesterday'
  return prettyDate(iso)
}

export default function RecordsScreen({ sessions, toast, onEdit, lastExportDate }) {
  const [filter, setFilter] = useState('All')
  const [busy, setBusy] = useState(false)
  const [showBackups, setShowBackups] = useState(false)
  const backups = useLiveQuery(() => listBackups(), [], [])

  const shown = useMemo(() => {
    const list = filter === 'All' ? sessions : sessions.filter((s) => s.division === filter)
    return [...list].sort((a, b) => (b.date + b.start).localeCompare(a.date + a.start))
  }, [sessions, filter])

  const periods = shown.reduce((n, s) => n + s.periods, 0)

  async function doExport() {
    if (!shown.length) return
    setBusy(true)
    try {
      const divisions = filter === 'All' ? DIVISIONS : [filter]
      const result = await runExport(sessions, divisions)
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

  async function restore(b) {
    if (!confirm(`Restore the backup from ${relDay(b.date)}? This replaces all ${sessions.length} current session(s) with the ${b.sessions} saved then.`)) return
    await restoreBackup(b.date)
    toast(`Restored ${b.sessions} session(s) from ${relDay(b.date)}.`)
  }

  const exportedToday = lastExportDate === new Date().toISOString().slice(0, 10)

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
        <div className="stat">
          <span className="k">Last export</span>
          <span className="v" style={{ color: exportedToday ? 'var(--green)' : 'var(--ink-2)' }}>
            {lastExportDate ? relDay(lastExportDate) : 'never'}
          </span>
        </div>
      </div>

      {shown.length === 0 ? (
        <div className="empty">
          <h3>Nothing recorded yet</h3>
          <p>Take a roll call and it will be listed here — tap any session to edit it.</p>
        </div>
      ) : (
        <div className="card">
          {shown.map((s) => {
            const strength = s.batch ? batchSize(s.division, s.batch) : roster[s.division].length
            const p = periodOf(s.start, s.type)
            return (
              <button className="sessionrow tappable" key={s.id} onClick={() => onEdit(s)}>
                <div style={{ minWidth: 0, textAlign: 'left' }}>
                  <div className="when">
                    {prettyDate(s.date)} · {to12h(s.start)}
                    {p ? ` · P${p}` : ''}
                  </div>
                  <div className="meta">
                    <span className={`badge ${s.type}`}>{s.type === 'lab' ? `Lab · ${s.periods}h` : 'Theory · 1h'}</span>{' '}
                    {s.division}
                    {s.batch ? ` · ${s.batch}` : ''} · {s.subject}
                  </div>
                </div>
                <div className="right">
                  <div className="score">
                    {s.present.length}
                    <span className="of">/{strength}</span>
                  </div>
                  <div className="rowactions">
                    <span className="editcue">Edit ›</span>
                    <span
                      role="button"
                      tabIndex={0}
                      className="del"
                      onClick={(e) => {
                        e.stopPropagation()
                        remove(s)
                      }}
                    >
                      Delete
                    </span>
                  </div>
                </div>
              </button>
            )
          })}
        </div>
      )}

      <div className="card">
        <button
          className="backuphead"
          onClick={() => setShowBackups(!showBackups)}
          aria-expanded={showBackups}
          aria-label="Backup and restore points"
        >
          <div style={{ textAlign: 'left' }}>
            <span className="eyebrow">Backup</span>
            <div style={{ fontSize: 13.5, marginTop: 3 }}>
              {backups.length
                ? `${backups.length} restore point${backups.length > 1 ? 's' : ''} · newest ${relDay(backups[0].date)}`
                : 'No restore points yet'}
            </div>
          </div>
          <span className="chev">{showBackups ? '▾' : '▸'}</span>
        </button>

        {showBackups && (
          <>
            <p className="hint" style={{ padding: '0 14px 4px' }}>
              A restore point is saved on the phone once a day, after {BACKUP_HOUR % 12 || 12} PM. These stay on
              this device — the Excel export is your real off-phone copy.
            </p>
            {backups.length === 0 ? (
              <p className="hint" style={{ padding: '4px 14px 12px' }}>
                Open the app after {BACKUP_HOUR % 12 || 12} PM with at least one session recorded and the first one
                is made automatically.
              </p>
            ) : (
              backups.map((b) => (
                <div className="sessionrow" key={b.date}>
                  <div>
                    <div className="when">{relDay(b.date)}</div>
                    <div className="meta">
                      {b.sessions} session{b.sessions > 1 ? 's' : ''} · {b.periods} periods
                    </div>
                  </div>
                  <div className="right">
                    <button className="btn sm" onClick={() => restore(b)}>
                      Restore
                    </button>
                  </div>
                </div>
              ))
            )}
          </>
        )}
      </div>

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
