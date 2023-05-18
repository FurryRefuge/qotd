import qotds from '../data/qotds.json' assert { type: 'json' };
import fs from 'node:fs';
import { URL } from 'node:url';
import path from 'node:path';
import process from 'node:process';

const argv = process.argv.slice(2);

let dry = false;
let overwrite = false;

const map = new Map();
let qotd_index = qotds.length - 1;

const duplicate_set = new Set();
for (const qotd of qotds) duplicate_set.add(qotd);

for (let arg of argv) {
  arg = arg.trim();

  if ('--help' == arg) {
    console.info(
      'Usage: add-qotd [entry_index_to_update=]"<text>"[:author_user_id] [...repeat]\n' +
      'Examples:\n' +
      ' Add entry: add-qotd "Hello world?":291656468493631488\n' +
      ' Update entry: add-qotd 7="Hello world?":291656468493631488\n' +
      ' Update text, keep author: add-qotd 7="Hello world?"\n' +
      ' Update text, remove author: add-qotd 7="Hello world?":\n' +
      ' Update author, keep text: add-qotd 7=:291656468493631488'
    );
    process.exit(0);
  }

  if ('--dry' == arg) {
    dry = true;
    continue;
  }

  if ('--update' == arg) {
    overwrite = true;
    continue;
  }

  const [, index, text, user_id] = arg.match(/^(?:([0-9]+)=)?(.*?)(:[0-9]*)?$/);
  const entry = {};
  if (undefined !== index) {
    if (!(index in qotds)) {
      console.error('Cannot update entry which does not exist');
      process.exit(1);
    }

    if (undefined === user_id) entry.author = qotds[index].author;
    else if (1 !== user_id.length) entry.author = user_id.substring(1);
    if (text) entry.text = text;
    else entry.text = qotds[index].text;
    
    map.set(index, entry);
  } else {
    if (undefined !== user_id && 1 !== user_id.length) entry.author = user_id.substring(1);
    if (!text) {
      console.error('Text is required');
      process.exit(1);
    }

    if (duplicate_set.has(text)) continue;
    duplicate_set.add(text);
    
    entry.text = text;
    map.set(++qotd_index, entry)
  }
}

if (!map.size) {
  console.info('Nothing to add.');
  process.exit(0);
}

if (false === overwrite)
  for (const key of map.keys()) {
    if (key in qotds) {
      console.error(`Cannot overwrite entry ${key} without --update switch`);
      process.exit(1);
    }
  }

for (const [key, value] of map.entries()) {
  qotds[key] = value;
}

if (false === dry) {
  fs.writeFileSync(new URL(path.join('..', 'data', 'qotds.json'), import.meta.url), JSON.stringify(qotds, undefined, 2))
  console.info(`Added ${map.size} entries`);
} else console.info(map);
