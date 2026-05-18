# Dashboard Enhancement – Change Report
**Date:** Monday, 18 May 2026  
**Feature:** In/Out Cycle Tracking, Per-Session Durations & Total Time Summary

---

## Overview

Three new metrics are now visible on both the **employee dashboard** and the **admin per-employee dashboard**:

| # | Feature | Where visible |
|---|---------|---------------|
| 1 | Number of times each person entered and exited | SessionMetrics cards + Detailed Sessions header badges + Detailed Sessions summary bar |
| 2 | Duration of every individual inside-session and outside-gap | Detailed Sessions timeline table |
| 3 | Overall total time spent inside and total time spent outside | SessionMetrics cards + Detailed Sessions summary bar |

---

## Files Changed

### 1. `backend/controllers/attendanceController.js`

**Function modified:** `getSessionDetails` (lines 436–475 → 436–500)

**What changed:**

- Added a loop after building `formattedSessions` that computes **out-time gaps** – the periods between one session's `check_out` and the next session's `check_in`.
- Each gap object contains:
  - `gap_number` – sequential gap index
  - `after_session` / `before_session` – which sessions it bridges
  - `time_out` – when the person left
  - `time_in` – when they returned
  - `duration_minutes` / `duration_formatted` – how long they were outside
- Added running totals:
  - `total_in_duration_minutes` / `total_in_duration_formatted` – sum of all inside durations
  - `total_out_duration_minutes` / `total_out_duration_formatted` – sum of all out-gaps
- Added convenience counts:
  - `times_exited` – number of recorded checkouts (= `out_gaps.length`)
  - `times_reentered` – same value; how many times they returned after leaving
- Appended the new fields (`out_gaps`, `total_in_duration_*`, `total_out_duration_*`, `times_exited`, `times_reentered`) to the JSON response.
- Fixed a pre-existing `session_duration_minutes` null-safety issue with `?? 0`.

**No existing API fields were removed.** The change is fully backward-compatible.

---

### 2. `frontend/src/Components/SessionMetrics.jsx`

**What changed:**

- Replaced the former 3-column card grid with a **2 × 2 card grid**.
- Old cards:
  - Total Sessions
  - Avg Session Duration
  - Total Time Inside
- New cards:

| Card | Value | Sub-text | Colour |
|------|-------|----------|--------|
| **Times Entered** | `total_cycles` | Active/no-active status | Blue |
| **Times Exited** | `completed_sessions` | Open sessions remaining | Purple |
| **Total Time Inside** | `formatted.total_time_inside` | Minutes total | Green |
| **Total Time Outside** | `formatted.total_time_outside` | Minutes total | Orange |

- The `total_time_outside` value was already returned by `GET /api/attendance/session-statistics` but was never displayed; it is now shown.
- Period toggle (Today / This Month / All Time) is unchanged.

---

### 3. `frontend/src/Components/ExpandableSessionDetails.jsx`

**What changed:**

#### A – Header badges (collapsed state)
- Replaced the single yellow badge (`total_sessions`) with **two colour-coded badges**:
  - Blue pill: `{N} in` – entries count
  - Orange pill: `{N} out` – exits count

#### B – Summary bar (inside expanded panel)
- Added a 4-card summary row above the timeline table with coloured bordered tiles:
  - **Times Entered** (blue) – total check-ins
  - **Times Exited** (purple) – total check-outs
  - **Total Inside** (green) – `total_in_duration_formatted` + minutes
  - **Total Outside** (orange) – `total_out_duration_formatted` + minutes

#### C – Timeline table (inside expanded panel)
- Replaced the old 5-column sessions-only table with a **6-column interleaved timeline table** (columns: `#`, `Type`, `From`, `To`, `Duration`, `Status`).
- Each **inside session** renders as a blue-tinted row with a `↓ Inside` badge.
- Immediately after each completed inside session, an **outside gap row** is injected (if a gap exists) as an orange-tinted row with an `↑ Outside` badge showing when the person left, when they returned, and how long they were away.
- The gap rows are matched to their position using `out_gaps[].after_session` from the API response.

---

## API Response – Before vs After

### `GET /api/attendance/session-details/:employeeId?date=YYYY-MM-DD`

**Before:**
```json
{
  "employeeId": "...",
  "date": "2026-05-18",
  "total_sessions": 3,
  "sessions": [
    { "id": 1, "sequence": 1, "check_in": "09:00:00", "check_out": "10:30:00", "duration_minutes": 90, "duration_formatted": "01:30", "status": "Completed" },
    { "id": 2, "sequence": 2, "check_in": "11:00:00", "check_out": "12:00:00", "duration_minutes": 60, "duration_formatted": "01:00", "status": "Completed" },
    { "id": 3, "sequence": 3, "check_in": "13:00:00", "check_out": null,       "duration_minutes": 0,  "duration_formatted": "-",     "status": "Active" }
  ]
}
```

**After (new fields in bold):**
```json
{
  "employeeId": "...",
  "date": "2026-05-18",
  "total_sessions": 3,
  "times_exited": 2,
  "times_reentered": 2,
  "total_in_duration_minutes": 150,
  "total_in_duration_formatted": "02:30",
  "total_out_duration_minutes": 90,
  "total_out_duration_formatted": "01:30",
  "sessions": [ ...unchanged... ],
  "out_gaps": [
    { "gap_number": 1, "after_session": 1, "before_session": 2, "time_out": "10:30:00", "time_in": "11:00:00", "duration_minutes": 30, "duration_formatted": "00:30" },
    { "gap_number": 2, "after_session": 2, "before_session": 3, "time_out": "12:00:00", "time_in": "13:00:00", "duration_minutes": 60, "duration_formatted": "01:00" }
  ]
}
```

---

## Visual Dashboard Snapshot (text layout)

```
┌─────────────────────────────────────────────────────┐
│  Session Details            [Today] [This Month] [All Time]  │
│                                                     │
│  ┌─────────────────┐  ┌─────────────────┐          │
│  │  Times Entered  │  │  Times Exited   │          │
│  │       3         │  │       2         │          │
│  │  1 currently    │  │  1 still open   │          │
│  │  inside         │  │                 │          │
│  └─────────────────┘  └─────────────────┘          │
│  ┌─────────────────┐  ┌─────────────────┐          │
│  │ Total Time      │  │ Total Time      │          │
│  │ Inside          │  │ Outside         │          │
│  │    02:30        │  │    01:30        │          │
│  │  150 min        │  │  90 min         │          │
│  └─────────────────┘  └─────────────────┘          │
└─────────────────────────────────────────────────────┘

  Detailed Sessions   [3 in] [2 out]          [v]
  ┌───────────────────────────────────────────────────┐
  │ [Times Entered: 3] [Times Exited: 2]              │
  │ [Total Inside: 02:30 / 150 min]                   │
  │ [Total Outside: 01:30 / 90 min]                   │
  │                                                   │
  │ # │ Type      │ From     │ To       │ Dur  │ Status│
  │ 1 │ ↓ Inside  │ 09:00:00 │ 10:30:00 │ 01:30│ Done  │
  │   │ ↑ Outside │ 10:30:00 │ 11:00:00 │ 00:30│ Retur.│
  │ 2 │ ↓ Inside  │ 11:00:00 │ 12:00:00 │ 01:00│ Done  │
  │   │ ↑ Outside │ 12:00:00 │ 13:00:00 │ 01:00│ Retur.│
  │ 3 │ ↓ Inside  │ 13:00:00 │ —        │  -   │ Active│
  └───────────────────────────────────────────────────┘
```

---

## Summary of All Edited Files

| File | Type | Change Summary |
|------|------|----------------|
| `backend/controllers/attendanceController.js` | Backend (Node.js) | `getSessionDetails`: added out-gap computation, totals, new response fields |
| `frontend/src/Components/SessionMetrics.jsx` | Frontend (React) | 3-card → 2×2 grid; added "Times Exited" and "Total Time Outside" cards |
| `frontend/src/Components/ExpandableSessionDetails.jsx` | Frontend (React) | Added summary bar; interleaved outside-gap rows in timeline table; dual header badges |

No database schema changes were required. All data needed for the new features was already stored in `detailed_attendance_sessions`.
