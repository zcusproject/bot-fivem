import { SERVERS, saveConfig } from "../config.js";

export const name = "delserver";

export async function execute({ interaction, isAdmin }) {
  if (!isAdmin)
    return interaction.reply({
      content: "❌ Kamu tidak punya akses",
      flags: 64,
    });

  const serverKeyRaw = interaction.options.getString("id")?.trim();

  if (!serverKeyRaw)
    return interaction.reply({
      content: "❌ ID server tidak valid",
      flags: 64,
    });

  const serverKey = serverKeyRaw.toLowerCase();

  if (!SERVERS[serverKey])
    return interaction.reply({
      content: `❌ Server **${serverKey}** tidak ditemukan`,
      flags: 64,
    });

  delete SERVERS[serverKey];
  saveConfig();

  return interaction.reply({
    content: `✅ Server **${serverKey}** berhasil dihapus`,
    flags: 64,
  });
}
