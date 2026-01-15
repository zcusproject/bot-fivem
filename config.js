import fs from "fs";
import mysql from "mysql2/promise";
import { EmbedBuilder } from "discord.js";
import dotenv from "dotenv";

dotenv.config({ path: "./config/.env" });

/* ================= CONFIG ================= */
const CONFIG_PATH = "./config/config.json";
export const config = JSON.parse(fs.readFileSync(CONFIG_PATH, "utf8"));

export const {
  author: AUTHOR_NAME = "Unknown",
  interval: INTERVAL = 10000,
  channels: CHANNELS = {},
  servers: SERVERS = {},
  admins: ADMINS = [],
} = config;

export function saveConfig() {
  fs.writeFileSync(CONFIG_PATH, JSON.stringify(config, null, 2));
}

/* ================= DATABASE ================= */
export const db = await mysql.createPool({
  host: process.env.DB_HOST || "127.0.0.1",
  user: process.env.DB_USER,
  password: process.env.DB_PASS,
  database: process.env.DB_NAME,
  port: process.env.DB_PORT || 3306,
  waitForConnections: true,
  connectionLimit: 10,
  queueLimit: 0,
});

/* ================= TIME (WIB) ================= */
export function nowWIB() {
  return new Date(
    new Date().toLocaleString("en-US", {
      timeZone: "Asia/Jakarta",
    })
  );
}

/* ===== FORMAT DATETIME WIB ===== */
export function formatDateTimeWIB(date = nowWIB()) {
  return (
    date.toLocaleString("id-ID", {
      timeZone: "Asia/Jakarta",
      day: "2-digit",
      month: "2-digit",
      year: "numeric",
      hour: "2-digit",
      minute: "2-digit",
      second: "2-digit",
    }) + " WIB"
  );
}

/* ================= PLAY DATE (RESET 05:59 WIB) ================= */
export function playDateWIB(resetHour = 5, resetMinute = 59) {
  const now = nowWIB();
  const h = now.getHours();
  const m = now.getMinutes();

  if (h < resetHour || (h === resetHour && m < resetMinute)) {
    now.setDate(now.getDate() - 1);
  }

  return now.toLocaleDateString("en-CA", {
    timeZone: "Asia/Jakarta",
  });
}

/* ================= UTIL ================= */
export function normalizeName(name) {
  return name.toLowerCase().trim().replace(/\s+/g, " ");
}

export function formatDuration(sec) {
  const h = Math.floor(sec / 3600);
  const m = Math.floor((sec % 3600) / 60);
  const s = sec % 60;

  return (
    String(h).padStart(2, "0") + ":" +
    String(m).padStart(2, "0") + ":" +
    String(s).padStart(2, "0")
  );
}

/* ================= FORMAT KOLOM PLAYER ================= */
export function calcWidths(rows) {
  return {
    id: Math.max(...rows.map(r => `[${r.id}]`.length)) + 1,
    name: Math.max(...rows.map(r => r.name.length)) + 2,
    ping: Math.max(...rows.map(r => `(${r.ping}ms)`.length)) + 1,
  };
}

export function formatPlayerLine({ id, name, ping, time }, w) {
  return (
    `[${id}]`.padEnd(w.id) +
    name.trimEnd().padEnd(w.name) + // ⬅️ PENTING
    // `(${ping}ms)`.padEnd(w.ping) +
    "" +
    time
  );
}


/* ================= EMBED (GENERIC) ================= */
export function makeEmbed(title, desc, color = "Blue") {
  return new EmbedBuilder()
    .setTitle(title)
    .setDescription(desc)
    .setColor(color)
    .setTimestamp(nowWIB())
    .setFooter({
      text: `Made by ${AUTHOR_NAME} | ${formatDateTimeWIB()}`,
    });
}

/* ================= EMBED (AUTO REFRESH / INTERVAL) ================= */
/**
 * Digunakan khusus untuk embed yang di-refresh tiap INTERVAL
 *
 * @param {Object} opt
 * @param {string} opt.logo     - emoji icon (👨‍⚕️ / 👮 / 🚑)
 * @param {string} opt.keyword  - Tabib / Polisi / EMS
 * @param {string} opt.server   - alpha / beta
 * @param {string} opt.table    - tabel player (string)
 * @param {number} opt.found    - jumlah player ditemukan
 * @param {number} opt.max      - max player server
 * @param {string} opt.color
 */
export function makeRefreshEmbed({
  logo = "👥",
  keyword,
  server,
  table,
  found,
  max,
  color = "Blue",
}) {
  return new EmbedBuilder()
    .setTitle(`${logo} ${keyword.toUpperCase()} ONLINE — ${server.toUpperCase()}`)
    .setDescription(`\`\`\`\n${table}\n\`\`\``)
    .setColor(color)

    // ⬇️ INI FORMAT YANG ANDA CONTOHKAN
    .addFields(
      {
        name: "Ditemukan",
        value: `\`\`\`\n${found}\n\`\`\``,
        inline: true,
      },
      {
        name: "Max Player",
        value: `\`\`\`\n${max}\n\`\`\``,
        inline: true,
      }
    )

    .setTimestamp(nowWIB())
    .setFooter({
      text: `Made by ${AUTHOR_NAME} | ${formatDateTimeWIB()}`,
    });
}



