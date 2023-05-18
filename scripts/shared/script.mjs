export function createMessagePayload(text, author) {
  return {
    allowed_mentions: {
      roles: ['672008561760534541'],
      users: [],
    },
    content: '<@&672008561760534541>',
    embeds: [
      {
        color: 0x01DDFF,
        description:
          `**${text}**\n` +
          '> [Notifications can be disabled here](https://discord.com/channels/368557500884189186/645783730559909908/694594700249792573)\n' +
          `> ${author ? `By <@${author}> from ` : ''}<#1065322834265653309>`,
      },
    ],
  }
}