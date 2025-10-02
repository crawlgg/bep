import { WebhookClient } from "discord.js";

const webhook = new WebhookClient({ url: process.env.DONATION_WEBHOOK });

export function sendDonation(donorName, amount, currency = "€") {
  const message = `**${donorName}** just donated ${amount}${currency} to Community Architects on [Ko-fi](https://ko-fi.com/).**\n` +
                  `Thank you so much for your support! <:BepLoveHeart:1419255173104275537>`;

  webhook.send({ content: message });
}