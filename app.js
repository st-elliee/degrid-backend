import express from 'express';
import cors from 'cors';
import swaggerUi from 'swagger-ui-express';
import { spec } from './config/openapi.js';
import { createRoutes } from './routes/index.js';
import { errorHandler } from './middleware/errorHandler.js';
import { logger } from './middleware/logger.js';
import { ApiError } from './utils/errors.js';
import { GameService } from './services/gameService.js';

/** Construct an isolated application instance, without opening a port. */
export function createApp(options = {}) {
  const app = express();
  const service = options.service ?? new GameService({
    inactivitySeconds: Number(process.env.INACTIVITY_SECONDS ?? 300),
    turnSeconds: Number(process.env.TURN_SECONDS ?? 60),
  });
  app.locals.service = service;
  app.disable('x-powered-by');
  app.use(cors());
  if (options.logRequests ?? process.env.LOG_REQUESTS !== 'false') app.use(logger);
  app.use(express.json({ limit: '1mb' }));
  app.use('/api-docs', swaggerUi.serve, swaggerUi.setup(spec));
  app.use(createRoutes(service));
  /** Report missing API paths using the standard error envelope. */
  app.use(function notFound(req, res, next) { next(new ApiError(404, 'Route not found.', 'NOT_FOUND')); });
  app.use(errorHandler);
  return app;
}
