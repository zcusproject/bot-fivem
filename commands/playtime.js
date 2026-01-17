import { makeEmbed, normalizeName, formatDuration, db } from "../config.js";
import { formatDateIndo } from "./helpers.js";

export const name = "playtime";

export async function execute({ interaction }) {
  const key = interaction.options.getString("nama")?.trim();
  if (!key)
    return interaction.reply({
      content: "❌ Nama / ID tidak valid",
      flags: 64,
    });

  const [rows] = await db.execute(
    `SELECT play_date, playtime_seconds
     FROM playtime_logs
     WHERE player_key=?
     ORDER BY play_date DESC LIMIT 14`,
    [normalizeName(key)]
  );

  if (!rows.length)
    return interaction.reply({
      content: "❌ Data playtime tidak ditemukan",
      flags: 64,
    });

  const lines = rows.map(
    (r) => `${formatDateIndo(r.play_date)} ${formatDuration(r.playtime_seconds)}`
  );

  return interaction.reply({
    embeds: [
      makeEmbed(
        `⏱️ PLAYTIME (${key})`,
        `\`\`\`\n${lines.join("\n")}\n\`\`\``,
        "Green"
      ),
    ],
  });
}
