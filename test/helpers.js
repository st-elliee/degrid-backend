import assert from 'node:assert/strict';
import { once } from 'node:events';
import Ajv from 'ajv';
import { createApp } from '../app.js';
import { GameService } from '../services/gameService.js';
import { spec } from '../config/openapi.js';

const ajv = new Ajv({ strict: false, allErrors: true });
ajv.addFormat('binary', true);
ajv.addSchema(spec, 'degrid');

/** Start a real loopback HTTP server with a deterministic clock and isolated seed. */
export async function fixture(t, options = {}) {
  let time = 1_800_000_000_000;
  /** Supply the test-controlled wall clock to the game service. */
  function now() { return time; }
  const service = new GameService({ now, ...options });
  const app = createApp({ service, logRequests: false });
  const server = app.listen(0, '127.0.0.1');
  await once(server, 'listening');
  const base = `http://127.0.0.1:${server.address().port}`;
  /** Close sockets even when an assertion fails. */
  t.after(async function close() {
    server.closeAllConnections();
    server.close();
    await once(server, 'close');
  });
  /** Send an actual HTTP request and decode the expected response envelope. */
  async function request(method, path, body, expected = 200, raw = false) {
    const headers = {};
    let payload = body;
    if (body !== undefined && !(body instanceof FormData)) {
      headers['Content-Type'] = 'application/json';
      payload = raw ? body : JSON.stringify(body);
    }
    const response = await fetch(base + path, { method: method.toUpperCase(), headers, body: payload });
    const json = await response.json();
    assert.equal(response.status, expected, `${method} ${path}: ${JSON.stringify(json)}`);
    assert.deepEqual(Object.keys(json).sort(), ['data', 'error', 'message', 'success']);
    assert.equal(json.success, expected < 400);
    if (expected >= 400) {
      assert.equal(json.data, null); assert.equal(typeof json.error, 'string');
    } else assert.equal(json.error, null);
    return json;
  }
  /** Advance simulated time without waiting in real time. */
  function elapse(seconds) { time += seconds * 1000; }
  return { app, service, base, request, elapse };
}

/** Check an HTTP result against its untouched OpenAPI response schema. */
export function assertResponse(method, path, status, response) {
  const schema = spec.paths[path][method].responses[status].content['application/json'].schema;
  const root = { ...schema, components: spec.components };
  const validate = ajv.compile(root);
  assert.ok(validate(response), JSON.stringify(validate.errors));
}

/** Ensure public responses contain no internal fields at any depth. */
export function assertNoSecrets(value) {
  if (!value || typeof value !== 'object') return;
  for (const [key, child] of Object.entries(value)) {
    assert.ok(!['answer', 'correctAnswer', 'expiresAt', 'startedAt', 'lastSeen', 'pendingChallengeId', 'challenges'].includes(key), `Leaked ${key}`);
    assertNoSecrets(child);
  }
}
