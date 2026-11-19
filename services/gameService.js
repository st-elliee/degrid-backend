import { GRID_SIZE, MIN_PLAYERS, MAX_PLAYERS, QUEUE_SECONDS, CENTRE_CELLS } from '../config/constants.js';
import { Game } from '../models/Game.js';
import { Grid } from '../models/Grid.js';
import { Player } from '../models/Player.js';
import { Challenge } from '../models/Challenge.js';
import { createStore } from '../models/store.js';
import { ensure } from '../utils/errors.js';

/** Own all mutable state and game rules; controllers expose only projections. */
export class GameService {
  /** Inject a clock for real timeout tests without sleeping. */
  constructor({ now = Date.now, inactivitySeconds = 300, turnSeconds = 60 } = {}) {
    ensure(Number.isFinite(inactivitySeconds) && inactivitySeconds > 0, 'Invalid inactivity timeout.');
    ensure(Number.isFinite(turnSeconds) && turnSeconds > 0, 'Invalid turn timeout.');
    this.now = now;
    this.inactivitySeconds = inactivitySeconds;
    this.turnSeconds = turnSeconds;
    this.state = createStore(now());
    this.seedTerritories(this.state.games.get(1));
  }

  /** Assign separate boundary cells and stable integer colours to game members. */
  seedTerritories(game) {
    const boundary = [];
    for (const cell of game.grid.cells) {
      if (cell.row === 1 || cell.row === 16 || cell.column === 1 || cell.column === 16) boundary.push(cell);
    }
    for (let i = 0; i < game.playerIds.length; i++) {
      const id = game.playerIds[i];
      game.colours.set(id, ((id * 2654435761) >>> 0) % 0xffffff + 1);
      const cell = boundary[Math.floor(i * boundary.length / game.playerIds.length)];
      cell.owner = id;
      cell.cellColour = game.colours.get(id);
    }
  }

  /** Resolve a game or return a documented missing-resource error. */
  game(id, status = 404) {
    const game = this.state.games.get(id);
    ensure(game, 'Game not found.', status, 'NOT_FOUND');
    return game;
  }

  /** Resolve a known player, optionally scoped to a game's current members. */
  player(id, game, status = 404) {
    const player = this.state.players.get(id);
    ensure(player && (!game || game.playerIds.includes(id)), 'Player not found.', status, 'NOT_FOUND');
    return player;
  }

  /** Find a player's active game without trusting fields sent by the client. */
  activeGame(id) {
    for (const game of this.state.games.values()) {
      if (game.status !== 'finished' && game.playerIds.includes(id)) return game;
    }
    return null;
  }

  /** Project public player fields and calculate owned-cell counts from the grid. */
  playerView(player, game = this.activeGame(player.playerId)) {
    let cells = 0;
    for (const cell of game?.grid.cells ?? []) if (cell.owner === player.playerId) cells++;
    return { playerId: player.playerId, username: player.username, language: player.language,
      avatar: player.avatar, cells, isConnected: player.isConnected,
      inGame: Boolean(this.activeGame(player.playerId)) };
  }

  /** Project game metadata without private challenge answers or timer state. */
  gameView(game) {
    const players = [];
    for (const id of game.playerIds) players.push(this.playerView(this.player(id), game));
    return { gameId: game.gameId, maxPlayers: game.maxPlayers, language: game.language, status: game.status, players };
  }

  /** Make a detached response copy to avoid accidental mutation through tests/consumers. */
  gridView(game) { return structuredClone(game.grid); }

  /** Return the exact Turn schema; zero denotes no player in a finished empty game. */
  turnView(game) {
    return { currentPlayerId: game.turnOrder[game.turnIndex] ?? 0,
      turnNumber: game.turnNumber, turnOrder: [...game.turnOrder] };
  }

  /** Resolve a fixed cell ID inside the game's grid. */
  cell(game, id) {
    const cell = game.grid.cells[id - 1];
    ensure(cell, 'Cell not found.', 404, 'NOT_FOUND');
    return cell;
  }

  /** Translate 1-based coordinates, validating bounds before lookup. */
  coordinateCell(game, body) {
    ensure(Number.isInteger(body.row) && body.row >= 1 && body.row <= GRID_SIZE &&
      Number.isInteger(body.column) && body.column >= 1 && body.column <= GRID_SIZE,
    'Coordinates must be integers between 1 and 16.');
    return this.cell(game, (body.row - 1) * GRID_SIZE + body.column);
  }

  /** Track player activity only on a request identifying that player. */
  touch(player) { player.lastSeen = this.now(); }

  /** Enforce turn ownership before selection, answer or trade evaluation. */
  requireTurn(game, player, status = 400) {
    ensure(game.status === 'in_progress', 'The game is not in progress.', status, 'GAME_STATE');
    ensure(player.isConnected, 'Player is disconnected.', status, 'GAME_STATE');
    ensure(game.turnOrder[game.turnIndex] === player.playerId, 'It is another player\'s turn.', status, 'TURN_CONFLICT');
    this.touch(player);
  }

  /** Advance one turn and start a new selection deadline. */
  advance(game) {
    game.pendingChallengeId = null;
    game.turnNumber++;
    game.turnIndex = game.turnOrder.length ? (game.turnIndex + 1) % game.turnOrder.length : 0;
    game.turnStartedAt = this.now();
  }

  /** Finish a game when one player controls all four central cells. */
  checkWinner(game) {
    const owner = this.cell(game, CENTRE_CELLS[0]).owner;
    let won = owner !== null;
    for (const id of CENTRE_CELLS) if (this.cell(game, id).owner !== owner) won = false;
    if (won) this.finish(game);
  }

  /** Freeze further moves and cancel an unresolved attempt when a game ends. */
  finish(game) {
    game.status = 'finished';
    const pending = game.challenges.get(game.pendingChallengeId);
    if (pending?.status === 'pending') pending.status = 'cancelled';
    game.pendingChallengeId = null;
  }

  /** Remove membership, clean ownership and retain the correct next player. */
  removePlayer(game, playerId) {
    const current = game.turnOrder[game.turnIndex];
    const index = game.turnOrder.indexOf(playerId);
    game.playerIds = game.playerIds.filter(/** Exclude the departing member. */ function keep(id) { return id !== playerId; });
    game.turnOrder = game.turnOrder.filter(/** Exclude the departing turn entry. */ function keep(id) { return id !== playerId; });
    for (const cell of game.grid.cells) if (cell.owner === playerId) { cell.owner = null; cell.cellColour = 0; }
    for (const challenge of game.challenges.values()) if (challenge.playerId === playerId && challenge.status === 'pending') challenge.status = 'cancelled';
    game.profiles.delete(playerId); game.votes.delete(playerId); game.popups.delete(playerId);
    if (current === playerId) {
      game.pendingChallengeId = null;
      game.turnIndex = game.turnOrder.length ? index % game.turnOrder.length : 0;
      game.turnNumber++; game.turnStartedAt = this.now();
    } else game.turnIndex = Math.max(0, game.turnOrder.indexOf(current));
    if (game.playerIds.length < 2) this.finish(game);
  }

  /** Run queue matching and clock-based transitions, including automatic inactivity removal. */
  tick() {
    const now = this.now();
    for (const game of this.state.games.values()) {
      if (game.status !== 'in_progress') continue;
      for (const id of [...game.playerIds]) {
        const player = this.player(id);
        if (now - player.lastSeen >= this.inactivitySeconds * 1000) {
          player.isConnected = false; this.removePlayer(game, id);
        }
      }
      if (game.status !== 'in_progress') continue;
      const pending = game.challenges.get(game.pendingChallengeId);
      if (pending && now >= pending.expiresAt) { pending.status = 'expired'; this.advance(game); }
      else if (!pending && now - game.turnStartedAt >= this.turnSeconds * 1000) this.advance(game);
    }
    this.matchQueue();
    if (this.state.queue.length > 0 && now - this.state.queueStartedAt >= QUEUE_SECONDS * 1000) {
      this.state.queueNotice = true; this.state.queueStartedAt = now;
    }
  }

  /** Match whole batches of up to 36 players, retaining a remainder below four. */
  matchQueue() {
    while (this.state.queue.length >= MIN_PLAYERS) {
      const ids = this.state.queue.splice(0, MAX_PLAYERS);
      const game = Game(this.state.nextGameId++, ids, this.now());
      this.seedTerritories(game);
      for (const id of ids) { this.touch(this.player(id)); game.profiles.add(id); }
      this.state.games.set(game.gameId, game);
      this.state.queueStartedAt = this.now(); this.state.queueNotice = false;
    }
  }

  /** List games with public projections. */
  listGames() {
    const games = [];
    for (const game of this.state.games.values()) games.push(this.gameView(game));
    return { data: games };
  }

  /** Validate all creation input before committing players and game state atomically. */
  createGame({ body }) {
    const maxPlayers = body.maxPlayers ?? MAX_PLAYERS;
    ensure(maxPlayers >= MIN_PLAYERS && maxPlayers <= MAX_PLAYERS, 'maxPlayers must be 4..36.');
    ensure(body.players.length >= MIN_PLAYERS && body.players.length <= maxPlayers, 'A game requires 4..maxPlayers players.');
    ensure(body.language === undefined || body.language.trim().length > 0, 'language cannot be empty.');
    const players = []; const seen = new Set();
    let nextId = this.state.nextPlayerId;
    for (const input of body.players) {
      const id = input.playerId ?? nextId++;
      ensure(Number.isSafeInteger(id) && id > 0 && !seen.has(id), 'Player IDs must be positive and unique.');
      ensure(!this.activeGame(id), 'Player is already in an active game.');
      const existing = this.state.players.get(id);
      ensure(!existing || existing.isConnected, 'Player is disconnected.');
      this.validateProfile(input);
      players.push(existing ?? Player(id, this.now(), input)); seen.add(id);
      nextId = Math.max(nextId, id + 1);
    }
    const ids = [...seen];
    const game = Game(this.state.nextGameId, ids, this.now(), body.language ?? 'en', maxPlayers);
    this.seedTerritories(game);
    for (const player of players) { player.exit = false; this.touch(player); this.state.players.set(player.playerId, player); }
    this.state.queue = this.state.queue.filter(/** Remove players explicitly assigned to the new game. */ function notSelected(id) { return !seen.has(id); });
    this.state.games.set(game.gameId, game);
    this.state.nextGameId++; this.state.nextPlayerId = nextId;
    return { data: this.gameView(game), status: 201 };
  }

  /** Return queue membership and countdown without exposing private timestamps. */
  queueView() {
    const players = [];
    for (const id of this.state.queue) players.push(this.playerView(this.player(id)));
    return { count: players.length, minPlayers: MIN_PLAYERS, maxPlayers: MAX_PLAYERS,
      remainingTime: Math.max(0, QUEUE_SECONDS - Math.floor((this.now() - this.state.queueStartedAt) / 1000)), players };
  }

  /** Provide queue feedback for the under-minimum timeout scenario. */
  getQueue() {
    return { data: this.queueView(), message: this.state.queueNotice ? 'Not enough players yet. Please wait longer.' : 'Queue retrieved.' };
  }

  /** Add a connected, idle player once and immediately evaluate matchmaking. */
  joinQueue({ body }) {
    const player = this.player(body.playerId, undefined, 400);
    ensure(player.isConnected, 'Player is disconnected.');
    ensure(!this.activeGame(player.playerId) && !this.state.queue.includes(player.playerId), 'Player is already in a game or queue.', 409, 'CONFLICT');
    if (!this.state.queue.length) { this.state.queueStartedAt = this.now(); this.state.queueNotice = false; }
    this.touch(player); player.exit = false; this.state.queue.push(player.playerId);
    this.matchQueue();
    return { data: this.queueView(), message: this.activeGame(player.playerId) ? 'Game created from queue.' : 'Player added to queue.' };
  }

  /** Return a leaderboard ordered by owned cells, then player ID. */
  listPlayers({ params }) {
    const game = this.game(params.gameId);
    const players = this.gameView(game).players;
    players.sort(/** Order ties deterministically. */ function rank(a, b) { return b.cells - a.cells || a.playerId - b.playerId; });
    return { data: players };
  }

  /** Read a player's profile and refresh that player's heartbeat. */
  getPlayer({ params }) {
    const game = this.game(params.gameId); const player = this.player(params.playerId, game);
    this.touch(player); return { data: this.playerView(player, game) };
  }

  /** Initialize an existing game member's profile exactly once. */
  initializeProfile({ params, body }) {
    const game = this.game(params.gameId); const player = this.player(body.playerId, game, 400);
    ensure(!game.profiles.has(player.playerId), 'Profile already exists.', 409, 'CONFLICT');
    game.profiles.add(player.playerId); this.touch(player);
    return { data: this.playerView(player, game), status: 201 };
  }

  /** Validate editable strings and supplied avatar URLs without trusting derived fields. */
  validateProfile(body) {
    for (const key of ['username', 'language']) {
      if (body[key] !== undefined) ensure(body[key].trim().length > 0 && body[key].length <= 100, `${key} must contain 1..100 characters.`);
    }
    if (body.avatar !== undefined) {
      let url;
      try { url = new URL(body.avatar); } catch { ensure(false, 'avatar must be a URL.'); }
      ensure(['http:', 'https:'].includes(url.protocol), 'avatar must use HTTP or HTTPS.');
    }
  }

  /** Update multipart profile text and hold a small image as a data URL in memory. */
  editProfile({ params, body, file }) {
    const game = this.game(params.gameId); const player = this.player(params.playerId, game);
    this.validateProfile({ username: body.username, language: body.language });
    let avatar = player.avatar;
    if (file) {
      const bytes = file.buffer;
      const png = bytes.subarray(0, 8).equals(Buffer.from([137, 80, 78, 71, 13, 10, 26, 10]));
      const jpg = bytes[0] === 255 && bytes[1] === 216 && bytes[2] === 255;
      const gif = ['GIF87a', 'GIF89a'].includes(bytes.subarray(0, 6).toString());
      const webp = bytes.subarray(0, 4).toString() === 'RIFF' && bytes.subarray(8, 12).toString() === 'WEBP';
      const mime = png ? 'image/png' : jpg ? 'image/jpeg' : gif ? 'image/gif' : webp ? 'image/webp' : null;
      ensure(mime, 'Avatar must be PNG, JPEG, GIF or WebP.');
      avatar = `data:${mime};base64,${bytes.toString('base64')}`;
    }
    player.username = body.username; player.language = body.language; player.avatar = avatar;
    game.profiles.add(player.playerId); this.touch(player);
    return { data: this.playerView(player, game) };
  }

  /** Remove a player explicitly; optional flags update connectivity before removal. */
  deletePlayer({ params, query }) {
    const game = this.game(params.gameId); const player = this.player(params.playerId, game);
    if (query.isConnected !== undefined) player.isConnected = query.isConnected;
    this.removePlayer(game, player.playerId);
    return { data: null, message: 'Player removed.' };
  }

  /** Record and immediately process an exit request, including queue cleanup. */
  exitPlayer({ params, body }) {
    const player = this.player(params.playerId); player.exit = body.exit;
    if (body.exit) {
      for (const game of this.state.games.values()) if (game.playerIds.includes(player.playerId)) this.removePlayer(game, player.playerId);
      this.state.queue = this.state.queue.filter(/** Keep everyone except the exiting player. */ function keep(id) { return id !== player.playerId; });
    }
    this.touch(player); return { data: this.playerView(player) };
  }

  /** Concede regardless of optional inGame flag, then release owned cells. */
  forfeit({ params }) {
    const game = this.game(params.gameId); const player = this.player(params.playerId, game);
    this.removePlayer(game, player.playerId); this.touch(player);
    return { data: this.playerView(player), message: 'Player forfeited.' };
  }

  /** Record finished-game votes; restart after unanimous eligible votes with at least four players. */
  rematchVote({ params, body }) {
    const game = this.game(params.gameId); const player = this.player(params.playerId, game);
    ensure(game.status === 'finished', 'Rematch votes are accepted only after the game finishes.');
    for (const id of game.playerIds) ensure(!this.activeGame(id), 'A participant has already joined another game.');
    game.votes.set(player.playerId, body.rematchVote); this.touch(player);
    let unanimous = game.playerIds.length >= MIN_PLAYERS;
    for (const id of game.playerIds) if (!game.votes.get(id) || !this.player(id).isConnected) unanimous = false;
    if (unanimous) {
      game.grid = Grid(game.gameId); game.status = 'in_progress'; game.votes.clear(); game.challenges.clear();
      game.pendingChallengeId = null; game.turnIndex = 0; game.turnNumber = 1; game.turnStartedAt = this.now();
      this.seedTerritories(game);
      const members = new Set(game.playerIds);
      this.state.queue = this.state.queue.filter(/** Avoid queue and game membership at once. */ function keep(id) { return !members.has(id); });
      for (const id of game.playerIds) this.touch(this.player(id));
    }
    return { data: null, message: unanimous ? 'Rematch started.' : 'Rematch vote recorded.' };
  }

  /** Store the latest popup text and return it for the calling frontend to display. */
  popup({ params, body }) {
    const game = this.game(params.gameId); const player = this.player(params.playerId, game);
    const message = body.message ?? 'Game update.';
    ensure(message.length <= 1000, 'Popup message is too long.');
    game.popups.set(player.playerId, message); this.touch(player);
    return { data: null, message };
  }

  /** Retrieve all 256 cells. */
  getGrid({ params }) { return { data: this.gridView(this.game(params.gameId)) }; }

  /** Validate a partial cell update and return a new cell without mutating the grid. */
  prepareCell(game, current, body) {
    ensure(body.cellId === undefined || body.cellId === current.cellId, 'cellId cannot be changed.');
    ensure(body.row === undefined || body.row === current.row, 'row cannot be changed.');
    ensure(body.column === undefined || body.column === current.column, 'column cannot be changed.');
    const owner = body.owner === undefined ? current.owner : body.owner;
    ensure(owner === null || game.playerIds.includes(owner), 'Owner must belong to this game.');
    if (body.cellColour !== undefined) ensure(body.cellColour >= 0 && body.cellColour <= 0xffffff, 'cellColour must be 0..16777215.');
    return { ...current, owner, cellColour: body.cellColour ?? (owner === null ? 0 : game.colours.get(owner)) };
  }

  /** Apply optional grid patches atomically while preserving 256 fixed coordinates. */
  editGrid({ params, body }) {
    const game = this.game(params.gameId);
    ensure(body.gameId === undefined || body.gameId === game.gameId, 'gameId cannot be changed.');
    ensure(body.size === undefined || body.size === GRID_SIZE, 'Grid size must be 16.');
    const updates = new Map();
    for (const patch of body.cells ?? []) {
      ensure(Number.isSafeInteger(patch.cellId) && !updates.has(patch.cellId), 'Each cell patch needs a unique cellId.');
      updates.set(patch.cellId, this.prepareCell(game, this.cell(game, patch.cellId), patch));
    }
    for (const [id, cell] of updates) game.grid.cells[id - 1] = cell;
    this.checkWinner(game); return { data: this.gridView(game) };
  }

  /** Reconcile cell colours and winner status at the end of a round. */
  updateGrid({ params }) {
    const game = this.game(params.gameId);
    for (const cell of game.grid.cells) cell.cellColour = cell.owner === null ? 0 : game.colours.get(cell.owner);
    this.checkWinner(game); return { data: this.gridView(game) };
  }

  /** Apply a validated system update to one cell and recalculate victory. */
  editCell({ params, body }) {
    const game = this.game(params.gameId);
    const cell = this.prepareCell(game, this.cell(game, params.cellId), body);
    game.grid.cells[cell.cellId - 1] = cell; this.checkWinner(game);
    return { data: { ...cell } };
  }

  /** Set a cell's integer display colour as defined by the explicit endpoint. */
  colourCell({ params, body }) {
    const game = this.game(params.gameId); const cell = this.cell(game, params.cellId);
    ensure(body.cellColour >= 0 && body.cellColour <= 0xffffff, 'cellColour must be 0..16777215.');
    cell.cellColour = body.cellColour;
    if (cell.owner !== null) {
      game.colours.set(cell.owner, body.cellColour);
      for (const owned of game.grid.cells) if (owned.owner === cell.owner) owned.cellColour = body.cellColour;
    }
    return { data: { ...cell } };
  }

  /** Bind one unique challenge to a free cell; repeated selection cannot reset time. */
  requestCell(game, player, cell, status) {
    this.requireTurn(game, player, status);
    ensure(cell.owner === null, 'Cell is not available.', status, 'CELL_UNAVAILABLE');
    const pending = game.challenges.get(game.pendingChallengeId);
    if (pending) {
      ensure(pending.cellId === cell.cellId && pending.playerId === player.playerId, 'Complete the pending challenge first.', status, 'PENDING_CHALLENGE');
      return pending;
    }
    const challenge = Challenge(this.state.nextChallengeId++, player.playerId, cell.cellId, this.now());
    game.challenges.set(challenge.challengeId, challenge); game.pendingChallengeId = challenge.challengeId;
    return challenge;
  }

  /** Select a cell by ID and return its challenge ID. */
  selectCell({ params }) {
    const game = this.game(params.gameId); const player = this.player(params.playerId, game); const cell = this.cell(game, params.cellId);
    const challenge = this.requestCell(game, player, cell, 409);
    return { data: { cell: { ...cell }, challengeId: challenge.challengeId } };
  }

  /** Validate coordinates and start the same challenge flow used by cell selection. */
  validateInput({ params, body }) {
    const game = this.game(params.gameId); const player = this.player(params.playerId, game); const cell = this.coordinateCell(game, body);
    const challenge = this.requestCell(game, player, cell, 400);
    return { data: { isValid: true, message: 'Coordinates approved.', cellId: cell.cellId, challengeId: challenge.challengeId } };
  }

  /** Evaluate a potential trade target; no exchange is authorized by this contract alone. */
  inputCoordinates({ params, body }) {
    const game = this.game(params.gameId); const player = this.player(params.playerId, game); const cell = this.coordinateCell(game, body);
    this.requireTurn(game, player);
    ensure(!game.pendingChallengeId, 'Complete the pending challenge first.');
    ensure(cell.owner !== null && cell.owner !== player.playerId, 'Trade target must belong to another player.');
    return { data: { ...cell }, message: 'Trade target evaluated. Ownership is unchanged; no agreed exchange is specified.' };
  }

  /** Return only public question fields for this exact player's game-bound attempt. */
  getChallenge({ params, query }) {
    const game = this.game(params.gameId); const player = this.player(query.playerId, game);
    const challenge = game.challenges.get(params.challengeId);
    ensure(challenge && challenge.playerId === player.playerId && challenge.status === 'pending', 'Challenge not found.', 404, 'NOT_FOUND');
    this.touch(player);
    return { data: { challengeId: challenge.challengeId, question: challenge.question,
      options: [...challenge.options], timeLimit: challenge.timeLimit } };
  }

  /** Evaluate one answer, reject replays, acquire on success and advance exactly once. */
  answerChallenge({ params, body }) {
    const game = this.game(params.gameId); const player = this.player(params.playerId, game);
    const challenge = game.challenges.get(body.challengeId);
    ensure(challenge && challenge.playerId === player.playerId, 'Challenge not found.', 404, 'NOT_FOUND');
    if (challenge.status === 'expired') {
      challenge.status = 'reported';
      return { data: { correct: false, cellAcquired: false, cell: { ...this.cell(game, challenge.cellId) } }, message: 'Challenge timed out.' };
    }
    ensure(challenge.status === 'pending' && game.pendingChallengeId === challenge.challengeId, 'Challenge has already ended.');
    this.requireTurn(game, player);
    const cell = this.cell(game, challenge.cellId);
    const correct = body.answer.trim() === challenge.correctAnswer;
    const cellAcquired = correct && cell.owner === null;
    if (cellAcquired) { cell.owner = player.playerId; cell.cellColour = game.colours.get(player.playerId); }
    challenge.status = 'answered'; this.advance(game); this.checkWinner(game);
    return { data: { correct, cellAcquired, cell: { ...cell } },
      message: cellAcquired ? 'Challenge passed; cell acquired.' : 'Cell not acquired. Wait for your next turn.' };
  }

  /** Read the current turn and its order. */
  getTurn({ params }) { return { data: this.turnView(this.game(params.gameId)) }; }

  /** Initialize a deterministic turn order without cancelling an active challenge. */
  setTurnOrder({ params }) {
    const game = this.game(params.gameId, 400);
    return this.updateTurnOrder({ params, body: { turnOrder: [...game.playerIds] } });
  }

  /** Apply a permutation of all members, preserving whose turn is in progress. */
  updateTurnOrder({ params, body }) {
    const game = this.game(params.gameId, 400);
    ensure(game.status === 'in_progress', 'Game is not in progress.');
    const order = body.turnOrder;
    ensure(order.length === game.playerIds.length && new Set(order).size === order.length, 'Turn order must contain every player exactly once.');
    for (const id of order) ensure(game.playerIds.includes(id), 'Turn order contains a non-member.');
    const current = game.turnOrder[game.turnIndex];
    game.turnOrder = [...order]; game.turnIndex = Math.max(0, order.indexOf(current));
    return { data: this.turnView(game) };
  }
}
