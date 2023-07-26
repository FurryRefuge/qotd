import { REST } from '@discordjs/rest';
import assert from 'node:assert/strict';
import { setTimeout } from 'node:timers';
import qotds from '../data/qotds.json' assert { type: 'json' };
import process from 'node:process';
import fs from 'node:fs';
import { URL } from 'node:url';
import path from 'node:path';
import { createMessagePayload } from './shared/script.mjs';
import * as constants from './shared/constants.mjs';

process.env.TZ = 'UTC';

assert.ok(process.env.DISCORD_TOKEN);
assert.ok(qotds.length > 0);

const argv = process.argv.slice(2);
const args = {};
let qotd_channel = constants.qotd_channel;

for (let arg of argv) {
  const extra_idx = arg.indexOf('=');
  let extra = undefined;
  if (extra_idx > 1) {
    extra = arg.substring(extra_idx + 1);
    arg = arg.substring(0, extra_idx);
  }

  switch (arg) {
    case '-ci':
      process.env.CI = 'true';
      break;
    case '--wait':
      args.wait = true;
      break;
    case '--test':
      if (undefined === extra) {
        console.error('Expected --test=<channel_id>, got --test');
        process.exit(1);
      }
      if (Number.isNaN(+extra)) {
        console.error('Expected --test=<channel_id>, got --test=%s', extra);
        process.exit(1);
      }

      qotd_channel = extra;
      args.test = true;
      break;
    case '--no-write':
      args.noWrite = true;
      break;
    default:
      console.error(`Unknown option ${arg}`);
      process.exit(1);
  }
}

const time = new Date();
let qotd_day = Math.floor(time / 86_400_000);

const did_qotd_today = didQotdToday();
if (did_qotd_today && true !== args.wait && !args.test) {
  console.error('QoTD has already been done today. Did you mean to wait for the next QoTD day with the --wait flag?')
  process.exit(1);
}

const restart = new Date().setUTCHours(16, 0, 0, 0);
let wait = restart - time;

assert.ok(!(did_qotd_today && 0 <= wait))

if (args.test) {
  wait = 0;
  const entry = getLastUsedQotdEntry();
  qotd_day = undefined === entry ? 0 : 1 + entry.last_used;
}
else if (0 > wait) {
  if (process.env.CI) {
    // ci is given a 30 minute grace period
    if (-1_800_000 <= wait)
      wait = 0;
    else {
      console.error('QoTD cannot be announced this late');
      process.exit(1);
    }
  }
  else if (args.wait) wait += 86_400_000;
  else {
    console.error('QoTD has been missed today. Use the -ci flag to force QoTD during grace period')
    process.exit(1);
  }
}

const oldest_qotd_entry = getOldestQotdEntry();
setTimeout(async function () {
  const rest = new REST({ version: '10' }).setToken(process.env.DISCORD_TOKEN);
  {
    const promise = createStatsForLast(rest);
    if (promise !== undefined) await promise;
  }

  const message = await rest.post(`/channels/${qotd_channel}/messages`, {
    body: createMessagePayload(args.test ? '0' : constants.qotd_role, oldest_qotd_entry.text, oldest_qotd_entry.author),
  });

  if (!('history' in oldest_qotd_entry)) oldest_qotd_entry.history = [];
  oldest_qotd_entry.history.push({ day: qotd_day, message: message.id });
  oldest_qotd_entry.last_used = qotd_day;
  if (true !== args.noWrite) fs.writeFileSync(new URL(path.join('..', 'data', 'qotds.json'), import.meta.url), JSON.stringify(qotds, undefined, 2));
}, wait);

function createStatsForLast(rest) {
  const last_qotd_entry = getLastUsedQotdEntry();
  if (last_qotd_entry === undefined) return;
  if (!('history' in last_qotd_entry)) return console.error('last used qotd entry had no history');
  if (0 === last_qotd_entry.history.length) return constants.error('last used qotd entry history is an empty array');

  const last_history_entry = last_qotd_entry.history.at(-1);
  if (last_history_entry.stats)
    return console.error('last used qotd entry already has stats');

  const { message } = last_history_entry;
  return rest.get(`/channels/${qotd_channel}/messages?after=${message}`)
    .then(messages => {
      const users = new Set();
      let total = 0;
      for (const message of messages) {
        if (message.webhook_id) continue;
        if (message.author.bot) continue;
        if (!message.content) continue;
        switch (message.type) {
          case 0:
          case 19: break;
          default: continue;
        }

        users.add(message.author.id);
        ++total;
      }

      last_history_entry.stats = {
        total,
        users: users.size,
      }
    })
    .catch(e => console.error(e));
}

function getOldestQotdEntry() {
  let entry = qotds[0];

  for (let i = 0; i < qotds.length; ++i) {
    const qotd = qotds[i];
    if (!('last_used' in qotd)) {
      if ('author' in qotd) return qotd;
      else if ('last_used' in entry) entry = qotd;
      continue;
    }

    if (!('last_used' in entry)) continue;
    if (qotd.last_used < entry.last_used) entry = qotd;
  }

  return entry;
}

function getLastUsedQotdEntry() {
  let i = 0;
  while (!('last_used' in qotds[i]))
    if (++i <= qotds.length) return;
  let entry = qotds[i];

  for (; i < qotds.length; ++i) {
    const qotd = qotds[i];
    if (!('last_used' in qotd)) continue;
    if (qotd.last_used > entry.last_used) entry = qotd;
  }

  return entry;
}

function didQotdToday() {
  for (const qotd of qotds)
    if (qotd_day === qotd.last_used)
      return true;
  return false;
}