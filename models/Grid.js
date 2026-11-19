import { GRID_SIZE } from '../config/constants.js';

/** Build the complete 1-based 16x16 grid as plain cell objects. */
export function Grid(gameId) {
  const cells = [];
  for (let row = 1; row <= GRID_SIZE; row++) {
    for (let column = 1; column <= GRID_SIZE; column++) {
      cells.push({ cellId: (row - 1) * GRID_SIZE + column, row, column, owner: null, cellColour: 0 });
    }
  }
  return { gameId, size: GRID_SIZE, cells };
}
