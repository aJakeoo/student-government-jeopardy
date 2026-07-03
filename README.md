# CCS Student Government Jeopardy

Two-screen Jeopardy trivia for CCS Student Government's summer training.
Vanilla HTML/CSS/JS, no build step, Firebase Firestore for real-time sync.

- `index.html` — host board (projector). Only entry point for the host.
- `buzzer.html` — player buzzer, reached by scanning the QR code on the
  host board. Name entry → buzz button, no separate join menu.

## Design source

Visual design (`CCS Jeopardy.dc.html`, Claude Design export) is the source
of truth for colors, fonts, and layout — see `css/base.css` for the design
tokens pulled directly from it.

## Question content

`data/questions.js` holds the 6 categories. **Points of Order has no
drafted questions yet** — its tiles render greyed out with a `—` and are
not clickable. Fill in `clues` for that category (5 objects shaped like
`{ value, question, answer }`) once content is written; the `empty: true`
flags can come out at the same time.

## Firebase setup

1. Firestore, native mode, project `stu-gov-jeopardy` (already wired in
   `js/firebase-config.js`).
2. Publish `firestore.rules` (Firestore → Rules tab, or `firebase deploy
   --only firestore:rules` with the Firebase CLI). Without this the app
   can't read/write the room document.
3. That's it — no Auth, no other products. `rooms/main` holds the board
   state (`currentTile`, `buzzLock`, answered tiles) and a `players`
   subcollection (one doc per device, keyed by a random id generated on
   first visit to `buzzer.html` — not by name, so two players who share a
   first name still get separate scores). Deleting `rooms/main` and its
   `players` subcollection resets the game; there's no cross-session
   persistence by design.

## Running locally

Any static file server works — e.g.:

```
python3 -m http.server 8080
```

Then open `http://localhost:8080/index.html`.

For local Firestore testing without touching the production project, run
the emulator and the app will auto-connect to it (see the `localhost`
check in `js/firebase-config.js`):

```
firebase emulators:start --only firestore
```

## Deploying

Push to GitHub and enable Pages (Settings → Pages → Source: Deploy from a
branch → pick this branch → `/` root). GitHub Pages serves `index.html`
at the repo root automatically.

## Notes

- The "AC Compacta" font file bundled in `assets/fonts/` is actually a
  freeware lookalike ("Aka-AcidGR-Compacta" by Cybertronical Design,
  explicitly marked free by its foundry) that the design tool substituted
  in — not the commercial Fontfabric "AC Compacta". Fine for this
  training tool; swap in a licensed copy later if wanted.
- Firestore is initialized with `experimentalForceLongPolling` since
  school/campus wifi and proxies often choke on the default streaming
  transport — worth the extra chattiness for reliability on guest wifi.
