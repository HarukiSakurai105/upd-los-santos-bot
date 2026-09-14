import { EmbedBuilder } from 'discord.js';
import { config } from './config.js';
import { rules } from './template.js';

export function baseEmbed(title, description) {
  return new EmbedBuilder().setColor(config.color).setTitle(title).setDescription(description).setTimestamp().setFooter({ text: `${config.brandName} • GTA 5 Roleplay` });
}

export function rulesEmbeds() {
  const chunks = [rules.slice(0, 6), rules.slice(6)];
  return chunks.map((chunk, chunkIndex) => baseEmbed(
    chunkIndex ? '🚔 LUẬT ROLEPLAY & UPD' : '📜 LUẬT CỘNG ĐỒNG',
    chunk.map(([title, body], index) => `**${chunkIndex * 6 + index + 1}. ${title}**\n${body}`).join('\n\n')
  ));
}

export function welcomeEmbed(member) {
  return baseEmbed(`Chào mừng đến ${config.brandName}!`, `Xin chào ${member}, bạn là thành viên thứ **${member.guild.memberCount}**.\n\nHãy đọc <#RULES_CHANNEL> và bấm **Tôi đồng ý** để mở khóa khu vực cộng đồng.`)
    .setThumbnail(member.user.displayAvatarURL({ size: 256 }));
}

export function successEmbed(text) { return baseEmbed('✅ Thành công', text).setColor(0x2ecc71); }
export function errorEmbed(text) { return baseEmbed('❌ Không thể thực hiện', text).setColor(0xe74c3c); }

