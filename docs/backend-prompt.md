Follow an incremental development approach. First, analyze the provided specifications and propose an implementation plan. Then implement the backend step by step, ensuring that the application remains runnable. Use Node.js with Express for backend (REST API).

**Name:** Degrid

**Description:** Degrid is a multiplayer, turn-based strategy game on a 16x16 grid. Players join a queue (4 to 36 players), a game is created, and players take turns requesting cells by entering coordinates, completing challenges (questions) within a time limit, and trading cells. The goal is to conquer the four central cells of the grid.

## Input Sources (Priority Order)

1. OpenAPI Spec (PRIMARY) - All endpoints, schemas, validation: `docs/swagger.json`
2. User Stories - Feature context & flows: `docs/stories.json`
3. Requirements - Business rules & constraints: `docs/requirements.json`
4. Scope decisions and notes: `docs/SCOPE.md`

Read these files from the repository. Do not modify `docs/`.

## TARGET STRUCTURE

- package.json - Dependencies
- .env.example - environmental variables
- .gitignore - Git ignore rules
- models/*.js - Data models (plain JavaScript objects for mock data)
- routes/*.js - Express routers for each resource
- controllers/*.js - Controller functions
- services/*.js - Business logic layer
- middleware/ - validation.js, errorHandler.js, logger.js
- config/ - constants.js, ...
- utils/ - responses.js, validators.js, helpers.js
- server.js & app.js - Entry points
- README.md - Documentation

## CODE STYLE REQUIREMENTS

- Async Pattern: async/await
- Error Handling: centralized error middleware with appropriate async error propagation
- Response Pattern: {success, data, error, message}
- Naming: camelCase for variables/functions, PascalCase for models
- Imports: use ES6 modules

## PROJECT-SPECIFIC REQUIREMENTS

- Implement ALL operations defined in `docs/swagger.json` (26 operations), with the exact paths, parameters, request bodies and response shapes from the spec.
- Do NOT use MongoDB or any database. Use hardcoded mock data in the code, available on every server start. State is kept in memory while the server runs.
- Mock data must include: several players (with usernames, languages, avatars as URLs), at least one active game with players, a 16x16 grid (256 cells, each with cellId, row, column, owner, cellColour), a queue with players, and several challenges (question, options, correct answer kept only on the server, timeLimit).
- The correct answer of a challenge must never be returned by the API.
- Entities: Player, Game, Cell (Grid), Challenge, plus Queue and Turn. Routes must make them interact (e.g. a player selects a cell, receives a challenge, answers it, and the cell ownership and the leaderboard cell counts update).
- Enable CORS for all origins (the React frontend runs on a different port).
- Run on port 3000 by default (configurable via .env PORT).
- Serve the Swagger UI at `/api-docs` using swagger-ui-express and `docs/swagger.json`.
- Validate input and return appropriate status codes (400, 404, 409) as defined in the spec.

## CRITICAL REQUIREMENTS

- COMPLETE, RUNNABLE code (no placeholders)
- All controller errors are handled appropriately through centralized error-handling middleware
- All async functions use async/await
- All functions have JSDoc comments
- Use ES6+ features
- All routes mounted in routes/index.js
- Error handler differentiates error types
- No authentication is required.
- There must be at least 10 available routes (the spec defines 26) with at least one GET, POST, PUT and DELETE.
- At least 3 different entities that interact with each other across routes.

Implement the backend according to the proposed plan, ensuring that the final application is complete, runnable, and satisfies all the requirements above. After each step, tell me how to run and test it (npm install, npm start, and example curl commands).
