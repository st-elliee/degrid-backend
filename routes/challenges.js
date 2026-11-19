export default [
  ['get', '/games/{gameId}/challenges/{challengeId}', 'getChallenge'],
  ['post', '/games/{gameId}/players/{playerId}/challenge-answer', 'answerChallenge'],
];
