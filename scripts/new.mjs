#!/usr/bin/env node
/**
 * Interactive scaffolder. Finds every directory containing `_example*` and lets
 * the user pick one by number, asks for a name, then copies the template under that name.
 */
import { copyFileSync, existsSync, mkdirSync, readdirSync } from 'node:fs';
import { dirname, extname, join, relative, resolve } from 'node:path';
import { createInterface } from 'node:readline';
import { fileURLToPath } from 'node:url';

const root = resolve(dirname(fileURLToPath(import.meta.url)), '..');
const SKIP_DIRS = new Set([ 'node_modules', 'dist', '.git', '.cache', '.vite' ]);

const cyan = (s) => `\x1b[36m${ s }\x1b[0m`;
const dim = (s) => `\x1b[2m${ s }\x1b[0m`;

function findExamples(dir, out) {
  for (const entry of readdirSync(dir, { withFileTypes: true })) {
    if (entry.name.startsWith('.') || SKIP_DIRS.has(entry.name)) continue;
    const full = join(dir, entry.name);
    if (entry.isDirectory()) {
      findExamples(full, out);
    } else if (/^_example(\.[^.]+)?$/u.test(entry.name)) {
      out.push(full);
    }
  }
}

async function main() {
  const examples = [];
  findExamples(root, examples);
  if (examples.length === 0) {
    console.error('No `_example*` files found.');
    process.exit(1);
  }

  const opts = examples
    .map((file) => ({ file, dir: dirname(file), label: relative(root, dirname(file)) || '.' }))
    .sort((a, b) => a.label.localeCompare(b.label));

  console.log('\nWhat do you want to make?\n');
  opts.forEach((o, i) => {
    console.log(`  ${ cyan(`[${ i + 1 }]`) } ${ o.label }/ ${ dim(`(${ relative(o.dir, o.file) })`) }`);
  });
  console.log();

  const rl = createInterface({ input: process.stdin, output: process.stdout });
  const lines = rl[Symbol.asyncIterator]();
  const ask = async (q) => {
    process.stdout.write(q);
    const { value, done } = await lines.next();
    if (done) throw new Error('Cancelled.');
    return value.trim();
  };

  try {
    const choiceAns = await ask('Enter number: ');
    const idx = Number.parseInt(choiceAns, 10) - 1;
    if (!Number.isInteger(idx) || idx < 0 || idx >= opts.length) {
      throw new Error('Invalid selection.');
    }
    const choice = opts[idx];

    const name = await ask(`\nName ${ dim('(without extension)') }: `);
    if (!name) throw new Error('Name required.');
    if (name === '_example' || name.includes('..') || !/^[A-Za-z0-9_./-]+$/u.test(name)) {
      throw new Error('Use letters, numbers, `_`, `-`, `.` or `/` only — and don\'t shadow `_example`.');
    }

    const ext = extname(choice.file);
    const finalName = extname(name) ? name : `${ name }${ ext }`;
    const dest = join(choice.dir, finalName);
    if (existsSync(dest)) {
      throw new Error(`${ relative(root, dest) } already exists.`);
    }

    mkdirSync(dirname(dest), { recursive: true });
    copyFileSync(choice.file, dest);
    console.log(`\nCreated ${ cyan(relative(root, dest)) }`);
  } finally {
    rl.close();
  }
}

main().catch((err) => {
  console.error(err.message ?? err);
  process.exit(1);
});
