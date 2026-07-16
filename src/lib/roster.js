import students from '../data/students.json'

// To correct a name or add a student, edit src/data/students.json and rebuild.
export const DIVISIONS = ['SY-A', 'SY-B', 'TY-B']
export const roster = students

export function rollsOf(division) {
  return roster[division].map((s) => s.roll)
}

export function studentAt(division, roll) {
  return roster[division].find((s) => s.roll === roll)
}

/**
 * The college day. Teaching runs 08:00–10:00, breaks for 15 minutes, then runs
 * 10:15–18:15 — ten one-hour periods in all, numbered as on a timetable.
 *
 * This is the only place the day is defined. Change these two blocks and every
 * slot, period number and end time in the app follows.
 */
export const DAY_BLOCKS = [
  { start: '08:00', end: '10:00' }, // periods 1–2
  { start: '10:15', end: '18:15' } // periods 3–10
]

export const PERIODS = { theory: 1, lab: 2 }

const toMin = (t) => {
  const [h, m] = t.split(':').map(Number)
  return h * 60 + m
}

const toHHMM = (n) =>
  `${String(Math.floor(n / 60) % 24).padStart(2, '0')}:${String(n % 60).padStart(2, '0')}`

/** Every period start in the day, in order, as minutes past midnight. */
const PERIOD_STARTS = DAY_BLOCKS.flatMap((b) => {
  const out = []
  for (let t = toMin(b.start); t + 60 <= toMin(b.end); t += 60) out.push(t)
  return out
})

/** The block a period sits in, so nothing is ever scheduled across the break. */
function blockEnd(startMin) {
  const b = DAY_BLOCKS.find((x) => startMin >= toMin(x.start) && startMin < toMin(x.end))
  return b ? toMin(b.end) : null
}

/**
 * Valid start times for a kind. A theory lecture fills one period; a lab fills
 * two consecutive periods and is dropped where it would run past the break or
 * past the end of the day — so a lab can start at 08:00 but not 09:00.
 */
export function slotsFor(type) {
  const len = PERIODS[type] * 60
  return PERIOD_STARTS.map((t, i) => {
    const end = blockEnd(t)
    return {
      start: toHHMM(t),
      end: toHHMM(t + len),
      period: len === 120 ? `${i + 1}–${i + 2}` : `${i + 1}`,
      fits: end !== null && t + len <= end
    }
  }).filter((s) => s.fits)
}

/** The period label for a start time, or null if it is off the timetable. */
export function periodOf(start, type) {
  const hit = slotsFor(type).find((s) => s.start === start)
  return hit ? hit.period : null
}

/** Keep a start time legal when the kind changes — 09:00 theory becomes a 10:15 lab. */
export function snapToSlot(start, type) {
  const list = slotsFor(type)
  if (list.some((s) => s.start === start)) return start
  const target = toMin(start)
  return list.reduce((best, s) =>
    Math.abs(toMin(s.start) - target) < Math.abs(toMin(best.start) - target) ? s : best
  ).start
}

/** Open on the period we are actually in, else the next one to come. */
export function defaultStart(type = 'theory') {
  const now = new Date()
  const mins = now.getHours() * 60 + now.getMinutes()
  const list = slotsFor(type)
  const current = list.find((s) => toMin(s.start) <= mins && mins < toMin(s.end))
  if (current) return current.start
  const next = list.find((s) => toMin(s.start) > mins)
  return next ? next.start : list[0].start
}

export function endTime(start, type) {
  const [h, m] = start.split(':').map(Number)
  if (Number.isNaN(h)) return '--:--'
  return toHHMM(h * 60 + m + PERIODS[type] * 60)
}

export function today() {
  const d = new Date()
  const off = d.getTimezoneOffset()
  return new Date(d.getTime() - off * 60000).toISOString().slice(0, 10)
}

const MONTHS = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec']

export function prettyDate(iso) {
  const [y, m, d] = iso.split('-').map(Number)
  return `${String(d).padStart(2, '0')} ${MONTHS[m - 1]} ${y}`
}

export function shortDate(iso) {
  const [, m, d] = iso.split('-').map(Number)
  return `${String(d).padStart(2, '0')} ${MONTHS[m - 1]}`
}

export function to12h(t) {
  const [h, m] = t.split(':').map(Number)
  if (Number.isNaN(h)) return t
  const ap = h >= 12 ? 'pm' : 'am'
  const hh = h % 12 === 0 ? 12 : h % 12
  return `${hh}:${String(m).padStart(2, '0')} ${ap}`
}
