import { ApiError } from '../utils/errors.js';

/** Format domain, JSON, upload and unexpected failures in one place. */
export function errorHandler(error, req, res, next) {
  if (res.headersSent) return next(error);
  let status = 500;
  let code = 'INTERNAL_ERROR';
  let message = 'An unexpected server error occurred.';
  if (error instanceof ApiError) {
    ({ status, code, message } = error);
  } else if (error.type === 'entity.parse.failed') {
    status = 400; code = 'INVALID_JSON'; message = 'Request body must be valid JSON.';
  } else if (error.name === 'MulterError' || error.type === 'entity.too.large') {
    status = 400; code = 'INVALID_UPLOAD'; message = 'Upload or request exceeds the allowed limits.';
  } else if (error.status >= 400 && error.status < 500) {
    status = 400; code = 'INVALID_REQUEST'; message = 'The request could not be read.';
  } else {
    console.error('Unexpected request failure:', error);
  }
  return res.status(status).json({ success: false, data: null, error: code, message });
}
