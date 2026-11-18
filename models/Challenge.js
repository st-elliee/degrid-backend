import { CHALLENGE_SECONDS } from '../config/constants.js';

export const challengeTemplates = [
  { question: 'What is 2 + 2?', options: ['3', '4', '5'], correctAnswer: '4' },
  { question: 'Which HTTP method retrieves a resource?', options: ['GET', 'POST', 'DELETE'], correctAnswer: 'GET' },
  { question: 'How many cells are in a 16 by 16 grid?', options: ['128', '256', '512'], correctAnswer: '256' },
  { question: 'What is the binary representation of decimal 2?', options: ['10', '11', '01'], correctAnswer: '10' },
];

/** Create a unique, player-bound attempt with a server-only correct answer. */
export function Challenge(challengeId, playerId, cellId, now) {
  const template = challengeTemplates[(challengeId - 1) % challengeTemplates.length];
  return { ...template, options: [...template.options], challengeId, playerId, cellId,
    timeLimit: CHALLENGE_SECONDS, startedAt: now, expiresAt: now + CHALLENGE_SECONDS * 1000,
    status: 'pending' };
}
