import { REST } from '@discordjs/rest';
import assert from 'node:assert/strict';
import { setTimeout } from 'node:timers';
import qotds from '../data/qotds.json' assert { type: 'json' };
import process from 'node:process';
import fs from 'node:fs';
import { URL } from 'node:url';
import path from 'node:path';

process.env.TZ = 'UTC';

assert.ok(process.env.DISCORD_TOKEN);

const argv = process.argv.slice(2);
const args = {};
let qotd_channel = '645783740618113028';

for (const arg of argv) {
  switch (arg) {
    case '-ci':
      process.env.CI = 'true';
    case '--wait':
      args.wait = true;
    case '--test':
      qotd_channel = '645783809492779052';
      args.test = true;
  }
}

const time = new Date();
const qotd_day = Math.floor(time / 86_400_000);

const did_qotd_today = function didQotdToday() {
  for (const qotd of qotds)
    if (qotd_day === qotd.last_used)
      return true;
  return false;
}();

const oldest_qotd_entry = function getOldestQotdEntry() {
  let entry = qotds[0];

  for (const qotd of qotds) {
    if (!('last_used' in entry)) break;
    if (!('last_used' in qotd)) return qotd;
    if (qotd.last_used < entry.last_used) entry = qotd;
  }

  return entry;
}();

if (did_qotd_today && true !== args.wait) {
  console.error('QoTD has already been done today. Did you mean to wait for the next QoTD day with the --wait flag?')
  process.exit(1);
}

const restart = new Date().setUTCHours(16, 0, 0, 0);
let wait = restart - time;

assert.ok(!(did_qotd_today && 0 <= wait))

if (args.test) wait = 0;
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


setTimeout(async function () {
  const rest = new REST({ version: '10' }).setToken(process.env.DISCORD_TOKEN);
  await rest.post(`/channels/${qotd_channel}/messages`, {
    body: {
      allowed_mentions: {
        roles: ['672008561760534541'],
        users: [],
      },
      content: '<@&672008561760534541>',
      embeds: [
        {
          color: 0x01DDFF,
          description:
            `**${oldest_qotd_entry.text}**\n` +
            '> [Notifications can be disabled here](https://discord.com/channels/368557500884189186/645783730559909908/694594700249792573)\n' +
            `> ${oldest_qotd_entry.author ? `By <@${oldest_qotd_entry.author}> from ` : ''}<#1065322834265653309>`,
        },
      ],
    },
  });

  oldest_qotd_entry.last_used = qotd_day;
  fs.writeFileSync(new URL(path.join('data', 'qotds.json'), import.meta.url), JSON.stringify(qotds, undefined, 2));
}, wait);