import qotds from '../data/qotds.json' assert { type: 'json' };
import assert from 'node:assert/strict';
import fs from 'node:fs';
import { URL } from 'node:url';
import path from 'node:path';
import process from 'node:process';

const linted_qotds = new Map();

for (const qotd of qotds) {
  qotd.text = qotd.text.trim();
  if ('author' in qotd) {
    qotd.author = qotd.author.trim();
    assert.ok(/[0-9]+/.exec(qotd.author));
  }
  if ('last_used' in qotd) assert.ok('number' === typeof qotd.last_used);

  if (linted_qotds.has(qotd.text)) {
    const linted = linted_qotds.get(qotd.text);
    if (qotd.last_used && (!linted.last_used || (qotd.last_used > linted.last_used)))
      linted.last_used = qotd.last_used;
    continue;
  }

  linted_qotds.set(qotd.text, qotd);
}

if (process.argv.slice(2).includes('--dry')) console.info(linted_qotds.values());
else {
  fs.writeFileSync(new URL(path.join('..', 'data', 'qotds.json'), import.meta.url), JSON.stringify([...linted_qotds.values()], undefined, 2));
  const removed_count = qotds.length - linted_qotds.size;
  if (0 !== removed_count) console.info(`Removed ${removed_count} duplicates`);
}
