import {
  ActionRowBuilder,
  ButtonBuilder,
  ButtonStyle,
} from "discord.js";
import { db } from "../config.js";
import { getUserAutoLimit } from "./helpers.js";

export const name = "profile";
export const buttonId = "profile_list_auto";

export async function handleButton(interaction) {
  await interaction.deferReply({ flags: 64 });

  const discordId = interaction.user.id;

  const [rows] = await db.execute(
    `SELECT id, server_key, keyword, channel_id
     FROM auto_find
     WHERE discord_id=?
     ORDER BY id ASC`,
    [discordId]
  );

  if (!rows.length) {
    return interaction.editReply({
      content: "❌ Kamu belum punya Auto Find aktif",
    });
  }

  const list = rows
    .map((r) => {
      const server = r.server_key.toUpperCase();
      const channel = r.channel_id ? `<#${r.channel_id}>` : "#unknown";
      return `#${r.id} | **${server}** > \`${r.keyword}\` ${channel}`;
    })
    .join("\n");

  return interaction.editReply({
    embeds: [
      {
        color: 0x2ecc71,
        title: "📋 Auto Find List",
        description: list,
        footer: {
          text: "Gunakan /delauto id:<id> untuk menghapus",
        },
      },
    ],
  });
}

export async function execute({ interaction }) {
  const discordId = interaction.user.id;
  const { role, max, expires } = await getUserAutoLimit(discordId);

  const [[cnt]] = await db.execute(
    `SELECT COUNT(*) AS total FROM auto_find WHERE discord_id=?`,
    [discordId]
  );

  const roleMeta = {
    dev: { icon: "🛠️", label: "Developer", color: 0xe74c3c },
    custom: { icon: "🎯", label: "Custom", color: 0xf1c40f },
    premium: { icon: "💎", label: "Premium", color: 0x3498db },
    donator: { icon: "🔥", label: "Donator", color: 0xe67e22 },
    user: { icon: "👤", label: "User", color: 0x95a5a6 },
  };

  const meta = roleMeta[role];
  const percent = max === Infinity ? 1 : cnt.total / max;
  const filled = Math.min(10, Math.round(percent * 10));
  const bar = "█".repeat(filled) + "░".repeat(10 - filled);

  const row = new ActionRowBuilder().addComponents(
    new ButtonBuilder()
      .setCustomId("profile_list_auto")
      .setLabel("📋 List Auto")
      .setStyle(ButtonStyle.Secondary)
  );

  return interaction.reply({
    embeds: [
      {
        color: meta.color,
        title: `${meta.icon} User Profile`,
        thumbnail: {
          url: interaction.user.displayAvatarURL({ dynamic: true }),
        },
        fields: [
          {
            name: "🆔 Account",
            value: `**${interaction.user.username}**\n${interaction.user.id}`,
          },
          {
            name: "🏷️ Role",
            value: meta.label,
            inline: true,
          },
          {
            name: "⏱️ Expiry",
            value: expires
              ? `<t:${Math.floor(new Date(expires).getTime() / 1000)}:R>`
              : "—",
            inline: true,
          },
          {
            name: "⚙️ Auto Find Usage",
            value: `\`${bar}\`\n${cnt.total} / ${max === Infinity ? "∞" : max}`,
          },
        ],
        footer: { text: "Auto Find System • BOT FIVEM" },
        timestamp: new Date(),
      },
    ],
    components: [row],
    flags: 64,
  });
}
