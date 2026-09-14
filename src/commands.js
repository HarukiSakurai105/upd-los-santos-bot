import { PermissionFlagsBits as P, SlashCommandBuilder } from 'discord.js';
import { rankGroups } from './template.js';

const rankCommand = new SlashCommandBuilder().setName('rank').setDescription('Cấp hoặc đổi cấp bậc theo từng cơ quan');
for (const group of rankGroups) {
  rankCommand.addSubcommand(subcommand => subcommand
    .setName(group.key)
    .setDescription(`Cấp bậc ${group.label} • Callsign ${group.callsign}`.slice(0, 100))
    .addUserOption(option => option.setName('thành_viên').setDescription('Thành viên cần cấp bậc').setRequired(true))
    .addStringOption(option => option.setName('cấp_bậc').setDescription('Cấp bậc mới').setRequired(true)
      .addChoices(...group.roles.map(([value, name]) => ({ name, value }))))
    .addStringOption(option => option.setName('lý_do').setDescription('Lý do thăng/giáng cấp')));
}

export const commandData = [
  new SlashCommandBuilder().setName('setup').setDescription('Tự động setup hoặc làm mới toàn bộ server UPD')
    .addStringOption(o => o.setName('chế_độ').setDescription('Bổ sung hoặc xóa toàn bộ kênh để làm mới').setRequired(true).addChoices(
      { name: 'Bổ sung phần còn thiếu (an toàn)', value: 'update' },
      { name: 'XÓA TOÀN BỘ KÊNH + ROLE và làm mới', value: 'reset' }
    ))
    .addStringOption(o => o.setName('tên_server').setDescription('Tên server mới; mặc định lấy BRAND_NAME').setMinLength(2).setMaxLength(100))
    .addAttachmentOption(o => o.setName('logo_server').setDescription('Logo PNG/JPG; bỏ trống để dùng logo UPD có sẵn'))
    .addAttachmentOption(o => o.setName('ảnh_bìa').setDescription('Banner PNG/JPG; cần server hỗ trợ banner'))
    .setDefaultMemberPermissions(P.Administrator),
  new SlashCommandBuilder().setName('cleanup_roles').setDescription('Xóa role cũ còn sót, giữ role UPD hiện tại và role hệ thống')
    .addStringOption(o => o.setName('xác_nhận').setDescription('Xác nhận thao tác xóa role cũ').setRequired(true).addChoices(
      { name: 'ĐỒNG Ý XÓA ROLE CŨ', value: 'yes' }
    )).setDefaultMemberPermissions(P.Administrator),
  new SlashCommandBuilder().setName('panel').setDescription('Đăng lại các bảng điều khiển').setDefaultMemberPermissions(P.ManageGuild),
  new SlashCommandBuilder().setName('announce').setDescription('Gửi thông báo chính thức').addStringOption(o => o.setName('nội_dung').setDescription('Nội dung thông báo').setRequired(true)).addChannelOption(o => o.setName('kênh').setDescription('Kênh nhận thông báo')).setDefaultMemberPermissions(P.ManageMessages),
  rankCommand,
  new SlashCommandBuilder().setName('department').setDescription('Phân công thành viên vào cơ quan thực thi pháp luật')
    .addUserOption(o => o.setName('thành_viên').setDescription('Nhân sự cần phân công').setRequired(true))
    .addStringOption(o => o.setName('cơ_quan').setDescription('Cơ quan mới').setRequired(true).addChoices(
      { name: 'LSPD・Los Santos Police Department', value: 'lspd' },
      { name: 'BCSO・Blaine County Sheriff Office', value: 'bcso' },
      { name: 'SASP・San Andreas State Police', value: 'sahp' },
      { name: 'SASPR・San Andreas State Park Ranger', value: 'saspr' },
      { name: 'FIB・Federal Investigation Bureau', value: 'fib' },
      { name: 'NOOSE・Special Operations', value: 'noose' },
      { name: 'DOC・Department of Corrections', value: 'doc' },
      { name: 'Gỡ khỏi cơ quan hiện tại', value: 'none' }
    )),
  new SlashCommandBuilder().setName('duty').setDescription('Bật/tắt trạng thái làm nhiệm vụ UPD'),
  new SlashCommandBuilder().setName('nickname').setDescription('Đổi tên một thành viên').addUserOption(o => o.setName('thành_viên').setDescription('Thành viên').setRequired(true)).addStringOption(o => o.setName('tên').setDescription('Tên mới').setRequired(true).setMaxLength(32)).setDefaultMemberPermissions(P.ManageNicknames),
  new SlashCommandBuilder().setName('clear').setDescription('Xóa tin nhắn gần đây').addIntegerOption(o => o.setName('số_lượng').setDescription('1–100').setRequired(true).setMinValue(1).setMaxValue(100)).setDefaultMemberPermissions(P.ManageMessages),
  new SlashCommandBuilder().setName('warn').setDescription('Cảnh cáo thành viên').addUserOption(o => o.setName('thành_viên').setDescription('Thành viên').setRequired(true)).addStringOption(o => o.setName('lý_do').setDescription('Lý do').setRequired(true)).setDefaultMemberPermissions(P.ModerateMembers),
  new SlashCommandBuilder().setName('warnings').setDescription('Xem cảnh cáo của thành viên').addUserOption(o => o.setName('thành_viên').setDescription('Thành viên').setRequired(true)).setDefaultMemberPermissions(P.ModerateMembers),
  new SlashCommandBuilder().setName('unwarn').setDescription('Xóa một cảnh cáo').addUserOption(o => o.setName('thành_viên').setDescription('Thành viên').setRequired(true)).addIntegerOption(o => o.setName('số').setDescription('Số thứ tự cảnh cáo').setRequired(true).setMinValue(1)).setDefaultMemberPermissions(P.ModerateMembers),
  new SlashCommandBuilder().setName('timeout').setDescription('Cách ly thành viên tạm thời').addUserOption(o => o.setName('thành_viên').setDescription('Thành viên').setRequired(true)).addIntegerOption(o => o.setName('phút').setDescription('Số phút').setRequired(true).setMinValue(1).setMaxValue(40320)).addStringOption(o => o.setName('lý_do').setDescription('Lý do').setRequired(true)).setDefaultMemberPermissions(P.ModerateMembers),
  new SlashCommandBuilder().setName('untimeout').setDescription('Gỡ cách ly thành viên').addUserOption(o => o.setName('thành_viên').setDescription('Thành viên').setRequired(true)).setDefaultMemberPermissions(P.ModerateMembers),
  new SlashCommandBuilder().setName('kick').setDescription('Mời thành viên ra khỏi server').addUserOption(o => o.setName('thành_viên').setDescription('Thành viên').setRequired(true)).addStringOption(o => o.setName('lý_do').setDescription('Lý do').setRequired(true)).setDefaultMemberPermissions(P.KickMembers),
  new SlashCommandBuilder().setName('ban').setDescription('Cấm thành viên khỏi server').addUserOption(o => o.setName('thành_viên').setDescription('Thành viên').setRequired(true)).addStringOption(o => o.setName('lý_do').setDescription('Lý do').setRequired(true)).setDefaultMemberPermissions(P.BanMembers),
  new SlashCommandBuilder().setName('server').setDescription('Xem thông tin cộng đồng'),
  new SlashCommandBuilder().setName('help').setDescription('Xem danh sách tính năng bot')
].map(command => command.toJSON());
