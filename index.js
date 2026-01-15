// index.js
import { client, startAutoRefresh } from "./bot.js";
import { registerCommands } from "./commands.js";
import { Events } from "discord.js";
import "dotenv/config";

console.log("====================================");
console.log("🚀 Starting FiveM Discord Bot...");
console.log("====================================");

client.once(Events.ClientReady, c => {
  console.log(`✅ Logged in as ${c.user.tag}`);
  console.log(`📡 Connected to ${c.guilds.cache.size} guild(s)`);
  console.log("⏱ Auto refresh started");
  console.log("⚙️ Commands registered");
  console.log("====================================");

  registerCommands(client);
  startAutoRefresh();
});

client.login(process.env.DISCORD_TOKEN).catch(err => {
  console.error("❌ Failed to login:", err);
});
