import { useState, useEffect, useCallback } from 'react'
import { useLiveQuery } from 'dexie-react-hooks'
import { db, getSetting, setSetting } from './lib/db'
import { today, defaultStart } from './lib/roster'
import TakeScreen from './components/TakeScreen'
import RecordsScreen from './components/RecordsScreen'
import Toast from './components/Toast'

export default function App() {
  const [tab, setTab] = useState('take')
  const [message, setMessage] = useState('')
  const [present, setPresent] = useState(() => new Set())
  const [draft, setDraft] = useState({
    division: 'SY-A',
    date: today(),
    start: defaultStart('theory'),
    type: 'theory',
    subject: ''
  })

  const sessions = useLiveQuery(() => db.sessions.toArray(), [], [])
  const subjects = useLiveQuery(async () => (await getSetting('subjects', [])) || [], [], [])

  const toast = useCallback((m) => setMessage(m), [])

  const patch = useCallback((p) => {
    setDraft((d) => ({ ...d, ...p }))
    if (p.division) setPresent(new Set())
  }, [])

  // Remember the last division and subject so the next lecture starts one tap away.
  // The remembered kind decides the slot list, so re-derive the start against it —
  // a lab restored onto a theory-only start time would be off-timetable.
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

  return (
    <div className="app">
      <header className="masthead">
        <div>
          <h1>Muster</h1>
          <div className="sub">Roll call · VU Comp Engg</div>
        </div>
        <nav className="tabs" role="tablist">
          <button className="tab" role="tab" aria-selected={tab === 'take'} onClick={() => setTab('take')}>
            Take
          </button>
          <button className="tab" role="tab" aria-selected={tab === 'records'} onClick={() => setTab('records')}>
            Records
          </button>
        </nav>
      </header>

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
          />
        ) : (
          <RecordsScreen sessions={sessions} toast={toast} />
        )}
      </main>

      <Toast message={message} onDone={() => setMessage('')} />
    </div>
  )
}
