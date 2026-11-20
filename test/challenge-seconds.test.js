import test from 'node:test';
import assert from 'node:assert/strict';
import { Challenge, challengeSeconds } from '../models/Challenge.js';

/** The challenge time limit defaults to 40 seconds and follows CHALLENGE_SECONDS from the environment. */
test('challenge time limit defaults to 40 seconds and follows CHALLENGE_SECONDS', function challengeTimeLimit() {
  const previous = process.env.CHALLENGE_SECONDS;
  try {
    delete process.env.CHALLENGE_SECONDS;
    assert.equal(challengeSeconds(), 40);
    process.env.CHALLENGE_SECONDS = '7';
    const challenge = Challenge(1, 1, 1, 1000);
    assert.equal(challenge.timeLimit, 7);
    assert.equal(challenge.expiresAt, 8000);
    process.env.CHALLENGE_SECONDS = 'abc';
    assert.equal(challengeSeconds(), 40);
  } finally {
    if (previous === undefined) delete process.env.CHALLENGE_SECONDS; else process.env.CHALLENGE_SECONDS = previous;
  }
});
