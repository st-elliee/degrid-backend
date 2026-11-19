import { Router } from 'express';
import multer from 'multer';
import { validateOperation } from '../middleware/validation.js';
import { createController } from '../controllers/resourceController.js';
import games from './games.js';
import queue from './queue.js';
import players from './players.js';
import grid from './grid.js';
import cells from './cells.js';
import challenges from './challenges.js';
import turns from './turns.js';

export const routeDefinitions = [...games, ...queue, ...players, ...grid, ...cells, ...challenges, ...turns];
const upload = multer({ storage: multer.memoryStorage(), limits: { fileSize: 1024 * 1024, files: 1, fields: 3, parts: 4 } });

/** Mount every resource through one inventory matched exactly to OpenAPI. */
export function createRoutes(service) {
  const root = Router();
  /** Process elapsed timers even when the caller polls only read endpoints. */
  root.use(function synchronize(req, res, next) { service.tick(); next(); });
  for (const group of [games, queue, players, grid, cells, challenges, turns]) {
    const router = Router();
    for (const [method, path, action] of group) {
      const expressPath = path.replace(/\{(\w+)\}/g, ':$1');
      const middleware = [];
      if (action === 'editProfile') middleware.push(upload.single('avatar'));
      router[method](expressPath, ...middleware, validateOperation(method, path), createController(service, action));
    }
    root.use(router);
  }
  return root;
}
