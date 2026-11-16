// Read-only inventory. Unreachable files are candidates for review, not deletion.
const fs = require('node:fs');
const path = require('node:path');
const normalize = (file) => file.replaceAll('\\', '/');
function walk(directory) {
  return fs.readdirSync(directory, { withFileTypes: true }).flatMap((entry) => {
    const file = path.join(directory, entry.name);
    return entry.isDirectory() ? walk(file) : [normalize(file)];
  });
}
const files = walk('src').filter((file) => /\.(ts|tsx)$/.test(file) && !file.includes('.test.'));
const modules = new Set(files);
const dependencies = new Set();
const graph = new Map();
for (const file of files) {
  const source = fs.readFileSync(file, 'utf8');
  const imports = [...source.matchAll(/(?:from\s*|import\s*\(|require\s*\()\s*['"]([^'"]+)['"]/g)].map((match) => match[1]);
  const edges = [];
  for (const name of imports) {
    if (!name.startsWith('.') && !name.startsWith('@/')) {
      dependencies.add(name.startsWith('@') ? name.split('/').slice(0, 2).join('/') : name.split('/')[0]);
      continue;
    }
    const base = normalize(name.startsWith('@/') ? `src/${name.slice(2)}` : path.join(path.dirname(file), name));
    for (const suffix of ['.ts', '.tsx', '.web.ts', '.web.tsx', '/index.ts', '/index.tsx']) {
      if (modules.has(base + suffix)) edges.push(base + suffix);
    }
  }
  graph.set(file, edges);
}
const reachable = new Set();
function visit(file) {
  if (reachable.has(file)) return;
  reachable.add(file);
  for (const child of graph.get(file) ?? []) visit(child);
}
for (const file of files.filter((file) => file.startsWith('src/app/'))) visit(file);
const visiting = new Set();
const visited = new Set();
const cycles = [];
function findCycles(file, stack = []) {
  if (visiting.has(file)) { cycles.push([...stack.slice(stack.indexOf(file)), file]); return; }
  if (visited.has(file)) return;
  visiting.add(file);
  for (const child of graph.get(file) ?? []) findCycles(child, [...stack, file]);
  visiting.delete(file);
  visited.add(file);
}
for (const file of files) findCycles(file);
console.log(JSON.stringify({
  sourceFiles: files.length,
  unreachableCandidates: files.filter((file) => !reachable.has(file)),
  cycles,
  dependenciesWithoutDirectSourceImport: Object.keys(JSON.parse(fs.readFileSync('package.json')).dependencies).filter((name) => !dependencies.has(name)),
  largestAssets: walk('assets').map((file) => ({ file, bytes: fs.statSync(file).size })).sort((a, b) => b.bytes - a.bytes).slice(0, 10),
}, null, 2));
