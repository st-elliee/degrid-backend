import test from 'node:test';
import assert from 'node:assert/strict';
import { fixture, assertNoSecrets } from './helpers.js';

/** Prove the central story across selection, challenge, ownership, count and turn APIs. */
test('S3/S4: correct answer acquires cell, updates leaderboard and advances once', async function acquisition(t) {
  const f = await fixture(t);
  const selection = await f.request('post','/games/1/players/1/validate-input',{row:2,column:2});
  assert.equal(selection.data.cellId,18);
  const challenge = await f.request('get',`/games/1/challenges/${selection.data.challengeId}?playerId=1`);
  assert.deepEqual(Object.keys(challenge.data).sort(),['challengeId','options','question','timeLimit']);
  const result = await f.request('post','/games/1/players/1/challenge-answer',{challengeId:selection.data.challengeId,answer:'4'});
  assert.equal(result.data.cellAcquired,true); assert.equal(result.data.cell.owner,1);
  const leaderboard = await f.request('get','/games/1/players'); assert.equal(leaderboard.data[0].cells,2);
  const turn = await f.request('get','/games/1/turn'); assert.equal(turn.data.currentPlayerId,2); assert.equal(turn.data.turnNumber,2);
  await f.request('post','/games/1/players/1/challenge-answer',{challengeId:selection.data.challengeId,answer:'4'},400);
  const next = await f.request('get','/games/1/turn'); assert.deepEqual(next.data,turn.data);
  assertNoSecrets(await f.request('get','/games'));
});

/** A failed answer consumes a turn and cannot be retried to acquire the cell. */
test('S4: incorrect answer leaves ownership unchanged and consumes turn', async function wrongAnswer(t) {
  const f = await fixture(t);
  await f.request('put','/games/1/players/1/cells/18');
  const r=await f.request('post','/games/1/players/1/challenge-answer',{challengeId:1,answer:'wrong'});
  assert.equal(r.data.correct,false); assert.equal(r.data.cellAcquired,false); assert.equal(r.data.cell.owner,null);
  assert.equal((await f.request('get','/games/1/turn')).data.currentPlayerId,2);
  await f.request('post','/games/1/players/1/challenge-answer',{challengeId:1,answer:'4'},400);
});

/** Verify exact expiry, stable deadlines, no acquisition and no double turn advance. */
test('S4: deadline expires on server; repeated GET/selection cannot extend it', async function timeout(t) {
  const f=await fixture(t);
  await f.request('put','/games/1/players/1/cells/18');
  f.elapse(39);
  await f.request('get','/games/1/challenges/1?playerId=1');
  const same=await f.request('put','/games/1/players/1/cells/18'); assert.equal(same.data.challengeId,1);
  f.elapse(1);
  const r=await f.request('post','/games/1/players/1/challenge-answer',{challengeId:1,answer:'4'});
  assert.equal(r.data.cellAcquired,false); assert.match(r.message,/timed out/);
  const turn=(await f.request('get','/games/1/turn')).data; assert.equal(turn.turnNumber,2);
  await f.request('post','/games/1/players/1/challenge-answer',{challengeId:1,answer:'4'},400);
  assert.deepEqual((await f.request('get','/games/1/turn')).data,turn);
});

/** Require the current player and keep pending attempts isolated from other players/games. */
test('turn enforcement, pending selection and challenge isolation', async function isolation(t) {
  const f=await fixture(t);
  await f.request('put','/games/1/players/2/cells/18',undefined,409);
  await f.request('put','/games/1/players/1/cells/1',undefined,409);
  await f.request('put','/games/1/players/1/cells/18');
  await f.request('put','/games/1/players/1/cells/19',undefined,409);
  await f.request('get','/games/1/challenges/1?playerId=2',undefined,404);
  await f.request('post','/games/1/players/2/challenge-answer',{challengeId:1,answer:'4'},404);
  await f.request('post','/games',{players:[{playerId:9},{playerId:10},{playerId:11},{playerId:12}]},201);
  await f.request('get','/games/2/challenges/1?playerId=9',undefined,404);
  await f.request('get','/games/1/challenges/1',undefined,400);
});

/** Exercise automatic matchmaking from the supplied two-player seed queue. */
test('S1/S2: queue starts a game at four and rejects duplicate/active/disconnected players', async function matchmaking(t) {
  const f=await fixture(t);
  await f.request('post','/queue/players',{playerId:5},409);
  await f.request('post','/queue/players',{playerId:1},409);
  f.service.state.players.get(8).isConnected=false;
  await f.request('post','/queue/players',{playerId:8},400);
  f.service.state.players.get(8).isConnected=true;
  assert.equal((await f.request('post','/queue/players',{playerId:7})).data.count,3);
  assert.equal((await f.request('post','/queue/players',{playerId:8})).data.count,0);
  const games=(await f.request('get','/games')).data; assert.equal(games.length,2);
  assert.deepEqual(games[1].players.map(/** Read member IDs. */ function id(p){return p.playerId;}),[5,6,7,8]);
  assert.equal((await f.request('get','/games/2/grid')).data.cells.length,256);
});

/** Verify the maximum and overflow story at the service's batching boundary. */
test('S1: queue batches 36 and retains a three-player overflow', async function overflow(t) {
  const f=await fixture(t);
  f.service.state.queue=Array.from({length:39}, /** Generate known idle IDs. */ function id(_,i){return i+5;});
  f.service.matchQueue();
  const games=(await f.request('get','/games')).data;
  assert.equal(games[1].players.length,36);
  assert.deepEqual((await f.request('get','/queue/players')).data.players.map(/** Read remaining IDs. */ function id(p){return p.playerId;}),[41,42,43]);
});

/** Return an under-minimum message and restart the documented six-minute wait. */
test('S1: fewer than four receive wait feedback at 360 seconds', async function queueWait(t) {
  const f=await fixture(t,{inactivitySeconds:1000}); f.elapse(360);
  const r=await f.request('get','/queue/players'); assert.equal(r.data.count,2);
  assert.equal(r.data.remainingTime,360); assert.match(r.message,/wait longer/);
});

/** Check creation limits, unique IDs, global membership and atomic rejection. */
test('game creation validates limits and commits no partial state', async function creation(t) {
  const f=await fixture(t);
  await f.request('post','/games',{players:[{playerId:9}]},400);
  await f.request('post','/games',{maxPlayers:37,players:[{},{},{},{}]},400);
  await f.request('post','/games',{players:[{playerId:100},{playerId:101},{playerId:102},{playerId:1}]},400);
  assert.equal(f.service.state.players.has(100),false);
  await f.request('post','/games',{players:[{playerId:9},{playerId:9},{playerId:10},{playerId:11}]},400);
  const created=await f.request('post','/games',{players:[{username:'A'},{username:'B'},{username:'C'},{username:'D'}]},201);
  assert.equal(created.data.players.length,4); assert.equal(new Set(created.data.players.map(/** Read IDs. */ function id(p){return p.playerId;})).size,4);
});

/** Verify immutable coordinates, distinct cells and all-or-nothing grid changes. */
test('grid patches are atomic and preserve 256 unique cells', async function atomicGrid(t) {
  const f=await fixture(t);
  const before=(await f.request('get','/games/1/grid')).data;
  await f.request('put','/games/1/grid',{cells:[{cellId:18,owner:1},{cellId:19,owner:999}]},400);
  await f.request('put','/games/1/grid',{cells:[{cellId:18,owner:1},{cellId:18,owner:2}]},400);
  await f.request('put','/games/1/grid/cells/18',{row:4},400);
  assert.deepEqual((await f.request('get','/games/1/grid')).data,before);
  await f.request('put','/games/1/grid/cells/18',{owner:2});
  assert.equal((await f.request('get','/games/1/players/2')).data.cells,2);
  assert.equal(new Set(before.cells.map(/** Read cell IDs. */ function id(c){return c.cellId;})).size,256);
});

/** A target changed by a system update cannot be acquired from a stale challenge. */
test('challenge cannot overwrite a cell acquired meanwhile', async function staleCell(t) {
  const f=await fixture(t);
  await f.request('put','/games/1/players/1/cells/18');
  await f.request('put','/games/1/grid/cells/18',{owner:2});
  const r=await f.request('post','/games/1/players/1/challenge-answer',{challengeId:1,answer:'4'});
  assert.equal(r.data.cellAcquired,false); assert.equal(r.data.cell.owner,2);
});

/** Evaluate a trade without an unauthorized transfer or an invented acceptance endpoint. */
test('trade evaluation returns target and preserves both owners', async function trade(t) {
  const f=await fixture(t); const before=(await f.request('get','/games/1/grid')).data;
  const r=await f.request('post','/games/1/players/1/inputcoordinates',{row:1,column:16});
  assert.equal(r.data.owner,2); assert.match(r.message,/unchanged/);
  assert.deepEqual((await f.request('get','/games/1/grid')).data,before);
  await f.request('post','/games/1/players/1/inputcoordinates',{row:2,column:2},400);
});

/** Remove the current player, release cells and avoid skipping the next player. */
test('forfeit cleans pending challenge, ownership and turn', async function forfeit(t) {
  const f=await fixture(t); await f.request('put','/games/1/players/1/cells/18');
  const r=await f.request('put','/games/1/players/1/forfeit'); assert.equal(r.data.inGame,false); assert.equal(r.data.cells,0);
  const turn=(await f.request('get','/games/1/turn')).data; assert.deepEqual(turn.turnOrder,[2,3,4]); assert.equal(turn.currentPlayerId,2);
  assert.equal((await f.request('get','/games/1/grid')).data.cells[0].owner,null);
  await f.request('get','/games/1/challenges/1?playerId=1',undefined,404);
  await f.request('post','/queue/players',{playerId:1});
});

/** Exit cleans queue membership as well as game state and can be cancelled. */
test('exit and deletion keep membership consistent', async function exits(t) {
  const f=await fixture(t);
  await f.request('put','/players/5/exit',{exit:true}); assert.equal((await f.request('get','/queue/players')).data.count,1);
  await f.request('put','/players/1/exit',{exit:false}); assert.equal((await f.request('get','/games/1/players')).data.length,4);
  await f.request('delete','/games/1/players/3?isConnected=false&inGame=false');
  await f.request('post','/queue/players',{playerId:3},400);
  await f.request('put','/players/1/exit',{exit:true}); assert.equal((await f.request('get','/games/1/players')).data.length,2);
});

/** Polling player-specific state acts as a heartbeat; stale members are removed automatically. */
test('inactivity and selection deadlines advance without a challenge answer', async function inactivity(t) {
  const f=await fixture(t,{inactivitySeconds:100});
  f.elapse(60); assert.equal((await f.request('get','/games/1/turn')).data.currentPlayerId,2);
  for(const id of [2,3,4]) await f.request('get',`/games/1/players/${id}`);
  f.elapse(40);
  const players=(await f.request('get','/games/1/players')).data;
  assert.deepEqual(players.map(/** Read active IDs. */ function id(p){return p.playerId;}),[2,3,4]);
  assert.equal((await f.request('get','/games/1/turn')).data.currentPlayerId,2);
});

/** Require a complete permutation and prevent reordering from granting another turn. */
test('turn-order validates all members and preserves an active attempt', async function order(t) {
  const f=await fixture(t); await f.request('put','/games/1/players/1/cells/18');
  await f.request('put','/games/1/turn-order',{turnOrder:[1,1,2,3]},400);
  await f.request('put','/games/1/turn-order',{turnOrder:[1,2,3]},400);
  const r=await f.request('put','/games/1/turn-order',{turnOrder:[4,3,2,1]}); assert.equal(r.data.currentPlayerId,1);
  await f.request('post','/games/1/players/1/challenge-answer',{challengeId:1,answer:'4'});
  assert.equal((await f.request('get','/games/1/turn')).data.currentPlayerId,4);
});

/** Exercise winner detection and unanimous rematch reset using public system update routes. */
test('four centre cells finish game and unanimous rematch resets it', async function rematch(t) {
  const f=await fixture(t);
  await f.request('put','/games/1/players/1/rematch-vote',{rematchVote:true},400);
  await f.request('put','/games/1/grid',{cells:[{cellId:120,owner:1},{cellId:121,owner:1},{cellId:136,owner:1},{cellId:137,owner:1}]});
  assert.equal((await f.request('get','/games')).data[0].status,'finished');
  await f.request('put','/games/1/players/1/cells/18',undefined,409);
  for(const id of [1,2,3]) await f.request('put',`/games/1/players/${id}/rematch-vote`,{rematchVote:true});
  assert.equal((await f.request('get','/games')).data[0].status,'finished');
  const r=await f.request('put','/games/1/players/4/rematch-vote',{rematchVote:true}); assert.equal(r.message,'Rematch started.');
  assert.equal((await f.request('get','/games')).data[0].status,'in_progress');
  assert.equal((await f.request('get','/games/1/grid')).data.cells[119].owner,null);
  assert.equal((await f.request('get','/games/1/turn')).data.turnNumber,1);
});

/** Two simultaneous submissions may produce only one ownership/turn mutation. */
test('concurrent answer replay is applied only once', async function concurrent(t) {
  const f=await fixture(t); await f.request('put','/games/1/players/1/cells/18');
  const requests=[];
  for(let i=0;i<2;i++) requests.push(fetch(f.base+'/games/1/players/1/challenge-answer',{method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify({challengeId:1,answer:'4'})}));
  const results=await Promise.all(requests);
  assert.deepEqual(results.map(/** Read response statuses. */ function status(r){return r.status;}).sort(),[200,400]);
  assert.equal((await f.request('get','/games/1/turn')).data.turnNumber,2);
});

/** Starting a fresh app restores the seeds and does not share mutable state. */
test('fresh applications have isolated resettable memory', async function reset(t) {
  const first=await fixture(t); const second=await fixture(t);
  await first.request('put','/games/1/grid/cells/18',{owner:1});
  assert.equal((await second.request('get','/games/1/grid')).data.cells[17].owner,null);
});
