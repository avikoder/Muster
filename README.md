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
- **Labs run batch by batch.** For SY-A and SY-B, picking *Practical lab* shows a
  batch selector, and only that batch's roll numbers are marked. TY-B labs run
  whole-class. Batches are by roll number: SY-A → A1 (1–21), A2 (22–43), A3 (44–65);
  SY-B → B1 (1–21), B2 (22–42), B3 (43–64). A student's attendance % counts only the
  sessions they were part of — a lab a student wasn't in is left blank, not marked
  absent.
- **Pick the slot off the timetable, not the clock.** The day is ten one-hour periods —
  8:00–10:00, break, then 10:15–18:15 — and the picker shows them by period number and
  time range. A theory lecture fills one period; a lab fills two and is only offered
  where it fits inside a block, so no lab ever straddles the 10:00 break or runs past
  18:15. Switching kind re-snaps the start to a legal slot.
- Date and subject per session. Recent subjects are remembered.
- Saving the same division + date + start + subject twice offers to overwrite rather
  than silently duplicating.
- **View and edit any past session.** The Records tab lists everything recorded;
  tap a session to reopen it with its marks loaded, change anything — marks, date,
  slot, kind or subject — and update. Division is locked while editing (a session
  can't move to another roster). Delete is on the same row.
- **Export to Excel** — all divisions or one.
- **Daily backup at 7 PM.** After 7 PM, opening the app saves a silent restore
  point on the phone, and a banner offers the one-tap Excel export until it's done
  for the day. See the note below on why a phone app can't do this unattended.

## About the 7 PM daily backup

A phone PWA **cannot** run code while it's closed, and a browser will only write a
file in response to a tap — both by design, and neither is bypassable without a
server. So a genuine unattended "export a file at 7 PM while the app is shut" is not
possible on iPhone (or reliably on Android). Rather than fake it, Muster does the two
things that *are* reliable:

- **Automatic local restore point.** The first time you open the app after 7 PM each
  day, it silently snapshots all sessions into the phone's database. No tap needed.
  This protects against a mis-tap or a bad edit — restore points are listed under
  **Backup** in the Records tab, newest first, about three weeks kept. Restoring
  replaces the current sessions with that day's.
- **One-tap export reminder.** Open the app any time after 7 PM on a day you haven't
  exported, and an amber banner sits at the top: *Daily backup due*. One tap writes
  the Excel file you keep off the phone, and the banner stands down for the day.

The restore points live only on the device — they're a safety net, not an off-phone
backup. **The Excel export is the real backup**, because it's the copy that leaves the
phone. Keep exporting it when the banner asks.

## The exported workbook

| Sheet | Contents |
| --- | --- |
| `SY-A`, `SY-B`, `TY-B` | Students down the side, sessions across the top. Four header rows per column: date, period, time + kind (+ batch, e.g. `LAB A1`), subject. Cells are `P` / `A`, or **blank** for a student who wasn't in that lab's batch. Last three columns are per-student: periods attended, periods held (only sessions they were in), attendance %. |
| `Sessions` | One row per session — division, date, day, period, start, end, kind, batch, periods, subject, present, absent, strength, %. For a batch lab, strength is the batch size. |
| `Raw log` | One row per student per session they were part of, with status. For pivot tables. |

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

## Lab batches

Batches are defined in `src/lib/roster.js`, by roll-number range:

```js
export const BATCHES = {
  'SY-A': [{ id: 'A1', from: 1, to: 21 }, { id: 'A2', from: 22, to: 43 }, { id: 'A3', from: 44, to: 65 }],
  'SY-B': [{ id: 'B1', from: 1, to: 21 }, { id: 'B2', from: 22, to: 42 }, { id: 'B3', from: 43, to: 64 }]
}
```

A division not listed here (TY-B) has no batch split — its labs run whole-class. To
change a range, add a batch, or split TY-B later, edit this object; the picker, the
grid, and every attendance calculation follow from it.

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
    backup.js           daily snapshot, export-due check, restore
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
