import { useState, useMemo, useCallback } from 'react'
import SessionBar from './SessionBar'
import { RollGrid, NameList } from './RollGrid'
import { roster, studentAt, endTime, PERIODS } from '../lib/roster'
import { db, findClash } from '../lib/db'

export default function TakeScreen({ draft, patch, present, setPresent, sessions, subjects, toast, onSaved }) {
  const [open, setOpen] = useState(false)
  const [view, setView] = useState('grid')
  const [touched, setTouched] = useState(() => new Set())
  const [echo, setEcho] = useState(null)

  const strength = roster[draft.division].length
  const nPresent = present.size
  const nAbsent = strength - nPresent
  const pct = strength ? Math.round((nPresent / strength) * 100) : 0

  const toggle = useCallback(
    (roll) => {
      const next = new Set(present)
      const nowPresent = !next.has(roll)
      nowPresent ? next.add(roll) : next.delete(roll)
      setPresent(next)
      setTouched((t) => new Set(t).add(roll))
      setEcho({ roll, name: studentAt(draft.division, roll).name, present: nowPresent })
      if (navigator.vibrate) navigator.vibrate(8)
    },
    [present, setPresent, draft.division]
  )

  const markAll = (all) => {
    setPresent(all ? new Set(roster[draft.division].map((s) => s.roll)) : new Set())
    setTouched(new Set(roster[draft.division].map((s) => s.roll)))
    setEcho(null)
  }

  const existing = useMemo(
    () => findClash(sessions, { id: null, ...draft, subject: draft.subject || '' }),
    [sessions, draft]
  )

  async function save() {
    if (!draft.subject.trim()) {
      toast('Add a subject first — it names the column in the export.')
      setOpen(true)
      return
    }
    const record = {
      division: draft.division,
      date: draft.date,
      start: draft.start,
      end: endTime(draft.start, draft.type),
      type: draft.type,
      periods: PERIODS[draft.type],
      subject: draft.subject.trim(),
      present: [...present].sort((a, b) => a - b),
      updatedAt: Date.now()
    }

    if (existing) {
      if (!confirm(`${draft.division} already has a ${draft.subject.trim()} session at ${draft.start} on this date. Overwrite it?`)) return
      await db.sessions.update(existing.id, record)
      toast(`Updated · ${nPresent} present, ${nAbsent} absent`)
    } else {
      await db.sessions.add({ ...record, createdAt: Date.now() })
      toast(`Saved · ${nPresent} present, ${nAbsent} absent`)
    }

    setPresent(new Set())
    setTouched(new Set())
    setEcho(null)
    onSaved(record.subject)
  }

  return (
    <>
      <SessionBar draft={draft} patch={patch} subjects={subjects} open={open} setOpen={setOpen} />

      <div className="tally">
        <div className="tallybar">
          <span className="p">
            <b>{nPresent}</b> <span className="lbl">present</span>
          </span>
          <span className="a">
            <b>{nAbsent}</b> <span className="lbl">absent</span>
          </span>
          <span className="pct">{pct}% of {strength}</span>
        </div>
        <div className="echo" aria-live="polite">
          {echo ? (
            <>
              <span className="num">{echo.roll}</span> {echo.name} —{' '}
              <span className={echo.present ? 'mark-p' : 'mark-a'}>
                {echo.present ? 'present' : 'absent'}
              </span>
            </>
          ) : existing ? (
            <span style={{ color: 'var(--amber)' }}>This slot is already recorded — saving will overwrite it.</span>
          ) : (
            'Tap a roll number to mark it present.'
          )}
        </div>
      </div>

      <div className="toolbar">
        <button className="chip" aria-pressed={view === 'grid'} onClick={() => setView('grid')}>
          Roll nos.
        </button>
        <button className="chip" aria-pressed={view === 'list'} onClick={() => setView('list')}>
          Names
        </button>
        <button className="chip spacer" onClick={() => markAll(true)}>
          All present
        </button>
        <button className="chip" onClick={() => markAll(false)}>
          Clear
        </button>
      </div>

      {view === 'grid' ? (
        <RollGrid division={draft.division} present={present} touched={touched} onToggle={toggle} />
      ) : (
        <NameList division={draft.division} present={present} touched={touched} onToggle={toggle} />
      )}

      <div className="actionbar">
        <div className="inner">
          <button className="btn primary" onClick={save}>
            {existing ? 'Overwrite session' : 'Save session'}
          </button>
        </div>
      </div>
    </>
  )
}
