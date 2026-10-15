import { ChannelType } from 'discord.js';

const channelTypeNames = new Map([
  [ChannelType.GuildText, 'Text'],
  [ChannelType.GuildVoice, 'Voice'],
  [ChannelType.GuildCategory, 'Category'],
  [ChannelType.GuildAnnouncement, 'Announcement'],
  [ChannelType.AnnouncementThread, 'Announcement Thread'],
  [ChannelType.PublicThread, 'Public Thread'],
  [ChannelType.PrivateThread, 'Private Thread'],
  [ChannelType.GuildStageVoice, 'Stage Voice'],
  [ChannelType.GuildDirectory, 'Directory'],
  [ChannelType.GuildForum, 'Forum'],
  [ChannelType.GuildMedia, 'Media']
]);

function channelTypeName(type) {
  return channelTypeNames.get(type) || `Unknown (${type})`;
}

function cleanInline(value) {
  return String(value ?? '').replace(/\r?\n/g, ' ').replace(/\|/g, '\\|').trim() || '—';
}

function permissionList(permissions) {
  return permissions?.toArray?.().sort() || [];
}

function serializeOverwrite(overwrite, guild) {
  const isRole = overwrite.type === 0;
  const target = isRole
    ? guild.roles.cache.get(overwrite.id)?.name
    : guild.members.cache.get(overwrite.id)?.user?.tag;
  return {
    id: overwrite.id,
    targetType: isRole ? 'role' : 'member',
    targetName: target || null,
    allow: permissionList(overwrite.allow),
    deny: permissionList(overwrite.deny)
  };
}

function serializeChannel(channel, guild) {
  const base = {
    id: channel.id,
    name: channel.name,
    type: channelTypeName(channel.type),
    typeCode: channel.type,
    position: channel.rawPosition ?? channel.position ?? 0,
    parentId: channel.parentId || null,
    parentName: channel.parent?.name || null,
    permissionOverwrites: channel.permissionOverwrites?.cache
      ? [...channel.permissionOverwrites.cache.values()].map(item => serializeOverwrite(item, guild))
      : []
  };

  if ('topic' in channel) base.topic = channel.topic || null;
  if ('nsfw' in channel) base.nsfw = Boolean(channel.nsfw);
  if ('rateLimitPerUser' in channel) base.slowmodeSeconds = channel.rateLimitPerUser || 0;
  if ('bitrate' in channel) base.bitrate = channel.bitrate || null;
  if ('userLimit' in channel) base.userLimit = channel.userLimit || 0;
  if ('rtcRegion' in channel) base.rtcRegion = channel.rtcRegion || null;
  if ('videoQualityMode' in channel) base.videoQualityMode = channel.videoQualityMode || null;
  return base;
}

function channelMarkdown(channel) {
  const details = [`ID: \`${channel.id}\``, `vị trí: ${channel.position}`];
  if (channel.topic) details.push(`chủ đề: ${cleanInline(channel.topic)}`);
  if (channel.slowmodeSeconds) details.push(`slowmode: ${channel.slowmodeSeconds}s`);
  if (channel.bitrate) details.push(`bitrate: ${channel.bitrate}`);
  if (channel.userLimit) details.push(`giới hạn: ${channel.userLimit}`);
  const lines = [`- **${cleanInline(channel.name)}** — ${channel.type} (${details.join(', ')})`];
  for (const overwrite of channel.permissionOverwrites) {
    const target = overwrite.targetName ? `${overwrite.targetName} (${overwrite.id})` : overwrite.id;
    const allow = overwrite.allow.length ? overwrite.allow.join(', ') : '—';
    const deny = overwrite.deny.length ? overwrite.deny.join(', ') : '—';
    lines.push(`  - quyền ${overwrite.targetType} **${cleanInline(target)}**: cho phép [${allow}] · từ chối [${deny}]`);
  }
  return lines.join('\n');
}

export async function generateServerReports(guild, requestedBy) {
  await Promise.all([guild.roles.fetch(), guild.channels.fetch()]);

  const generatedAt = new Date();
  const roles = [...guild.roles.cache.values()]
    .sort((a, b) => b.position - a.position)
    .map(role => ({
      id: role.id,
      name: role.name,
      position: role.position,
      color: role.hexColor,
      hoist: role.hoist,
      mentionable: role.mentionable,
      managed: role.managed,
      memberCount: role.members.size,
      permissions: permissionList(role.permissions),
      tags: role.tags || null
    }));

  const channels = [...guild.channels.cache.values()]
    .filter(channel => !channel.isThread?.())
    .sort((a, b) => (a.rawPosition ?? 0) - (b.rawPosition ?? 0))
    .map(channel => serializeChannel(channel, guild));

  const report = {
    schemaVersion: 1,
    generatedAt: generatedAt.toISOString(),
    requestedBy: { id: requestedBy.id, tag: requestedBy.tag },
    server: {
      id: guild.id,
      name: guild.name,
      description: guild.description || null,
      ownerId: guild.ownerId,
      memberCount: guild.memberCount,
      createdAt: guild.createdAt.toISOString(),
      preferredLocale: guild.preferredLocale,
      verificationLevel: guild.verificationLevel,
      premiumTier: guild.premiumTier,
      premiumSubscriptionCount: guild.premiumSubscriptionCount || 0,
      iconURL: guild.iconURL({ size: 1024 }),
      bannerURL: guild.bannerURL({ size: 2048 })
    },
    summary: {
      roles: roles.length,
      categories: channels.filter(channel => channel.typeCode === ChannelType.GuildCategory).length,
      textChannels: channels.filter(channel => [ChannelType.GuildText, ChannelType.GuildAnnouncement, ChannelType.GuildForum, ChannelType.GuildMedia].includes(channel.typeCode)).length,
      voiceChannels: channels.filter(channel => [ChannelType.GuildVoice, ChannelType.GuildStageVoice].includes(channel.typeCode)).length
    },
    roles,
    channels
  };

  const markdown = [
    `# Báo cáo cấu trúc Discord — ${guild.name}`,
    '',
    `- Server ID: \`${guild.id}\``,
    `- Xuất lúc: ${generatedAt.toISOString()}`,
    `- Người xuất: ${requestedBy.tag} (\`${requestedBy.id}\`)`,
    `- Tổng quan: ${report.summary.roles} role · ${report.summary.categories} category · ${report.summary.textChannels} kênh chat · ${report.summary.voiceChannels} kênh voice/stage`,
    '',
    '## Role (cao xuống thấp)',
    '',
    '| # | Role | ID | Màu | Thành viên | Cấu hình | Quyền |',
    '|---:|---|---|---|---:|---|---|',
    ...roles.map(role => `| ${role.position} | ${cleanInline(role.name)} | \`${role.id}\` | ${role.color} | ${role.memberCount} | hoist=${role.hoist}, mentionable=${role.mentionable}, managed=${role.managed} | ${role.permissions.length ? role.permissions.join(', ') : 'Không có'} |`),
    '',
    '## Category và kênh (trên xuống dưới)',
    ''
  ];

  const categories = channels.filter(channel => channel.typeCode === ChannelType.GuildCategory);
  const uncategorized = channels.filter(channel => channel.typeCode !== ChannelType.GuildCategory && !channel.parentId);
  if (uncategorized.length) {
    markdown.push('### Không thuộc category', '', ...uncategorized.map(channelMarkdown), '');
  }
  for (const category of categories) {
    markdown.push(`### ${cleanInline(category.name)} — ID \`${category.id}\`, vị trí ${category.position}`, '');
    if (category.permissionOverwrites.length) markdown.push(...category.permissionOverwrites.map(overwrite => {
      const target = overwrite.targetName ? `${overwrite.targetName} (${overwrite.id})` : overwrite.id;
      return `- Quyền category ${overwrite.targetType} **${cleanInline(target)}**: cho phép [${overwrite.allow.join(', ') || '—'}] · từ chối [${overwrite.deny.join(', ') || '—'}]`;
    }), '');
    const children = channels.filter(channel => channel.parentId === category.id);
    markdown.push(...(children.length ? children.map(channelMarkdown) : ['- *(Category trống)*']), '');
  }

  markdown.push(
    '## Ghi chú sử dụng',
    '',
    '- File Markdown dùng để xem và trao đổi nhanh.',
    '- File JSON giữ ID, vị trí, permission và permission overwrite để kỹ thuật viên đối chiếu hoặc viết công cụ dựng lại server.',
    '- Báo cáo không chứa nội dung tin nhắn, token bot hoặc danh sách thông tin cá nhân của thành viên.'
  );

  const date = generatedAt.toISOString().slice(0, 10);
  return {
    summary: report.summary,
    files: [
      { attachment: Buffer.from(`\uFEFF${markdown.join('\n')}`, 'utf8'), name: `server-scan-${guild.id}-${date}.md` },
      { attachment: Buffer.from(JSON.stringify(report, null, 2), 'utf8'), name: `server-scan-${guild.id}-${date}.json` }
    ]
  };
}
