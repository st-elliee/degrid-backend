import test from 'node:test';
import assert from 'node:assert/strict';
import { fixture, assertResponse } from './helpers.js';

/** Validate error status/envelope without disclosing the internal error stack. */
test('malformed JSON, primitive bodies, wrong types and bad IDs return JSON errors', async function badInputs(t) {
  const f=await fixture(t);
  const malformed=await f.request('post','/games','{"players":',400,true);
  assert.equal(malformed.error,'INVALID_JSON'); assertResponse('post','/games',400,malformed);
  await f.request('post','/queue/players',{playerId:'7'},400);
  await f.request('put','/players/1/exit',{exit:'true'},400);
  await f.request('post','/games',[],400);
  await f.request('post','/games',{players:null},400);
  await f.request('get','/games/1.5/grid',undefined,400);
  await f.request('get','/games/999/grid',undefined,404);
  await f.request('get','/games/-1/grid',undefined,400);
  await f.request('get','/games/9007199254740993/grid',undefined,400);
  await f.request('delete','/games/1/players/1?isConnected=maybe',undefined,400);
  await f.request('get','/games/1/challenges/1?playerId=1&playerId=2',undefined,400);
  await f.request('get','/unknown',undefined,404);
  const conflict=await f.request('post','/queue/players',{playerId:5},409);
  assertResponse('post','/queue/players',409,conflict);
});

/** Validate coordinate bounds, optional JSON types and unknown resources. */
test('invalid coordinate/profile/grid values never mutate state', async function badValues(t) {
  const f=await fixture(t);
  for(const body of [{row:0,column:1},{row:17,column:1},{row:1,column:17},{row:1.2,column:2},{row:'2',column:2},{}]) {
    await f.request('post','/games/1/players/1/validate-input',body,400);
  }
  await f.request('put','/games/1/grid/cells/18',{owner:'1'},400);
  await f.request('put','/games/1/grid/cells/18/colour',{cellColour:-1},400);
  await f.request('put','/games/1/grid',{size:15},400);
  await f.request('put','/games/1/grid',{gameId:2},400);
  await f.request('put','/games/1/players/1/cells/257',undefined,404);
  await f.request('post','/games/1/players/1/popup',{message:2},400);
  await f.request('post','/games/1/profiles',{playerId:1},409);
  assert.equal((await f.request('get','/games/1/turn')).data.turnNumber,1);
  assert.equal(f.service.state.nextChallengeId,1);
});

/** Accept a real tiny PNG and keep its URL entirely in memory. */
test('multipart avatar upload round-trips and profile text stays editable', async function avatar(t) {
  const f=await fixture(t);
  const png=Buffer.from('iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAQAAAC1HAwCAAAAC0lEQVR42mP8/x8AAwMCAO+aWZcAAAAASUVORK5CYII=','base64');
  const body=new FormData(); body.set('username','Αναστασία'); body.set('language','el');
  body.set('avatar',new Blob([png],{type:'image/png'}),'avatar.png');
  const r=await f.request('put','/games/1/players/1/profile',body);
  assert.equal(r.data.username,'Αναστασία'); assert.equal(r.data.language,'el'); assert.match(r.data.avatar,/^data:image\/png;base64,/);
  assert.deepEqual((await f.request('get','/games/1/players/1')).data,r.data);
});

/** Reject unsafe or excessive uploads without partially editing a profile. */
test('invalid, oversized and unexpected avatar uploads are centralized 400 errors', async function badAvatar(t) {
  const f=await fixture(t);
  const before=(await f.request('get','/games/1/players/1')).data;
  for(const [field,bytes,name] of [['avatar','<svg></svg>','a.svg'],['avatar',new Uint8Array(1024*1024+1),'large.png'],['wrong','x','a.png']]) {
    const body=new FormData(); body.set('username','Changed'); body.set('language','el'); body.set(field,new Blob([bytes]),name);
    await f.request('put','/games/1/players/1/profile',body,400);
  }
  const missing=new FormData(); missing.set('username','Missing language');
  await f.request('put','/games/1/players/1/profile',missing,400);
  await f.request('put','/games/1/players/1/profile',{username:'JSON',language:'en'},400);
  assert.deepEqual((await f.request('get','/games/1/players/1')).data,before);
});

/** Prove a rejected async controller reaches centralized handling, with a safe response. */
test('unexpected async rejection becomes a safe 500 and server remains usable', async function unexpected(t) {
  const f=await fixture(t);
  const original=f.service.listGames;
  /** Deliberately fail after an await to exercise asynchronous propagation. */
  f.service.listGames=async function reject() { await Promise.resolve(); throw new Error('private-test-detail'); };
  const logged=[];
  /** Capture the server log without exposing it in the expected HTTP response. */
  t.mock.method(console,'error',function capture(...args){logged.push(args);});
  const response=await f.request('get','/games',undefined,500);
  assert.equal(response.error,'INTERNAL_ERROR'); assert.ok(!JSON.stringify(response).includes('private-test-detail'));
  assert.equal(logged.length,1); f.service.listGames=original;
  await f.request('get','/games');
});
