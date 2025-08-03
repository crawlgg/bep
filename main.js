const { Client, GatewayIntentBits, Partials } = require('discord.js');
const ms = require('ms');
require('dotenv').config();

const DISCORD_TOKEN = process.env.DISCORD_TOKEN;
const LOGS_CHANNEL = process.env.LOGS_CHANNEL;

const client = new Client({
  intents: [
    GatewayIntentBits.Guilds,
    GatewayIntentBits.GuildMembers,
  ],
  partials: [Partials.GuildMember],
});

const regex = /token|john f|motion|tokens?.rip/i;

client.on('ready', () => {
  client.user.setPresence({
    activities: [{
      name: 'idiots',
      type: 2,
    }],
    status: 'invisible',
  });

  console.log(`Logged in as ${client.user.tag}`);
});

client.on('guildMemberAdd', async member => {
  try {
    const username = member.user.username.toLowerCase();
    const createdTimestamp = member.user.createdTimestamp;
    const now = Date.now();
    const accountAge = now - createdTimestamp;

    const reason = 'User is most likely a spam account.';

    if (regex.test(username) || accountAge < ms('1m')) {
      await member.ban({
        deleteMessageSeconds: 604800,
        reason,
      });

      const logMessage = `Banned: ${member.user.tag} (${member.user.id})\nReason: ${reason}`;

      const logChannel = member.guild.channels.cache.get(LOGS_CHANNEL);
      if (logChannel && logChannel.isTextBased()) {
        await logChannel.send(logMessage);
      }

      console.log(`Banned ${member.user.tag}`);
    }
  } catch (err) {
    console.error(`Failed to ban ${member.user?.tag || 'unknown'}:`, err.message);
  }
});

client.login(DISCORD_TOKEN);
