const fs = require('fs');
const path = require('path');

// TypeScript me-rewrite path alias (@app/*) menjadi relative path dengan
// ekstensi ".ts" di output. Di runtime, file hasil compile ber-ekstensi
// ".js", jadi rewrite ".ts" -> ".js" pada semua require di dalam dist.
const distDir = path.resolve(__dirname, '..', 'dist');
const requireTsRegex = /require\("([^"]+)\.ts"\)/g;

function rewriteFile(file) {
  const source = fs.readFileSync(file, 'utf8');
  const rewritten = source.replace(requireTsRegex, 'require("$1.js")');
  if (rewritten !== source) {
    fs.writeFileSync(file, rewritten);
  }
}

function walk(dir) {
  for (const entry of fs.readdirSync(dir, { withFileTypes: true })) {
    const full = path.join(dir, entry.name);
    if (entry.isDirectory()) {
      walk(full);
    } else if (entry.name.endsWith('.js')) {
      rewriteFile(full);
    }
  }
}

if (!fs.existsSync(distDir)) {
  process.exit(0);
}
walk(distDir);
