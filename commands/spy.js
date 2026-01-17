import { SERVERS, makeEmbed } from "../config.js";
import { fetchPlayers } from "../services.js";

export const name = "spy";

export async function execute({ interaction, isAdmin }) {
  if (!isAdmin)
    return interaction.reply({
      content: "❌ Admin only",
      flags: 64,
    });

  const server = interaction.options.getString("server")?.toLowerCase();
  const id = interaction.options.getInteger("id");

  if (!server || !SERVERS[server])
    return interaction.reply({
      content: "❌ Server tidak ditemukan",
      flags: 64,
    });

  const players = await fetchPlayers(SERVERS[server]);
  const player = players.find((p) => p.id === id);

  if (!player)
    return interaction.reply({
      content: "❌ Player tidak ditemukan",
      flags: 64,
    });

  const info = player.identifiers?.join("\n") || "-";

  return interaction.reply({
    embeds: [
      makeEmbed(
        `🕵️ SPY (${server.toUpperCase()})`,
        `**ID:** ${player.id}\n**Nama:** ${player.name}\n**Ping:** ${
          player.ping
        }\n**Identifiers:**\n\`\`\`\n${info}\n\`\`\``,
        "Orange"
      ),
    ],
  });
}
