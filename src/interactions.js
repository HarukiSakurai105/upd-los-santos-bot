import {
  ActionRowBuilder,
  ButtonBuilder,
  ButtonStyle,
  ChannelType,
  MessageFlags,
  ModalBuilder,
  PermissionFlagsBits as P,
  TextInputBuilder,
  TextInputStyle,
} from 'discord.js';
import path from 'node:path';
import { config } from './config.js';
import { baseEmbed, errorEmbed, successEmbed } from './embeds.js';
import { getGuildData, updateGuildData } from './storage.js';
import { departmentKeys, departmentRankGroup, rankGroups, rankKeys, updManagementRoleKeys } from './template.js';
import { deleteAllCustomRoles, deleteAllGuildChannels, deleteUnexpectedRoles, repostPanels, setupGuild } from './setup.js';

const ticketLabels = { support: 'hỗ-trợ', report: 'khiếu-nại', staff: 'liên-hệ-bqt' };
const pendingResets = new Map();
const ticketDeletionTimers = new Map();

function scheduleTicketDeletion(guild, channelId, deleteAt) {
  const timerKey = `${guild.id}:${channelId}`;
  const existingTimer = ticketDeletionTimers.get(timerKey);
  if (existingTimer) clearTimeout(existingTimer);
  const delay = Math.max(0, deleteAt - Date.now());
  const timer = setTimeout(async () => {
    ticketDeletionTimers.delete(timerKey);
    const channel = await guild.channels.fetch(channelId).catch(() => null);
    if (channel?.deletable) await channel.delete('Ticket closed for 5 minutes').catch(() => null);
    await updateGuildData(guild.id, current => {
      if (current.pendingTicketDeletions) delete current.pendingTicketDeletions[channelId];
      return current;
    }).catch(() => null);
  }, delay);
  timer.unref();
  ticketDeletionTimers.set(timerKey, timer);
}

export async function restorePendingTicketDeletions(guild) {
  const data = await getGuildData(guild.id);
  for (const [channelId, deleteAt] of Object.entries(data.pendingTicketDeletions || {})) {
    scheduleTicketDeletion(guild, channelId, Number(deleteAt));
  }
}

function option(interaction, name) {
  return interaction.options.get(name)?.value;
}

function safeName(value) {
  return value.normalize('NFD').replace(/[\u0300-\u036f]/g, '').toLowerCase().replace(/đ/g, 'd').replace(/[^a-z0-9-]/g, '-').replace(/-+/g, '-').slice(0, 40);
}

function formatNames(names, limit = 20) {
  if (!names.length) return 'Không có';
  const shown = names.slice(0, limit).map(name => `\`${String(name).slice(0, 80)}\``).join(', ');
  return names.length > limit ? `${shown} … và ${names.length - limit} role khác` : shown;
}

async function reply(interaction, payload) {
  if (interaction.deferred || interaction.replied) return interaction.editReply(payload);
  return interaction.reply({ ...payload, flags: MessageFlags.Ephemeral });
}

async function logAction(guild, data, title, description, color = 0x5865f2) {
  const channel = guild.channels.cache.get(data.channels.mod_logs || data.channels.logs);
  if (!channel?.isTextBased()) return;
  await channel.send({ embeds: [baseEmbed(title, description).setColor(color)] }).catch(() => null);
}

async function addRolesAtomically(member, roles, reason) {
  const added = [];
  try {
    for (const role of roles) {
      if (member.roles.cache.has(role.id)) continue;
      await member.roles.add(role, reason);
      added.push(role);
    }
  } catch (error) {
    for (const role of added.reverse()) await member.roles.remove(role, 'Rollback after role assignment failure').catch(() => null);
    throw error;
  }
}

async function replaceRolesAtomically(member, currentRoles, desiredRoles, reason) {
  const removable = currentRoles.filter(role => member.roles.cache.has(role.id) && !desiredRoles.some(desired => desired.id === role.id));
  const addable = desiredRoles.filter(role => !member.roles.cache.has(role.id));
  const uneditable = [...removable, ...addable].find(role => !role?.editable);
  if (uneditable) throw new Error(`Bot không thể quản lý role ${uneditable.name}. Hãy kéo role bot lên cao hơn.`);

  const added = [];
  const removed = [];
  try {
    for (const role of addable) {
      await member.roles.add(role, reason);
      added.push(role);
    }
    for (const role of removable) {
      await member.roles.remove(role, reason);
      removed.push(role);
    }
  } catch (error) {
    for (const role of removed.reverse()) await member.roles.add(role, 'Rollback after role replacement failure').catch(() => null);
    for (const role of added.reverse()) await member.roles.remove(role, 'Rollback after role replacement failure').catch(() => null);
    throw error;
  }
}

async function claimApplicationReview(guildId, messageId, userId, reviewerId, decision) {
  await updateGuildData(guildId, current => {
    current.reviewedApplications ||= {};
    const existing = current.reviewedApplications[messageId];
    const stale = existing?.status === 'processing' && Date.now() - new Date(existing.at).getTime() > 10 * 60_000;
    if (existing && !stale) {
      const error = new Error(existing.status === 'processing' ? 'Đơn này đang được một người khác xử lý.' : 'Đơn này đã được duyệt trước đó.');
      error.code = 'APPLICATION_ALREADY_REVIEWED';
      throw error;
    }
    current.reviewedApplications[messageId] = {
      status: 'processing', userId, reviewerId, decision, at: new Date().toISOString()
    };
    return current;
  });
}

async function finishApplicationReview(guildId, messageId, reviewerId, status) {
  await updateGuildData(guildId, current => {
    const review = current.reviewedApplications?.[messageId];
    if (review?.reviewerId === reviewerId) {
      current.reviewedApplications[messageId] = { ...review, status, finishedAt: new Date().toISOString() };
      current.applicationSubmissions ||= {};
      const submission = current.applicationSubmissions[review.userId];
      if (submission?.messageId === messageId) {
        current.applicationSubmissions[review.userId] = { ...submission, status, reviewedAt: new Date().toISOString() };
      }
    }
    return current;
  });
}

async function releaseApplicationReview(guildId, messageId, reviewerId) {
  await updateGuildData(guildId, current => {
    const review = current.reviewedApplications?.[messageId];
    if (review?.status === 'processing' && review.reviewerId === reviewerId) delete current.reviewedApplications[messageId];
    return current;
  }).catch(() => null);
}

async function reserveApplicationSubmission(guildId, userId) {
  await updateGuildData(guildId, current => {
    current.applicationSubmissions ||= {};
    const existing = current.applicationSubmissions[userId];
    const submittedAt = existing?.submittedAt ? new Date(existing.submittedAt).getTime() : 0;
    const pendingIsFresh = existing?.status === 'pending' && Date.now() - submittedAt < 7 * 24 * 60 * 60_000;
    if (pendingIsFresh) {
      const error = new Error('Bạn đã có một đơn đang chờ duyệt. Vui lòng chờ Bộ Chỉ Huy xử lý.');
      error.code = 'APPLICATION_COOLDOWN';
      throw error;
    }
    const cooldownStartedAt = existing?.reviewedAt ? new Date(existing.reviewedAt).getTime() : submittedAt;
    const cooldown = 24 * 60 * 60_000;
    if (cooldownStartedAt && Date.now() - cooldownStartedAt < cooldown) {
      const retryAt = Math.floor((cooldownStartedAt + cooldown) / 1000);
      const error = new Error(`Bạn chỉ có thể gửi lại đơn <t:${retryAt}:R>.`);
      error.code = 'APPLICATION_COOLDOWN';
      throw error;
    }
    current.applicationSubmissions[userId] = { status: 'pending', submittedAt: new Date().toISOString(), messageId: null };
    return current;
  });
}

async function attachApplicationMessage(guildId, userId, messageId) {
  await updateGuildData(guildId, current => {
    const submission = current.applicationSubmissions?.[userId];
    if (submission?.status === 'pending') submission.messageId = messageId;
    return current;
  });
}

async function cancelApplicationSubmission(guildId, userId) {
  await updateGuildData(guildId, current => {
    const submission = current.applicationSubmissions?.[userId];
    if (submission?.status === 'pending' && !submission.messageId) delete current.applicationSubmissions[userId];
    return current;
  }).catch(() => null);
}

function canManageRole(interaction, role) {
  return interaction.guild.ownerId === interaction.user.id || interaction.member.roles.highest.position > role.position;
}

function hasUpdManagementAuthority(interaction, data) {
  return interaction.member.permissions.has(P.ManageRoles)
    || updManagementRoleKeys.some(key => data.roles[key] && interaction.member.roles.cache.has(data.roles[key]));
}

function canManageRankGroup(interaction, data, groupKey) {
  if (interaction.member.permissions.has(P.ManageRoles)) return true;
  const globalKeys = ['founder', 'manager', 'admin', 'upd_command'];
  if (globalKeys.some(key => data.roles[key] && interaction.member.roles.cache.has(data.roles[key]))) return true;
  const prefixes = groupKey === 'upd' ? ['chief', 'assistant_chief', 'deputy_chief', 'commander'] : updManagementRoleKeys.filter(key => key.startsWith(`${groupKey}_`));
  return prefixes.some(key => data.roles[key] && interaction.member.roles.cache.has(data.roles[key]));
}

function canActOnMember(interaction, target, { allowSelf = false } = {}) {
  if (interaction.guild.ownerId === interaction.user.id) return true;
  if (target.id === interaction.user.id) return allowSelf;
  if (target.id === interaction.guild.ownerId) return false;
  return interaction.member.roles.highest.comparePositionTo(target.roles.highest) > 0;
}

function hierarchyError() {
  return { embeds: [errorEmbed('Bạn không thể dùng bot để xử lý chính mình, chủ server hoặc thành viên có role ngang/cao hơn bạn.')] };
}

function validImage(attachment) {
  return !attachment || attachment.contentType?.startsWith('image/');
}

async function applyBranding(guild, settings) {
  const notes = [];
  await guild.setName(settings.serverName || config.brandName, 'UPD automated branding');
  const logoSource = settings.logoUrl || path.resolve('assets', 'upd-los-santos-logo.png');
  await guild.setIcon(logoSource, 'UPD automated branding').catch(error => notes.push(`Không đổi được logo: ${error.message}`));
  const bannerSource = settings.bannerUrl || path.resolve('assets', 'upd-los-santos-banner.png');
  await guild.setBanner(bannerSource, 'UPD automated branding').catch(() => notes.push('Server chưa hỗ trợ banner tùy chỉnh; ảnh bìa vẫn được đăng trong kênh hướng dẫn.'));
  return notes;
}

function applicationModal() {
  return new ModalBuilder().setCustomId('application_upd').setTitle('Đơn ứng tuyển UPD').addComponents(
    new ActionRowBuilder().addComponents(new TextInputBuilder().setCustomId('character').setLabel('Tên nhân vật / tuổi OOC').setPlaceholder('Nguyễn Văn A / 18').setStyle(TextInputStyle.Short).setRequired(true).setMaxLength(100)),
    new ActionRowBuilder().addComponents(new TextInputBuilder().setCustomId('experience').setLabel('Kinh nghiệm GTA 5 RP').setPlaceholder('Server từng chơi, vị trí từng đảm nhiệm…').setStyle(TextInputStyle.Paragraph).setRequired(true).setMaxLength(600)),
    new ActionRowBuilder().addComponents(new TextInputBuilder().setCustomId('schedule').setLabel('Khung giờ hoạt động').setPlaceholder('Ví dụ: 19:00–23:00 hằng ngày').setStyle(TextInputStyle.Short).setRequired(true).setMaxLength(100)),
    new ActionRowBuilder().addComponents(new TextInputBuilder().setCustomId('scenario').setLabel('Xử lý khi đồng đội lạm quyền').setPlaceholder('Mô tả cách bạn sẽ xử lý tình huống…').setStyle(TextInputStyle.Paragraph).setRequired(true).setMaxLength(700)),
    new ActionRowBuilder().addComponents(new TextInputBuilder().setCustomId('motivation').setLabel('Lý do muốn gia nhập UPD').setStyle(TextInputStyle.Paragraph).setRequired(true).setMaxLength(700))
  );
}

function ticketModal(type) {
  return new ModalBuilder().setCustomId(`ticket_modal_${type}`).setTitle(`Tạo ticket ${ticketLabels[type]}`).addComponents(
    new ActionRowBuilder().addComponents(new TextInputBuilder().setCustomId('subject').setLabel('Tiêu đề ngắn').setStyle(TextInputStyle.Short).setRequired(true).setMaxLength(100)),
    new ActionRowBuilder().addComponents(new TextInputBuilder().setCustomId('details').setLabel('Nội dung chi tiết').setPlaceholder('Mô tả sự việc, thời gian, người liên quan…').setStyle(TextInputStyle.Paragraph).setRequired(true).setMaxLength(1500))
  );
}

async function handleCommand(interaction, data) {
  const { commandName, guild } = interaction;

  if (commandName === 'setup') {
    const mode = option(interaction, 'chế_độ');
    const logo = interaction.options.getAttachment('logo_server');
    const banner = interaction.options.getAttachment('ảnh_bìa');
    if (!validImage(logo) || !validImage(banner)) return reply(interaction, { embeds: [errorEmbed('Logo và ảnh bìa phải là tệp hình ảnh PNG/JPG/WebP.')] });
    const settings = {
      serverName: option(interaction, 'tên_server') || config.brandName,
      logoUrl: logo?.url,
      bannerUrl: banner?.url,
      requestedBy: interaction.user.id,
      expiresAt: Date.now() + 5 * 60_000
    };
    if (mode === 'reset') {
      if (interaction.user.id !== guild.ownerId) return reply(interaction, { embeds: [errorEmbed('Chế độ xóa toàn bộ kênh và role chỉ dành cho **chủ server**.')] });
      pendingResets.set(`${guild.id}:${interaction.user.id}`, settings);
      const row = new ActionRowBuilder().addComponents(
        new ButtonBuilder().setCustomId(`setup_reset_confirm_${interaction.user.id}`).setLabel('XÓA KÊNH + ROLE CŨ').setEmoji('⚠️').setStyle(ButtonStyle.Danger),
        new ButtonBuilder().setCustomId(`setup_reset_cancel_${interaction.user.id}`).setLabel('Hủy bỏ').setStyle(ButtonStyle.Secondary)
      );
      return interaction.editReply({ embeds: [baseEmbed('⚠️ XÁC NHẬN FULL RESET', `Thao tác này sẽ **xóa vĩnh viễn toàn bộ kênh, tin nhắn và role tùy chỉnh cũ**, sau đó tạo lại cấu trúc UPD mới.\n\n**Tên server mới:** ${settings.serverName}\n**Được giữ lại:** @everyone, role bot và role hệ thống Discord\n**Thời hạn xác nhận:** 5 phút` ).setColor(0xe74c3c)], components: [row] });
    }
    const brandingNotes = await applyBranding(guild, settings);
    const state = await setupGuild(guild, message => interaction.editReply({ embeds: [baseEmbed('⚙️ ĐANG SETUP', message)] }));
    const founderRole = guild.roles.cache.get(state.roles.founder);
    if (interaction.user.id === guild.ownerId && founderRole?.editable) await interaction.member.roles.add(founderRole, 'Chủ server khởi tạo setup UPD').catch(() => null);
    const setupNotes = [...brandingNotes, ...(state.orderingWarnings || [])];
    const note = setupNotes.length ? `\n\n⚠️ ${setupNotes.join('\n⚠️ ')}` : '';
    return interaction.editReply({ embeds: [successEmbed(`Đã đổi tên thành **${guild.name}**, áp dụng nhận diện và setup **${Object.keys(state.roles).length} role**, **${Object.keys(state.channels).length} category/kênh**.${note}\n\nHãy kéo role của bot lên trên toàn bộ role mà bot cần quản lý.`)] });
  }

  if (!data.setupComplete) return reply(interaction, { embeds: [errorEmbed('Chủ server cần chạy `/setup` trước.')] });

  if (commandName === 'cleanup_roles') {
    if (interaction.user.id !== guild.ownerId) return reply(interaction, { embeds: [errorEmbed('Chỉ chủ server được xóa các role cũ còn sót.')] });
    const result = await deleteUnexpectedRoles(guild, Object.values(data.roles));
    const deleted = formatNames(result.deletedNames);
    const protectedNames = formatNames(result.unableToDelete);
    const failed = result.failed.length ? `\n\n⚠️ **Lỗi:** ${result.failed.slice(0, 5).join(' | ')}` : '';
    return interaction.editReply({ embeds: [successEmbed(`**Đã xóa ${result.deletedNames.length} role cũ:** ${deleted}\n\n**Không thể xóa vì là role hệ thống/bot hoặc cao hơn bot:** ${protectedNames}${failed}`)] });
  }

  if (commandName === 'panel') {
    await repostPanels(guild, data);
    return interaction.editReply({ embeds: [successEmbed('Đã đăng lại bảng luật, hỗ trợ, ứng tuyển và hướng dẫn.')] });
  }

  if (commandName === 'announce') {
    const channel = interaction.options.getChannel('kênh') || guild.channels.cache.get(data.channels.announcements);
    if (!channel?.isTextBased()) return reply(interaction, { embeds: [errorEmbed('Kênh đã chọn không thể nhận tin nhắn.')] });
    const content = option(interaction, 'nội_dung');
    await channel.send({ embeds: [baseEmbed('📢 THÔNG BÁO CHÍNH THỨC', content).setAuthor({ name: interaction.user.username, iconURL: interaction.user.displayAvatarURL() })] });
    return reply(interaction, { embeds: [successEmbed(`Đã gửi thông báo tới ${channel}.`)] });
  }

  if (commandName === 'rank') {
    const rankGroupKey = interaction.options.getSubcommand();
    const rankGroup = rankGroups.find(group => group.key === rankGroupKey);
    if (!rankGroup || !canManageRankGroup(interaction, data, rankGroupKey)) return reply(interaction, { embeds: [errorEmbed('Bạn không có quyền quản lý cấp bậc của cơ quan này.')] });
    const member = await guild.members.fetch(option(interaction, 'thành_viên'));
    if (!canActOnMember(interaction, member, { allowSelf: true })) return reply(interaction, hierarchyError());
    const rankKey = option(interaction, 'cấp_bậc');
    if (!rankGroup.roles.some(([key]) => key === rankKey)) return reply(interaction, { embeds: [errorEmbed('Cấp bậc không thuộc cơ quan đã chọn.')] });
    const expectedDepartment = rankGroupKey === 'upd' ? null : Object.entries(departmentRankGroup).find(([, group]) => group === rankGroupKey)?.[0];
    if (expectedDepartment && !member.roles.cache.has(data.roles[expectedDepartment])) {
      return reply(interaction, { embeds: [errorEmbed(`Hãy dùng \`/department\` phân công thành viên vào **${rankGroup.label}** trước khi cấp rank.`)] });
    }
    const rankRole = guild.roles.cache.get(data.roles[rankKey]);
    const updRole = guild.roles.cache.get(data.roles.upd);
    const alreadyHasRank = member.roles.cache.has(rankRole?.id);
    if (!rankRole?.editable || !updRole?.editable || (!alreadyHasRank && !canManageRole(interaction, rankRole))) return reply(interaction, { embeds: [errorEmbed('Bạn hoặc bot không đủ thứ bậc để cấp role này.')] });
    const oldRankRoles = rankKeys.map(key => guild.roles.cache.get(data.roles[key])).filter(Boolean);
    try {
      await replaceRolesAtomically(member, oldRankRoles, [updRole, rankRole], `Đổi cấp bởi ${interaction.user.tag}`);
    } catch (error) {
      return reply(interaction, { embeds: [errorEmbed(error.message)] });
    }
    const reason = option(interaction, 'lý_do') || 'Không ghi lý do';
    await logAction(guild, data, '🚔 THAY ĐỔI CẤP BẬC', `${member} → ${rankRole}\n**Người thực hiện:** ${interaction.user}\n**Lý do:** ${reason}`, 0xf1c40f);
    return reply(interaction, { embeds: [successEmbed(`Đã cấp ${rankRole} cho ${member}.`)] });
  }

  if (commandName === 'department') {
    if (!hasUpdManagementAuthority(interaction, data)) return reply(interaction, { embeds: [errorEmbed('Chỉ Chủ Cộng Đồng, Quản Lý/Admin hoặc cấp chỉ huy UPD được phân công cơ quan.')] });
    const member = await guild.members.fetch(option(interaction, 'thành_viên'));
    if (!canActOnMember(interaction, member, { allowSelf: true })) return reply(interaction, hierarchyError());
    const departmentKey = option(interaction, 'cơ_quan');
    const departmentRoles = departmentKeys.map(key => guild.roles.cache.get(data.roles[key])).filter(Boolean);
    const allRankRoles = rankKeys.map(key => guild.roles.cache.get(data.roles[key])).filter(Boolean);
    if (departmentKey === 'none') {
      try {
        await replaceRolesAtomically(member, [...departmentRoles, ...allRankRoles], [], `Gỡ cơ quan bởi ${interaction.user.tag}`);
      } catch (error) {
        return reply(interaction, { embeds: [errorEmbed(error.message)] });
      }
      await logAction(guild, data, '🏛️ GỠ PHÂN CÔNG CƠ QUAN', `${member} được gỡ khỏi cơ quan hiện tại bởi ${interaction.user}.`, 0x95a5a6);
      return reply(interaction, { embeds: [successEmbed(`Đã gỡ role cơ quan hiện tại của ${member}.`)] });
    }
    const departmentRole = guild.roles.cache.get(data.roles[departmentKey]);
    const updRole = guild.roles.cache.get(data.roles.upd);
    const matchingGroup = rankGroups.find(group => group.key === departmentRankGroup[departmentKey]);
    const matchingRankIds = new Set((matchingGroup?.roles || []).map(([key]) => data.roles[key]).filter(Boolean));
    const matchingRanks = allRankRoles.filter(role => matchingRankIds.has(role.id) && member.roles.cache.has(role.id));
    const alreadyInDepartment = member.roles.cache.has(departmentRole?.id);
    if (!departmentRole?.editable || !updRole?.editable || (!alreadyInDepartment && !canManageRole(interaction, departmentRole))) return reply(interaction, { embeds: [errorEmbed('Bạn hoặc bot không đủ thứ bậc để cấp role cơ quan này.')] });
    try {
      await replaceRolesAtomically(member, [...departmentRoles, ...allRankRoles], [updRole, departmentRole, ...matchingRanks], `Phân công bởi ${interaction.user.tag}`);
    } catch (error) {
      return reply(interaction, { embeds: [errorEmbed(error.message)] });
    }
    await logAction(guild, data, '🏛️ PHÂN CÔNG CƠ QUAN', `${member} → ${departmentRole}\n**Người thực hiện:** ${interaction.user}`, 0x3498db);
    return reply(interaction, { embeds: [successEmbed(`Đã phân công ${member} vào ${departmentRole}.`)] });
  }

  if (commandName === 'duty') {
    const updRole = guild.roles.cache.get(data.roles.upd);
    if (!interaction.member.roles.cache.has(updRole?.id)) return reply(interaction, { embeds: [errorEmbed('Lệnh này chỉ dành cho nhân sự UPD.')] });
    const current = interaction.member.nickname || interaction.user.globalName || interaction.user.username;
    const isOnDuty = current.startsWith('[10-8] ');
    const next = isOnDuty ? current.replace(/^\[10-8\] /, '') : `[10-8] ${current}`.slice(0, 32);
    await interaction.member.setNickname(next, 'UPD duty toggle');
    return reply(interaction, { embeds: [successEmbed(isOnDuty ? 'Bạn đã **kết thúc ca**.' : 'Bạn đã **bắt đầu ca**.')] });
  }

  if (commandName === 'nickname') {
    const member = await guild.members.fetch(option(interaction, 'thành_viên'));
    if (!canActOnMember(interaction, member)) return reply(interaction, hierarchyError());
    if (!member.manageable) return reply(interaction, { embeds: [errorEmbed('Bot không thể đổi tên thành viên này do thứ tự role.')] });
    await member.setNickname(option(interaction, 'tên'), `Đổi bởi ${interaction.user.tag}`);
    return reply(interaction, { embeds: [successEmbed(`Đã đổi nickname của ${member}.`)] });
  }

  if (commandName === 'clear') {
    if (!interaction.channel?.bulkDelete) return reply(interaction, { embeds: [errorEmbed('Lệnh này chỉ dùng trong kênh chat.')] });
    const deleted = await interaction.channel.bulkDelete(option(interaction, 'số_lượng'), true);
    return interaction.editReply({ embeds: [successEmbed(`Đã xóa **${deleted.size}** tin nhắn (tin quá 14 ngày sẽ không bị xóa).`)] });
  }

  if (commandName === 'warn') {
    const member = await guild.members.fetch(option(interaction, 'thành_viên'));
    if (!canActOnMember(interaction, member)) return reply(interaction, hierarchyError());
    const reason = option(interaction, 'lý_do');
    const warning = { reason, moderatorId: interaction.user.id, at: new Date().toISOString() };
    const next = await updateGuildData(guild.id, current => {
      current.warnings ||= {};
      current.warnings[member.id] ||= [];
      current.warnings[member.id].push(warning);
      return current;
    });
    await member.send({ embeds: [baseEmbed(`⚠️ CẢNH CÁO TẠI ${guild.name}`, `**Lý do:** ${reason}\n**Mức cảnh cáo hiện tại:** ${next.warnings[member.id].length}`)] }).catch(() => null);
    await logAction(guild, data, '⚠️ CẢNH CÁO', `${member} bị cảnh cáo bởi ${interaction.user}\n**Lý do:** ${reason}`, 0xf39c12);
    return reply(interaction, { embeds: [successEmbed(`Đã cảnh cáo ${member}. Tổng: **${next.warnings[member.id].length}**.`)] });
  }

  if (commandName === 'warnings') {
    const user = interaction.options.getUser('thành_viên');
    const list = data.warnings?.[user.id] || [];
    const text = list.length ? list.map((item, i) => `**${i + 1}.** ${item.reason}\n<@${item.moderatorId}> • <t:${Math.floor(new Date(item.at).getTime() / 1000)}:R>`).join('\n\n') : 'Không có cảnh cáo.';
    return reply(interaction, { embeds: [baseEmbed(`⚠️ Cảnh cáo của ${user.username}`, text)] });
  }

  if (commandName === 'unwarn') {
    const user = interaction.options.getUser('thành_viên');
    const member = await guild.members.fetch(user.id).catch(() => null);
    if (member && !canActOnMember(interaction, member)) return reply(interaction, hierarchyError());
    const index = option(interaction, 'số') - 1;
    if (!data.warnings?.[user.id]?.[index]) return reply(interaction, { embeds: [errorEmbed('Không tìm thấy cảnh cáo có số này.')] });
    await updateGuildData(guild.id, current => { current.warnings[user.id].splice(index, 1); return current; });
    return reply(interaction, { embeds: [successEmbed(`Đã xóa cảnh cáo số **${index + 1}** của ${user}.`)] });
  }

  if (commandName === 'timeout' || commandName === 'untimeout') {
    const member = await guild.members.fetch(option(interaction, 'thành_viên'));
    if (!canActOnMember(interaction, member)) return reply(interaction, hierarchyError());
    if (!member.moderatable) return reply(interaction, { embeds: [errorEmbed('Bot không thể cách ly thành viên này do thứ tự role.')] });
    const removing = commandName === 'untimeout';
    const reason = removing ? `Gỡ bởi ${interaction.user.tag}` : option(interaction, 'lý_do');
    const duration = removing ? null : option(interaction, 'phút') * 60_000;
    await member.timeout(duration, reason);
    await logAction(guild, data, removing ? '✅ GỠ CÁCH LY' : '⏳ CÁCH LY', `${member} • ${reason}\n**Người thực hiện:** ${interaction.user}`, removing ? 0x2ecc71 : 0xe67e22);
    return reply(interaction, { embeds: [successEmbed(removing ? `Đã gỡ cách ly ${member}.` : `Đã cách ly ${member} trong **${option(interaction, 'phút')} phút**.`)] });
  }

  if (commandName === 'kick' || commandName === 'ban') {
    const member = await guild.members.fetch(option(interaction, 'thành_viên'));
    if (!canActOnMember(interaction, member)) return reply(interaction, hierarchyError());
    const reason = option(interaction, 'lý_do');
    const possible = commandName === 'kick' ? member.kickable : member.bannable;
    if (!possible) return reply(interaction, { embeds: [errorEmbed('Bot không thể xử lý thành viên này do thứ tự role.')] });
    await member.send({ embeds: [baseEmbed(commandName === 'kick' ? 'Bạn đã bị mời khỏi server' : 'Bạn đã bị cấm khỏi server', `**Server:** ${guild.name}\n**Lý do:** ${reason}`)] }).catch(() => null);
    await logAction(guild, data, commandName === 'kick' ? '👢 KICK' : '🔨 BAN', `${member.user.tag} (${member.id})\n**Người thực hiện:** ${interaction.user}\n**Lý do:** ${reason}`, 0xe74c3c);
    if (commandName === 'kick') await member.kick(reason); else await member.ban({ reason });
    return reply(interaction, { embeds: [successEmbed(`Đã ${commandName} **${member.user.tag}**.`)] });
  }

  if (commandName === 'server') {
    const owner = await guild.fetchOwner();
    return reply(interaction, { embeds: [baseEmbed(`🏙️ ${guild.name}`, `**Chủ server:** ${owner}\n**Thành viên:** ${guild.memberCount}\n**Kênh:** ${guild.channels.cache.size}\n**Role:** ${guild.roles.cache.size}\n**Ngày thành lập:** <t:${Math.floor(guild.createdTimestamp / 1000)}:D>`).setThumbnail(guild.iconURL({ size: 256 }))] });
  }

  if (commandName === 'help') {
    return reply(interaction, { embeds: [baseEmbed('🤖 TRỢ GIÚP BOT UPD', '**Thành viên**\n`/server` `/duty` `/help`\n\n**Quản trị**\n`/announce` `/nickname` `/clear` `/warn` `/warnings` `/unwarn` `/timeout` `/untimeout` `/kick` `/ban`\n\n**UPD**\n`/rank lspd|bcso|sasp|saspr|upd` — cấp/đổi cấp bậc theo cơ quan\n`/department` — phân công LSPD/BCSO/SASP/SASPR/FIB/NOOSE/DOC\n\n**Chủ server**\n`/setup` — setup/full reset\n`/cleanup_roles` — xóa role cũ còn sót\n`/panel` — đăng lại các bảng điều khiển')] });
  }
}

async function handleButton(interaction, data) {
  const { customId, guild } = interaction;
  if (customId.startsWith('setup_reset_cancel_')) {
    const ownerId = customId.split('_').at(-1);
    if (interaction.user.id !== ownerId) return reply(interaction, { embeds: [errorEmbed('Chỉ người mở xác nhận mới có thể hủy.')] });
    pendingResets.delete(`${guild.id}:${ownerId}`);
    return interaction.editReply({ embeds: [baseEmbed('Đã hủy', 'Không có kênh nào bị xóa.').setColor(0x95a5a6)], components: [] });
  }
  if (customId.startsWith('setup_reset_confirm_')) {
    const ownerId = customId.split('_').at(-1);
    if (interaction.user.id !== ownerId) return reply(interaction, { embeds: [errorEmbed('Chỉ người mở xác nhận mới có thể thực hiện reset.')] });
    const key = `${guild.id}:${ownerId}`;
    const settings = pendingResets.get(key);
    if (!settings || settings.expiresAt < Date.now()) {
      pendingResets.delete(key);
      return interaction.editReply({ embeds: [errorEmbed('Xác nhận đã hết hạn. Hãy chạy lại `/setup`.')], components: [] });
    }
    pendingResets.delete(key);
    await interaction.editReply({ embeds: [baseEmbed('⚙️ ĐANG FULL RESET', 'Bắt đầu xóa toàn bộ kênh và role tùy chỉnh cũ. Thông báo này sẽ biến mất khi kênh hiện tại bị xóa. Kết quả sẽ được gửi vào kênh lệnh bot mới.')], components: [] });
    const brandingNotes = await applyBranding(guild, settings);
    const resetResult = await deleteAllGuildChannels(guild, (done, total) => console.log(`Reset ${guild.id}: deleted ${done}/${total} channels`));
    const roleResetResult = await deleteAllCustomRoles(guild, (done, total) => console.log(`Reset ${guild.id}: deleted ${done}/${total} roles`));
    const state = await setupGuild(guild);
    const founderRole = guild.roles.cache.get(state.roles.founder);
    if (interaction.user.id === guild.ownerId && founderRole?.editable) await interaction.member.roles.add(founderRole, 'Chủ server reset UPD').catch(() => null);
    const resultChannel = guild.channels.cache.get(state.channels.bot_commands);
    const notes = [...brandingNotes];
    notes.push(...(state.orderingWarnings || []));
    if (resetResult.skipped.length) notes.push(`Bỏ qua ${resetResult.skipped.length} kênh không thể xóa.`);
    if (roleResetResult.skipped.length) notes.push(`Bỏ qua ${roleResetResult.skipped.length} role bot không thể quản lý.`);
    const protectedList = roleResetResult.protectedRoles.slice(0, 15).map(name => `\`${name}\``).join(', ') || 'Không có';
    await resultChannel?.send({ embeds: [successEmbed(`Full reset hoàn tất bởi ${interaction.user}.\n\n**Đã xóa:** ${resetResult.deleted} kênh và ${roleResetResult.deleted} role cũ\n**Đã tạo:** ${Object.keys(state.roles).length} role và ${Object.keys(state.channels).length} category/kênh mới\n**Role Discord/bot không cho xóa (${roleResetResult.protectedRoles.length}):** ${protectedList}\n**Tên server:** ${guild.name}${notes.length ? `\n\n⚠️ ${notes.join('\n⚠️ ')}` : ''}`)] });
    return;
  }
  if (customId === 'verify_rules') {
    const roles = [data.roles.verified, data.roles.civilian].map(id => guild.roles.cache.get(id)).filter(Boolean);
    await addRolesAtomically(interaction.member, roles, 'Đồng ý luật cộng đồng');
    return reply(interaction, { embeds: [successEmbed('Bạn đã xác minh và mở khóa khu vực cộng đồng. Chào mừng!')] });
  }
  if (customId === 'ticket_close') {
    const ownerId = interaction.channel.topic?.match(/owner:(\d+)/)?.[1] || interaction.user.id;
    const deleteAt = Date.now() + 5 * 60_000;
    await interaction.channel.permissionOverwrites.edit(ownerId, { SendMessages: false }).catch(() => null);
    if (!interaction.channel.name.startsWith('closed-')) await interaction.channel.setName(`closed-${interaction.channel.name}`.slice(0, 100));
    const disabled = new ActionRowBuilder().addComponents(new ButtonBuilder().setCustomId('ticket_closed').setLabel('Ticket đã đóng').setEmoji('🔒').setStyle(ButtonStyle.Secondary).setDisabled(true));
    await interaction.message.edit({ components: [disabled] }).catch(() => null);
    await updateGuildData(guild.id, current => {
      current.pendingTicketDeletions ||= {};
      current.pendingTicketDeletions[interaction.channel.id] = deleteAt;
      return current;
    });
    scheduleTicketDeletion(guild, interaction.channel.id, deleteAt);
    await interaction.channel.send({ embeds: [baseEmbed('🔒 Ticket đã đóng', `Đóng bởi ${interaction.user}. Kênh này sẽ tự động bị xóa <t:${Math.floor(deleteAt / 1000)}:R>.`).setColor(0xe67e22)] });
    return interaction.editReply({ embeds: [successEmbed('Đã đóng ticket. Kênh sẽ tự động bị xóa sau **5 phút**.')] });
  }

  if (customId.startsWith('application_accept_') || customId.startsWith('application_reject_')) {
    const isReviewer = interaction.member.permissions.has(P.ManageRoles) || interaction.member.roles.cache.has(data.roles.recruitment_reviewer);
    if (!isReviewer) return reply(interaction, { embeds: [errorEmbed('Bạn không có quyền duyệt đơn.')] });
    const accepted = customId.startsWith('application_accept_');
    const userId = customId.split('_').at(-1);
    const member = await guild.members.fetch(userId).catch(() => null);
    if (!member) return reply(interaction, { embeds: [errorEmbed('Ứng viên không còn trong server.')] });
    const recruitRoles = [data.roles.upd, data.roles.cadet].map(id => guild.roles.cache.get(id)).filter(Boolean);
    if (accepted && (recruitRoles.length !== 2 || recruitRoles.some(role => !role.editable))) return reply(interaction, { embeds: [errorEmbed('Không tìm thấy role UPD/Cadet hoặc một trong hai role đang nằm cao hơn role bot.')] });
    try {
      await claimApplicationReview(guild.id, interaction.message.id, userId, interaction.user.id, accepted ? 'accepted' : 'rejected');
    } catch (error) {
      if (error.code === 'APPLICATION_ALREADY_REVIEWED') return reply(interaction, { embeds: [errorEmbed(error.message)] });
      throw error;
    }
    if (accepted) {
      try {
        await addRolesAtomically(member, recruitRoles, `Đơn duyệt bởi ${interaction.user.tag}`);
      } catch (error) {
        await releaseApplicationReview(guild.id, interaction.message.id, interaction.user.id);
        return reply(interaction, { embeds: [errorEmbed(`Discord từ chối cấp role: ${error.message}\n\nKiểm tra bot có quyền **Manage Roles** và role UPD/Cadet nằm dưới role bot.`)] });
      }
    }
    try {
      await finishApplicationReview(guild.id, interaction.message.id, interaction.user.id, accepted ? 'accepted' : 'rejected');
    } catch (error) {
      await releaseApplicationReview(guild.id, interaction.message.id, interaction.user.id);
      throw error;
    }
    await member.send({ embeds: [baseEmbed(accepted ? '✅ ĐƠN UPD ĐƯỢC CHẤP NHẬN' : '❌ ĐƠN UPD CHƯA ĐƯỢC CHẤP NHẬN', accepted ? `Chúc mừng! Bạn đã được nhận với cấp bậc **Cadet** tại ${guild.name}.` : `Cảm ơn bạn đã ứng tuyển tại ${guild.name}. Bạn có thể hoàn thiện thêm kinh nghiệm và ứng tuyển lại sau.`).setColor(accepted ? 0x2ecc71 : 0xe74c3c)] }).catch(() => null);
    const disabled = new ActionRowBuilder().addComponents(
      new ButtonBuilder().setCustomId('review_done').setLabel(accepted ? `Đã duyệt bởi ${interaction.user.username}` : `Đã từ chối bởi ${interaction.user.username}`).setStyle(accepted ? ButtonStyle.Success : ButtonStyle.Danger).setDisabled(true)
    );
    await interaction.message.edit({ components: [disabled] });
    return interaction.editReply({ embeds: [successEmbed(accepted ? `Đã chấp nhận ${member}.` : `Đã từ chối đơn của ${member}.`)] });
  }
}

async function handleModal(interaction, data) {
  if (interaction.customId === 'application_upd') {
    const channel = interaction.guild.channels.cache.get(data.channels.recruit_review);
    if (!channel?.isTextBased()) return reply(interaction, { embeds: [errorEmbed('Kênh duyệt đơn chưa tồn tại. Hãy chạy lại `/setup`.')] });
    if (interaction.member.roles.cache.has(data.roles.upd)) return reply(interaction, { embeds: [errorEmbed('Bạn đã là nhân sự UPD nên không cần nộp đơn mới.')] });
    try {
      await reserveApplicationSubmission(interaction.guild.id, interaction.user.id);
    } catch (error) {
      if (error.code === 'APPLICATION_COOLDOWN') return reply(interaction, { embeds: [errorEmbed(error.message)] });
      throw error;
    }
    const embed = baseEmbed('📥 ĐƠN ỨNG TUYỂN UPD MỚI', `**Ứng viên:** ${interaction.user} (${interaction.user.id})`)
      .addFields(
        { name: 'Tên nhân vật / tuổi OOC', value: interaction.fields.getTextInputValue('character') },
        { name: 'Kinh nghiệm', value: interaction.fields.getTextInputValue('experience') },
        { name: 'Khung giờ', value: interaction.fields.getTextInputValue('schedule') },
        { name: 'Tình huống đạo đức', value: interaction.fields.getTextInputValue('scenario') },
        { name: 'Động lực', value: interaction.fields.getTextInputValue('motivation') }
      ).setThumbnail(interaction.user.displayAvatarURL({ size: 256 }));
    const row = new ActionRowBuilder().addComponents(
      new ButtonBuilder().setCustomId(`application_accept_${interaction.user.id}`).setLabel('Chấp nhận').setEmoji('✅').setStyle(ButtonStyle.Success),
      new ButtonBuilder().setCustomId(`application_reject_${interaction.user.id}`).setLabel('Từ chối').setEmoji('❌').setStyle(ButtonStyle.Danger)
    );
    const reviewerRoleIds = [data.roles.recruitment_reviewer].filter(Boolean);
    let applicationMessage = null;
    try {
      applicationMessage = await channel.send({
        content: `${reviewerRoleIds.map(id => `<@&${id}>`).join(' ')} Có đơn ứng tuyển UPD mới cần duyệt.`,
        embeds: [embed],
        components: [row],
        allowedMentions: { roles: reviewerRoleIds }
      });
      await attachApplicationMessage(interaction.guild.id, interaction.user.id, applicationMessage.id);
    } catch (error) {
      await applicationMessage?.delete().catch(() => null);
      await cancelApplicationSubmission(interaction.guild.id, interaction.user.id);
      throw error;
    }
    return reply(interaction, { embeds: [successEmbed('Đã gửi đơn tới Bộ Chỉ Huy UPD. Vui lòng chờ phản hồi.')] });
  }

  if (interaction.customId.startsWith('ticket_modal_')) {
    const type = interaction.customId.replace('ticket_modal_', '');
    const existing = interaction.guild.channels.cache.find(channel => channel.topic?.includes(`owner:${interaction.user.id}`) && !channel.name.startsWith('closed-'));
    if (existing) return interaction.editReply({ embeds: [errorEmbed(`Bạn đã có ticket đang mở: ${existing}`)] });
    const state = await updateGuildData(interaction.guild.id, current => { current.tickets = (current.tickets || 0) + 1; return current; });
    const staffIds = ['founder', 'manager', 'admin', 'moderator', 'ticket_handler'].map(key => data.roles[key]).filter(Boolean);
    const notificationRoleIds = [data.roles.ticket_handler].filter(Boolean);
    const overwrites = [
      { id: interaction.guild.roles.everyone.id, deny: [P.ViewChannel] },
      { id: interaction.user.id, allow: [P.ViewChannel, P.SendMessages, P.ReadMessageHistory, P.AttachFiles] },
      ...staffIds.map(id => ({ id, allow: [P.ViewChannel, P.SendMessages, P.ReadMessageHistory, P.ManageMessages] }))
    ];
    const channel = await interaction.guild.channels.create({
      name: `${ticketLabels[type] || 'ticket'}-${String(state.tickets).padStart(4, '0')}-${safeName(interaction.user.username)}`,
      type: ChannelType.GuildText,
      parent: data.channels.support_category,
      topic: `UPD ticket • type:${type} • owner:${interaction.user.id}`,
      permissionOverwrites: overwrites,
      reason: `Ticket opened by ${interaction.user.tag}`
    });
    const row = new ActionRowBuilder().addComponents(new ButtonBuilder().setCustomId('ticket_close').setLabel('Đóng ticket').setEmoji('🔒').setStyle(ButtonStyle.Danger));
    await channel.send({
      content: `${interaction.user} ${notificationRoleIds.map(id => `<@&${id}>`).join(' ')} Có ticket mới cần xử lý.`,
      embeds: [baseEmbed(`🎫 ${interaction.fields.getTextInputValue('subject')}`, `**Loại:** ${ticketLabels[type] || type}\n**Người tạo:** ${interaction.user}\n\n${interaction.fields.getTextInputValue('details')}`)],
      components: [row],
      allowedMentions: { users: [interaction.user.id], roles: notificationRoleIds }
    });
    return interaction.editReply({ embeds: [successEmbed(`Ticket đã được tạo: ${channel}`)] });
  }
}

export async function handleInteraction(interaction) {
  if (!interaction.inGuild()) return;
  try {
    if (interaction.isButton()) {
      if (interaction.customId === 'apply_upd') return interaction.showModal(applicationModal());
      if (interaction.customId.startsWith('ticket_') && interaction.customId !== 'ticket_close') {
        return interaction.showModal(ticketModal(interaction.customId.replace('ticket_', '')));
      }
      if (interaction.customId.startsWith('setup_reset_')) await interaction.deferUpdate();
      else await interaction.deferReply({ flags: MessageFlags.Ephemeral });
    } else if (interaction.isChatInputCommand() || interaction.isModalSubmit()) {
      await interaction.deferReply({ flags: MessageFlags.Ephemeral });
    }
    const data = await getGuildData(interaction.guildId);
    if (interaction.isChatInputCommand()) await handleCommand(interaction, data);
    else if (interaction.isButton()) await handleButton(interaction, data);
    else if (interaction.isModalSubmit()) await handleModal(interaction, data);
  } catch (error) {
    console.error('Interaction error:', error);
    await reply(interaction, { embeds: [errorEmbed(`Đã xảy ra lỗi: ${error.message}`)] }).catch(() => null);
  }
}

export async function sendWelcome(member) {
  const data = await getGuildData(member.guild.id);
  if (!data.setupComplete) return;
  const channel = member.guild.channels.cache.get(data.channels.welcome);
  if (!channel?.isTextBased()) return;
  const rulesChannel = data.channels.rules;
  const embed = baseEmbed(`👋 Chào mừng ${member.user.username}!`, `Xin chào ${member}, bạn là thành viên thứ **${member.guild.memberCount}**.\n\nHãy đọc <#${rulesChannel}> và bấm **Tôi đồng ý với luật** để mở khóa cộng đồng.`).setThumbnail(member.user.displayAvatarURL({ size: 256 }));
  await channel.send({ embeds: [embed] });
}

export async function sendLeave(member) {
  const data = await getGuildData(member.guild.id);
  const channel = member.guild.channels.cache.get(data.channels.logs);
  if (channel?.isTextBased()) await channel.send({ embeds: [baseEmbed('📤 Thành viên rời server', `**${member.user.tag}** (${member.id}) đã rời server.`).setColor(0x95a5a6)] });
}
