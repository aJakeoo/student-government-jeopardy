# Build Log — CCS Student Government Jeopardy

Running log of every phase, decision, and issue for this build. Newest entries at the bottom of each section as work progresses.

## Session Start — 2026-07-03

**Starting state of repo:**
- `assets/fonts/AC-Compacta.ttf`, `assets/img/peacock-logo.png`
- `css/base.css` — design tokens (colors, fonts) already extracted from the Claude Design export, comment says source is `CCS Jeopardy.dc.html`
- `data/questions.js` — full question bank for 5 categories, `Points of Order` intentionally `empty: true` placeholder
- No HTML files exist yet (index.html, buzzer.html not created)
- No firebase-config.js yet

**Plan for this session:**
1. Import the design (`CCS Jeopardy.dc.html`) via the claude_design MCP so I have the real layout/visual spec, not just the color tokens in base.css.
2. Build static board (index.html) matching the design, wired to real questions.js data.
3. Add tile state machine + manual scoring controls.
4. Build buzzer.html (QR generation, name entry, buzz button).
5. Wire up Firebase (firebase-config.js, room state, buzz transaction, live score sync).
6. Recursive QA loop comparing rendered app against the design export, fixing gaps, re-checking, until clean.
7. Commit and push to https://github.com/aJakeoo/student-government-jeopardy.

Log entries for each phase follow below.

## Discovery: prior work already on this branch — 2026-07-03

Before writing anything beyond this log, `git log` showed the branch already
had two commits I didn't make: `e04b304 Add design tokens, question data,
and design-export assets` and `26077ee Build host board, buzzer page, and
Firebase real-time sync`, both authored by a separate Claude session
(`session_018JJu7NJ3HK8LDXYFmm1Qmj`) and already pushed + merged to
`origin/claude/ccs-jeopardy-game-1lczs9`. That session had already built:
`index.html`, `buzzer.html`, `css/host.css`, `css/buzzer.css`,
`js/host.js`, `js/buzzer.js`, `js/room.js`, `js/firebase-config.js`,
`firestore.rules`, `firebase.json`, `README.md`, and vendored
`js/vendor/qrcode-generator.js`.

Rather than duplicate or overwrite that work, I reviewed it in full. It was
genuinely solid — faithful to the design (independently converged on
nearly identical CSS to what I'd have written pulling from the same
`CCS Jeopardy.dc.html` spec), and its commit message documented a real bug
it had already found and fixed (`[hidden]` losing to `display:flex` via
CSS specificity). I discarded my own redundant first-pass files
(`css/board.css`, `js/qrcode.js`) and built on the existing implementation
instead, fixing the gaps described below.

## Design import — 2026-07-03

Pulled `CCS Jeopardy.dc.html` directly from the Claude Design project
(`dab8eb39-a8a4-4a0b-9ede-683b478aeec6`) via the claude_design MCP
(`DesignSync` tool) per this session's request. Confirmed it matches what
the existing `css/host.css`/`css/buzzer.css` already implemented almost
value-for-value — colors, spacing, fonts, animation keyframes, and copy
all lined up. Added one missing token to `css/base.css`
(`--color-tile-value: #9d5fc0`, the tile dollar-value purple) that had
been hardcoded rather than tokenized, and pointed `host.css` at it.

## Data-shape correction — 2026-07-03

The existing `room.js` stored player scores as `scores: { [name]: score }`
directly on the `rooms/main` doc. That's a real correctness gap against
the brief: two players who happen to share a first name (plausible at a
~20-30 person student government event) would silently share one score
bucket, breaking "individual scoring." It also didn't match the data shape
specified in the brief (a `players` subcollection keyed by a persistent
per-device `playerId`).

Rewrote `js/room.js`, `js/host.js`, and `js/buzzer.js` so:
- `rooms/main` holds only `{ currentTile, buzzLock, board, buzzToken }`
  (consolidated `activeQuestion` + `questionPhase` into a single
  `currentTile: { catIdx, rowIdx, phase }`, and `buzzedBy`/`buzzerOpen`
  into a single `buzzLock: playerId | null`, matching the brief's shape).
- `rooms/main/players/{playerId}` holds `{ name, score }`, one doc per
  device. `playerId` is generated once in `buzzer.js` and persisted in
  `localStorage` (survives refresh/tab close).
- `markResult` now looks up the buzzed player by `playerId` inside the
  same transaction that writes the board update, so scoring and board
  state commit atomically.
- Updated `firestore.rules` to also allow the new `players` subcollection
  path (previously only `rooms/main` itself was covered).

Also removed two elements the existing build had kept from the design
prototype but that don't belong in the shipped product: the host's
"🎯 Simulate Buzz-In" button (a design-tool convenience for demoing
without a second device — real buzz-ins now always come from an actual
`buzzer.html` client) and the buzzer's "← Host board" back-link (the brief
specifies the buzzer flow should have no navigation menu; a link back to
host controls doesn't belong on a player's phone).

## QA — 2026-07-03

Static checks first: `node --check` on every JS file (clean), and
confirmed every asset path referenced by `index.html`/`buzzer.html`
(css, js, vendor lib, fonts, images) resolves with a 200 from a real
static server.

Live browser QA (Claude in Chrome) needed a couple of retries to connect
in this environment — once connected, ran the actual host + buzzer flow
across two tabs against real cloud Firestore (not the emulator; served
from the machine's LAN IP specifically so `firebase-config.js`'s
`localhost`-only emulator check wouldn't kick in):

- Host board renders true to the design: dark navy background, blue
  category headers with the two-line wrapped names, cream $-value tiles
  in the tokenized purple, QR corner with purple border, peacock logo,
  yellow "JEOPARDY!" wordmark. Points of Order tiles render grey with
  "—" and are correctly non-interactive (no click handler attached).
- **Bug found and fixed:** `buzzer.js` generated the per-device
  `playerId` with `crypto.randomUUID()`, which throws in any non-secure
  context (plain HTTP on a LAN IP, as opposed to HTTPS or `localhost`).
  This silently broke the entire buzzer page — the join button did
  nothing, no console-visible cause until checking logs directly. Since
  GitHub Pages serves over HTTPS this would never have surfaced in
  production, but it would break for anyone testing locally over LAN
  (a plausible thing to do before a live event), so fixed with a
  same-length fallback ID (`Date.now().toString(36) + Math.random()...`)
  that doesn't require a secure context.
- Verified after the fix: name entry → join → live score chip appears on
  host ("ALEX $0"), confirming the players subcollection sync works
  end-to-end.
- Opened a tile, confirmed the full-screen question overlay (category +
  value badge, question text, Reveal Answer / Close controls).
- Buzzed in from the player tab — host showed "ALEX BUZZES IN!", player
  tab showed "🎉 You buzzed first!" — confirming buzzLock resolves through
  the players subcollection correctly.
- Revealed answer, marked Correct — tile went green with a checkmark,
  host score chip and buzzer leaderboard both updated to $200 in real
  time.
- Tested the no-buzz path: opened another tile, revealed answer with no
  one buzzed in, marked Skip — tile greyed with the design's small `·`
  marker, no score change (confirms `markResult` correctly skips the
  score-write branch when `buzzLock` is null).
- No console errors after the fix, on either tab, through the full flow.

Reset the real `stu-gov-jeopardy` Firestore project back to a clean state
afterward (deleted the test player doc, reset `rooms/main` to
`{ board: {}, currentTile: null, buzzLock: null, buzzToken: 0 }`) via the
Firestore REST API, since this is the actual production project and the
test run had left a fake "Alex, $200, one tile answered" state sitting in
it.

## Outstanding / needs your call

- **Points of Order** is still placeholder-only by design — not touched,
  per the brief.
- **Firestore rules**: the brief said these "come later, not now," but
  the prior session published a permissive `allow read, write: if true`
  rule for `rooms/main` (and I extended it to the `players` subcollection)
  so the app is actually functional today. Worth revisiting before a
  real public event if you want tighter rules.
- The `assets/fonts/AC-Compacta.ttf` bundled in the repo is a freeware
  lookalike ("Aka-AcidGR-Compacta"), not the commercial Fontfabric
  AC Compacta — noted in `README.md`. Fine for this training tool, swap
  later if you want the real font.

## Commit, push, and deploy — 2026-07-03

Committed all fixes (`b80698a`) and pushed to
`origin/claude/ccs-jeopardy-game-1lczs9`. This branch is the repo's
default branch (confirmed via `git remote show origin` — HEAD branch is
`claude/ccs-jeopardy-game-1lczs9`, not `main`), and GitHub Pages was
already enabled and live at
`https://ajakeoo.github.io/student-government-jeopardy/` serving both
`index.html` and `buzzer.html` with a 200 before this session even ended
— no manual Pages setup needed. GitHub Pages rebuilds typically land
within a minute or two of a push, so allow a short delay before the
`playerId`/subcollection fix is live if you check immediately.

## Host-presence / game-session reset — 2026-07-03

Requested feature: the host board is the game's "anchor" — whenever it's
closed or refreshed, the whole game should reset and every buzzer should
get kicked out until a new game starts.

Firestore has no server-side disconnect hook (that's an RTDB-only
feature — `onDisconnect()` doesn't exist here), so this is built as a
heartbeat/session pattern instead of trying to catch the tab-close event
directly:

- `rooms/main` gains `hostSessionId` (random, regenerated every time
  `index.html` loads) and `hostLastSeen` (a plain `Date.now()` timestamp,
  not `serverTimestamp()` — avoids the "pending write reads as null"
  gap that would otherwise show on the host's own snapshot).
- `js/room.js`: new `startHostSession()` — called once on host boot,
  batch-deletes every doc in `players/` and resets the room doc with a
  fresh session id in one atomic batch. New `sendHostHeartbeat()`, called
  every `HOST_HEARTBEAT_MS` (4s) from `host.js` via `setInterval` for as
  long as the tab stays open. New `isHostActive(room)` — true only if
  `hostLastSeen` is newer than `HOST_TIMEOUT_MS` (10s) old.
- `js/host.js`: boot now calls `startHostSession()` instead of the old
  `ensureRoom()` (which only created the doc if missing — now every load
  unconditionally resets), and starts the heartbeat interval.
- `js/buzzer.js`: tracks the last `hostSessionId` it knew about in
  `localStorage`. On every room update: if the session id changed (host
  started a new game), the player's local name is cleared and they're
  sent back to name entry. Independently, if `isHostActive()` is false
  (host tab closed, no heartbeat for 10s+) a new "Waiting for the host"
  screen takes over from both the join screen and the game screen, and
  they can't join or buzz until it comes back. A player's own page
  refresh, while the same host session is still active, still silently
  resumes as themself (no forced re-entry) — only an actual new game
  forces a fresh name entry.
- `buzzer.html`/`css/buzzer.css`: added the `#hostGoneScreen` block for
  the above.

Known limitation: since this relies on a heartbeat rather than an
instant disconnect signal, there's up to ~10s of lag between the host
tab actually closing and buzzers flipping to "waiting for host" — an
immediate kick would need Firebase Realtime Database or a Cloud
Function, which is a much bigger change than this task called for. A
host *refresh* resets instantly (the new page load wipes everything
before it renders anything), so the lag only applies to the
close-without-reopening case.

Per instruction, skipped the live browser QA loop for this change (JS
syntax-checked with `node --check`, greped for dangling references to
the removed `ensureRoom` — clean) to get it committed before the usage
window closed. Recommend a quick manual pass next session: open the
host board, open a buzzer tab and join, close the host tab, confirm the
buzzer flips to "Waiting for the host" within ~10s, then reopen the host
board and confirm the buzzer is forced back to name entry with a clean
board.

## Question set update + QA loop — 2026-08-12

Replaced the question bank with the finalized set from "CCS SG Jeopardy
Full Question Set" (PDF). Category changes:

- `Elections & Nominations` -> `How We Work`, with entirely new clues
  (department-wide meetings, Department Chair cadence, alternate voting,
  the support path up to the Advisor, expected meetings).
- `Points of Order` -> `Funding in Practice`, and it is no longer a
  placeholder: five real clues on RSO eligibility, the five-minute
  presentation cap, the funding rubric, partial awards, and the
  ranked-choice selection formula.
- **`Committees` is now the empty one.** The source document has the
  header with no table under it, so it inherits the `empty: true`
  treatment and its five previous clues were dropped. Confirmed this is
  the document's actual state, not a text-extraction failure. If that
  was not intended, that section of the source doc needs refilling and
  this is the only place to fix it.

`Reps & Alternates`, `Executive Board`, and `Money & Motions` kept their
names, but several clues were reworded or replaced outright. Em dashes in
the source copy were converted to plain punctuation per the convention
set in d413443.

All 25 clues were then diffed programmatically against text extracted
from the PDF (normalizing smart quotes, dashes, and whitespace): zero
mismatches, and category names/order match the document.

### QA loop

Ran headless (Puppeteer against the local Firestore emulator) rather than
by hand, so the whole board could actually be played: host board plus
three buzzer clients, each in its own storage partition because
`buzzer.js` keys identity off `localStorage` and a shared context makes
player 2 inherit player 1's name.

Played all 25 live clues end to end (open, buzz, reveal, mark), plus a
worst-case layout pass on the six longest clues with a full five-deep
buzz order and long names. No layout clipping or overflow at 1280x800,
the empty `Committees` column is correctly inert, and the buzzer caps at
five with the sixth player told the buzzer is closed.

**Two pre-existing bugs surfaced and were fixed** (both in the
host-presence work flagged in the previous entry as never manually
tested; neither is related to the question update):

1. **A player refreshing their phone lost their entire score.**
   `joinRoom` wrote `{ name, score: 0 }` with `merge: true` and
   `buzzer.js` calls it on every load that resumes a session. `merge`
   merges the document but still overwrites the fields it is handed, so
   the literal `score: 0` reset returning players. Confirmed on the host
   board (`Rosa $100` -> `Rosa $0` on reload). Now a transaction that
   reads the existing score and only defaults to 0 for a new player; a
   new game still zeroes everyone because `startHostSession` deletes the
   player docs outright.

2. **The buzzer never noticed the host disappearing.** `isHostActive()`
   is a clock check against the last heartbeat, but `render()` only ran
   on a Firestore snapshot. When the host tab closes it stops writing, so
   no snapshot arrives and nothing re-evaluates staleness: players sat on
   a live-looking game screen indefinitely (verified still showing the
   game 15s after the host closed, with a 10s timeout). Added a 2s clock
   poll that re-renders only when host-active actually flips.

Also cleared the name field when a session resets, so the previous game's
name is not sitting in the box for whoever picks the phone up next.

After the fixes all three suites pass clean: full 25-clue playthrough,
worst-case layout stress, and a presence suite covering host-closes,
host-reopens, and player-refreshes-mid-game.
