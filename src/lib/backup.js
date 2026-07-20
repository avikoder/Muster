import { db, getSetting, setSetting } from './db'
import { today } from './roster'
import { buildAndSave, exportName } from './exportXlsx'
import { DIVISIONS } from './roster'

// A PWA gets no CPU while it is closed, and writing a file needs a user gesture,
// so a true unattended export at a fixed time is impossible on a phone. Instead:
//   - after this hour, opening the app writes a silent local restore point, and
//   - a banner offers the one-tap real export until it is done for the day.
export const BACKUP_HOUR = 19 // 7:00 PM
const KEEP = 21 // restore points retained (~three weeks)

/** True when it is past 7 PM, there is something to save, and no export today. */
export function isExportDue(lastExportDate, sessionCount, now = new Date()) {
  return sessionCount > 0 && now.getHours() >= BACKUP_HOUR && lastExportDate !== today()
}

/**
 * Once per day, after 7 PM, freeze all sessions into IndexedDB. Silent and
 * gesture-free — this is the safety net against a mis-tap or a bad edit, not the
 * off-device backup (that is the Excel export). Returns the snapshot or null.
 */
export async function snapshotIfDue(now = new Date()) {
  if (now.getHours() < BACKUP_HOUR) return null
  const date = today()
  if (await db.backups.get(date)) return null // already done today

  const sessions = await db.sessions.toArray()
  if (!sessions.length) return null

  const snap = { date, createdAt: Date.now(), sessions }
  await db.backups.put(snap)

  // Trim oldest restore points beyond the retention window.
  const dates = (await db.backups.orderBy('date').keys()).sort()
  if (dates.length > KEEP) await db.backups.bulkDelete(dates.slice(0, dates.length - KEEP))

  return snap
}

export async function listBackups() {
  const rows = await db.backups.orderBy('date').reverse().toArray()
  return rows.map((r) => ({
    date: r.date,
    createdAt: r.createdAt,
    sessions: r.sessions.length,
    periods: r.sessions.reduce((n, s) => n + (s.periods || 0), 0)
  }))
}

/** Replace all current sessions with a restore point. Destructive — confirm first. */
export async function restoreBackup(date) {
  const snap = await db.backups.get(date)
  if (!snap || !Array.isArray(snap.sessions)) return false
  await db.sessions.clear()
  // Preserve original ids so nothing collides after the clear.
  await db.sessions.bulkPut(snap.sessions.map((s) => ({ ...s })))
  return true
}

/** The daily/manual Excel export. Records the date so the reminder stands down. */
export async function runExport(sessions, divisions = DIVISIONS) {
  const data = divisions.length === DIVISIONS.length ? sessions : sessions.filter((s) => divisions.includes(s.division))
  const result = await buildAndSave(data, divisions, exportName(divisions))
  if (result === 'downloaded' || result === 'shared') {
    await setSetting('lastExportDate', today())
  }
  return result
}
