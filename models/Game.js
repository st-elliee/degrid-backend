import { Grid } from './Grid.js';

/** Create game state, including private turn, challenge and vote metadata. */
export function Game(gameId, playerIds, now, language = 'en', maxPlayers = 36) {
  return {
    gameId, language, maxPlayers, status: 'in_progress', playerIds: [...playerIds],
    grid: Grid(gameId), turnOrder: [...playerIds], turnIndex: 0, turnNumber: 1,
    turnStartedAt: now, profiles: new Set(), challenges: new Map(),
    pendingChallengeId: null, votes: new Map(), colours: new Map(), popups: new Map(),
  };
}
