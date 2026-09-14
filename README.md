# UPD Los Santos Community Bot

Bot Discord tiếng Việt dành cho cộng đồng **UPD Los Santos GTA 5 RP**. Lệnh `/setup` có thể bổ sung phần còn thiếu hoặc xóa toàn bộ kênh cũ rồi dựng lại server từ đầu.

## Có sẵn trong bot

- 73 role: Chủ Cộng Đồng, Ban Quản Trị, Bộ Chỉ Huy, Ministry of Interior Police, Internal Affairs Division, FTI/FTO, hai role xử lý nghiệp vụ, cấp bậc riêng của LSPD/BCSO/SASP/SASPR, cấp bậc UPD chung và 7 cơ quan.
- 14 category và 63 kênh, gồm khu vực chung cùng khu nội bộ riêng cho LSPD, BCSO, SASP, SASPR, FIB, NOOSE và DOC.
- Luật cộng đồng + luật RP: metagaming, powergaming, FearRP, NLR, RDM/VDM, combat logging và quy tắc UPD.
- Nút đồng ý luật tự cấp `Đã Xác Minh` + `Công Dân`.
- Ticket hỗ trợ/khiếu nại/liên hệ Staff, chống mở trùng; đóng ticket sẽ khóa ngay và tự xóa sau 5 phút.
- Form ứng tuyển UPD; Bộ Chỉ Huy duyệt/từ chối bằng nút. Duyệt xong tự cấp `UPD` + `Cadet`.
- Đơn mới tự xuất hiện trong `📥・duyệt-đơn` và chỉ ping `Recruitment Reviewer`.
- Ticket mới tạo kênh riêng chỉ người gửi/Staff thấy và chỉ ping `Ticket Support`.
- `/department` tự chuyển nhân sự giữa LSPD/BCSO/SASP/SASPR/FIB/NOOSE/DOC, mở đúng khu nội bộ và gỡ rank không còn phù hợp.
- `/setup` tự sắp role từ cao xuống thấp. Ba category được ưu tiên trên cùng đúng mẫu: Thông Tin → Hỗ Trợ & Ứng Tuyển → Cộng Đồng; tiếp theo là UPD Los Santos và các khu nội bộ.
- Welcome/leave log, cảnh cáo lưu bền vững, timeout, kick, ban, clear, thông báo và đổi nickname.
- `/rank lspd`, `/rank bcso`, `/rank sasp`, `/rank saspr`, `/rank upd` cấp đúng hệ thống rank của từng cơ quan và tự gỡ rank cũ; `/duty` bật/tắt tiền tố `[10-8]`.
- Setup an toàn: chạy lại không xóa kênh/role đang được bot quản lý, đồng thời tự khôi phục đúng permission riêng tư cho category và room mẫu.
- Cấp rank/cơ quan có rollback: nếu Discord từ chối giữa chừng, bot khôi phục role cũ thay vì để thành viên mất cấp bậc.
- Mỗi người chỉ có một đơn đang chờ; gửi lại sau 24 giờ. Một đơn chỉ có thể được một người duyệt để tránh kết quả mâu thuẫn.
- Full reset dành riêng cho chủ server: xóa toàn bộ kênh, tin nhắn và role tùy chỉnh cũ rồi dựng lại cấu trúc mới.
- Tự đổi tên server, tự cài logo UPD và thử cài banner; banner cũng được đăng trong kênh hướng dẫn.
- Có sẵn logo `assets/upd-los-santos-logo.png` và banner `assets/upd-los-santos-banner.png`.

## 1. Tạo bot Discord

1. Mở [Discord Developer Portal](https://discord.com/developers/applications), chọn **New Application**.
2. Vào **Bot** → tạo bot → sao chép token. Không gửi token cho bất kỳ ai và không commit file `.env`.
3. Trong **Privileged Gateway Intents**, bật **Server Members Intent**. Bot dùng intent này cho welcome, xác minh và quản lý thành viên. Không cần bật Message Content Intent.
4. Vào **OAuth2 → URL Generator**, chọn `bot` và `applications.commands`.
5. Khi setup lần đầu, cấp bot quyền **Administrator**. Sau khi setup có thể giới hạn lại, nhưng bot vẫn cần tối thiểu: Manage Roles, Manage Channels, Manage Guild, Manage Messages, Moderate Members, Kick Members, Ban Members, View Audit Log, Send Messages, Embed Links, Attach Files và Read Message History.
6. Mời bot vào server. Trong **Server Settings → Roles**, kéo role của bot lên trên mọi role mà bot cần cấp/quản lý. Discord không cho bot quản lý role cao hơn role của chính nó.

## 2. Cài đặt

Yêu cầu [Node.js 20+](https://nodejs.org/).

```powershell
npm install
Copy-Item .env.example .env
```

Mở `.env` rồi điền:

```env
DISCORD_TOKEN=token_cua_bot
CLIENT_ID=application_id
GUILD_ID=id_server
TIMEZONE=Asia/Ho_Chi_Minh
BRAND_NAME=UPD Los Santos
BRAND_COLOR=1E90FF
```

Để lấy ID: bật **Developer Mode** trong Discord → nhấp phải server → **Copy Server ID**. `CLIENT_ID` là **Application ID** trong trang General Information của ứng dụng.

## 3. Chạy và setup server

```powershell
npm start
```

### Chạy nhanh bằng CMD

Nhấp đúp file `CHAY-BOT.cmd`. File sẽ tự chuyển tới đúng thư mục bot, kiểm tra Node.js/npm, tự chạy `npm install` nếu thiếu thư viện rồi khởi động bot. Không đóng cửa sổ CMD khi muốn bot tiếp tục online; nhấn `Ctrl+C` để dừng.

Nếu chưa có `.env`, file CMD sẽ tự sao chép `.env.example` thành `.env` và mở Notepad để bạn điền `DISCORD_TOKEN`, `CLIENT_ID`, `GUILD_ID`. Sau khi lưu, nhấp đúp `CHAY-BOT.cmd` lần nữa.

Khi terminal báo bot online và đã đăng ký slash command:

1. Trong Discord, chủ server chạy `/setup` và chọn một trong hai chế độ:
   - `Bổ sung phần còn thiếu`: giữ nguyên cấu trúc bot đã lưu, tạo phần thiếu và sửa permission của các room/category mẫu về cấu hình an toàn.
   - `XÓA TOÀN BỘ KÊNH + ROLE và làm mới`: chỉ chủ server dùng được; bot hiện nút cảnh báo để xóa kênh, tin nhắn, role tùy chỉnh cũ và dựng lại.
2. Có thể nhập `tên_server`, tải `logo_server` và `ảnh_bìa` ngay trong lệnh. Nếu bỏ trống, bot dùng tên trong `BRAND_NAME` cùng bộ ảnh UPD có sẵn.
3. Chờ bot báo hoàn tất; full reset có thể mất 30–120 giây tùy số kênh và rate limit Discord.
4. Kiểm tra role của bot đang ở phía trên các role UPD/Verified.
5. Dùng tài khoản thử bấm **Tôi đồng ý với luật**, tạo ticket và gửi một đơn ứng tuyển.
6. Chỉnh lại nội dung tuổi tối thiểu, IP FiveM hoặc quy định riêng trực tiếp trong `src/panels.js` và `src/template.js` nếu cần.

## Lệnh

| Lệnh | Công dụng | Quyền mặc định |
|---|---|---|
| `/setup` | Bổ sung hoặc reset toàn bộ kênh, đổi tên và ảnh server | Administrator |
| `/cleanup_roles` | Xóa role cũ còn sót, giữ role UPD hiện tại | Chủ server |
| `/panel` | Đăng lại bảng luật/ticket/ứng tuyển | Manage Server |
| `/announce` | Gửi embed thông báo | Manage Messages |
| `/rank lspd/bcso/sasp/saspr/upd` | Cấp/đổi cấp bậc đúng cấu trúc từng cơ quan | Chỉ huy cơ quan, Bộ Chỉ Huy hoặc Manage Roles |
| `/department` | Phân công hoặc gỡ cơ quan LSPD/BCSO/SASP/SASPR/FIB/NOOSE/DOC | Bộ Chỉ Huy hoặc Manage Roles |
| `/duty` | Bật/tắt trạng thái trực | Role UPD |
| `/nickname` | Đổi nickname | Manage Nicknames |
| `/clear` | Xóa 1–100 tin gần đây | Manage Messages |
| `/warn`, `/warnings`, `/unwarn` | Quản lý cảnh cáo | Moderate Members |
| `/timeout`, `/untimeout` | Cách ly/gỡ cách ly | Moderate Members |
| `/kick`, `/ban` | Loại/cấm thành viên | Kick/Ban Members |
| `/server`, `/help` | Thông tin và trợ giúp | Mọi người |

## Lưu dữ liệu và backup

ID kênh/role, cảnh cáo và số ticket nằm tại `data/guilds.json` sau lần chạy đầu tiên. Khi đưa bot lên VPS/hosting, hãy gắn persistent volume cho thư mục `data`; nếu không, dữ liệu cảnh cáo có thể mất khi container khởi động lại.

## Chạy bằng Docker

```powershell
docker build -t upd-los-santos-bot .
docker run -d --name upd-bot --env-file .env -v upd-data:/app/data --restart unless-stopped upd-los-santos-bot
```

## Chạy tạm 24/24 bằng Render Free

Bản này có sẵn HTTP health server tại `/health` và `render.yaml`, không cần Docker hoặc Express.

1. Đưa mã nguồn lên một GitHub repository riêng tư. Không đưa file `.env` lên GitHub.
2. Trên Render chọn **New → Blueprint** và kết nối repository. Render sẽ đọc `render.yaml` để tạo Free Web Service.
3. Điền ba biến bí mật khi Render yêu cầu: `DISCORD_TOKEN`, `CLIENT_ID`, `GUILD_ID`.
4. Khi deploy hoàn tất, mở `https://TEN-DICH-VU.onrender.com/health`. Kết quả cần có `"ok":true` và `"discordReady":true`.
5. Tạo tài khoản UptimeRobot, chọn **Add New Monitor → HTTP(s)**, nhập URL `/health` phía trên và để chu kỳ 5 phút.

Render Free ngủ sau 15 phút không nhận request; monitor 5 phút cung cấp request HTTP đều đặn. Đây chỉ là giải pháp hobby/tạm thời: Render có thể restart dịch vụ và giới hạn 750 giờ mỗi workspace/tháng.

Filesystem Free là tạm thời. Hãy backup `data/guilds.json`; bot chỉ tự khôi phục theo ID đã lưu và cố ý không nhận role trùng tên để tránh trao nhầm quyền Ticket/Recruitment. Nếu file mất, chạy lại `/setup` hoặc khôi phục bản backup. Muốn lưu vĩnh viễn cần database hoặc persistent disk.

## Lưu ý vận hành

- Chế độ `Bổ sung` không xóa cấu trúc cũ. Chỉ chế độ full reset mới xóa kênh, tin nhắn và role tùy chỉnh sau khi chủ server bấm xác nhận.
- Discord không cho bot xóa `@everyone`, role tích hợp/booster, role của bot hoặc role nằm cao hơn role bot. Hãy kéo role bot lên cao nhất trước khi reset; các role hệ thống sẽ được giữ lại theo quy định Discord.
- Nếu đã full reset nhưng còn role cũ, kéo role bot lên cao nhất, khởi động lại bot rồi chạy `/cleanup_roles xác_nhận: ĐỒNG Ý XÓA ROLE CŨ`; không cần reset kênh thêm lần nữa.
- Reset kênh là không thể hoàn tác trừ khi bạn có bản sao lưu hoặc Discord Server Template riêng.
- Discord chỉ hỗ trợ server banner tùy chỉnh với server đủ điều kiện. Nếu không đặt được banner, bot vẫn gắn ảnh bìa vào kênh hướng dẫn.
- Endpoint `/health` không tiết lộ token; tuyệt đối không đặt token trong URL, mã nguồn hoặc UptimeRobot.
- Từ v1.1.5, mọi slash command, modal và nút xử lý chậm đều được xác nhận ngay bằng `deferReply`/`deferUpdate`; phản hồi riêng tư dùng `MessageFlags.Ephemeral`. Điều này loại bỏ cảnh báo `ephemeral is deprecated` và lỗi `Unknown interaction 10062` khi duyệt đơn.
- Từ v1.1.6, cấp role UPD/Cadet không còn bị chặn nhầm bởi `GuildMember.manageable`. Discord chỉ yêu cầu role được cấp nằm dưới role cao nhất của bot; chủ server vẫn có thể dùng chính tài khoản của mình để thử đơn.
- Từ v1.2.0, server có 6 cơ quan riêng, hai role xử lý ticket/ứng tuyển và ticket tự xóa sau 5 phút. Lịch xóa được lưu để tiếp tục sau khi bot restart.
- Từ v1.2.1, `/setup` tự chuẩn hóa thứ tự role, category và channel từ cao xuống thấp. Role bot phải nằm cao nhất để bot có quyền di chuyển toàn bộ role mẫu.
- Từ v1.3.0, `/setup` sửa permission riêng tư của room cũ; `UPD Command` không còn xem log Staff; đổi rank/cơ quan có rollback; hàng đợi lưu dữ liệu tự hồi phục; đơn ứng tuyển có chống spam và chống duyệt trùng.
- Từ v1.3.1, Chủ Cộng Đồng, Quản Lý/Admin, UPD Command, Chief, Assistant Chief, Deputy Chief và Commander được dùng `/rank`, `/department` theo thứ bậc; các role này cũng có thể tự gán rank/cơ quan hợp lệ cho chính mình.
- Từ v1.3.2, có file `CHAY-BOT.cmd` để cài thư viện khi thiếu và chạy bot trực tiếp bằng CMD chỉ với một lần nhấp đúp.
- Từ v1.4.0, bot có 69 role, hệ thống rank/callsign riêng cho LSPD (400–499), BCSO (900–999), SASP (200–249), SASPR (250–299), thêm khu SASPR và ưu tiên Thông Tin/Hỗ Trợ/Cộng Đồng lên đầu danh sách room.
- Từ v1.4.1, role dùng API `colors` mới của discord.js; nếu Discord từ chối xếp 69 role cùng lúc, bot tự chia thành nhóm nhỏ và vẫn tiếp tục setup thay vì báo lỗi 50013 rồi dừng.
- Từ v1.4.2, thêm Internal Affairs Division, Ministry of Interior Police, FTI, FTO và đổi SASPR Game Warden thành Forest Ranger Station Chief.
- Từ v1.4.3, toàn bộ role được nhóm và xếp lại từ cao xuống thấp: quản trị cấp cao → Bộ Chỉ Huy/FTI/FTO → từng hệ thống rank LSPD/BCSO/SASP/SASPR → rank UPD/FIB/NOOSE/DOC → role nghiệp vụ và thành viên.
- Không cấp `Administrator` cho role nhân sự thông thường. Mẫu chỉ cấp quyền này cho `Chủ Cộng Đồng`.
- Quyền slash command có thể tinh chỉnh tại **Server Settings → Integrations → bot → Commands**.
- Bot chưa kết nối FiveM/txAdmin hoặc database nhân vật vì mỗi server dùng framework/API khác nhau. Phần Discord hoạt động độc lập hoàn chỉnh.
