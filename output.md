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
