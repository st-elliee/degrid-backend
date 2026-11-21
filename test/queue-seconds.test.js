import test from 'node:test';
import assert from 'node:assert/strict';
import { queueSeconds } from '../config/constants.js';

/** The queue wait time defaults to 360 seconds and follows QUEUE_SECONDS from the environment. */
test('queue wait time defaults to 360 seconds and follows QUEUE_SECONDS', function queueWaitTime() {
  const previous = process.env.QUEUE_SECONDS;
  try {
    delete process.env.QUEUE_SECONDS;
    assert.equal(queueSeconds(), 360);
    process.env.QUEUE_SECONDS = '10';
    assert.equal(queueSeconds(), 10);
    process.env.QUEUE_SECONDS = 'abc';
    assert.equal(queueSeconds(), 360);
  } finally {
    if (previous === undefined) delete process.env.QUEUE_SECONDS; else process.env.QUEUE_SECONDS = previous;
  }
});
