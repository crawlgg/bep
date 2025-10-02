import { EmbedBuilder, ActionRowBuilder, ButtonBuilder, ButtonStyle } from "discord.js";

export function getInfoEmbed() {
  const embed = new EmbedBuilder()
    .setColor("#2b2d31")
    .setTitle("Welcome to cozyland")
    .setDescription(
      "We offer several great opportunities to share ideas, exchange advice, receive feedback, collaborate with communities on Discord.\n\n" +
      "-# **• ** **Be respectful.** Nobody here wants to see spam, NSFW, advertising, or political chat. Please help us keep those topics out of our community and DMs.\n\n" +
      "-# **• ** **Be mature.** When a debate turns into an argument, consider stepping away from the chat. The team may get involved, we ask that you please listen to us as we are here to help.\n\n" +
      "-# **• ** **Be mindful.** Please help us to keep chat in the best channels as well as high quality to be engaging and meaningful. We are a volunteer, community-run, Discord."
    )
    .setImage("attachment://welcome.png");

  const row = new ActionRowBuilder().addComponents(
    new ButtonBuilder()
      .setLabel("Visit our Website")
      .setStyle(ButtonStyle.Link)
      .setURL("https://traf.codes"),
    new ButtonBuilder()
      .setLabel("Support us on Ko-Fi")
      .setStyle(ButtonStyle.Link)
      .setURL("https://ko-fi.com/sreemanrp")
  );

  return { embed, row };
}