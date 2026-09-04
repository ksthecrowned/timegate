#!/usr/bin/env node
/**
 * Validate api/.skills/*.md frontmatter + freshness (90 days).
 * Usage: bun run docs:check  (from api/)
 */
import { readdirSync, readFileSync, existsSync } from 'node:fs';
import { join, dirname } from 'node:path';
import { fileURLToPath } from 'node:url';

const __dirname = dirname(fileURLToPath(import.meta.url));
const skillsDir = join(__dirname, '../.skills');
const MAX_AGE_DAYS = 90;
const REQUIRED = ['status', 'last-verified', 'owner', 'scope', 'audience'];
const STATUS_OK = new Set(['stable', 'draft', 'deprecated']);

let errors = 0;
let warnings = 0;

function fail(msg) {
  console.error(`ERROR: ${msg}`);
  errors++;
}
function warn(msg) {
  console.warn(`WARN: ${msg}`);
  warnings++;
}

if (!existsSync(skillsDir)) {
  fail(`.skills/ missing at ${skillsDir}`);
  process.exit(1);
}

const files = readdirSync(skillsDir).filter((f) => f.endsWith('.md'));
const today = new Date();

for (const file of files) {
  const text = readFileSync(join(skillsDir, file), 'utf8');
  if (!text.startsWith('---')) {
    fail(`${file}: missing YAML frontmatter`);
    continue;
  }
  const end = text.indexOf('---', 3);
  if (end < 0) {
    fail(`${file}: unclosed frontmatter`);
    continue;
  }
  const fm = text.slice(3, end).trim();
  const meta = {};
  for (const line of fm.split('\n')) {
    const m = line.match(/^([a-zA-Z0-9_-]+):\s*(.+)$/);
    if (m) meta[m[1]] = m[2].trim();
  }
  for (const key of REQUIRED) {
    if (!meta[key]) fail(`${file}: missing frontmatter field "${key}"`);
  }
  if (meta.status && !STATUS_OK.has(meta.status)) {
    fail(`${file}: invalid status "${meta.status}"`);
  }
  if (meta['last-verified']) {
    const d = new Date(meta['last-verified']);
    if (Number.isNaN(d.getTime())) {
      fail(`${file}: invalid last-verified date`);
    } else if (meta.status === 'stable') {
      const age = (today - d) / (1000 * 60 * 60 * 24);
      if (age > MAX_AGE_DAYS) {
        warn(`${file}: stable but last-verified ${Math.floor(age)}d ago (>${MAX_AGE_DAYS}d)`);
      }
    }
  }
}

if (errors) {
  console.error(`\ndocs:check failed — ${errors} error(s), ${warnings} warning(s)`);
  process.exit(1);
}
console.log(`docs:check ok — ${files.length} skill file(s), ${warnings} warning(s)`);
