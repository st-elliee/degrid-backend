import test from 'node:test';
import assert from 'node:assert/strict';
import { routeDefinitions } from '../routes/index.js';
import { spec } from '../config/openapi.js';
import { fixture, assertResponse, assertNoSecrets } from './helpers.js';

const bodies = {
  createGame: { players: [{ playerId: 9 }, { playerId: 10 }, { playerId: 11 }, { playerId: 12 }] },
  joinQueue: { playerId: 7 }, initializeProfile: { playerId: 9 }, exitPlayer: { exit: false },
  rematchVote: { rematchVote: true }, popup: { message: 'Hello player!' }, editGrid: {},
  editCell: { owner: 1 }, colourCell: { cellColour: 123 },
  inputCoordinates: { row: 1, column: 16 }, validateInput: { row: 2, column: 2 },
  answerChallenge: { challengeId: 1, answer: '4' }, updateTurnOrder: { turnOrder: [4, 3, 2, 1] },
};

for (const [method, path, action] of routeDefinitions) {
  /** Exercise the real route and validate its successful response against OpenAPI. */
  test(`contract: ${method.toUpperCase()} ${path}`, async function successCase(t) {
    const f = await fixture(t);
    let gameId = 1;
    if (action === 'initializeProfile') {
      await f.request('post', '/games', bodies.createGame, 201); gameId = 2;
    }
    if (action === 'getChallenge' || action === 'answerChallenge') {
      await f.request('post', '/games/1/players/1/validate-input', bodies.validateInput);
    }
    if (action === 'rematchVote') {
      await f.request('put', '/games/1/grid', { cells: [{cellId:120,owner:1},{cellId:121,owner:1},{cellId:136,owner:1},{cellId:137,owner:1}] });
    }
    let body = bodies[action];
    if (action === 'editProfile') {
      body = new FormData(); body.set('username', 'Anastasia'); body.set('language', 'el');
    }
    const resolved = path.replace('{gameId}', gameId).replace('{playerId}', '1').replace('{cellId}', '18').replace('{challengeId}', '1') + (action === 'getChallenge' ? '?playerId=1' : '');
    const status = ['createGame', 'initializeProfile'].includes(action) ? 201 : 200;
    const response = await f.request(method, resolved, body, status);
    assertResponse(method, path, status, response);
    assertNoSecrets(response);
  });
}

/** Verify supplied docs have a matching, unique, complete route inventory. */
test('26 operations exactly match the supplied OpenAPI', function inventory() {
  const expected = [];
  for (const [path, operations] of Object.entries(spec.paths)) for (const method of Object.keys(operations)) expected.push(`${method} ${path}`);
  const actual = [];
  for (const [method, path] of routeDefinitions) actual.push(`${method} ${path}`);
  assert.equal(actual.length, 26); assert.equal(new Set(actual).size, 26);
  assert.deepEqual(actual.sort(), expected.sort());
});

/** Check schema-based validation on every operation with a required body. */
test('all required request bodies reject missing fields', async function missingBodies(t) {
  const f = await fixture(t);
  for (const [method, path] of routeDefinitions) {
    if (!spec.paths[path][method].requestBody?.required) continue;
    const resolved = path.replace('{gameId}', '1').replace('{playerId}', '1').replace('{cellId}', '18');
    await f.request(method, resolved, undefined, 400);
  }
});

/** Confirm Swagger assets, wildcard CORS and preflights are served without credentials. */
test('Swagger UI and browser CORS work', async function browserIntegration(t) {
  const f = await fixture(t);
  const docs = await fetch(f.base + '/api-docs/');
  assert.equal(docs.status, 200); assert.match(await docs.text(), /swagger-ui/);
  const asset = await fetch(f.base + '/api-docs/swagger-ui-bundle.js'); assert.equal(asset.status, 200);
  const preflight = await fetch(f.base + '/games', {method:'OPTIONS',headers:{Origin:'http://localhost:5173','Access-Control-Request-Method':'POST'}});
  assert.equal(preflight.status, 204); assert.equal(preflight.headers.get('access-control-allow-origin'), '*');
  const response = await fetch(f.base + '/games', {headers:{Origin:'http://localhost:5173'}});
  assert.equal(response.headers.get('access-control-allow-origin'), '*');
});
