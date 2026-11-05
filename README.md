# Mật Ong – web học từ vựng tiếng Anh

Tái tạo giao diện và trải nghiệm của luyentu.com theo bản phân tích `claude/luyentu-phan-tich.md` (trong Project "code web").

## Cấu trúc
```
matong/
├── client/   React 19 + Vite + Chakra UI v2 + React Router
├── server/   Node 22 + Express 5 + SQLite (node:sqlite, không cần cài DB)
└── scripts/  dev-restart.sh, kiểm thử end-to-end (Playwright, e2e_*.py, run_all_e2e.sh), mock_claude.py (giả lập API Claude khi test)
```

## Yêu cầu
- Node.js **22.5 trở lên** (dùng SQLite có sẵn trong Node).

## Chạy khi phát triển
```bash
cd server && npm install && npm run dev      # API: http://localhost:4000
cd client && npm install && npm run dev      # Web: http://localhost:5173
```
Mở http://localhost:5173 → "Tiếp tục với email" → nhập email bất kỳ.
Khi **chưa cấu hình gửi mail**, mã 6 số được in ra console của server và hiện ngay trên màn hình (chỉ ở chế độ dev).

Thêm dữ liệu thử cho tài khoản đầu tiên: `cd server && node scripts/seed-dev.js 1`

## Chạy production
```bash
cd client && npm run build
cd ../server && NODE_ENV=production JWT_SECRET=<chuỗi bí mật dài> npm start   # phục vụ cả web lẫn API ở cổng 4000
```

## Vận hành trên VPS
- Cập nhật code mới từ GitHub: `bash /opt/matong/scripts/update.sh`
- Sao lưu (cần `apt install -y sqlite3`): `bash /opt/matong/scripts/backup.sh` → lưu ở `/root/matong-backups`, giữ 14 bản gần nhất.
  Tự động mỗi ngày lúc 3h: `crontab -e` rồi thêm dòng `0 3 * * * bash /opt/matong/scripts/backup.sh >> /var/log/matong-backup.log 2>&1`
- Khôi phục: `pm2 stop matong`, chép bản `.db` về `server/data/matong.db` (xóa `matong.db-wal`, `matong.db-shm` cũ), giải nén `files-*.tgz` vào `server/data`, rồi `pm2 start matong`.

## Biến môi trường
| Biến | Nơi đặt | Tác dụng |
|---|---|---|
| `JWT_SECRET` | server | Khóa ký phiên đăng nhập (bắt buộc ở production) |
| `RESEND_API_KEY`, `MAIL_FROM` | server | Gửi mã OTP qua email (resend.com) |
| `GOOGLE_CLIENT_ID` | server | Xác minh đăng nhập Google |
| `VITE_GOOGLE_CLIENT_ID` | client/.env | Bật nút "Tiếp tục với Google" |
| `VITE_COMMUNITY_FACEBOOK`, `VITE_COMMUNITY_ZALO` | client/.env | Link nhóm cộng đồng (modal "Cộng đồng") |
| `PORT`, `DATA_DIR` | server | Cổng API và thư mục chứa file SQLite + ảnh người dùng tải lên (`DATA_DIR/uploads`) |
| `ANTHROPIC_API_KEY` | server | Bật tính năng AI (tạo từ theo chủ đề/đoạn văn/ảnh, chấm câu, dịch câu ví dụ) qua API Claude |
| `ANTHROPIC_MODEL` | server | Model Claude dùng cho AI (mặc định `claude-haiku-5-5`) |
| `AI_DAILY_LIMIT` | server | Số lượt AI mỗi tài khoản mỗi ngày (mặc định 30, như nhau cho mọi người) |
| `WORD_LIMIT` | server | Số từ tối đa mỗi tài khoản (mặc định 20.000, chống lạm dụng) |
| `CLASS_SLOTS` | server | Số học sinh tối đa mỗi lớp (mặc định 30) |
| `ADMIN_EMAILS` | server | Email quản trị (nhập lộ trình), cách nhau bởi dấu phẩy. Bỏ trống ở dev = ai cũng là admin |
| `VAPID_PUBLIC_KEY`, `VAPID_PRIVATE_KEY`, `VAPID_SUBJECT` | server | Khóa Web Push cho nhắc học. Bỏ trống thì tự tạo và lưu ở `DATA_DIR/vapid.json` (giữ file này cố định khi deploy) |
| `VITE_CONTACT_EMAIL` | client/.env | Email liên hệ hiển thị ở trang Điều khoản / Quyền riêng tư |

### Dịch vụ bên ngoài
- **Không có thanh toán.** Website hoàn toàn miễn phí, không phân biệt Free/PRO; xu chỉ kiếm được khi học.
- **Claude API (Anthropic)** – tùy chọn, cho các tính năng AI. Lấy key tại console.anthropic.com. Không có key thì nút AI hiện thông báo "chưa cấu hình", các phần khác vẫn chạy.
- **Web Push** – miễn phí, dùng chuẩn VAPID qua dịch vụ push của trình duyệt; web cần chạy HTTPS ở production.
- **Resend** – tùy chọn, gửi mã đăng nhập qua email. **Google Identity** – tùy chọn, đăng nhập Google.

## Kiểm thử
```bash
pip install playwright && bash scripts/run_all_e2e.sh   # 11 bộ: vocab, practice, srs, roadmap, social, store, community, classes, ai_games, landing, push
```

## Tiến độ
- [x] Khung dự án, design tokens, app shell (header, sidebar thu gọn, drawer mobile, dark mode)
- [x] Đăng nhập email OTP (+ Google khi có Client ID), phiên JWT cookie
- [x] Trang chủ: thống kê, chuỗi ngày học, truy cập nhanh, lộ trình (ghim, lọc nhóm)
- [x] Modal hồ sơ: đổi tên, ngày thi, giờ nhắc, giọng đọc & tốc độ (Web Speech), đăng xuất, xóa tài khoản
- [x] Bộ từ vựng (/category-list): tạo/sửa/xóa bộ từ & thư mục, chọn nhiều → thêm vào thư mục, bỏ khỏi thư mục,
      xem bộ từ, sửa trực tiếp trong bảng, xuất CSV/Excel
- [x] Từ vựng (/words): thống kê, tìm kiếm, lọc theo bộ, phân trang 40 từ, bật/tắt "Thuộc", chọn nhiều (Thuộc/Chưa thuộc/Xóa),
      sửa từ, "Thêm nhiều từ" (nhập tay, nhập CSV/Excel, Thêm nhanh dạng `từ | /IPA/ | loại từ | nghĩa | ví dụ | ghi chú`, tải file mẫu)
- [x] Giới hạn số từ chung cho mọi tài khoản (không còn Free/PRO, không có nạp phí)
- [x] Học từ vựng (/practice): chọn bộ từ (cây thư mục, chọn nhiều), bộ lọc, thứ tự, số lượng, "N từ sẵn sàng", cài đặt game
      (âm thanh, âm lượng, thời gian mỗi câu, tự chuyển câu), lịch sử đấu + thống kê
- [x] Dạng bài: Flashcard (lật 3D, EN↔VN, check nghĩa, phím tắt) · Trắc nghiệm (Từ→Nghĩa, Ngữ cảnh, Nghĩa→Từ, phím 1-4)
      · Nối từ (vòng 8 cặp, 5 mạng, đếm giờ) · Gõ từ (gợi ý chữ cái, xem ví dụ) · Nghe viết (phát âm, chậm 0.7x) · Hỗn hợp
- [x] Bottom sheet đúng/sai, tự chuyển câu, tính lại đúng/sai; thoát / kết thúc lượt giữa chừng
- [x] Màn kết quả: % + đánh giá, xu dự kiến → đã nhận, đánh dấu "Đã thuộc", Lưu & Hoàn thành, Làm lại câu sai, Chơi tiếp
- [x] SRS khi lưu: đúng +1 cấp (lịch 1/3/7/14 ngày, Lv5 = đã thuộc), sai −1 cấp và ôn ngay; cộng xu (mỗi câu đúng: Flashcard 5,
      Trắc nghiệm/Nối từ/Gõ từ 10, Nghe viết 15, Hỗn hợp 20); ghi lịch sử → streak
- [x] Ôn tập SRS riêng (cấp độ, đến hạn, dạng bài theo cấp, chu kỳ Lv5) · Lộ trình (nhóm, ghim, bộ từ, BXH, nhập lộ trình CSV/Excel cho admin)
- [x] Xếp hạng: BXH lượt chơi/streak, heatmap, chuỗi chung (mời qua email), chat cộng đồng
- [x] Cửa hàng: ảnh đại diện, hình nền, meme đúng/sai (hiện khi trả lời), 5 giao diện mùa (hiệu ứng rơi), đá streak, quà hằng ngày,
      ô ảnh tự upload (ảnh vẽ riêng bằng SVG, không dùng ảnh của site gốc)
- [x] Thư viện cộng đồng: công khai thư mục, tìm kiếm, Thịnh hành/Mới nhất, upvote, xem & sao chép bộ từ/thư mục, link chia sẻ /share/:token
- [x] Lớp học: tạo/vào lớp bằng mã hoặc link mời, tài liệu, giao bài có hạn nộp (đếm ngược), học sinh làm bài, bảng kết quả Đạt/Chưa đạt,
      tiến độ + heatmap từng học sinh, sửa tên, xóa học sinh, rời lớp
- [x] AI (Claude): thêm từ theo chủ đề / đọc hiểu (bôi đen) / ảnh (OCR) → duyệt trong bảng "Thêm nhiều từ"; chấm câu; dịch câu ví dụ
- [x] Game đặc biệt: Dịch câu, Luyện đặt câu (AI chấm), Chim Chăm Chỉ (canvas), Bắn thiên thạch (canvas)
- [x] Nhắc học mỗi ngày bằng Web Push (service worker, gửi thử, mở thẳng Ôn tập SRS) · đếm ngược ngày thi trên Header
- [x] Trang giới thiệu "/", Điều khoản sử dụng, Chính sách quyền riêng tư, trang 404, xóa tài khoản trong Hồ sơ
