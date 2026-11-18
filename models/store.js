import { Player } from './Player.js';
import { Game } from './Game.js';

/** Seed independent in-memory data for each server start or test application. */
export function createStore(now) {
  const players = new Map();
  for (let id = 1; id <= 48; id++) players.set(id, Player(id, now));
  const game = Game(1, [1, 2, 3, 4], now);
  for (const id of game.playerIds) game.profiles.add(id);
  return { players, games: new Map([[1, game]]), queue: [5, 6], queueStartedAt: now,
    queueNotice: false, nextGameId: 2, nextPlayerId: 49, nextChallengeId: 1 };
}
