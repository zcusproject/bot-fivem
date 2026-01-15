// commands.js
import {
  PermissionFlagsBits,
  ActionRowBuilder,
  ButtonBuilder,
  ButtonStyle,
} from "discord.js";

import {
  SERVERS,
  ADMINS,
  formatDuration,
  normalizeName,
  playDateWIB,
  makeEmbed,
  makeRefreshEmbed,
  calcWidths,
  formatPlayerLine,
} from "./config.js";

import { fetchPlayers } from "./services.js";
import { db } from "./config.js";

/* ================= HELPER ================= */
function normalizeSearch(str) {
  return str
    .toLowerCase()
    .replace(/[^a-z0-9\s]/g, " ")
    .replace(/\s+/g, " ")
    .trim();
}

function formatDateIndo(dateInput) {
  const d = new Date(dateInput);
  const hari = ["Minggu", "Senin", "Selasa", "Rabu", "Kamis", "Jumat", "Sabtu"][
    d.getDay()
  ];
  const dd = String(d.getDate()).padStart(2, "0");
  const mm = String(d.getMonth() + 1).padStart(2, "0");
  const yyyy = d.getFullYear();
  return `${hari}, ${dd}/${mm}/${yyyy},`;
}

/* ================= ROLE HELPER ================= */
async function getUserAutoLimit(discordId) {
  const [[row]] = await db.execute(
    `SELECT role, max_auto, expires_at
     FROM user_roles
     WHERE discord_id=? LIMIT 1`,
    [discordId]
  );

  if (!row) return { role: "user", max: 1, expires: null };

  // ⏱️ Expired → downgrade otomatis
  if (row.expires_at && new Date(row.expires_at) < new Date()) {
    return { role: "user", max: 1, expires: null };
  }

  switch (row.role) {
    case "dev":
      return { role: "dev", max: Infinity, expires: null };
    case "custom":
      return {
        role: "custom",
        max: row.max_auto || 1,
        expires: row.expires_at,
      };
    case "premium":
      return { role: "premium", max: 3, expires: row.expires_at };
    case "donator":
      return { role: "donator", max: 5, expires: row.expires_at };
    default:
      return { role: "user", max: 1, expires: null };
  }
}

/* ================= COMMAND HANDLER ================= */
export function registerCommands(client) {
  client.on("interactionCreate", async (interaction) => {
    /* =================================================
   BUTTON HANDLER
   ================================================= */
    if (interaction.isButton()) {
      if (interaction.customId !== "profile_list_auto") return;

      // ⏳ cegah interaction expired
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

    /* =================================================
       SLASH COMMAND
       ================================================= */
    if (!interaction.isChatInputCommand()) return;

    const cmd = interaction.commandName;
    const isAdmin =
      ADMINS.includes(interaction.user.id) ||
      interaction.memberPermissions?.has(PermissionFlagsBits.Administrator);

    /* ================= /find ================= */
    if (cmd === "find") {
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

    /* ================= /spy ================= */
    if (cmd === "spy") {
      if (!isAdmin)
        return interaction.reply({ content: "❌ Tidak punya izin", flags: 64 });

      const server = interaction.options.getString("server")?.toLowerCase();
      const id = interaction.options.getInteger("id");

      if (!server || !SERVERS[server])
        return interaction.reply({
          content: "❌ Server tidak ditemukan",
          flags: 64,
        });

      const players = await fetchPlayers(SERVERS[server]);
      const p = players.find((x) => x.id === id);

      if (!p)
        return interaction.reply({
          content: "❌ Player tidak ditemukan",
          flags: 64,
        });

      const today = playDateWIB();
      const key = normalizeName(p.name);
      const [r] = await db.execute(
        `SELECT playtime_seconds FROM playtime_logs
         WHERE player_key=? AND play_date=?`,
        [key, today]
      );

      return interaction.reply({
        embeds: [
          makeEmbed(
            `🕵️ SPY (${server.toUpperCase()})`,
            `\`\`\`
ID   : ${p.id}
Name : ${p.name}
Ping : ${p.ping} ms
Time : ${r.length ? formatDuration(r[0].playtime_seconds) : "00:00:00"}
\`\`\``,
            "Orange"
          ),
        ],
      });
    }

    /* ================= /playtime ================= */
    if (cmd === "playtime") {
      const query = interaction.options.getString("nama")?.trim();
      if (!query)
        return interaction.reply({
          content: "❌ Query tidak valid",
          flags: 64,
        });

      const today = playDateWIB();
      let rows;

      if (/^\d+$/.test(query)) {
        const [todayRows] = await db.execute(
          `SELECT player_name FROM playtime_logs
           WHERE player_id=? AND play_date=? LIMIT 1`,
          [Number(query), today]
        );
        if (!todayRows.length)
          return interaction.reply({
            content: "❌ Player ID tidak ditemukan hari ini",
            flags: 64,
          });

        const key = normalizeName(todayRows[0].player_name);
        [rows] = await db.execute(
          `SELECT play_date, player_id, player_name, playtime_seconds
           FROM playtime_logs
           WHERE player_key=?
           ORDER BY play_date DESC LIMIT 30`,
          [key]
        );
      } else {
        const key = normalizeName(query);
        [rows] = await db.execute(
          `SELECT play_date, player_id, player_name, playtime_seconds
           FROM playtime_logs
           WHERE player_key=? OR player_name LIKE ?
           ORDER BY play_date DESC LIMIT 30`,
          [key, `%${query}%`]
        );
      }

      if (!rows.length)
        return interaction.reply({
          content: "❌ Tidak ada data playtime",
          flags: 64,
        });

      const lines = rows.map((r) => {
        const dateCol = formatDateIndo(r.play_date).padEnd(21);
        const idCol = `[${r.player_id}]`.padEnd(8);
        return `${dateCol}${idCol}${r.player_name} → ${formatDuration(
          r.playtime_seconds
        )}`;
      });

      return interaction.reply({
        embeds: [
          makeEmbed(
            "📊 Riwayat Playtime",
            `\`\`\`\n${lines.join("\n")}\n\`\`\``,
            "Green"
          ),
        ],
      });
    }

    /* ================= /setauto ================= */
    if (cmd === "setauto") {
      if (!isAdmin)
        return interaction.reply({ content: "❌ Admin only", flags: 64 });

      const server = interaction.options.getString("server")?.toLowerCase();
      const keyword = interaction.options.getString("keyword")?.trim();
      const channelOpt = interaction.options.getChannel("channel");
      const channelId = channelOpt?.id || interaction.channelId;

      if (!server || !SERVERS[server])
        return interaction.reply({
          content: "❌ Server tidak valid",
          flags: 64,
        });

      if (!keyword)
        return interaction.reply({ content: "❌ Keyword kosong", flags: 64 });

      const discordId = interaction.user.id;
      const { role, max } = await getUserAutoLimit(discordId);

      const [[cnt]] = await db.execute(
        `SELECT COUNT(*) AS total FROM auto_find WHERE discord_id=?`,
        [discordId]
      );

      if (cnt.total >= max)
        return interaction.reply({
          content: `❌ Limit Auto Tercapai\nRole: **${role}**\nMax: **${max}**`,
          flags: 64,
        });

      const embed = makeRefreshEmbed({
        keyword,
        server,
        table: "Menunggu data...",
        found: 0,
        max: SERVERS[server].maxPlayers || 0,
      });

      const msg = await interaction.channel.send({ embeds: [embed] });

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

    /* ================= /delauto ================= */
    if (cmd === "delauto") {
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

    /* ================= /profile ================= */
    if (cmd === "profile") {
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
                value: `\`${bar}\`\n${cnt.total} / ${
                  max === Infinity ? "∞" : max
                }`,
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
  });
}
