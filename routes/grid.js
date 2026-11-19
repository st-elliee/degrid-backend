export default [
  ['get', '/games/{gameId}/grid', 'getGrid'],
  ['put', '/games/{gameId}/grid', 'editGrid'],
  ['put', '/games/{gameId}/grid/update', 'updateGrid'],
  ['put', '/games/{gameId}/grid/cells/{cellId}', 'editCell'],
  ['put', '/games/{gameId}/grid/cells/{cellId}/colour', 'colourCell'],
];
