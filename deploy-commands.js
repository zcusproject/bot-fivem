//deploy-commands.js
import {
  REST,
  Routes,
  SlashCommandBuilder,
  PermissionFlagsBits,
} from "discord.js";
import dotenv from "dotenv";
dotenv.config({ path: "./config/.env" });

/*
  WAJIB:
  - CLIENT_ID  = Application ID bot
  - DISCORD_TOKEN = Bot token
*/

const rest = new REST({ version: "10" }).setToken(process.env.DISCORD_TOKEN);

// ================= COMMAND DEFINITIONS =================
const commands = [
  /* ================= /find ================= */
  new SlashCommandBuilder()
    .setName("find")
    .setDescription("Cari player di server berdasarkan nama")
    .addStringOption((opt) =>
      opt
        .setName("server")
        .setDescription("Key server (sesuai config)")
        .setRequired(true)
    )
    .addStringOption((opt) =>
      opt
        .setName("nama")
        .setDescription("Nama / potongan nama player")
        .setRequired(true)
    ),

  /* ================= /spy ================= */
  new SlashCommandBuilder()
    .setName("spy")
    .setDescription("Lihat detail player berdasarkan ID (Admin)")
    .addStringOption((opt) =>
      opt
        .setName("server")
        .setDescription("Key server (sesuai config)")
        .setRequired(true)
    )
    .addIntegerOption((opt) =>
      opt.setName("id").setDescription("Player ID (FiveM)").setRequired(true)
    ),

  /* ================= /playtime ================= */
  new SlashCommandBuilder()
    .setName("playtime")
    .setDescription("Lihat riwayat playtime berdasarkan ID atau Nama")
    .addStringOption((opt) =>
      opt
        .setName("nama") // HARUS string & HARUS "nama"
        .setDescription("Player ID atau nama player")
        .setRequired(true)
    ),

  new SlashCommandBuilder()
    .setName("setauto")
    .setDescription("Set auto find (Admin)")
    .setDefaultMemberPermissions(PermissionFlagsBits.Administrator)
    .addStringOption((o) =>
      o.setName("server").setDescription("Server key").setRequired(true)
    )
    .addStringOption((o) =>
      o
        .setName("keyword")
        .setDescription("Keyword nama player")
        .setRequired(true)
    )
    .addChannelOption((o) =>
      o
        .setName("channel")
        .setDescription("Channel tujuan (opsional)")
        .setRequired(false)
    ),

  new SlashCommandBuilder()
    .setName("delauto")
    .setDescription("Hapus auto find")
    .addIntegerOption((o) =>
      o.setName("id").setDescription("ID auto (default 1)")
    ),
  new SlashCommandBuilder()
    .setName("profile")
    .setDescription("Lihat profile role & limit auto"),

    new SlashCommandBuilder()
    .setName("addserver")
    .setDescription("Tambah server baru (Admin)")
    .setDefaultMemberPermissions(PermissionFlagsBits.Administrator)
    .addStringOption((o) =>
      o.setName("id").setDescription("ID server").setRequired(true)
    )
    .addStringOption((o) =>
      o.setName("kodeserver").setDescription("Kode server").setRequired(true)
    ),

  new SlashCommandBuilder()
    .setName("editserver")
    .setDescription("Edit server (Admin)")
    .setDefaultMemberPermissions(PermissionFlagsBits.Administrator)
    .addStringOption((o) =>
      o.setName("id").setDescription("ID server").setRequired(true)
    )
    .addStringOption((o) =>
      o
        .setName("kodeserver")
        .setDescription("Kode server baru")
        .setRequired(true)
    ),

  new SlashCommandBuilder()
    .setName("delserver")
    .setDescription("Hapus server (Admin)")
    .setDefaultMemberPermissions(PermissionFlagsBits.Administrator)
    .addStringOption((o) =>
      o.setName("id").setDescription("ID server").setRequired(true)
    ),
];

// ================= DELETE + DEPLOY =================
(async () => {
  try {
    console.log("🗑️ Deleting ALL slash commands...");

    // STEP 1: DELETE ALL
    await rest.put(Routes.applicationCommands(process.env.CLIENT_ID), {
      body: [],
    });

    console.log("✅ All slash commands deleted");
    console.log("⏳ Waiting 3 seconds for Discord cache...");

    // delay kecil (penting)
    await new Promise((res) => setTimeout(res, 3000));

    console.log("🚀 Deploying slash commands...");

    // STEP 2: DEPLOY AGAIN
    await rest.put(Routes.applicationCommands(process.env.CLIENT_ID), {
      body: commands.map((cmd) => cmd.toJSON()),
    });

    console.log("✅ Slash commands reset & deployed successfully");
  } catch (err) {
    console.error("❌ Failed to reset commands:", err);
  }
})();
