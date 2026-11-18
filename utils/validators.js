import { ensure } from './errors.js';
import { spec } from '../config/openapi.js';

/** Validate the supplied OpenAPI subset recursively, keeping source docs unchanged. */
export function validateSchema(value, definition, label = 'body') {
  const schema = definition.$ref
    ? spec.components.schemas[definition.$ref.split('/').at(-1)] : definition;
  if (value === null && schema.nullable) return;
  if (schema.type === 'integer') ensure(Number.isSafeInteger(value), `${label} must be an integer.`);
  if (schema.type === 'boolean') ensure(typeof value === 'boolean', `${label} must be a boolean.`);
  if (schema.type === 'string') ensure(typeof value === 'string', `${label} must be a string.`);
  if (schema.enum) ensure(schema.enum.includes(value), `${label} has an unsupported value.`);
  if (schema.type === 'array') {
    ensure(Array.isArray(value), `${label} must be an array.`);
    for (let i = 0; i < value.length; i++) validateSchema(value[i], schema.items, `${label}[${i}]`);
  }
  if (schema.type === 'object') {
    ensure(value !== null && typeof value === 'object' && !Array.isArray(value), `${label} must be an object.`);
    for (const key of schema.required ?? []) ensure(value[key] !== undefined, `${label}.${key} is required.`);
    for (const [key, child] of Object.entries(schema.properties ?? {})) {
      if (value[key] !== undefined) validateSchema(value[key], child, `${label}.${key}`);
    }
  }
}

/** Parse a positive ID without permissive parseInt truncation or array coercion. */
export function positiveId(value, label) {
  ensure(typeof value === 'string' && /^[1-9]\d*$/.test(value) && Number.isSafeInteger(Number(value)), `${label} must be a positive integer.`);
  return Number(value);
}
