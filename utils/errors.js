/** A deliberate API failure with a stable public code and HTTP status. */
export class ApiError extends Error {
  /** Create a safe error message for an expected input or state failure. */
  constructor(status, message, code = 'INVALID_INPUT') {
    super(message);
    this.status = status;
    this.code = code;
  }
}

/** Enforce an invariant before mutating any shared state. */
export function ensure(condition, message, status = 400, code = 'INVALID_INPUT') {
  if (!condition) throw new ApiError(status, message, code);
}
