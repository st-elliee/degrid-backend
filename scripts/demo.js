import assert from 'node:assert/strict';

const base = process.env.BASE_URL ?? 'http://127.0.0.1:3000';

/** Call the running server and print a compact demonstration of the public result. */
async function request(method, path, body) {
  const response = await fetch(base + path, {
    method, headers: { 'Content-Type': 'application/json' },
    body: body === undefined ? undefined : JSON.stringify(body),
  });
  const json = await response.json();
  assert.ok(response.ok && json.success, JSON.stringify(json));
  console.log(`${method} ${path} -> ${response.status}`);
  return json.data;
}

const game = await request('POST', '/games', { players: [
  { username: 'Demo-A', language: 'el' }, { username: 'Demo-B', language: 'el' },
  { username: 'Demo-C', language: 'el' }, { username: 'Demo-D', language: 'el' },
] });
const gameId = game.gameId;
const playerId = game.players[0].playerId;
const selection = await request('POST', `/games/${gameId}/players/${playerId}/validate-input`, { row: 2, column: 2 });
const challenge = await request('GET', `/games/${gameId}/challenges/${selection.challengeId}?playerId=${playerId}`);
console.log('Public challenge:', JSON.stringify(challenge));
// These are known answers to the bundled demonstration questions, not returned by the API.
const demoAnswers = {
  'What is 2 + 2?': '4',
  'Which HTTP method retrieves a resource?': 'GET',
  'How many cells are in a 16 by 16 grid?': '256',
  'What is the binary representation of decimal 2?': '10',
};
const result = await request('POST', `/games/${gameId}/players/${playerId}/challenge-answer`, {
  challengeId: challenge.challengeId, answer: demoAnswers[challenge.question],
});
assert.equal(result.cellAcquired, true);
assert.equal(result.cell.owner, playerId);
const leaderboard = await request('GET', `/games/${gameId}/players`);
const turn = await request('GET', `/games/${gameId}/turn`);
assert.equal(leaderboard[0].cells, 2);
assert.equal(turn.currentPlayerId, game.players[1].playerId);
console.log(JSON.stringify({ acquiredCell: result.cell, leaderboard, turn }, null, 2));
console.log('Demo passed: acquisition, leaderboard and next turn agree.');
