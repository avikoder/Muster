import { roster } from '../lib/roster'

export function RollGrid({ division, present, touched, onToggle }) {
  return (
    <div className="grid">
      {roster[division].map((s) => {
        const on = present.has(s.roll)
        return (
          <button
            key={s.roll}
            className={`tile ${on ? 'present' : 'absent'} ${touched.has(s.roll) ? 'touched' : ''}`}
            aria-pressed={on}
            aria-label={`Roll ${s.roll}, ${s.name}, ${on ? 'present' : 'absent'}`}
            onClick={() => onToggle(s.roll)}
          >
            {s.roll}
          </button>
        )
      })}
    </div>
  )
}

export function NameList({ division, present, touched, onToggle }) {
  return (
    <div className="list">
      {roster[division].map((s) => {
        const on = present.has(s.roll)
        return (
          <button
            key={s.roll}
            className={`row ${on ? 'present' : 'absent'} ${touched.has(s.roll) ? 'touched' : ''}`}
            aria-pressed={on}
            onClick={() => onToggle(s.roll)}
          >
            <span className="rn">{s.roll}</span>
            <span className="nm">
              {s.name}
              <br />
              <span className="prn">{s.prn}</span>
            </span>
            <span className="box" aria-hidden="true">✓</span>
          </button>
        )
      })}
    </div>
  )
}
