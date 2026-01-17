import { db } from "../config.js";

export function normalizeSearch(str) {
  return str
    .toLowerCase()
    .replace(/[^a-z0-9\s]/g, " ")
    .replace(/\s+/g, " ")
    .trim();
}

export function formatDateIndo(dateInput) {
  const d = new Date(dateInput);
  const hari = ["Minggu", "Senin", "Selasa", "Rabu", "Kamis", "Jumat", "Sabtu"][
    d.getDay()
  ];
  const dd = String(d.getDate()).padStart(2, "0");
  const mm = String(d.getMonth() + 1).padStart(2, "0");
  const yyyy = d.getFullYear();
  return `${hari}, ${dd}/${mm}/${yyyy},`;
}

export async function getUserAutoLimit(discordId) {
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
