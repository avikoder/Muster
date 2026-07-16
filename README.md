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
- **Theory or lab.** Theory is 1 hour and counts 1 period; a lab is 2 hours and counts
  2. End time is computed from the start — never typed.
- Date, start time, subject per session. Recent subjects are remembered.
- Saving the same division + date + start + subject twice offers to overwrite rather
  than silently duplicating.
- **Export to Excel** — all divisions or one.

## The exported workbook

| Sheet | Contents |
| --- | --- |
| `SY-A`, `SY-B`, `TY-B` | Students down the side, sessions across the top. Three header rows per column: date, time + kind, subject. Cells are `P` / `A`. Last three columns: periods attended, periods held, attendance %. |
| `Sessions` | One row per session — division, date, day, start, end, kind, periods, subject, present, absent, strength, %. |
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
    roster.js           roster access, slots, period/time maths
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
