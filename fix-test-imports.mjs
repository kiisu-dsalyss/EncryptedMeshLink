#!/usr/bin/env node

import { readFileSync, writeFileSync, readdirSync, statSync } from 'fs';
import { join } from 'path';

function getAllTestFiles(dir) {
  const files = [];
  
  function walk(currentDir) {
    const items = readdirSync(currentDir);
    for (const item of items) {
      const fullPath = join(currentDir, item);
      const stat = statSync(fullPath);
      if (stat.isDirectory()) {
        walk(fullPath);
      } else if (item.endsWith('.test.ts')) {
        files.push(fullPath);
      }
    }
  }
  
  walk(dir);
  return files;
}

const files = getAllTestFiles('tests');

files.forEach(file => {
  let content = readFileSync(file, 'utf8');
  
  // Fix imports from '../src/....js' back to '../src/....' (remove .js from test imports)
  content = content.replace(/from ['"](\.\.[^'"]*src[^'"]*\.js)['"]/g, (match, path) => {
    const pathWithoutJs = path.replace(/\.js$/, '');
    return match.replace(path, pathWithoutJs);
  });
  
  writeFileSync(file, content);
  console.log(`Fixed test imports in ${file}`);
});

console.log('All test imports reverted to .ts!');
