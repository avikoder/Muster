import { DIVISIONS, QUICK_SLOTS, PERIODS, roster, endTime, to12h } from '../lib/roster'

export default function SessionBar({ draft, patch, subjects, open, setOpen }) {
  const end = endTime(draft.start, draft.type)

  return (
    <>
      <div className="divrow">
        {DIVISIONS.map((d) => (
          <button
            key={d}
            className="divbtn"
            aria-pressed={draft.division === d}
            onClick={() => patch({ division: d })}
          >
            {d}
            <small>{roster[d].length} on roll</small>
          </button>
        ))}
      </div>

      <div className="card">
        <div className="field" style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
          <div style={{ flex: 1 }}>
            <span className="eyebrow">Session</span>
            <div style={{ marginTop: 4, fontSize: 14 }}>
              {draft.date.split('-').reverse().join('/')} · {to12h(draft.start)}–{to12h(end)} ·{' '}
              {draft.type === 'lab' ? 'Lab' : 'Theory'}
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
                    onClick={() => patch({ type: t })}
                  >
                    {t === 'lab' ? 'Practical lab' : 'Theory lecture'}
                    <em>{PERIODS[t]} hour{PERIODS[t] > 1 ? 's' : ''}</em>
                  </button>
                ))}
              </div>
            </div>

            <div className="field">
              <span className="eyebrow">Starts at</span>
              <div className="slotline">
                <input
                  className="input"
                  type="time"
                  step="300"
                  value={draft.start}
                  onChange={(e) => patch({ start: e.target.value })}
                />
                <span className="dash">→</span>
                <span className="endtime">{end}</span>
              </div>
              <div className="chiprow" style={{ marginTop: 8 }}>
                {QUICK_SLOTS.map((s) => (
                  <button
                    key={s}
                    className="chip"
                    aria-pressed={draft.start === s}
                    onClick={() => patch({ start: s })}
                  >
                    {s}
                  </button>
                ))}
              </div>
              <p className="hint">End time follows the kind — theory runs 1 hour, a lab runs 2.</p>
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
