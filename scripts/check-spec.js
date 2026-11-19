import SwaggerParser from '@apidevtools/swagger-parser';
import assert from 'node:assert/strict';
import { spec } from '../config/openapi.js';
import { routeDefinitions } from '../routes/index.js';

await SwaggerParser.validate(structuredClone(spec));
const expected = [];
for (const [path, methods] of Object.entries(spec.paths)) {
  for (const method of Object.keys(methods)) {
    if (['get', 'post', 'put', 'delete', 'patch'].includes(method)) expected.push(`${method} ${path}`);
  }
}
const actual = [];
for (const [method, path] of routeDefinitions) actual.push(`${method} ${path}`);
assert.equal(new Set(actual).size, actual.length);
assert.equal(expected.length, 26);
assert.deepEqual(actual.sort(), expected.sort());
console.log('Valid OpenAPI 1.1.0; 26/26 operations mounted exactly; no duplicate routes.');
