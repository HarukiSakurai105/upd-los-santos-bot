import { PermissionFlagsBits as P } from 'discord.js';

export const rankGroups = [
  { key: 'lspd', label: 'LSPD', callsign: '400–499', roles: [
    ['lspd_chief', '★★★★★・LSPD Chief of Police'],
    ['lspd_assistant_chief', '★★★★・LSPD Assistant Chief'],
    ['lspd_deputy_chief', '★★・LSPD Deputy Chief'],
    ['lspd_commander', '★・LSPD Commander'],
    ['lspd_captain', '🏅・LSPD Captain'],
    ['lspd_lieutenant', '🎖️・LSPD Lieutenant'],
    ['lspd_sergeant', '🔰・LSPD Sergeant'],
    ['lspd_corporal', '🔰・LSPD Corporal'],
    ['lspd_senior_officer', '🔷・LSPD Senior Officer'],
    ['lspd_officer', '🔹・LSPD Officer'],
    ['lspd_solo_cadet', '🔸・LSPD Solo Cadet'],
    ['lspd_cadet', '🔸・LSPD Cadet']
  ]},
  { key: 'bcso', label: 'BCSO', callsign: '900–999', roles: [
    ['bcso_sheriff', '★★★★・BCSO Sheriff'],
    ['bcso_undersheriff', '★★★・BCSO Undersheriff'],
    ['bcso_chief_deputy', '★★・BCSO Chief Deputy'],
    ['bcso_commander', '★・BCSO Commander'],
    ['bcso_captain', '🏅・BCSO Captain'],
    ['bcso_lieutenant', '🎖️・BCSO Lieutenant'],
    ['bcso_sergeant', '🔰・BCSO Sergeant'],
    ['bcso_corporal', '🔰・BCSO Corporal'],
    ['bcso_senior_deputy', '🔷・BCSO Senior Deputy'],
    ['bcso_deputy', '🔹・BCSO Deputy'],
    ['bcso_solo_cadet', '🔸・BCSO Solo Cadet'],
    ['bcso_cadet', '🔸・BCSO Cadet']
  ]},
  { key: 'sasp', label: 'SASP', callsign: '200–249', roles: [
    ['sasp_commissioner', '✪・SASP Commissioner'],
    ['sasp_deputy_commissioner', '★★★★★・SASP Deputy Commissioner'],
    ['sasp_assistant_commissioner', '★★★★・SASP Assistant Commissioner'],
    ['sasp_chief', '★★・SASP Chief'],
    ['sasp_assistant_chief', '★・SASP Assistant Chief'],
    ['sasp_captain', '🏅・SASP Captain'],
    ['sasp_lieutenant', '🎖️・SASP Lieutenant'],
    ['sasp_sergeant', '🔰・SASP Sergeant'],
    ['sasp_trooper', '🔹・SASP Trooper']
  ]},
  { key: 'saspr', label: 'SASPR', callsign: '250–299', roles: [
    ['saspr_game_warden', '★★★★・SASPR Forest Ranger Station Chief'],
    ['saspr_captain', '🏅・SASPR Captain'],
    ['saspr_lieutenant', '🎖️・SASPR Lieutenant'],
    ['saspr_sergeant', '🔰・SASPR Sergeant'],
    ['saspr_corporal', '🔰・SASPR Corporal'],
    ['saspr_senior_ranger', '🔷・SASPR Senior Ranger'],
    ['saspr_ranger', '🔹・SASPR Ranger'],
    ['saspr_junior_ranger', '🔸・SASPR Junior Ranger']
  ]},
  { key: 'upd', label: 'UPD / FIB / NOOSE / DOC', callsign: 'Theo phân công', roles: [
    ['chief', 'UPD Chief'], ['assistant_chief', 'UPD Assistant Chief'], ['deputy_chief', 'UPD Deputy Chief'],
    ['commander', 'UPD Commander'], ['captain', 'UPD Captain'], ['lieutenant', 'UPD Lieutenant'], ['sergeant', 'UPD Sergeant'],
    ['senior_officer', 'UPD Senior Officer'], ['officer', 'UPD Officer'], ['cadet', 'UPD Cadet']
  ]}
];

const agencyRankColors = { lspd: 0x2471a3, bcso: 0x8e6e31, sasp: 0x1f4e79, saspr: 0x3f6844 };
const agencyRankSpecs = rankGroups
  .filter(group => group.key !== 'upd')
  .flatMap(group => group.roles.map(([key, name]) => ({ key, name, color: agencyRankColors[group.key] })));

export const roleSpecs = [
  { key: 'founder', name: '👑・Chủ Cộng Đồng', color: 0xf1c40f, permissions: [P.Administrator], hoist: true },
  { key: 'ministry_police', name: '🏛️・Ministry of Interior Police', color: 0x8e44ad, hoist: true },
  { key: 'manager', name: '💎・Quản Lý Server', color: 0xe67e22, permissions: [P.ManageGuild, P.ManageChannels, P.ManageRoles, P.ManageMessages, P.ModerateMembers, P.KickMembers, P.BanMembers, P.ViewAuditLog], hoist: true },
  { key: 'admin', name: '🛡️・Administrator', color: 0xe74c3c, permissions: [P.ManageChannels, P.ManageRoles, P.ManageMessages, P.ModerateMembers, P.KickMembers, P.BanMembers, P.ViewAuditLog], hoist: true },
  { key: 'internal_affairs', name: '🔎・Internal Affairs Division', color: 0x34495e, hoist: true },
  { key: 'moderator', name: '🔨・Moderator', color: 0x9b59b6, permissions: [P.ManageMessages, P.ModerateMembers, P.KickMembers, P.ViewAuditLog], hoist: true },
  { key: 'upd_command', name: '⭐・UPD Command', color: 0xffc300, hoist: true },
  { key: 'fti', name: '🎓・FTI', color: 0x16a085, hoist: true },
  { key: 'fto', name: '🧑‍🏫・FTO', color: 0x138d75, hoist: true },

  ...agencyRankSpecs.filter(spec => spec.key.startsWith('lspd_')),
  { key: 'lspd', name: '🚓・LSPD', color: 0x2471a3, hoist: true },
  ...agencyRankSpecs.filter(spec => spec.key.startsWith('bcso_')),
  { key: 'bcso', name: '⭐・BCSO', color: 0x8e6e31, hoist: true },
  ...agencyRankSpecs.filter(spec => spec.key.startsWith('sasp_')),
  { key: 'sahp', name: '🚨・SASP', color: 0x1f4e79, hoist: true },
  ...agencyRankSpecs.filter(spec => spec.key.startsWith('saspr_')),
  { key: 'saspr', name: '🌲・SASPR', color: 0x3f6844, hoist: true },

  { key: 'chief', name: '🏅・UPD Chief', color: 0xffd700, hoist: true },
  { key: 'assistant_chief', name: '🏅・UPD Assistant Chief', color: 0xf4d03f, hoist: true },
  { key: 'deputy_chief', name: '🏅・UPD Deputy Chief', color: 0xe5c100, hoist: true },
  { key: 'commander', name: '🎖️・UPD Commander', color: 0xe67e22, hoist: true },
  { key: 'captain', name: '🎖️・UPD Captain', color: 0xd35400, hoist: true },
  { key: 'lieutenant', name: '🎖️・UPD Lieutenant', color: 0xc47f17, hoist: true },
  { key: 'sergeant', name: '🔰・UPD Sergeant', color: 0x27ae60, hoist: true },
  { key: 'senior_officer', name: '🔷・UPD Senior Officer', color: 0x3498db },
  { key: 'officer', name: '🔹・UPD Officer', color: 0x2980b9 },
  { key: 'cadet', name: '🔸・UPD Cadet', color: 0x85c1e9 },
  { key: 'fib', name: '🕵️・FIB', color: 0x212f3d, hoist: true },
  { key: 'noose', name: '🦅・NOOSE', color: 0x641e16, hoist: true },
  { key: 'doc', name: '🔒・DOC', color: 0x566573, hoist: true },
  { key: 'ticket_handler', name: '🎫・Ticket Support', color: 0x5865f2, hoist: true },
  { key: 'recruitment_reviewer', name: '📋・Recruitment Reviewer', color: 0x1abc9c, hoist: true },
  { key: 'upd', name: '🚔・UPD', color: 0x1f618d, hoist: true },
  { key: 'civilian', name: '🏙️・Công Dân', color: 0x95a5a6 },
  { key: 'verified', name: '✅・Đã Xác Minh', color: 0x2ecc71 },
  { key: 'muted', name: '🔇・Muted', color: 0x2c3e50 }
];

export const rankKeys = rankGroups.flatMap(group => group.roles.map(([key]) => key));
export const departmentKeys = ['lspd', 'bcso', 'sahp', 'saspr', 'fib', 'noose', 'doc'];
export const departmentRankGroup = { lspd: 'lspd', bcso: 'bcso', sahp: 'sasp', saspr: 'saspr', fib: 'upd', noose: 'upd', doc: 'upd' };
export const updManagementRoleKeys = [
  'founder', 'manager', 'admin', 'upd_command',
  'lspd_chief', 'lspd_assistant_chief', 'lspd_deputy_chief', 'lspd_commander',
  'bcso_sheriff', 'bcso_undersheriff', 'bcso_chief_deputy', 'bcso_commander',
  'sasp_commissioner', 'sasp_deputy_commissioner', 'sasp_assistant_commissioner', 'sasp_chief', 'sasp_assistant_chief',
  'saspr_game_warden', 'saspr_captain',
  'chief', 'assistant_chief', 'deputy_chief', 'commander'
];

export const rules = [
  ['Tôn trọng cộng đồng', 'Không xúc phạm, phân biệt đối xử, quấy rối, kích động thù ghét hoặc gây drama.'],
  ['Không spam/quảng cáo', 'Không flood, tag hàng loạt, gửi link mời hoặc quảng cáo khi chưa được Ban Quản Trị cho phép.'],
  ['Nội dung an toàn', 'Cấm nội dung NSFW, lừa đảo, mã độc, doxxing và tiết lộ thông tin cá nhân của người khác.'],
  ['Đúng kênh, đúng mục đích', 'Đọc mô tả kênh trước khi gửi nội dung; không làm phiền các kênh nghiệp vụ UPD.'],
  ['Tên và ảnh đại diện', 'Tên/ảnh không được giả mạo Ban Quản Trị, phản cảm hoặc gây nhầm lẫn.'],
  ['Tuân thủ quyết định quản trị', 'Không né hình phạt bằng tài khoản phụ. Khiếu nại văn minh qua ticket.'],
  ['Không metagaming', 'Không dùng thông tin ngoài nhân vật (OOC) để tạo lợi thế cho nhân vật (IC).'],
  ['Không powergaming', 'Không ép tình huống phi thực tế, lạm dụng cơ chế game hoặc hành động vượt khả năng nhân vật.'],
  ['FearRP & New Life Rule', 'Biết sợ hãi hợp lý; sau khi chết không quay lại trả thù hoặc nhớ chi tiết tình huống trước đó.'],
  ['RDM / VDM', 'Cấm giết người hoặc dùng phương tiện tấn công không có lý do/tình huống RP hợp lệ.'],
  ['Combat logging', 'Cấm thoát game để né tình huống, bắt giữ, khám xét hoặc hậu quả RP.'],
  ['Quy tắc UPD', 'Tuân thủ chain of command, SOP, radio discipline; không lạm quyền, tiết lộ hồ sơ hay trang bị nội bộ.']
];

export const channelGroups = [
  { key: 'info_category', name: '📌 THÔNG TIN', channels: [
    { key: 'welcome', name: '👋・chào-mừng', readOnly: true },
    { key: 'rules', name: '📜・luật-cộng-đồng', readOnly: true },
    { key: 'announcements', name: '📢・thông-báo', readOnly: true },
    { key: 'server_guide', name: '🖥️・hướng-dẫn-tham-gia', readOnly: true }
  ]},
  { key: 'community_category', name: '🏙️ CỘNG ĐỒNG', verified: true, channels: [
    { key: 'general', name: '💬・trò-chuyện' },
    { key: 'media', name: '📸・hình-ảnh-video' },
    { key: 'suggestions', name: '💡・góp-ý' },
    { key: 'bot_commands', name: '🤖・lệnh-bot' }
  ]},
  { key: 'support_category', name: '🎫 HỖ TRỢ & ỨNG TUYỂN', verified: true, channels: [
    { key: 'support', name: '🎫・tạo-ticket', readOnly: true },
    { key: 'recruitment', name: '📝・ứng-tuyển-upd', readOnly: true }
  ]},
  { key: 'upd_public_category', name: '🚔 UPD LOS SANTOS', verified: true, channels: [
    { key: 'upd_news', name: '🚨・tin-tức-upd', readOnly: true },
    { key: 'wanted', name: '🔎・truy-nã', readOnly: true },
    { key: 'complaints', name: '⚖️・khiếu-nại-upd' }
  ]},
  { key: 'upd_private_category', name: '🔒 NỘI BỘ UPD', privateRole: 'upd', channels: [
    { key: 'upd_chat', name: '💬・nội-bộ-upd' },
    { key: 'briefing', name: '📋・briefing' },
    { key: 'case_files', name: '🗂️・hồ-sơ-vụ-án' },
    { key: 'evidence', name: '📦・kho-vật-chứng' },
    { key: 'radio', name: '📻・radio-upd', voice: true },
    { key: 'patrol_1', name: '🚓・Tuần Tra 1', voice: true },
    { key: 'patrol_2', name: '🚓・Tuần Tra 2', voice: true }
  ]},
  { key: 'lspd_category', name: '🚓 LSPD・LOS SANTOS POLICE', privateRole: 'lspd', channels: [
    { key: 'lspd_announcements', name: '📢・lspd-thông-báo', readOnly: true },
    { key: 'lspd_ranks', name: '📟・lspd-cấp-bậc-callsign', readOnly: true, topic: 'LSPD rank structure • Callsign 400–499' },
    { key: 'lspd_chat', name: '💬・lspd-nội-bộ' },
    { key: 'lspd_records', name: '📁・lspd-hồ-sơ' },
    { key: 'lspd_radio', name: '📻・Radio LSPD', voice: true },
    { key: 'lspd_patrol', name: '🚓・Tuần Tra LSPD', voice: true }
  ]},
  { key: 'bcso_category', name: '⭐ BCSO・BLAINE COUNTY SHERIFF', privateRole: 'bcso', channels: [
    { key: 'bcso_announcements', name: '📢・bcso-thông-báo', readOnly: true },
    { key: 'bcso_ranks', name: '📟・bcso-cấp-bậc-callsign', readOnly: true, topic: 'BCSO rank structure • Callsign 900–999' },
    { key: 'bcso_chat', name: '💬・bcso-nội-bộ' },
    { key: 'bcso_records', name: '📁・bcso-hồ-sơ' },
    { key: 'bcso_radio', name: '📻・Radio BCSO', voice: true },
    { key: 'bcso_patrol', name: '⭐・Tuần Tra BCSO', voice: true }
  ]},
  { key: 'sahp_category', name: '🚨 SASP・SAN ANDREAS STATE POLICE', privateRole: 'sahp', channels: [
    { key: 'sahp_announcements', name: '📢・sasp-thông-báo', readOnly: true },
    { key: 'sahp_ranks', name: '📟・sasp-cấp-bậc-callsign', readOnly: true, topic: 'SASP rank structure • Callsign 200–249' },
    { key: 'sahp_chat', name: '💬・sasp-nội-bộ' },
    { key: 'sahp_records', name: '📁・sasp-hồ-sơ' },
    { key: 'sahp_radio', name: '📻・Radio SASP', voice: true },
    { key: 'sahp_patrol', name: '🚨・Tuần Tra SASP', voice: true }
  ]},
  { key: 'saspr_category', name: '🌲 SASPR・STATE PARK RANGER', privateRole: 'saspr', channels: [
    { key: 'saspr_announcements', name: '📢・saspr-thông-báo', readOnly: true },
    { key: 'saspr_ranks', name: '📟・saspr-cấp-bậc-callsign', readOnly: true, topic: 'SASPR rank structure • Callsign 250–299' },
    { key: 'saspr_chat', name: '💬・saspr-nội-bộ' },
    { key: 'saspr_records', name: '📁・saspr-hồ-sơ' },
    { key: 'saspr_radio', name: '📻・Radio SASPR', voice: true },
    { key: 'saspr_patrol', name: '🌲・Tuần Tra SASPR', voice: true }
  ]},
  { key: 'fib_category', name: '🕵️ FIB・FEDERAL INVESTIGATION', privateRole: 'fib', channels: [
    { key: 'fib_announcements', name: '📢・fib-thông-báo', readOnly: true },
    { key: 'fib_chat', name: '💬・fib-nội-bộ' },
    { key: 'fib_records', name: '📁・fib-hồ-sơ-mật' },
    { key: 'fib_radio', name: '📻・Radio FIB', voice: true }
  ]},
  { key: 'noose_category', name: '🦅 NOOSE・SPECIAL OPERATIONS', privateRole: 'noose', channels: [
    { key: 'noose_announcements', name: '📢・noose-thông-báo', readOnly: true },
    { key: 'noose_chat', name: '💬・noose-nội-bộ' },
    { key: 'noose_operations', name: '📁・noose-kế-hoạch' },
    { key: 'noose_radio', name: '📻・Radio NOOSE', voice: true }
  ]},
  { key: 'doc_category', name: '🔒 DOC・DEPARTMENT OF CORRECTIONS', privateRole: 'doc', channels: [
    { key: 'doc_announcements', name: '📢・doc-thông-báo', readOnly: true },
    { key: 'doc_chat', name: '💬・doc-nội-bộ' },
    { key: 'doc_records', name: '📁・doc-hồ-sơ-phạm-nhân' },
    { key: 'doc_radio', name: '📻・Radio DOC', voice: true }
  ]},
  { key: 'command_category', name: '⭐ BỘ CHỈ HUY UPD', privateRole: 'upd_command', channels: [
    { key: 'command_chat', name: '⭐・bộ-chỉ-huy' },
    { key: 'recruit_review', name: '📥・duyệt-đơn', allowedRoles: ['recruitment_reviewer'] },
    { key: 'discipline', name: '📕・kỷ-luật-nội-bộ' }
  ]},
  { key: 'staff_category', name: '🛡️ BAN QUẢN TRỊ', privateRole: 'moderator', channels: [
    { key: 'staff_chat', name: '🛡️・staff-chat' },
    { key: 'logs', name: '📑・nhật-ký-bot', readOnly: true },
    { key: 'mod_logs', name: '🔨・nhật-ký-xử-lý', readOnly: true },
    { key: 'staff_voice', name: '🔊・Phòng Staff', voice: true }
  ]}
];

export const categoryOrderKeys = [
  'info_category',
  'support_category',
  'community_category',
  'upd_public_category',
  'command_category',
  'staff_category',
  'upd_private_category',
  'lspd_category',
  'bcso_category',
  'sahp_category',
  'saspr_category',
  'fib_category',
  'noose_category',
  'doc_category'
];
