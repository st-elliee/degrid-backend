import { readdirSync, readFileSync } from 'node:fs';
import { join } from 'node:path';
import { fileURLToPath } from 'node:url';
import { parse } from 'acorn';
import assert from 'node:assert/strict';

const root = fileURLToPath(new URL('../', import.meta.url));
let fileCount = 0;
let functionCount = 0;

/** Walk only project JavaScript, excluding dependencies and supplied source documents. */
function checkDirectory(directory) {
  for (const entry of readdirSync(directory, { withFileTypes: true })) {
    if (['node_modules', 'docs', '.git'].includes(entry.name)) continue;
    const path = join(directory, entry.name);
    if (entry.isDirectory()) checkDirectory(path);
    else if (entry.name.endsWith('.js')) {
      const source = readFileSync(path, 'utf8');
      const comments = [];
      const ast = parse(source, { ecmaVersion: 'latest', sourceType: 'module', onComment: comments });
      checkNode(ast, comments, source, path); fileCount++;
    }
  }
}

/** Check each function has a nearby JSDoc block, including named test callbacks. */
function checkNode(node, comments, source, path) {
  if (!node || typeof node !== 'object') return;
  if (['FunctionDeclaration', 'FunctionExpression', 'ArrowFunctionExpression'].includes(node.type)) {
    let documentation;
    for (const comment of comments) {
      if (comment.end > node.start) break;
      documentation = comment;
    }
    const gap = documentation ? source.slice(documentation.end, node.start) : '';
    assert.ok(documentation?.type === 'Block' && documentation.value.startsWith('*') && gap.length < 300,
      `Missing function JSDoc in ${path} at line ${source.slice(0, node.start).split('\n').length}`);
    functionCount++;
  }
  for (const value of Object.values(node)) {
    if (Array.isArray(value)) for (const child of value) checkNode(child, comments, source, path);
    else if (value && typeof value === 'object') checkNode(value, comments, source, path);
  }
}

checkDirectory(root);
console.log(`Parsed ${fileCount} ES modules; all ${functionCount} functions have JSDoc comments.`);
