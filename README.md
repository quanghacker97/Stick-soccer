# Stick-soccer
Đội bóng thiếu lâm người que

Game bóng đá người que 1v1 lấy cảm hứng từ "Đội Bóng Thiếu Lâm" — mỗi cao thủ
có một tuyệt kỹ võ thuật riêng để tung ra khi thanh năng lượng đầy. Chạy hoàn
toàn trên trình duyệt bằng HTML5 Canvas + JavaScript thuần, không cần build.

## Chạy thử cục bộ

Mở trực tiếp `index.html`, hoặc chạy một server tĩnh đơn giản:

```bash
python3 -m http.server 8080
```

rồi truy cập `http://localhost:8080`.

## Deploy lên Render

Repo đã có sẵn `render.yaml`, nên chỉ cần:

1. Vào [Render Dashboard](https://dashboard.render.com) → **New** → **Blueprint**.
2. Chọn repo này, Render sẽ tự đọc `render.yaml` và tạo một **Static Site**.
3. Bấm **Apply** để deploy — không cần build command, vì đây là site tĩnh
   (`index.html`, `style.css`, `js/game.js`).

Hoặc tạo thủ công không dùng Blueprint: **New** → **Static Site**, chọn repo,
để trống *Build Command*, và đặt *Publish Directory* là `.` (thư mục gốc).
