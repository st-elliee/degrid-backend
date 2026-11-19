# Implementation record

Sources: original OpenAPI 1.1.0 (26 operations), four supplied stories,
27 requirements, activity diagrams, and request/challenge mockups M-7/M-12.
The three JSON files in docs/ are byte-for-byte copies of supplied files.
No SCOPE.md was supplied; this document records implementation decisions,
not an invented source or an approved replacement for SCOPE.md.

## Incremental plan and acceptance checks
1. Runnable Express ES module server, CORS, Swagger UI, centralized errors,
   schema validation. Check /api-docs and the JSON error envelope.
2. All 26 resource operations, mock models, memory-only game service,
   timers, queue, turns, challenges, ownership and leaderboard. Check live
   HTTP flows and no disclosure of answers.
3. OpenAPI validation, route inventory and response-shape tests; malformed
   input, atomic mutations, isolation and expiry tests. Package the source,
   lockfile and documentation, then repeat tests from the extracted package.

Run each stage with `npm install`, then `npm start`.
Stage 1: `curl http://localhost:3000/api-docs/` and
`curl http://localhost:3000/not-found`.
Stage 2: `curl http://localhost:3000/games` and the flow in README.md.
Stage 3: `npm run check:spec` and `npm test`.

## Decisions where the supplied sources are not specific
- Coordinates are 1..16, matching M-7. cellId = (row - 1) * 16 + column.
- Requesting a free cell uses validate-input or the cell selection PUT;
  these create one pending challenge. GET challenge does not restart its timer.
- inputcoordinates is explicitly the trade operation in the primary OpenAPI.
  It evaluates the target and returns that Cell without transferring it.
  The contract explicitly allows evaluation OR execution and has no offered
  cell, counterparty consent or acceptance operation. No forced trade is invented.
  System cell/grid updates remain available as specified.
- The queue is checked automatically: 4..36 connected players make a game;
  overflow stays for another game. Fewer than 4 wait 360 seconds, receive an
  explanatory response message and a restarted countdown. Music/popups and
  animations are rendered by the frontend, not this REST backend.
- Public projections include only schema fields. Correct answers and internal
  timers are never exposed. Additional invalid-input cases use the same error
  envelope with 400 even where the source does not enumerate that response.
- No authentication, database, external API, deployment or paid service.

Technical references: [Express async errors](https://expressjs.com/en/guide/error-handling/)
and [Multer multipart handling](https://expressjs.com/en/resources/middleware/multer/).

## Additional concrete decisions
- Seed: 48 connected mock players, one active four-player game, queue [5,6],
  four question templates. Each game starts with one distinct perimeter cell per player.
- Selection timeout defaults to 60s, challenge timeout to 40s (matching M-12),
  inactivity timeout to 300s. Turn/inactivity limits are configurable. The server
  ticks every second and also before API requests. A fake injected clock tests
  exact expiry boundaries without long sleeps.
- Game completion means all four central cells have one owner; fewer than two
  remaining participants also ends a game. Unanimous rematch requires at least
  four connected participants not playing another active game.
- DELETE always removes membership; optional inGame does not override deletion.
  Exit=true is processed immediately. Post-creation profiles are initialized once;
  seed and automatically matched players already have initialized profiles.
- System grid PUT supports partial patches; empty optional bodies are valid.
  Cell IDs/coordinates cannot move, and every batch validates before mutation.
- Colour is an integer RGB value; 0 is neutral by default. Explicit per-cell
  colours can be reconciled by grid/update; colour endpoint updates an owner's
  palette consistently across owned cells.
- Player-specific requests refresh that player's activity; the own-profile GET
  can serve as a polling heartbeat. No authentication/session protocol is invented.
- Multipart avatar files are limited to 1 MiB and accepted only with PNG/JPEG/GIF/
  WebP signatures. The data URL is held in memory, with no uploads directory.
- A trade is evaluated only. This intentionally remains a stated limitation for
  the broader R-4 business requirement while implementing the contract's permitted
  evaluation outcome. The team must supply exchange rules to implement actual swaps.

## Observed stage results
1. Initial foundation served Swagger UI (200) and a standard missing-route
   error (404) on an ephemeral real HTTP listener.
2. Full route inventory validated (26/26). A live sequence acquired cell 18,
   increased player 1's cell count from one to two and advanced to player 2.
3. Automated tests include all 26 successful operations, error envelopes,
   queue/turn/challenge flows, multipart avatars and atomic state changes.
   Exact final results and clean-package checks are recorded in TEST-RESULTS.md.
