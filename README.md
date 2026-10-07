# HỆ THỐNG XÓA MÃ ẨN & CẤP MÃ VIP MM88 (All-in-One 1 Link Duy Nhất)

Toàn bộ hệ thống hiện tại **đã được gộp chung vào 1 link duy nhất**, bạn không cần phải deploy 2 link riêng biệt!

---

## 🌐 Đường dẫn truy cập trên cùng 1 Domain:

- **`https://domain-cua-ban/`** : Trang Check & Xóa mã ẩn (Cổng xác thực Gateway + Dashboard + Hiệu ứng Matrix MM88).
  > **Quy tắc**: Nhập đúng `MM88` mới báo thành công (rủi ro 0%), các trang khác báo dính mã độc (rủi ro 99%).
- **`https://domain-cua-ban/admin`** : Trang Quản trị Cấp mã VIP dùng 1 lần (Có nút tạo nhanh `MM...`, đẩy mã lên máy chủ, xem và xóa mã).
- **`https://domain-cua-ban/api`** : API kết nối Database Cloudflare KV (Tự động xác thực và tự hủy mã khi dùng).

---

## 🚀 Cách Deploy Chỉ 1 Bước (Khuyên dùng Cloudflare Worker)

1. Đăng nhập vào [Cloudflare Dashboard](https://dash.cloudflare.com/) -> vào mục **Workers & Pages** -> **KV**.
2. Bấm **Create a Namespace** -> Đặt tên là `CODES_KV`.
3. Vào mục **Workers & Pages** -> **Create application** -> **Create Worker**:
   - Copy toàn bộ nội dung file [cloudflare-worker.js](file:///c:/Landingpages/MM88/xoamaan-khuD-mm88/cloudflare-worker.js) dán vào Worker editor.
   - Vào mục **Settings** -> **Variables and Secrets** -> cuộn xuống **KV Namespace Bindings**:
     - *Variable name*: `CODES_KV`
     - *KV namespace*: Chọn `CODES_KV` vừa tạo ở Bước 2.
   - Bấm **Deploy**.

Sau khi deploy xong, bạn sẽ có ngay 1 link dạng: `https://ten-worker.ten-ban.workers.dev/`
- Truy cập thẳng link để vào trang **Check mã ẩn**.
- Thêm đuôi `/admin` vào link để vào trang **Quản trị cấp mã**.

---

## 📁 Cấu trúc thư mục

- [index.html](file:///c:/Landingpages/MM88/xoamaan-khuD-mm88/index.html) : Giao diện trang chủ check mã ẩn.
- [admin/index.html](file:///c:/Landingpages/MM88/xoamaan-khuD-mm88/admin/index.html) : Giao diện trang `/admin` (tương thích cả Netlify, Cloudflare Pages, Vercel).
- [cloudflare-worker.js](file:///c:/Landingpages/MM88/xoamaan-khuD-mm88/cloudflare-worker.js) : Code All-In-One chạy trực tiếp trên 1 Cloudflare Worker.
