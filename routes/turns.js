export default [
  ['get', '/games/{gameId}/turn', 'getTurn'],
  ['post', '/games/{gameId}/turn-order', 'setTurnOrder'],
  ['put', '/games/{gameId}/turn-order', 'updateTurnOrder'],
];
