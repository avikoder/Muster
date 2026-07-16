# Muster

Roll-call attendance for **SY-A**, **SY-B** and **TY-B**. Runs entirely on the phone —
no backend, no login, no network. Exports to Excel.

Built the way the other projects are: React + Vite + Dexie (IndexedDB) + Workbox,
deployed to GitHub Pages, installed as a PWA.

---

## What it does

- **Tap a roll number to mark it present.** 65–70 students fit on roughly one screen
  as a grid, so a full roll call is a few seconds of tapping rather than a scroll.
  Tap **All present** first and knock out the absentees — usually the faster route.
- **Names view** when the grid isn't enough — full name and PRN per row, same tap target.
- Every tap echoes the student's name under the tally, so a mis-tap on a 65-tile
  grid is visible immediately.
- **Pick the slot off the timetable, not the clock.** The day is ten one-hour periods —
  8:00–10:00, break, then 10:15–18:15 — and the picker shows them by period number and
  time range. A theory lecture fills one period; a lab fills two and is only offered
  where it fits inside a block, so no lab ever straddles the 10:00 break or runs past
  18:15. Switching kind re-snaps the start to a legal slot.
- Date and subject per session. Recent subjects are remembered.
- Saving the same division + date + start + subject twice offers to overwrite rather
  than silently duplicating.
- **Export to Excel** — all divisions or one.

## The exported workbook

| Sheet | Contents |
| --- | --- |
| `SY-A`, `SY-B`, `TY-B` | Students down the side, sessions across the top. Four header rows per column: date, period, time + kind, subject. Cells are `P` / `A`. Last three columns: periods attended, periods held, attendance %. |
| `Sessions` | One row per session — division, date, day, period, start, end, kind, periods, subject, present, absent, strength, %. |
| `Raw log` | One row per student per session, with status. For pivot tables. |

Percentages are computed on **periods**, not sessions, so a 2-hour lab weighs double —
which is how attendance is actually counted.

---

## Deploy to GitHub Pages

```bash
git init
git add -A
git commit -m "Muster"
git remote add origin git@github.com:avikoder/muster.git
git push -u origin main
```

Then in the repo: **Settings → Pages → Build and deployment → Source: GitHub Actions**.

The included workflow (`.github/workflows/deploy.yml`) builds on every push to `main` and
sets the base path from the repo name automatically. If the repo is named something other
than `muster`, nothing needs changing — the workflow reads it.

For a local build outside CI, the base path must match the repo:

```bash
npm install
BASE_PATH=/muster/ npm run build     # -> dist/
npm run preview                      # check it before pushing
```

## Install on the phone

Open `https://avikoder.github.io/muster/` once, on the phone, over HTTPS.

- **iPhone** — Safari (not Chrome) → Share → **Add to Home Screen**.
- **Android** — Chrome → menu → **Install app** / **Add to Home screen**.

After the first load the app is fully cached — fonts, code and the export library
included. It works with the phone in airplane mode.

**Exporting on iPhone:** the app hands the file to the iOS share sheet, so send it to
Files, Mail, or Drive from there. On Android and desktop it downloads directly.

---

## Changing the timetable

The day is defined once, in `src/lib/roster.js`:

```js
export const DAY_BLOCKS = [
  { start: '08:00', end: '10:00' },  // periods 1–2
  { start: '10:15', end: '18:15' }   // periods 3–10
]
```

Every slot, period number and end time in the app and in the export is derived from
those two blocks. Move a block or add a third and the picker follows — nothing else
to change.

Theory slots (10): 08:00, 09:00, 10:15, 11:15, 12:15, 13:15, 14:15, 15:15, 16:15, 17:15
Lab slots (8): 08:00, 10:15, 11:15, 12:15, 13:15, 14:15, 15:15, 16:15 — 09:00 and 17:15
are absent by design, since a two-hour lab from either would cross the break or overrun
the day.

An **Off-timetable time** field takes any start time, for extra or remedial sessions.

## Editing the roster

Names and roll numbers live in `src/data/students.json`, generated from
`Roll_Call_List.xlsx`:

```json
{ "SY-A": [{ "roll": 1, "prn": "3125036010397", "name": "Rugved Ramesh Yevale" }], ... }
```

Current strength: **SY-A 65 · SY-B 64 · TY-B 70** (199 students).

Edit the file and push — the workflow rebuilds. Saved sessions store only roll numbers,
so correcting a spelling doesn't disturb existing attendance.

## Where the data lives

IndexedDB on the device, database `muster`, one `sessions` table:

```js
{ id, division, date, start, end, type, periods, subject, present: [rolls], createdAt, updatedAt }
```

Absent is derived from the roster, so the roster stays the single source of truth for
who exists. Nothing leaves the phone. **The data is only on that phone** — export
regularly, and note that clearing Safari/Chrome site data wipes it.

## Layout

```
src/
  main.jsx              entry, fonts, service worker registration
  App.jsx               tabs, session draft state, remembered defaults
  styles.css            design tokens + all styles
  lib/
    db.js               Dexie schema, settings, clash detection
    roster.js           roster access, the day's blocks, slot/period/time maths
    exportXlsx.js       workbook construction, share-sheet/download save
  components/
    SessionBar.jsx      division, date, kind, slot, subject
    RollGrid.jsx        the grid and the names list
    TakeScreen.jsx      tally, echo, save
    RecordsScreen.jsx   history, stats, export
  data/students.json    the roster
```

SheetJS (~430 kB) is dynamically imported, so it loads only on first export — but it is
precached, so that first export still works offline.

## Design notes

The register is the reference: ink on ruled paper, a green pen for a tick, red used
sparingly because in a real muster roll red only ever marks the exception. Archivo for
headings, IBM Plex Sans for text, IBM Plex Mono for anything numeric — roll numbers and
tallies get tabular figures so columns line up. Fonts are self-hosted rather than pulled
from Google's CDN, so a cold start in a lecture hall with no signal still renders right.
