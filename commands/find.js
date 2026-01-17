import {
  SERVERS,
  formatDuration,
  normalizeName,
  playDateWIB,
  makeEmbed,
  calcWidths,
  formatPlayerLine,
  db,
} from "../config.js";
import { fetchPlayers } from "../services.js";
import { normalizeSearch } from "./helpers.js";

export const name = "find";

export async function execute({ interaction }) {
  const server = interaction.options.getString("server")?.toLowerCase();
  const keyword = interaction.options.getString("nama")?.trim();

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

  const players = await fetchPlayers(SERVERS[server]);
  const keyNorm = normalizeSearch(keyword);
  const found = players.filter((p) =>
    normalizeSearch(p.name).includes(keyNorm)
  );

  if (!found.length)
    return interaction.reply({
      content: "❌ Player tidak ditemukan",
      flags: 64,
    });

  const today = playDateWIB();
  const rows = [];

  for (const p of found) {
    const key = normalizeName(p.name);
    const [r] = await db.execute(
      `SELECT playtime_seconds FROM playtime_logs
       WHERE player_key=? AND play_date=?`,
      [key, today]
    );

    rows.push({
      id: p.id,
      name: p.name,
      ping: p.ping,
      time: r.length ? formatDuration(r[0].playtime_seconds) : "00:00:00",
    });
  }

  const widths = calcWidths(rows);
  const lines = rows.map((r) => formatPlayerLine(r, widths));

  return interaction.reply({
    embeds: [
      makeEmbed(
        `🔍 FIND (${server.toUpperCase()})`,
        `\`\`\`\n${lines.join("\n")}\n\`\`\``,
        "Blue"
      ),
    ],
  });
}
