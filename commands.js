// commands.js
import { PermissionFlagsBits } from "discord.js";

import { ADMINS } from "./config.js";
import * as findCommand from "./commands/find.js";
import * as spyCommand from "./commands/spy.js";
import * as playtimeCommand from "./commands/playtime.js";
import * as setautoCommand from "./commands/setauto.js";
import * as delautoCommand from "./commands/delauto.js";
import * as profileCommand from "./commands/profile.js";
import * as addserverCommand from "./commands/addserver.js";
import * as editserverCommand from "./commands/editserver.js";
import * as delserverCommand from "./commands/delserver.js";

const commands = [
  findCommand,
  spyCommand,
  playtimeCommand,
  setautoCommand,
  delautoCommand,
  profileCommand,
  addserverCommand,
  editserverCommand,
  delserverCommand,
];

const commandMap = new Map(commands.map((command) => [command.name, command]));

export function registerCommands(client) {
  client.on("interactionCreate", async (interaction) => {
    if (interaction.isButton()) {
      for (const command of commands) {
        if (
          command.buttonId &&
          command.handleButton &&
          interaction.customId === command.buttonId
        ) {
          await command.handleButton(interaction);
          return;
        }
      }
    }

    if (!interaction.isChatInputCommand()) return;

    const cmd = interaction.commandName;
    const isAdmin =
      ADMINS.includes(interaction.user.id) ||
      interaction.memberPermissions?.has(PermissionFlagsBits.Administrator);

    const command = commandMap.get(cmd);
    if (!command) return;

    await command.execute({ interaction, isAdmin });
  });
}
