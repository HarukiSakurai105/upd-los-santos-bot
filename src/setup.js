import { ChannelType, PermissionFlagsBits as P } from 'discord.js';
import { categoryOrderKeys, channelGroups, roleSpecs } from './template.js';
import { getGuildData, updateGuildData } from './storage.js';
import { postAgencyRankPanel, postGuide, postRecruitmentPanel, postRulesPanel, postSupportPanel } from './panels.js';

const staffKeys = ['founder', 'manager', 'admin', 'moderator'];
const oversightKeys = staffKeys;

function roleOverwrites(guild, roles, group) {
  const overwrites = [];
  if (group.privateRole) {
    overwrites.push({ id: guild.roles.everyone.id, deny: [P.ViewChannel] });
    if (roles[group.privateRole]) overwrites.push({ id: roles[group.privateRole].id, allow: [P.ViewChannel, P.ReadMessageHistory, P.SendMessages, P.Connect, P.Speak] });
  } else if (group.verified) {
    overwrites.push({ id: guild.roles.everyone.id, deny: [P.ViewChannel] });
    if (roles.verified) overwrites.push({ id: roles.verified.id, allow: [P.ViewChannel, P.ReadMessageHistory, P.SendMessages, P.Connect, P.Speak] });
  } else {
    overwrites.push({ id: guild.roles.everyone.id, allow: [P.ViewChannel, P.ReadMessageHistory] });
  }
  const existingIds = new Set(overwrites.map(item => item.id));
  for (const key of oversightKeys) {
    if (roles[key] && !existingIds.has(roles[key].id)) {
      overwrites.push({ id: roles[key].id, allow: [P.ViewChannel, P.ReadMessageHistory, P.SendMessages, P.Connect, P.Speak] });
      existingIds.add(roles[key].id);
    }
  }
  if (roles.muted) overwrites.push({ id: roles.muted.id, deny: [P.SendMessages, P.AddReactions, P.Speak] });
  return overwrites;
}

function childOverwrites(guild, roles, spec) {
  const result = [];
  if (spec.readOnly) {
    result.push({ id: guild.roles.everyone.id, deny: [P.SendMessages] });
    for (const key of oversightKeys) {
      if (roles[key]) result.push({ id: roles[key].id, allow: [P.ViewChannel, P.SendMessages, P.ReadMessageHistory] });
    }
  }
  for (const key of spec.allowedRoles || []) {
    if (roles[key]) result.push({ id: roles[key].id, allow: [P.ViewChannel, P.ReadMessageHistory, P.SendMessages] });
  }
  return result;
}

function mergeOverwrites(...lists) {
  const merged = new Map();
  for (const list of lists) {
    for (const overwrite of list) {
      const current = merged.get(overwrite.id) || { id: overwrite.id, allow: new Set(), deny: new Set() };
      for (const permission of overwrite.allow || []) {
        current.deny.delete(permission);
        current.allow.add(permission);
      }
      for (const permission of overwrite.deny || []) {
        current.allow.delete(permission);
        current.deny.add(permission);
      }
      merged.set(overwrite.id, current);
    }
  }
  return [...merged.values()].map(overwrite => ({
    id: overwrite.id,
    allow: [...overwrite.allow],
    deny: [...overwrite.deny]
  }));
}

async function ensureRole(guild, spec, storedRoleId) {
  const existing = storedRoleId ? guild.roles.cache.get(storedRoleId) : null;
  if (existing && !existing.managed) {
    if (existing.editable) {
      await existing.edit({
        name: spec.name,
        colors: { primaryColor: spec.color },
        permissions: spec.permissions || [],
        hoist: Boolean(spec.hoist),
        mentionable: false,
        reason: 'Normalize UPD managed role'
      });
    }
    return existing;
  }
  return guild.roles.create({
    name: spec.name,
    colors: { primaryColor: spec.color },
    permissions: spec.permissions || [],
    hoist: Boolean(spec.hoist),
    mentionable: false,
    reason: 'UPD automated server setup'
  });
}

async function ensureCategory(guild, spec, roles, storedChannelId) {
  const storedChannel = storedChannelId ? guild.channels.cache.get(storedChannelId) : null;
  const existing = storedChannel?.type === ChannelType.GuildCategory ? storedChannel : null;
  const intendedOverwrites = roleOverwrites(guild, roles, spec);
  if (existing) {
    if (existing.name !== spec.name) await existing.setName(spec.name, 'Normalize UPD category name');
    await existing.permissionOverwrites.set(intendedOverwrites, 'Repair UPD category permissions');
    return existing;
  }
  return guild.channels.create({
    name: spec.name,
    type: ChannelType.GuildCategory,
    permissionOverwrites: intendedOverwrites,
    reason: 'UPD automated server setup'
  });
}

async function ensureChannel(guild, category, group, spec, roles, storedChannelId) {
  const expectedType = spec.voice ? ChannelType.GuildVoice : ChannelType.GuildText;
  const storedChannel = storedChannelId ? guild.channels.cache.get(storedChannelId) : null;
  const existing = storedChannel?.parentId === category.id && storedChannel.type === expectedType ? storedChannel : null;
  const intendedOverwrites = mergeOverwrites(roleOverwrites(guild, roles, group), childOverwrites(guild, roles, spec));
  const channel = existing || await guild.channels.create({
      name: spec.name,
      type: expectedType,
      parent: category.id,
      topic: spec.voice ? undefined : (spec.topic || `Kênh chính thức của UPD Los Santos • ${spec.key}`),
      bitrate: spec.voice ? 64000 : undefined,
      userLimit: spec.voice ? 0 : undefined,
      permissionOverwrites: intendedOverwrites,
      reason: 'UPD automated server setup'
    });
  if (existing) {
    const edits = { name: spec.name };
    if (!spec.voice) edits.topic = spec.topic || `Kênh chính thức của UPD Los Santos • ${spec.key}`;
    if (channel.name !== spec.name || (!spec.voice && channel.topic !== edits.topic)) await channel.edit(edits, 'Normalize UPD channel');
    await channel.permissionOverwrites.set(intendedOverwrites, 'Repair UPD channel permissions');
  }
  return channel;
}

async function orderGuildStructure(guild, roles, channels) {
  const warnings = [];
  await guild.roles.fetch();
  const orderedRoles = roleSpecs.map(spec => roles[spec.key]).filter(Boolean);
  const uneditable = orderedRoles.filter(role => !role.editable);
  const botHighest = guild.members.me.roles.highest;
  if (!guild.members.me.permissions.has(P.ManageRoles)) {
    warnings.push('Bot thiếu quyền Manage Roles nên chưa thể sắp xếp role.');
  } else if (uneditable.length) {
    warnings.push(`Không thể sắp ${uneditable.length} role nằm ngang hoặc cao hơn role bot.`);
  } else if (botHighest.position <= orderedRoles.length) {
    warnings.push('Role bot chưa đủ cao để xếp toàn bộ role mẫu. Hãy kéo role bot lên cao nhất rồi chạy lại /setup.');
  } else {
    const highestTemplatePosition = botHighest.position - 1;
    const positions = orderedRoles.map((role, index) => ({ role, position: highestTemplatePosition - index }));
    try {
      await guild.roles.setPositions(positions);
    } catch (bulkError) {
      let failedBatches = 0;
      const batchSize = 15;
      for (let end = positions.length; end > 0; end -= batchSize) {
        const batch = positions.slice(Math.max(0, end - batchSize), end);
        try {
          await guild.roles.setPositions(batch);
        } catch {
          failedBatches += 1;
        }
      }
      if (failedBatches) {
        warnings.push(`Discord từ chối sắp ${failedBatches} nhóm role (${bulkError.code || bulkError.message}). Hãy cấp Manage Roles và kéo role bot lên cao nhất rồi chạy lại /setup.`);
      } else {
        warnings.push('Discord từ chối xếp role một lần; bot đã chuyển sang xếp theo từng nhóm và hoàn tất.');
      }
    }
  }

  try {
    const categories = categoryOrderKeys.map(key => channels[key]).filter(Boolean);
    await guild.channels.setPositions(categories.map((channel, index) => ({ channel, position: index })));
    for (const group of channelGroups) {
      const children = group.channels.map(spec => channels[spec.key]).filter(Boolean);
      if (children.length) await guild.channels.setPositions(children.map((channel, index) => ({ channel, position: index })));
    }
  } catch (error) {
    warnings.push(`Không thể sắp xếp một số category/kênh: ${error.message}`);
  }
  return warnings;
}

export async function setupGuild(guild, progress = async () => {}) {
  await guild.roles.fetch();
  await guild.channels.fetch();
  const stored = await getGuildData(guild.id);
  const roles = {};
  const channels = {};

  await progress('Đang tạo và kiểm tra role…');
  for (const spec of roleSpecs) roles[spec.key] = await ensureRole(guild, spec, stored.roles?.[spec.key]);

  await progress('Đang tạo category, kênh và phân quyền…');
  for (const group of channelGroups) {
    const category = await ensureCategory(guild, group, roles, stored.channels?.[group.key]);
    channels[group.key] = category;
    for (const spec of group.channels) channels[spec.key] = await ensureChannel(guild, category, group, spec, roles, stored.channels?.[spec.key]);
  }

  if (roles.ticket_handler) {
    const openTickets = guild.channels.cache.filter(channel => channel.type === ChannelType.GuildText && channel.topic?.startsWith('UPD ticket'));
    for (const ticket of openTickets.values()) {
      await ticket.permissionOverwrites.edit(roles.ticket_handler, { ViewChannel: true, SendMessages: true, ReadMessageHistory: true, ManageMessages: true });
    }
  }

  await progress('Đang sắp xếp role, category và kênh từ cao xuống thấp…');
  const orderingWarnings = await orderGuildStructure(guild, roles, channels);

  await progress('Đang đăng luật và các bảng điều khiển…');
  const state = await updateGuildData(guild.id, current => ({
    ...current,
    roles: Object.fromEntries(Object.entries(roles).map(([key, role]) => [key, role.id])),
    channels: Object.fromEntries(Object.entries(channels).map(([key, channel]) => [key, channel.id])),
    orderingWarnings,
    setupComplete: true,
    setupAt: new Date().toISOString()
  }));

  async function postOnce(channel, expectedTitle, sender) {
    const recent = await channel.messages.fetch({ limit: 50 });
    if (!recent.some(message => message.author.id === guild.members.me.id && message.embeds.some(embed => embed.title === expectedTitle || embed.title?.startsWith(expectedTitle)))) {
      const sent = await sender(channel);
      await sent.pin().catch(() => null);
    }
  }
  await postOnce(channels.rules, '📜 LUẬT CỘNG ĐỒNG', postRulesPanel);
  await postOnce(channels.support, '🎫 TRUNG TÂM HỖ TRỢ', postSupportPanel);
  await postOnce(channels.recruitment, '📝 TUYỂN DỤNG UPD LOS SANTOS', postRecruitmentPanel);
  await postOnce(channels.server_guide, '📘 BẮT ĐẦU TẠI UPD LOS SANTOS', postGuide);
  for (const [channelKey, groupKey] of [['lspd_ranks', 'lspd'], ['bcso_ranks', 'bcso'], ['sahp_ranks', 'sasp'], ['saspr_ranks', 'saspr']]) {
    const title = `📟 ${groupKey.toUpperCase()} • CẤP BẬC & CALLSIGN`;
    await postOnce(channels[channelKey], title, channel => postAgencyRankPanel(channel, groupKey));
  }

  await guild.setSystemChannel(channels.welcome).catch(() => null);
  return state;
}

export async function repostPanels(guild, data) {
  const fetchChannel = key => guild.channels.cache.get(data.channels[key]);
  await postRulesPanel(fetchChannel('rules'));
  await postSupportPanel(fetchChannel('support'));
  await postRecruitmentPanel(fetchChannel('recruitment'));
  await postGuide(fetchChannel('server_guide'));
  for (const [channelKey, groupKey] of [['lspd_ranks', 'lspd'], ['bcso_ranks', 'bcso'], ['sahp_ranks', 'sasp'], ['saspr_ranks', 'saspr']]) {
    const channel = fetchChannel(channelKey);
    if (channel?.isTextBased()) await postAgencyRankPanel(channel, groupKey);
  }
}

export async function deleteAllGuildChannels(guild, onProgress = async () => {}) {
  await guild.setSystemChannel(null, 'Preparing UPD full channel reset').catch(() => null);
  await guild.setRulesChannel(null, 'Preparing UPD full channel reset').catch(() => null);
  await guild.setPublicUpdatesChannel(null, 'Preparing UPD full channel reset').catch(() => null);
  await guild.setAFKChannel(null, 'Preparing UPD full channel reset').catch(() => null);
  await guild.channels.fetch();
  const candidates = [...guild.channels.cache.values()]
    .filter(channel => !channel.isThread() && channel.deletable)
    .sort((a, b) => Number(a.type === ChannelType.GuildCategory) - Number(b.type === ChannelType.GuildCategory));
  let deleted = 0;
  const skipped = [];
  for (const channel of candidates) {
    try {
      await channel.delete('UPD full reset requested by server administrator');
      deleted += 1;
      if (deleted % 5 === 0) await onProgress(deleted, candidates.length);
    } catch (error) {
      skipped.push(`${channel.name}: ${error.message}`);
    }
  }
  return { deleted, skipped };
}

export async function deleteAllCustomRoles(guild, onProgress = async () => {}) {
  await guild.roles.fetch();
  const candidates = [...guild.roles.cache.values()]
    .filter(role => role.id !== guild.roles.everyone.id && !role.managed && role.editable)
    .sort((a, b) => b.position - a.position);
  const protectedRoles = [...guild.roles.cache.values()]
    .filter(role => role.id !== guild.roles.everyone.id && (role.managed || !role.editable))
    .map(role => role.name);
  let deleted = 0;
  const skipped = [];
  for (const role of candidates) {
    try {
      await role.delete('UPD full reset requested by server owner');
      deleted += 1;
      if (deleted % 5 === 0) await onProgress(deleted, candidates.length);
    } catch (error) {
      skipped.push(`${role.name}: ${error.message}`);
    }
  }
  return { deleted, skipped, protectedRoles };
}

export async function deleteUnexpectedRoles(guild, keepRoleIds) {
  await guild.roles.fetch();
  const keep = new Set(keepRoleIds);
  const candidates = [...guild.roles.cache.values()]
    .filter(role => role.id !== guild.roles.everyone.id && !keep.has(role.id) && !role.managed && role.editable)
    .sort((a, b) => b.position - a.position);
  const unableToDelete = [...guild.roles.cache.values()]
    .filter(role => role.id !== guild.roles.everyone.id && !keep.has(role.id) && (role.managed || !role.editable))
    .map(role => role.name);
  const deletedNames = [];
  const failed = [];
  for (const role of candidates) {
    try {
      const name = role.name;
      await role.delete('UPD cleanup of leftover custom roles requested by server owner');
      deletedNames.push(name);
    } catch (error) {
      failed.push(`${role.name}: ${error.message}`);
    }
  }
  return { deletedNames, failed, unableToDelete };
}
