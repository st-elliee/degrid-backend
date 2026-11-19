import { success } from '../utils/responses.js';

/** Adapt a service action to Express 5's async error propagation. */
export function createController(service, action) {
  /** Await an action and serialize only its prepared public result. */
  return async function resourceController(req, res) {
    const result = await service[action](req.input);
    return success(res, result.data, result.message ?? 'Operation completed successfully.', result.status ?? 200);
  };
}
