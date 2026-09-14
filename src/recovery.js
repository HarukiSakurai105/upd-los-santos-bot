import { ChannelType } from 'discord.js';
import { channelGroups, roleSpecs } from './template.js';
import { getGuildData, updateGuildData } from './storage.js';

export async function recoverGuildState(guild) {
  await guild.roles.fetch();
  await guild.channels.fetch();
  const stored = await getGuildData(guild.id);

  const roles = {};
  const channels = {};
  const missingRoles = [];
  const missingChannels = [];

  for (const spec of roleSpecs) {
    const role = guild.roles.cache.get(stored.roles?.[spec.key]);
    if (role) roles[spec.key] = role.id;
    else missingRoles.push(spec.name);
  }

  for (const group of channelGroups) {
    const category = guild.channels.cache.get(stored.channels?.[group.key]);
    if (!category || category.type !== ChannelType.GuildCategory) {
      missingChannels.push(group.name);
      continue;
    }
    channels[group.key] = category.id;
    for (const spec of group.channels) {
      const expectedType = spec.voice ? ChannelType.GuildVoice : ChannelType.GuildText;
      const channel = guild.channels.cache.get(stored.channels?.[spec.key]);
      if (channel?.parentId === category.id && channel.type === expectedType) channels[spec.key] = channel.id;
      else missingChannels.push(`${group.name} / ${spec.name}`);
    }
  }

  if (missingRoles.length || missingChannels.length) {
    return { recovered: false, missingRoles, missingChannels };
  }

  await updateGuildData(guild.id, current => ({
    ...current,
    roles,
    channels,
    setupComplete: true,
    recoveredAt: new Date().toISOString()
  }));
  return { recovered: true, roles: Object.keys(roles).length, channels: Object.keys(channels).length };
}
