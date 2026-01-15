import { db, normalizeName, playDateWIB, nowWIB } from "./config.js";

/* ================= FETCH SERVER ================= */
export async function fetchPlayers(serverId) {
  try {
    const controller = new AbortController();
    const timeout = setTimeout(() => controller.abort(), 8000);

    const res = await fetch(
      `https://servers-frontend.fivem.net/api/servers/single/${serverId}`,
      { signal: controller.signal }
    );

    clearTimeout(timeout);

    if (!res.ok) return [];
    const json = await res.json();
    return json?.Data?.players || [];
  } catch {
    return [];
  }
}

/* ================= PLAYTIME (RESET 05:59 WIB) ================= */
export async function updatePlaytime(players) {
  if (!players.length) return { updated: 0 };

  const playDate = playDateWIB(5, 59); // 🔥 RESET JAM 05:59
  const now = nowWIB();
  let updated = 0;

  for (const p of players) {
    const key = normalizeName(p.name);

    const [rows] = await db.execute(
      `SELECT id, last_seen
       FROM playtime_logs
       WHERE player_key=? AND play_date=?
       LIMIT 1`,
      [key, playDate]
    );

    if (!rows.length) {
      await db.execute(
        `INSERT INTO playtime_logs
         (player_key, player_id, player_name, play_date, last_seen, playtime_seconds)
         VALUES (?, ?, ?, ?, ?, 0)`,
        [key, p.id, p.name, playDate, now]
      );
      continue;
    }

    const lastSeen = new Date(rows[0].last_seen);
    const diff = Math.floor((now - lastSeen) / 1000);

    if (diff > 0 && diff < 120) {
      await db.execute(
        `UPDATE playtime_logs
         SET playtime_seconds = playtime_seconds + ?,
             last_seen=?, player_id=?, player_name=?
         WHERE id=?`,
        [diff, now, p.id, p.name, rows[0].id]
      );
      updated++;
    } else {
      await db.execute(
        `UPDATE playtime_logs
         SET last_seen=?, player_id=?, player_name=?
         WHERE id=?`,
        [now, p.id, p.name, rows[0].id]
      );
    }
  }

  return { updated };
}
