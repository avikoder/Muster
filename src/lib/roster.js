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

/** Lecture slots on a normal college day. Any other start time can be typed in. */
export const QUICK_SLOTS = ['08:00', '09:00', '10:00', '11:00', '12:00', '13:00', '14:00', '15:00', '16:00']

export const PERIODS = { theory: 1, lab: 2 }

export function endTime(start, type) {
  const [h, m] = start.split(':').map(Number)
  if (Number.isNaN(h)) return '--:--'
  const total = h * 60 + m + PERIODS[type] * 60
  const hh = String(Math.floor(total / 60) % 24).padStart(2, '0')
  const mm = String(total % 60).padStart(2, '0')
  return `${hh}:${mm}`
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
