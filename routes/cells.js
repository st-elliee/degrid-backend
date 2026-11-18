export default [
  ['put', '/games/{gameId}/players/{playerId}/cells/{cellId}', 'selectCell'],
  ['post', '/games/{gameId}/players/{playerId}/inputcoordinates', 'inputCoordinates'],
  ['post', '/games/{gameId}/players/{playerId}/validate-input', 'validateInput'],
];
