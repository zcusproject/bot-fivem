import { Client, GatewayIntentBits } from "discord.js";
import {
  INTERVAL,
  CHANNELS,
  SERVERS,
  saveConfig,
  makeRefreshEmbed,
  formatDuration,
  normalizeName,
  playDateWIB,
  calcWidths,
  formatPlayerLine,
  db,
} from "./config.js";
import { fetchPlayers, updatePlaytime } from "./services.js";

export const client = new Client({
  intents: [GatewayIntentBits.Guilds],
});

/* ================= COLOR HELPER ================= */
// Palette warna aman Discord
const COLOR_POOL = [
  "Blue",
  "Green",
  "Yellow",
  "Orange",
  "Red",
  "Purple",
  "Aqua",
  "Gold",
  "DarkBlue",
  "DarkGreen",
  "DarkPurple",
];

let colorIndex = 0;

// 🌈 Rotasi warna tiap refresh (RECOMMENDED)
function nextColor() {
  const color = COLOR_POOL[colorIndex];
  colorIndex = (colorIndex + 1) % COLOR_POOL.length;
  return color;
}

// (opsional) warna berdasarkan jumlah player
// function colorByCount(count) {
//   if (count === 0) return "Red";
//   if (count <= 2) return "Orange";
//   if (count <= 5) return "Yellow";
//   return "Green";
// }

/* ================= AUTO FIND (DB) ================= */
async function runAutoFind(players, serverKey) {
  const playDate = playDateWIB(5, 59);

  const [autos] = await db.execute(
    `SELECT * FROM auto_find WHERE server_key=?`,
    [serverKey]
  );

  for (const auto of autos) {
    const keyword = auto.keyword.toLowerCase();

    const foundPlayers = players.filter((p) =>
      p.name.toLowerCase().includes(keyword)
    );

    let rows = [];
    let table = "Tidak ada player online";

    if (foundPlayers.length) {
      rows = await Promise.all(
        foundPlayers.map(async (p) => {
          const key = normalizeName(p.name);
          const [r] = await db.execute(
            `SELECT playtime_seconds
             FROM playtime_logs
             WHERE player_key=? AND play_date=?`,
            [key, playDate]
          );

          return {
            id: p.id,
            name: p.name,
            ping: p.ping,
            time: r.length ? formatDuration(r[0].playtime_seconds) : "00:00:00",
          };
        })
      );

      const widths = calcWidths(rows);
      table = rows.map((r) => formatPlayerLine(r, widths)).join("\n");
    }

    const embed = makeRefreshEmbed({
      keyword: auto.keyword,
      server: serverKey,
      table,
      found: rows.length,
      max: players.length,
      color: nextColor(), // 🌈 WARNA BERUBAH TIAP REFRESH
    });

    const channel = await client.channels
      .fetch(auto.channel_id)
      .catch(() => null);

    if (!channel?.isTextBased()) continue;

    // 🔥 EDIT MESSAGE JIKA ADA
    if (auto.message_id) {
      const msg = await channel.messages
        .fetch(auto.message_id)
        .catch(() => null);

      if (msg) {
        await msg.edit({ embeds: [embed] });
        continue;
      }
    }

    // 🔁 FALLBACK JIKA MESSAGE HILANG
    const sent = await channel.send({ embeds: [embed] });
    await db.execute(`UPDATE auto_find SET message_id=? WHERE id=?`, [
      sent.id,
      auto.id,
    ]);
  }
}

/* ================= AUTO REFRESH LOOP ================= */
export function startAutoRefresh() {
  setInterval(async () => {
    try {
      const serverKey = Object.keys(SERVERS)[0];
      if (!serverKey) return;

      const server = SERVERS[serverKey];
      const players = await fetchPlayers(server);
      if (!players.length) return;

      // 🔥 UPDATE PLAYTIME
      const { updated } = await updatePlaytime(players);

      console.log(
        `[AUTO] ${serverKey} | Online: ${players.length} | Updated: ${updated}`
      );

      // 🔥 AUTO FIND (DB)
      await runAutoFind(players, serverKey);

      const playDate = playDateWIB(5, 59);

      /* ===== AUTO REFRESH EMBED (CONFIG.JSON) ===== */
      for (const [keyword, info] of Object.entries(CHANNELS)) {
        const channel = await client.channels
          .fetch(info.channelId)
          .catch(() => null);
        if (!channel?.isTextBased()) continue;

        const foundPlayers = players.filter((p) =>
          p.name.toLowerCase().startsWith(keyword.toLowerCase())
        );

        let rows = [];
        let table = "Tidak ada player online";

        if (foundPlayers.length) {
          rows = await Promise.all(
            foundPlayers.map(async (p) => {
              const key = normalizeName(p.name);
              const [r] = await db.execute(
                `SELECT playtime_seconds
                 FROM playtime_logs
                 WHERE player_key=? AND play_date=?`,
                [key, playDate]
              );

              return {
                id: p.id,
                name: p.name,
                ping: p.ping,
                time: r.length
                  ? formatDuration(r[0].playtime_seconds)
                  : "00:00:00",
              };
            })
          );

          const widths = calcWidths(rows);
          table = rows.map((r) => formatPlayerLine(r, widths)).join("\n");
        }

        const embed = makeRefreshEmbed({
          logo: info.logo || "👥",
          keyword,
          server: serverKey,
          table,
          found: rows.length,
          max: server.maxPlayers || players.length,
          color: nextColor(), // 🌈 WARNA BERUBAH TIAP REFRESH
          // atau: color: info.color || nextColor()
        });

        if (info.messageId) {
          const msg = await channel.messages
            .fetch(info.messageId)
            .catch(() => null);
          if (msg) await msg.edit({ embeds: [embed] });
        } else {
          const sent = await channel.send({ embeds: [embed] });
          info.messageId = sent.id;
          saveConfig();
        }
      }
    } catch (err) {
      console.error("[AUTO] ERROR:", err);
    }
  }, INTERVAL); // 10 detik
}
