import { makeRefreshEmbed, normalizeName, SERVERS, db } from "../config.js";
import { getUserAutoLimit } from "./helpers.js";

export const name = "setauto";

export async function execute({ interaction, isAdmin }) {
  if (!isAdmin)
    return interaction.reply({ content: "❌ Admin only", flags: 64 });

  const server = interaction.options.getString("server")?.toLowerCase();
  const keyword = interaction.options.getString("keyword")?.trim();
  const channel = interaction.options.getChannel("channel");
  const channelId = channel?.id || interaction.channelId;
  const discordId = interaction.user.id;

  if (!server || !SERVERS[server])
    return interaction.reply({
      content: "❌ Server tidak ditemukan",
      flags: 64,
    });

  if (!keyword)
    return interaction.reply({
      content: "❌ Keyword tidak valid",
      flags: 64,
    });

  const role = normalizeName(keyword);
  const count = await getUserAutoLimit(discordId);

  const [[cnt]] = await db.execute(
    `SELECT COUNT(*) AS total FROM auto_find WHERE discord_id=?`,
    [discordId]
  );

  if (cnt.total >= count.max)
    return interaction.reply({
      content: `❌ Limit Auto Find kamu sudah habis (${cnt.total}/${count.max})`,
      flags: 64,
    });

  const msg = await interaction.channel.send({
    embeds: [
      makeRefreshEmbed({
        keyword,
        server,
        table: "Loading...",
        found: 0,
        max: 0,
      }),
    ],
  });

  await db.execute(
    `INSERT INTO auto_find
     (discord_id, server_key, keyword, channel_id, message_id, role)
     VALUES (?, ?, ?, ?, ?, ?)`,
    [discordId, server, keyword, channelId, msg.id, role]
  );

  return interaction.reply({
    content: "✅ Auto Find Aktif",
    flags: 64,
  });
}
