import { readFileSync } from 'node:fs';
export const spec = JSON.parse(readFileSync(new URL('../docs/swagger.json', import.meta.url), 'utf8'));
