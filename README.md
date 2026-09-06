# Stick-soccer
Đội bóng thiếu lâm người que

Game bóng đá 3D người que lấy cảm hứng từ "Đội Bóng Thiếu Lâm" — thi đấu 5v5
cả đội, mỗi bên có một cao thủ mang tuyệt kỹ võ thuật riêng, tung ra khi
thanh năng lượng đầy. Dựng bằng [Three.js](https://threejs.org) + Vite.

## Cách chơi

- **Di chuyển:** W/A/S/D
- **Sút bóng:** Space (sút theo hướng đang di chuyển/nhìn)
- **Chuyền bóng:** Shift (tự nhắm đồng đội ở vị trí tốt phía trên)
- **Xuất chiêu:** F (chỉ dùng được khi thanh CHIÊU đầy)
- **Đổi cầu thủ điều khiển:** Tab (hệ thống cũng tự chuyển sang cầu thủ gần
  bóng nhất khi cần, giống các game bóng đá thật)

Chọn 1 trong 6 cao thủ Thiếu Lâm để dẫn dắt đội của bạn, mỗi người có một
tuyệt kỹ khác nhau (Hàng Long Cước, Thiết Đầu Công, Thái Cực Toàn Phong, Liệt
Hỏa Phần Thiên Cước, Thiên Ảnh Vạn Hình Cước, Cuồng Phong Toái Nhật Cước). Đội
đối thủ do AI điều khiển toàn bộ, cũng có một cao thủ riêng và có thể tung
chiêu để đáp trả.

## Chạy thử cục bộ

```bash
npm install
npm run dev
```

rồi mở địa chỉ mà Vite in ra (mặc định `http://localhost:5173`).

## Build production

```bash
npm run build
```

Kết quả nằm trong thư mục `dist/`, có thể xem thử bằng `npm run preview`.

## Deploy lên Render

Repo đã có sẵn `render.yaml`, nên chỉ cần:

1. Vào [Render Dashboard](https://dashboard.render.com) → **New** → **Blueprint**.
2. Chọn repo này, Render sẽ tự đọc `render.yaml` và tạo một **Static Site**
   với build command `npm install && npm run build`, publish thư mục `dist`.
3. Bấm **Apply** để deploy.

Hoặc tạo thủ công không dùng Blueprint: **New** → **Static Site**, chọn repo,
Build Command đặt là `npm install && npm run build`, Publish Directory đặt
là `dist`.

## Phiên bản 2D cũ

Bản gốc (bóng đá người que 2D, 1v1, HTML5 Canvas thuần) vẫn còn lưu trong
thư mục [`archive-2d/`](./archive-2d) để tham khảo, không còn được deploy.
