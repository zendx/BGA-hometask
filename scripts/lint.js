const { spawnSync } = require('node:child_process');
const { readdirSync, statSync } = require('node:fs');
const { join } = require('node:path');

const roots = ['src', 'tests'];
const files = [];

function collectJsFiles(directory) {
  for (const entry of readdirSync(directory)) {
    const fullPath = join(directory, entry);
    const stats = statSync(fullPath);
    if (stats.isDirectory()) {
      collectJsFiles(fullPath);
    } else if (entry.endsWith('.js')) {
      files.push(fullPath);
    }
  }
}

for (const root of roots) {
  collectJsFiles(root);
}

let failed = false;
for (const file of files) {
  const result = spawnSync(process.execPath, ['--check', file], { stdio: 'inherit' });
  if (result.status !== 0) {
    failed = true;
  }
}

if (failed) {
  process.exit(1);
}

console.log(`Syntax check passed for ${files.length} JavaScript files.`);
