import { db } from "../config.js";

export const name = "delauto";

export async function execute({ interaction, isAdmin }) {
  if (!isAdmin)
    return interaction.reply({ content: "❌ Admin only", flags: 64 });

  const id = interaction.options.getInteger("id") ?? 1;
  const discordId = interaction.user.id;

  const [res] = await db.execute(
    `DELETE FROM auto_find WHERE id=? AND discord_id=?`,
    [id, discordId]
  );

  if (!res.affectedRows)
    return interaction.reply({
      content: "❌ Auto tidak ditemukan",
      flags: 64,
    });

  return interaction.reply({
    content: `✅ Auto ID ${id} dihapus`,
    flags: 64,
  });
}
