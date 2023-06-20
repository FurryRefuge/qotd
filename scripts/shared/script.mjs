export function createMessagePayload(role_id, text, author) {
  return {
    allowed_mentions: {
      roles: [role_id],
      users: [],
    },
    content: `<@&${role_id}>`,
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