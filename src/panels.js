import {
  ActionRowBuilder,
  AttachmentBuilder,
  ButtonBuilder,
  ButtonStyle,
} from 'discord.js';
import path from 'node:path';
import { baseEmbed, rulesEmbeds } from './embeds.js';
import { rankGroups } from './template.js';

export async function postRulesPanel(channel) {
  const row = new ActionRowBuilder().addComponents(
    new ButtonBuilder().setCustomId('verify_rules').setLabel('Tôi đồng ý với luật').setEmoji('✅').setStyle(ButtonStyle.Success)
  );
  return channel.send({ embeds: rulesEmbeds(), components: [row] });
}

export async function postSupportPanel(channel) {
  const embed = baseEmbed('🎫 TRUNG TÂM HỖ TRỢ', 'Chọn đúng loại ticket bên dưới. Mỗi người chỉ nên mở một ticket cho cùng một vấn đề.\n\n• **Hỗ trợ:** lỗi kỹ thuật, thắc mắc chung\n• **Khiếu nại:** báo cáo người chơi/nhân sự\n• **Liên hệ BQT:** vấn đề riêng tư\n\nTicket đã đóng sẽ tự động bị xóa sau **5 phút**. Hãy lưu bằng chứng cần thiết trước khi đóng.');
  const row = new ActionRowBuilder().addComponents(
    new ButtonBuilder().setCustomId('ticket_support').setLabel('Hỗ trợ').setEmoji('🛠️').setStyle(ButtonStyle.Primary),
    new ButtonBuilder().setCustomId('ticket_report').setLabel('Khiếu nại').setEmoji('⚖️').setStyle(ButtonStyle.Danger),
    new ButtonBuilder().setCustomId('ticket_staff').setLabel('Liên hệ BQT').setEmoji('🛡️').setStyle(ButtonStyle.Secondary)
  );
  return channel.send({ embeds: [embed], components: [row] });
}

export async function postRecruitmentPanel(channel) {
  const embed = baseEmbed('📝 TUYỂN DỤNG UPD LOS SANTOS', '**Yêu cầu cơ bản**\n• Từ 16 tuổi (có thể điều chỉnh theo server)\n• Micro rõ, thái độ nghiêm túc\n• Hiểu luật RP và tuân thủ chain of command\n• Không có án phạt nghiêm trọng gần đây\n\nBấm nút bên dưới để điền đơn. Thành viên có role **Recruitment Reviewer** sẽ nhận thông báo và duyệt tại Discord.');
  const row = new ActionRowBuilder().addComponents(
    new ButtonBuilder().setCustomId('apply_upd').setLabel('Nộp đơn UPD').setEmoji('🚔').setStyle(ButtonStyle.Primary)
  );
  return channel.send({ embeds: [embed], components: [row] });
}

export async function postGuide(channel) {
  const banner = new AttachmentBuilder(path.resolve('assets', 'upd-los-santos-banner.png'), { name: 'upd-los-santos-banner.png' });
  const embed = baseEmbed('📘 BẮT ĐẦU TẠI UPD LOS SANTOS', '1. Đọc luật tại kênh luật và bấm **Tôi đồng ý**.\n2. Đổi nickname theo mẫu nhân vật của server.\n3. Trò chuyện văn minh tại khu vực cộng đồng.\n4. Muốn gia nhập UPD: mở kênh ứng tuyển và điền đơn.\n5. Khi cần hỗ trợ: tạo ticket, không nhắn riêng hàng loạt Staff.\n\n**Lưu ý:** Ban Quản Trị có thể cập nhật luật. Việc tham gia server đồng nghĩa bạn chấp nhận phiên bản luật hiện hành.').setImage('attachment://upd-los-santos-banner.png');
  return channel.send({ embeds: [embed], files: [banner] });
}

export async function postAgencyRankPanel(channel, groupKey) {
  const group = rankGroups.find(item => item.key === groupKey);
  if (!group) throw new Error(`Unknown rank group: ${groupKey}`);
  const hierarchy = group.roles.map(([, name], index) => `**${index + 1}.** ${name}`).join('\n');
  const embed = baseEmbed(
    `📟 ${group.label} • CẤP BẬC & CALLSIGN ${group.callsign}`,
    `**Thứ tự từ cao xuống thấp**\n${hierarchy}\n\n**Dải callsign:** ${group.callsign}\nCấp bậc được quản lý bằng lệnh \`/rank ${group.key}\`.`
  );
  return channel.send({ embeds: [embed] });
}
