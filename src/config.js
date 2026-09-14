import 'dotenv/config';

export const config = {
  token: process.env.DISCORD_TOKEN,
  clientId: process.env.CLIENT_ID,
  guildId: process.env.GUILD_ID,
  timezone: process.env.TIMEZONE || 'Asia/Ho_Chi_Minh',
  brandName: process.env.BRAND_NAME || 'UPD Los Santos',
  color: Number.parseInt(process.env.BRAND_COLOR || '1E90FF', 16),
};

export function validateConfig() {
  const missing = [];
  if (!config.token) missing.push('DISCORD_TOKEN');
  if (!config.clientId) missing.push('CLIENT_ID');
  if (!config.guildId) missing.push('GUILD_ID');
  if (missing.length) throw new Error(`Thieu bien moi truong: ${missing.join(', ')}`);
}

