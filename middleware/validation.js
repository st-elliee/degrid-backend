import { spec } from '../config/openapi.js';
import { ensure } from '../utils/errors.js';
import { positiveId, validateSchema } from '../utils/validators.js';

/** Build validation directly from a method and the original OpenAPI path. */
export function validateOperation(method, path) {
  const operation = spec.paths[path][method];
  /** Validate and normalize an individual request before business logic runs. */
  return function validation(req, res, next) {
    const params = {};
    const query = {};
    for (const parameter of operation.parameters ?? []) {
      const source = parameter.in === 'path' ? req.params : req.query;
      const target = parameter.in === 'path' ? params : query;
      const value = source[parameter.name];
      if (value === undefined) {
        ensure(!parameter.required, `${parameter.name} is required.`);
        continue;
      }
      if (parameter.schema.type === 'integer') target[parameter.name] = positiveId(value, parameter.name);
      else if (parameter.schema.type === 'boolean') {
        ensure(value === 'true' || value === 'false', `${parameter.name} must be true or false.`);
        target[parameter.name] = value === 'true';
      }
    }
    const bodyDefinition = operation.requestBody;
    if (bodyDefinition) {
      ensure(!bodyDefinition.required || req.body !== undefined, 'Request body is required.');
      if (req.body !== undefined) {
        const [contentType, content] = Object.entries(bodyDefinition.content)[0];
        ensure(req.is(contentType), `Content-Type must be ${contentType}.`);
        validateSchema(req.body, content.schema);
      }
    }
    req.input = { params, query, body: req.body ?? {}, file: req.file };
    next();
  };
}
