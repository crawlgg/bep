import {
  Client,
  GatewayIntentBits,
  Partials,
  ActivityType,
  REST,
  Routes,
  ButtonBuilder,
  ButtonStyle,
  AttachmentBuilder,
  ActionRowBuilder,
  ApplicationCommandType,
  EmbedBuilder,
} from "discord.js";
import fs from "fs";
import automod from "./automod.js";
import dotenv from "dotenv";
dotenv.config();

const client = new Client({
  intents: [
    GatewayIntentBits.Guilds,
    GatewayIntentBits.GuildMembers,
    GatewayIntentBits.GuildMessages,
    GatewayIntentBits.MessageContent,
  ],
  partials: [Partials.User],
});

const GUILD_ID = "1311742970751619176";
const REPORT_CHANNEL_ID = "1419753711848259685";
const TESTING = true;
const ALLOWED_ROLES = ["1417011916035067905", "1418647508409647134"];

const commands = [
  { name: "donate", description: "Find out how to financially support Cozyland", type: ApplicationCommandType.ChatInput },
  { name: "mention-allow", description: "Allow users to mention you on this server", type: ApplicationCommandType.ChatInput },
  { name: "mention-disallow", description: "Disallow users from mentioning you on this server", type: ApplicationCommandType.ChatInput },
  { name: "Report Message", type: ApplicationCommandType.Message },
  { name: "Report User", type: ApplicationCommandType.User },
  { 
    name: "report", 
    description: "Submit a report", 
    type: ApplicationCommandType.ChatInput,
    options: [
      { name: "user", description: "The user you want to report", type: 6, required: true },
    ],
  },
];

const rest = new REST({ version: "10" }).setToken(process.env.TOKEN);

async function registerCommands() {
  try {
    if (TESTING) {
      await rest.put(Routes.applicationCommands(client.user.id), { body: [] });
      await rest.put(Routes.applicationGuildCommands(client.user.id, GUILD_ID), { body: commands });
    } else {
      await rest.put(Routes.applicationGuildCommands(client.user.id, GUILD_ID), { body: [] });
      await rest.put(Routes.applicationCommands(client.user.id), { body: commands });
    }
  } catch (err) {
    console.error(err);
  }
}

let posts = 0;
let forumMessages = 0;

function updateStatus() {
  const memberCount = client.guilds.cache.reduce((acc, guild) => acc + guild.memberCount, 0);
  client.user.setActivity(`${memberCount} members!`, { type: ActivityType.Watching });
}

function sendReport(embed, row = null) {
  const reportChannel = client.channels.cache.get(REPORT_CHANNEL_ID);
  if (reportChannel) {
    reportChannel.send({ embeds: [embed], components: row ? [row] : [] });
  }
}

let userStats = {};

if (fs.existsSync("./userStats.json")) {
  userStats = JSON.parse(fs.readFileSync("./userStats.json", "utf8"));
}

function saveStats() {
  fs.writeFileSync("./userStats.json", JSON.stringify(userStats, null, 2));
}

client.on("messageCreate", async (message) => {

  if (message.author.bot) return;

  if (message.mentions.has(client.user)) {
    try {
        await message.react('<:BepHiWave:1417879637169541233>');
    } catch (err) {
        console.error('Failed to react:', err);
    }
  }
  
  const prefix = ",";
  if (!message.content.startsWith(prefix)) return;

  const [cmd, ...args] = message.content.slice(prefix.length).trim().split(/ +/);

  const hasRole = message.member.roles.cache.some(r => ALLOWED_ROLES.includes(r.id));
  if (!hasRole) return message.reply("You don’t have permission to use this command.");

  if (cmd === "info") {
    const channel = message.guild.channels.cache.get("1415952501634633760");
    if (!channel) return message.reply("<:Warning:1420999573463371886> Could not find the target channel.");

    const { embed, row } = getInfoEmbed();
    const file = new AttachmentBuilder("./welcome.png", { name: "welcome.png" });

    await channel.send({ embeds: [embed], files: [file], components: [row] });
    return message.reply("<:Check:1420999550130454579> Server rules posted.");
  }

  if (cmd === "post") {
    const channelId = args.shift();
    const text = args.join(" ");
    const targetChannel = message.guild.channels.cache.get(channelId);

    if (!targetChannel) return message.reply("<:Warning:1420999573463371886> Invalid channel ID.");
    if (!text) return message.reply("<:Warning:1420999573463371886> Please provide a message to send.");

    await targetChannel.send(text);
    return message.reply(`<:Check:1420999550130454579> Message posted in <#${channelId}>`);
  }

  if (cmd === "apply") {
    const embed = new EmbedBuilder()
      .setColor("#2b2d31")
      .setTitle("✨ Role Information")
      .setDescription(
        "Discord roles help us manage permissions, different categorizations, teams, and more. Below we've listed some of our community roles.\n\n" +
        "**• ** **Moderators.** – Our moderation team is here to help maintain a safe, comfortable and respectful space for everyone. [Apply](https://cmty.at/apply)\n\n" +
        "**• ** **Donators.** – Donators help fund content creation and application development efforts at Community Architects. You can directly support us at [cmty.at/donate](https://cmty.at/donate)"
      );

    return message.channel.send({ embeds: [embed] });
  }

  if (cmd === "donated") {
    const embed = new EmbedBuilder()
      .setColor("#2b2d31")
      .setTitle("Cozyland Donation Fund Expenses")
      .setDescription(
        "Total fund: 770€\n" +
        "Spent: 775€\n\n" +
        "**• ** Emote packs: 86.50€\n" +
        "**• ** Developer payment Q2: 50€\n" +
        "**• ** Motion graphics for YouTube videos (intro/outro): 60.50€\n" +
        "**• ** Developer Meeting IRL: 48€\n" +
        "**• ** Birthday Prize pool: 30€\n" +
        "**• ** Guard development: 500€ (not yet sent)"
      );

    return message.channel.send({ embeds: [embed] });
  }

  if (cmd === "reply") {
    try {
      if (!message.reference) {
        return message.channel.send({ content: "<:Warning:1420999573463371886> Please reply to the message you want to respond to." });
      }

      const targetMessage = await message.channel.messages.fetch(message.reference.messageId);
      if (!targetMessage) {
        return message.channel.send({ content: "<:Warning:1420999573463371886> Could not find the referenced message." });
      }

      const images = message.attachments.filter(att =>
        att.contentType?.startsWith("image") || /\.(png|jpg|jpeg|gif|webp)$/i.test(att.url)
      );

      const messageText = message.content.slice(prefix.length + cmd.length).trim();

      let description = messageText;
      if (images.size > 0) {
        description += `\n\n*This message contains an attachment <:bepMessage:1419298132315082844>*`;
      }

      const embed = new EmbedBuilder().setColor("#2b2d31").setDescription(description);
      if (images.size > 0) embed.setImage(images.first().url);

      const row = new ActionRowBuilder().addComponents(
        new ButtonBuilder().setLabel("Jump to Message").setStyle(ButtonStyle.Link).setURL(targetMessage.url)
      );

      await targetMessage.reply({ embeds: [embed], components: [row] });
      await message.delete();
    } catch (err) {
      console.error(err);
      message.channel.send({ content: "<:Warning:1420999573463371886> An error occurred while executing the reply command." });
    }
  }

  if (cmd === "reply2") {
  try {
    const messageId = args[0];
    const announceMessage = args.slice(1).join(" ");

    if (!messageId) return message.reply("<:Warning:1420999573463371886> Please provide a message ID.");
    if (!announceMessage && message.attachments.size === 0) 
      return message.reply("<:Warning:1420999573463371886> Please provide a message or attach an image.");

    let targetMessage;
    for (const channel of message.guild.channels.cache.values()) {
      if (!channel.isTextBased()) continue;
      try {
        targetMessage = await channel.messages.fetch(messageId);
        if (targetMessage) break;
      } catch {}
    }

    if (!targetMessage) {
      return message.reply("<:Warning:1420999573463371886> Could not find the message with that ID.");
    }

    const images = message.attachments.filter(att =>
      att.contentType?.startsWith("image") || /\.(png|jpg|jpeg|gif|webp)$/i.test(att.url)
    );

    let description = announceMessage;
    if (images.size > 0) {
      description += `\n\n*This message contains an attachment <:bepMessage:1419298132315082844>*`;
    }

    const embed = new EmbedBuilder()
      .setColor("#2b2d31")
      .setAuthor({ name: `${message.author.tag}`, iconURL: message.author.displayAvatarURL() })
      .setDescription(description);

    if (images.size > 0) embed.setImage(images.first().url);

    const row = new ActionRowBuilder().addComponents(
      new ButtonBuilder()
        .setLabel("Jump to Message")
        .setStyle(ButtonStyle.Link)
        .setURL(targetMessage.url)
    );

    await targetMessage.reply({ embeds: [embed], components: [row] });
    await message.channel.send(`<:Check:1420999550130454579> Reply sent in <#${targetMessage.channel.id}>`);
  } catch (err) {
    console.error(err);
    message.channel.send("<:Warning:1420999573463371886> An error occurred while sending the reply.");
  }
  }

  if (cmd === "inspect") {
  const userId = args[0];
  if (!userId) return message.channel.send("<:Warning:1420999573463371886> Please provide a user ID!");

  try {
    const user = await client.users.fetch(userId);
    const member = await message.guild.members.fetch(userId).catch(() => null);

    const createdAt = user.createdAt;
    const daysAgo = Math.floor(
      (Date.now() - createdAt.getTime()) / (1000 * 60 * 60 * 24)
    );
    const formattedDate = createdAt.toLocaleDateString("en-GB", {
      day: "2-digit",
      month: "short",
      year: "numeric",
    });
    const formattedTime = createdAt
      .toUTCString()
      .split(" ")
      .slice(4)
      .join(" ");

    const embed = new EmbedBuilder()
      .setColor("#2b2d31")
      .setTitle(`${user.tag}`)
      .addFields(
        {
          name: "User ID",
          value: 
            "```" + `${user.id}` + "```",
          inline: false,
        },

        {
          name: "Created at",
          value:
            "```" +
            `- ${daysAgo} days ago\n- ${formattedDate}\n- ${formattedTime}` +
            "```",
          inline: false,
        },
        { name: "Posts", value: "```" + posts + "```", inline: false },
        { name: "Forum messages", value: "```" + forumMessages + "```", inline: false }
      )
      .setFooter({
        text: member
          ? "✅ The user you're currently inspecting is on this server."
          : "⚠️ The user you're currently inspecting is not on this server.",
      });
    message.channel.send({ embeds: [embed] });
  } catch (err) {
    console.error(err);
    message.channel.send("<:Cross:1420999532602327110> Could not fetch that user. Invalid ID?");
  }
  }
  saveStats();
});

client.on("interactionCreate", async (interaction) => {
  try {
    if (interaction.isChatInputCommand()) {
      if (interaction.commandName === "donate") {
        const messageText =
          "If you are interested in supporting Cozyland' team, please check out our Ko-Fi page! " +
          "You can directly help us with financially compensating our developers, content editors, and managers for their hard work. Thanks!\n\n" +
          "Don't forget to link your Discord account with Ko-Fi to receive a special Donator role and achievement.";

        const donateButton = new ButtonBuilder()
          .setLabel("Donate")
          .setStyle(ButtonStyle.Link)
          .setEmoji("1419255400980676788")
          .setURL("https://ko-fi.com/sreemanrp");

        const row = new ActionRowBuilder().addComponents(donateButton);

        await interaction.reply({ content: messageText, components: [row], ephemeral: true });
      }

      if (interaction.commandName === "mention-allow" || interaction.commandName === "mention-disallow") {
        await interaction.deferReply({ ephemeral: true });

        let role = interaction.guild.roles.cache.find(r => r.name === "On Break");
        if (!role) {
          role = await interaction.guild.roles.create({ name: "On Break", mentionable: false });
        }

        const embed = new EmbedBuilder().setColor("#2b2d31");

        if (interaction.commandName === "mention-allow") {
          await interaction.member.roles.remove(role);
          if (!role.mentionable) await role.setMentionable(true);
          embed.setDescription("<:Check:1420999550130454579> Users are now able to mention you on this server.");
        }

        if (interaction.commandName === "mention-disallow") {
          await interaction.member.roles.add(role);
          if (role.mentionable) await role.setMentionable(false);
          embed.setDescription("<:Check:1420999550130454579> Users are now unable to mention you on this server.");
        }

        await interaction.editReply({ embeds: [embed] });
      }

      if (interaction.commandName === "report") {
        const user = interaction.options.getUser("user");
        const message = interaction.options.getString("message") || "No message provided.";

        const embed = new EmbedBuilder()
          .setAuthor({ name: "User Report", iconURL: client.user.displayAvatarURL() })
          .setColor("#a285ff")
          .addFields(
            { name: "Reported User", value: `${user.tag} (${user.id})` },
            { name: "Reported By", value: `${interaction.user.tag} (${interaction.user.id})` },
            { name: "Message", value: message }
          )
          .setTimestamp();

        sendReport(embed);

        const confirmEmbed = new EmbedBuilder()
          .setColor("#2b2d31")
          .setDescription(`<:Check:1420999550130454579> Your report on **${user.tag}** has been submitted.`);

        await interaction.reply({ embeds: [confirmEmbed], ephemeral: true });
      }
    }

    if (interaction.isMessageContextMenuCommand() && interaction.commandName === "Report Message") {
      const targetMessage = await interaction.channel.messages.fetch(interaction.targetId);

      const embed = new EmbedBuilder()
        .setAuthor({ name: "Message Report", iconURL: client.user.displayAvatarURL() })
        .setColor("#a285ff")
        .addFields(
          { name: "Message Author", value: `${targetMessage.author.tag} (${targetMessage.author.id})` },
          { name: "Reported By", value: `${interaction.user.tag} (${interaction.user.id})` },
          { name: "Message Content", value: targetMessage.content || "[No text content]" }
        )
        .setTimestamp();

      const row = new ActionRowBuilder().addComponents(
        new ButtonBuilder().setLabel("Jump to Message").setStyle(ButtonStyle.Link).setURL(targetMessage.url)
      );

      sendReport(embed, row);

      const confirmEmbed = new EmbedBuilder()
        .setColor("#2b2d31")
        .setDescription("<:Check:1420999550130454579> The message has been reported to the moderators.");

      await interaction.reply({ embeds: [confirmEmbed], ephemeral: true });
    }

    if (interaction.isUserContextMenuCommand() && interaction.commandName === "Report User") {
      const targetUser = interaction.targetUser;
      const embed = new EmbedBuilder()
        .setAuthor({ name: "User Report", iconURL: client.user.displayAvatarURL() })
        .setColor("#a285ff")
        .addFields(
          { name: "Reported User", value: `${targetUser.tag} (${targetUser.id})` },
          { name: "Reported By", value: `${interaction.user.tag} (${interaction.user.id})` }
        )
        .setTimestamp();

      sendReport(embed);

      const confirmEmbed = new EmbedBuilder()
        .setColor("#2b2d31")
        .setDescription(`<:Check:1420999550130454579> Your report on **${targetUser.tag}** has been submitted.`);

      await interaction.reply({ embeds: [confirmEmbed], ephemeral: true });
    }
  } catch (err) {
    console.error(err);
  }
});

automod(client);

client.once("clientReady", async () => {
  console.log(`Logged in as ${client.user.tag}`);
  await registerCommands();
  updateStatus();
  setInterval(updateStatus, 60_000);
});

client.login(process.env.TOKEN);
