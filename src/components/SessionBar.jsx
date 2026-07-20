import { useState } from 'react'
import {
  DIVISIONS,
  PERIODS,
  roster,
  slotsFor,
  snapToSlot,
  periodOf,
  endTime,
  to12h,
  hasBatches,
  batchesOf,
  batchSize
} from '../lib/roster'

export default function SessionBar({ draft, patch, subjects, open, setOpen, locked }) {
  const [custom, setCustom] = useState(false)
  const end = endTime(draft.start, draft.type)
  const slots = slotsFor(draft.type)
  const period = periodOf(draft.start, draft.type)

  // Switching kind must keep the start legal: a 09:00 theory can't become a
  // 09:00 lab, because that would run through the break.
  const setType = (t) => patch({ type: t, start: snapToSlot(draft.start, t) })

  return (
    <>
      <div className="divrow">
        {DIVISIONS.map((d) => (
          <button
            key={d}
            className="divbtn"
            aria-pressed={draft.division === d}
            disabled={locked && draft.division !== d}
            onClick={() => !locked && patch({ division: d })}
          >
            {d}
            <small>{locked && draft.division === d ? 'editing' : `${roster[d].length} on roll`}</small>
          </button>
        ))}
      </div>

      <div className="card">
        <div className="field" style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
          <div style={{ flex: 1, minWidth: 0 }}>
            <span className="eyebrow">Session</span>
            <div style={{ marginTop: 4, fontSize: 14 }}>
              {draft.date.split('-').reverse().join('/')} ·{' '}
              {period ? `Period ${period} · ` : ''}
              {to12h(draft.start)}–{to12h(end)} · {draft.type === 'lab' ? 'Lab' : 'Theory'}
              {draft.type === 'lab' && draft.batch ? ` · ${draft.batch}` : ''}
              {draft.subject ? ` · ${draft.subject}` : ''}
            </div>
          </div>
          <button className="btn sm" onClick={() => setOpen(!open)} aria-expanded={open}>
            {open ? 'Done' : 'Change'}
          </button>
        </div>

        {open && (
          <>
            <div className="field">
              <span className="eyebrow">Date</span>
              <input
                className="input"
                type="date"
                value={draft.date}
                onChange={(e) => patch({ date: e.target.value })}
              />
            </div>

            <div className="field">
              <span className="eyebrow">Kind</span>
              <div className="chiprow">
                {['theory', 'lab'].map((t) => (
                  <button
                    key={t}
                    className="chip wide typebtn"
                    aria-pressed={draft.type === t}
                    onClick={() => setType(t)}
                  >
                    {t === 'lab' ? 'Practical lab' : 'Theory lecture'}
                    <em>
                      {PERIODS[t]} period{PERIODS[t] > 1 ? 's' : ''} · {PERIODS[t]} hour
                      {PERIODS[t] > 1 ? 's' : ''}
                    </em>
                  </button>
                ))}
              </div>
            </div>

            {draft.type === 'lab' && hasBatches(draft.division) && (
              <div className="field">
                <span className="eyebrow">Batch</span>
                <div className="chiprow">
                  {batchesOf(draft.division).map((b) => (
                    <button
                      key={b.id}
                      className="chip wide typebtn"
                      aria-pressed={draft.batch === b.id}
                      onClick={() => patch({ batch: b.id })}
                    >
                      {b.id}
                      <em>
                        roll {b.from}–{b.to} · {batchSize(draft.division, b.id)}
                      </em>
                    </button>
                  ))}
                </div>
                <p className="hint">Labs are taken one batch at a time — only this batch is marked.</p>
              </div>
            )}

            <div className="field">
              <span className="eyebrow">Slot</span>
              <div className="slots">
                {slots.map((s) => (
                  <button
                    key={s.start}
                    className="slot"
                    aria-pressed={draft.start === s.start}
                    aria-label={`Period ${s.period}, ${s.start} to ${s.end}`}
                    onClick={() => {
                      patch({ start: s.start })
                      setCustom(false)
                    }}
                  >
                    <span className="pd">{s.period}</span>
                    <span className="tm">
                      {s.start}–{s.end}
                    </span>
                  </button>
                ))}
              </div>
              <p className="hint">
                {draft.type === 'lab'
                  ? 'Labs run two periods, so they never cross the 10:00 break or the 18:15 finish.'
                  : 'Ten periods a day — 8:00 to 10:00, then 10:15 to 18:15.'}
              </p>

              <button className="linkish" onClick={() => setCustom(!custom)} aria-expanded={custom}>
                {custom ? 'Hide off-timetable time' : 'Off-timetable time'}
              </button>
              {custom && (
                <div className="slotline" style={{ marginTop: 8 }}>
                  <input
                    className="input"
                    type="time"
                    step="300"
                    value={draft.start}
                    onChange={(e) => e.target.value && patch({ start: e.target.value })}
                  />
                  <span className="dash">→</span>
                  <span className="endtime">{end}</span>
                </div>
              )}
            </div>

            <div className="field">
              <span className="eyebrow">Subject</span>
              <input
                className="input"
                type="text"
                list="subjects"
                placeholder="e.g. Computer Networks"
                value={draft.subject}
                onChange={(e) => patch({ subject: e.target.value })}
              />
              <datalist id="subjects">
                {subjects.map((s) => (
                  <option key={s} value={s} />
                ))}
              </datalist>
            </div>
          </>
        )}
      </div>
    </>
  )
}
