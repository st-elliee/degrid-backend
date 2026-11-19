/** Log method, path, status and duration; never log bodies or challenge answers. */
export function logger(req, res, next) {
  const start = Date.now();
  /** Write one request summary after the response finishes. */
  function completed() {
    console.log(`${req.method} ${req.path} ${res.statusCode} ${Date.now() - start}ms`);
  }
  res.once('finish', completed);
  next();
}
