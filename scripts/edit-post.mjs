import { createMessagePayload } from './shared/script.mjs';
import assert from 'node:assert/strict';
import process from 'node:process';
import qotds from '../data/qotds.json' assert { type: 'json' };
import { REST } from '@discordjs/rest';
import * as constants from './shared/constants.mjs';

assert.ok(process.env.DISCORD_TOKEN);

const argv = process.argv.slice(2);

let qotd = {};
let message_id;
let channel_id = constants.qotd_channel;

for (let i = 0; i < argv.length; ++i) {
  let arg = argv[i];
  const str_idx = arg.indexOf('=');
  let value;
  console.log(arg)
  if (-1 === str_idx) {
    value = argv[++i];
  } else {
    value = arg.substring(1 + str_idx, arg.length);
    arg = arg.substring(0, str_idx);
  }

  if (!value) {
    console.error('Arguments expected');
    process.exit(1);
  }

  switch (arg) {
    case '-q':
    case '--qotd':
      qotd = qotds[value];
      if (!qotd) {
        console.error(`QoTD ${value} does not exist`);
        process.exit(1);
      }
      break;
    case '-t':
    case '--text':
      qotd.text = value;
      break;
    case '-a':
    case '--author':
      assert.ok(/[0-9]+/.exec(value));
      qotd.author = value;
      break;
    case '-m':
    case '--message-id':
      assert.ok(/[0-9]+/.exec(value));
      message_id = value;
      break;
    case '--channel-id':
      assert.ok(/[0-9]+/.exec(value));
      channel_id = value;
      break;
    default:
      console.error(`Unknown option ${arg}`);
      process.exit(1);
  }
}

if (!message_id) {
  console.error('--message-id is a required argument');
  process.exit(1);
}

const rest = new REST({ version: '10' }).setToken(process.env.DISCORD_TOKEN);

rest.patch(`/channels/${channel_id}/messages/${message_id}`, {
  body: createMessagePayload(qotd.text, qotd.author),
});