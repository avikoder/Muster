import Dexie from 'dexie'

/**
 * One IndexedDB table. A session is a single lecture or lab, and it carries the
 * roll numbers that were marked present. Absent is derived from the roster, so
 * the roster stays the single source of truth for who exists.
 *
 * session = {
 *   id, division, date ('2026-07-16'), start ('10:00'), end ('11:00'),
 *   type ('theory' | 'lab'), periods (1 | 2), subject, present: number[],
 *   createdAt, updatedAt
 * }
 */
export const db = new Dexie('muster')

db.version(1).stores({
  sessions: '++id, division, date, [division+date], type, subject',
  settings: 'key'
})

export async function getSetting(key, fallback) {
  const row = await db.settings.get(key)
  return row === undefined ? fallback : row.value
}

export async function setSetting(key, value) {
  await db.settings.put({ key, value })
}

/** Same division, date, start time and subject = the same lecture. */
export function findClash(sessions, s) {
  return sessions.find(
    (x) =>
      x.id !== s.id &&
      x.division === s.division &&
      x.date === s.date &&
      x.start === s.start &&
      x.subject.trim().toLowerCase() === s.subject.trim().toLowerCase()
  )
}
