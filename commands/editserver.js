import { SERVERS, saveConfig } from "../config.js";

export const name = "editserver";

export async function execute({ interaction, isAdmin }) {
  if (!isAdmin)
    return interaction.reply({
      content: "❌ Kamu tidak punya akses",
      flags: 64,
    });

  const serverKeyRaw = interaction.options.getString("id")?.trim();
  const serverCode = interaction.options.getString("kodeserver")?.trim();

  if (!serverKeyRaw || !serverCode)
    return interaction.reply({
      content: "❌ ID server atau kodeserver tidak valid",
      flags: 64,
    });

  const serverKey = serverKeyRaw.toLowerCase();

  if (!SERVERS[serverKey])
    return interaction.reply({
      content: `❌ Server **${serverKey}** tidak ditemukan`,
      flags: 64,
    });

  SERVERS[serverKey] = serverCode;
  saveConfig();

  return interaction.reply({
    content: `✅ Server **${serverKey}** berhasil diupdate`,
    flags: 64,
  });
}
