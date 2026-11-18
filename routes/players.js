export default [
  ['get', '/games/{gameId}/players', 'listPlayers'],
  ['get', '/games/{gameId}/players/{playerId}', 'getPlayer'],
  ['delete', '/games/{gameId}/players/{playerId}', 'deletePlayer'],
  ['post', '/games/{gameId}/profiles', 'initializeProfile'],
  ['put', '/games/{gameId}/players/{playerId}/profile', 'editProfile'],
  ['put', '/players/{playerId}/exit', 'exitPlayer'],
  ['put', '/games/{gameId}/players/{playerId}/forfeit', 'forfeit'],
  ['put', '/games/{gameId}/players/{playerId}/rematch-vote', 'rematchVote'],
  ['post', '/games/{gameId}/players/{playerId}/popup', 'popup'],
];
