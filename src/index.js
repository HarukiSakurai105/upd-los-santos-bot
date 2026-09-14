import {
  ActivityType,
  Client,
  Events,
  GatewayIntentBits,
  REST,
  Routes,
} from 'discord.js';
import http from 'node:http';
import { commandData } from './commands.js';
import { config, validateConfig } from './config.js';
import { handleInteraction, restorePendingTicketDeletions, sendLeave, sendWelcome } from './interactions.js';
import { recoverGuildState } from './recovery.js';

validateConfig();

const health = {
  startedAt: new Date().toISOString(),
  discordReady: false,
  botTag: null,
  guildId: config.guildId
};

const port = Number(process.env.PORT || 3000);
const healthServer = http.createServer((request, response) => {
  if (request.url !== '/' && request.url !== '/health') {
    response.writeHead(404, { 'content-type': 'application/json; charset=utf-8' });
    return response.end(JSON.stringify({ ok: false, error: 'Not found' }));
  }
  response.writeHead(200, { 'content-type': 'application/json; charset=utf-8', 'cache-control': 'no-store' });
  return response.end(JSON.stringify({ ok: true, service: 'UPD Los Santos Bot', ...health }));
});

healthServer.listen(port, '0.0.0.0', () => console.log(`✅ Health server listening on port ${port}`));

const client = new Client({
  intents: [
    GatewayIntentBits.Guilds,
    GatewayIntentBits.GuildMembers,
    GatewayIntentBits.GuildModeration,
    GatewayIntentBits.GuildMessages,
  ]
});

client.once(Events.ClientReady, async readyClient => {
  console.log(`✅ Bot online: ${readyClient.user.tag}`);
  health.discordReady = true;
  health.botTag = readyClient.user.tag;
  readyClient.user.setPresence({
    activities: [{ name: `${config.brandName} • /help`, type: ActivityType.Watching }],
    status: 'online'
  });
  try {
    const rest = new REST({ version: '10' }).setToken(config.token);
    await rest.put(Routes.applicationGuildCommands(config.clientId, config.guildId), { body: commandData });
    console.log(`✅ Đã đăng ký ${commandData.length} slash command cho server ${config.guildId}`);
  } catch (error) {
    console.error('Không thể đăng ký slash commands:', error);
  }
  try {
    const guild = await readyClient.guilds.fetch(config.guildId);
    const recovery = await recoverGuildState(guild);
    if (recovery.recovered) console.log(`✅ Đã đồng bộ ${recovery.roles} role và ${recovery.channels} kênh từ Discord`);
    else console.warn(`⚠️ Không thể tự khôi phục đầy đủ. Thiếu ${recovery.missingRoles.length} role và ${recovery.missingChannels.length} kênh; hãy chạy /setup.`);
    await restorePendingTicketDeletions(guild);
  } catch (error) {
    console.error('Không thể tự khôi phục cấu hình server:', error);
  }
});

client.on(Events.InteractionCreate, handleInteraction);
client.on(Events.GuildMemberAdd, sendWelcome);
client.on(Events.GuildMemberRemove, sendLeave);

process.on('unhandledRejection', error => console.error('Unhandled rejection:', error));
process.on('uncaughtException', error => console.error('Uncaught exception:', error));

async function shutdown(signal) {
  console.log(`Received ${signal}, shutting down…`);
  health.discordReady = false;
  client.destroy();
  healthServer.close(() => process.exit(0));
  setTimeout(() => process.exit(0), 10_000).unref();
}

process.once('SIGTERM', () => shutdown('SIGTERM'));
process.once('SIGINT', () => shutdown('SIGINT'));

client.login(config.token);
