export const GRID_SIZE = 16;
export const MIN_PLAYERS = 4;
export const MAX_PLAYERS = 36;
export const QUEUE_SECONDS = 360;
export const CHALLENGE_SECONDS = 40;
export const CENTRE_CELLS = [120, 121, 136, 137];

/** Read the queue wait time from QUEUE_SECONDS (.env), falling back to the default of 360 seconds. */
export function queueSeconds() {
  const configured = Number(process.env.QUEUE_SECONDS);
  return Number.isFinite(configured) && configured > 0 ? configured : QUEUE_SECONDS;
}
