import { Events, EmbedBuilder, PermissionsBitField } from "discord.js";
import fs from "fs";
import path from "path";

const ALLOWED_ROLES = [
  "Admin",
  "Community Team",
  "Friends",
  "Donator",
  "Booster",
];

const LINK_REGEX = /(https?:\/\/[^\s]+)/gi;
const LOG_CHANNEL_ID = "1419753711848259685";
const PREFIX = ",";

const DATA_FILE = path.join("./server_data.json");

let userData = {};
if (fs.existsSync(DATA_FILE)) {
  try {
    const fileContent = fs.readFileSync(DATA_FILE, "utf-8").trim();
    userData = fileContent ? JSON.parse(fileContent) : {};
  } catch (err) {
    console.error(
      "<:Cross:1420999532602327110> Could not parse server_data.json, starting fresh:",
      err
    );
    userData = {};
  }
}

function saveData() {
  fs.writeFileSync(DATA_FILE, JSON.stringify(userData, null, 2), "utf-8");
}

function resetUserWarns(userId, username) {
  if (!userData[userId]) {
    userData[userId] = {
      Username: username,
      UserID: userId,
      LinkWarns: 0,
      FileWarns: 0,
      LinkLastViolation: null,
      FileLastViolation: null,
      Kicked: false,
      Banned: false,
      SentInfoDM: false,
    };
  } else {
    userData[userId].LinkWarns = 0;
    userData[userId].FileWarns = 0;
    userData[userId].LinkLastViolation = null;
    userData[userId].FileLastViolation = null;
  }
  saveData();
  return true;
}

export default (client) => {
  client.on(Events.MessageCreate, async (message) => {
    try {
      if (!message.guild || message.author.bot) return;

      if (message.content.startsWith(PREFIX)) {
        const args = message.content.slice(PREFIX.length).trim().split(/ +/);
        const command = args.shift().toLowerCase();

        if (command === "reset" && args[0] === "warns") {
          if (!message.member.permissions.has(PermissionsBitField.Flags.KickMembers)) {
            return message.reply("<:Cross:1420999532602327110> You do not have permission to reset warns.");
          }

          const userMention = message.mentions.users.first();
          if (!userMention)
            return message.reply("<:Cross:1420999532602327110> Please mention a user to reset warns.");

          resetUserWarns(userMention.id, userMention.tag);

          await message.channel.send(`<:Check:1420999550130454579> Warns for \`${userMention.tag}\` have been reset successfully`);

          const logChannel = client.channels.cache.get(LOG_CHANNEL_ID);
          if (logChannel) {
            logChannel.send({
              embeds: [
                new EmbedBuilder()
                  .setColor("#a285ff")
                  .setTitle("<:Warning:1420999573463371886> Manual Warn Reset")
                  .setDescription(`All link and file warns for \`${userMention.tag}\` have been reset by \`${message.author.tag}\``)
                  .setTimestamp(),
              ],
            });
          }
          return;
        }
      }

      const member = await message.guild.members.fetch(message.author.id);

      if (ALLOWED_ROLES.some((role) => member.roles.cache.some((r) => r.name === role))) return;

      const hasLink = LINK_REGEX.test(message.content);
      const hasAttachment = message.attachments.size > 0;

      if (hasLink || hasAttachment) {
        await message.delete().catch(() => {});

        if (!userData[member.id]) {
          userData[member.id] = {
            Username: member.user.tag,
            UserID: member.id,
            LinkWarns: 0,
            FileWarns: 0,
            LinkLastViolation: null,
            FileLastViolation: null,
            Kicked: false,
            Banned: false,
            SentInfoDM: false,
          };
        }

        if (!userData[member.id].SentInfoDM) {
          try {
            const infoEmbed = new EmbedBuilder()
              .setColor("#a285ff")
              .setAuthor({
                name: message.guild.name,
                iconURL: message.guild.iconURL(),
              })
              .setDescription(
                "If you can imagine it, you can create it. [Join](https://discord.gg/8yY6BV7Kc6)"
              )
              .setImage("attachment://welcome.png");

            await member.send({
              embeds: [infoEmbed],
              files: ["./welcome.png"],
            });

            userData[member.id].SentInfoDM = true;
            saveData();
          } catch (err) {
            console.log(
              "<:Cross:1420999532602327110> Could not send server info DM:",
              err
            );
          }
        }

        if (hasLink) {
          const timeoutMs = 24 * 60 * 60 * 1000;
          await member.timeout(timeoutMs, "Posting links without permission").catch(() => {});
        }

        try {
          const warningEmbed = new EmbedBuilder()
            .setColor("#2b2d31")
            .setTitle("<:BepLoveHeartAutomod:1419255196869202003> You have been warned")
            .setDescription(
              hasLink
                ? "You are not allowed to send **links** in this server.\n\nYou have been timed out for **24 hours**."
                : "You are not allowed to send **files/attachments** in this server.\n\nThis counts as a warning."
            );

          await member.send({ embeds: [warningEmbed] });
        } catch (err) {
          console.log("<:Cross:1420999532602327110> Could not send warning DM:", err);
        }

        const now = Date.now();

        if (hasLink) {
          userData[member.id].LinkWarns += 1;
          userData[member.id].LinkLastViolation = now;

          if (userData[member.id].LinkWarns >= 5 && !userData[member.id].Banned) {
            await member.ban({ reason: "Reached 5 warns for posting links without permission" }).catch(() => {});
            userData[member.id].Banned = true;
          }
        }

        if (hasAttachment) {
          userData[member.id].FileWarns += 1;
          userData[member.id].FileLastViolation = now;

          if (userData[member.id].FileWarns >= 5 && !userData[member.id].Kicked) {
            await member.kick({ reason: "Reached 5 warns for posting files/attachments without permission" }).catch(() => {});
            userData[member.id].Kicked = true;
          }
        }

        saveData();

        const logChannel = client.channels.cache.get(LOG_CHANNEL_ID);
        if (logChannel) {
          await logChannel.send({
            embeds: [
              new EmbedBuilder()
                .setColor("#a285ff")
                .setTitle("<:BepLoveHeartAutomod:1419255196869202003> AutoMod Violation")
                .addFields(
                  { name: "User", value: `\`\`\`@${member.user.tag}\`\`\` (${member.id})` },
                  { name: "Action", value: `Message deleted, warned${hasLink ? ", timeout 24h" : ""}${userData[member.id].Banned ? ", auto-banned" : userData[member.id].Kicked ? ", auto-kicked" : ""}` },
                  { name: "Message Content", value: message.content || "Attachment/File" },
                  { name: "Link Warns", value: `${userData[member.id].LinkWarns}`, inline: true },
                  { name: "File Warns", value: `${userData[member.id].FileWarns}`, inline: true }
                )
                .setTimestamp(),
            ],
          });
        }
      }
    } catch (err) {
      console.error("AutoMod Error:", err);
    }
  });
};
