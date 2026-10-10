# topbar-macos-for-ubuntu

🇬🇧 [English](README.md) · 🇻🇳 Tiếng Việt

Biến thanh top bar của Ubuntu (GNOME Shell 46) thành thanh menu kiểu macOS: nền mờ trong suốt, logo bên trái, menu
File / Edit / View / Window / Help cho ứng dụng đang focus, và bên phải là các icon trạng thái nét mảnh.

Gồm một extension tự viết (`macbar`) cộng với cấu hình cho 6 extension có sẵn trên extensions.gnome.org.

> **Đã thử trên:** Ubuntu 24.04, GNOME Shell 46, phiên **X11**, một máy duy nhất. Chưa thử trên Wayland hay máy khác.

## Tính năng

**Bên trái:** logo T-Rex, tên ứng dụng (in đậm), menu File / Edit / View / Go / Window / Help (global menu), icon và tiêu đề cửa sổ.

**Bên phải (từ trái sang):** tên người dùng, cờ Việt Nam, ngôn ngữ nhập, máy bay, bluetooth, loa, wifi, pin kèm %,
Control Center, cài đặt top bar, bánh răng mở Settings, đồng hồ (`Sun 11 Oct  03:28`).

- Icon tự vẽ bằng Cairo: wifi 3 mức, loa 3 sóng, bluetooth, pin có tia sét khi cắm sạc (xanh khi sạc, đỏ khi ≤ 20%).
- Chỉ icon bấm được mới có hover; viên thuốc hover cùng kích thước. Wifi, bluetooth, loa tắt thì mờ và có gạch chéo mảnh;
  bấm vào để bật tắt. Bật lại loa mà âm lượng gần 0 thì đặt 80%.
- **Nút cài đặt top bar** (icon màn hình có thanh trên): chọn **Light / Dark / Transparent**, màu chữ và icon tùy ý
  (ô màu, mã hex, thanh trượt RGB) cho chế độ Transparent, và **tự ẩn** (Off / Smart / Always).
- **Tên người dùng**: bấm để xem thông tin tài khoản, có **Log Out** (có hộp thoại xác nhận).
- Menu đang mở không tự nhảy sang menu khác khi rê chuột qua nút khác.
- Đồng hồ luôn nằm tận cùng bên phải, đổi thứ tự ngày thành thứ, ngày, tháng bất kể ngôn ngữ hệ thống.

## Cài đặt

Chỉ một lệnh (cần kết nối mạng; script hỏi mật khẩu `sudo` nếu thiếu gói hệ thống):

```bash
curl -fsSL https://raw.githubusercontent.com/vanvietle/topbar-macos-for-ubuntu/main/install.sh | bash
```

Muốn xem script sẽ làm gì mà không thay đổi gì: thêm `-s -- --dry-run` sau `bash`:

```bash
curl -fsSL https://raw.githubusercontent.com/vanvietle/topbar-macos-for-ubuntu/main/install.sh | bash -s -- --dry-run
```

Hoặc clone về rồi đọc kỹ trước khi chạy:

```bash
git clone https://github.com/vanvietle/topbar-macos-for-ubuntu.git
cd topbar-macos-for-ubuntu
./install.sh --dry-run
./install.sh
```

Script sẽ: cài các gói còn thiếu (`pipx`, `dconf-cli`, `patch`, ...), sao lưu cài đặt hiện tại ra `~/gnome-backup-<ngày>.dconf`,
cài các extension bằng `gext`, vá Global Menu, chép `macbar`, nạp cấu hình, và bật các extension. Sau đó khởi động lại shell:
**`Alt+F2`, gõ `r`, Enter** (X11), hoặc đăng xuất rồi đăng nhập lại.

## Gỡ cài đặt / khôi phục

Một lệnh (gỡ `macbar` và tắt các extension):

```bash
curl -fsSL https://raw.githubusercontent.com/vanvietle/topbar-macos-for-ubuntu/main/scripts/uninstall.sh | bash
dconf load / < ~/gnome-backup-<ngày>.dconf        # trả lại toàn bộ cài đặt cũ (bản sao lưu do script cài tạo)
```

Nếu thanh top bar biến mất sau khi dùng tự ẩn: `gnome-extensions disable hidetopbar@mathieu.bidon.ca`, rồi `Alt+F2`, `r`.

## Cấu trúc

| Thư mục | Nội dung |
|---|---|
| `extensions/macbar@local/` | extension tự viết (JavaScript, GNOME Shell 46) |
| `patches/globalmenu-fix.patch` | vá Global Menu: menu bị dựng lại giữa lúc bấm, và phím gửi quá sớm |
| `config/extensions.dconf` | cài đặt của các extension (mặc định: chế độ Dark, chữ trắng, tự ẩn Off) |
| `assets/` | icon T-Rex |
| `install.sh` | script cài một lệnh (tải repo rồi chạy `scripts/install.sh`) |
| `scripts/` | `install.sh` (bản cài đầy đủ), `uninstall.sh` |

## Lưu ý

- Mỗi lần sửa mã `macbar` phải tải lại shell (`Alt+F2`, `r`) thì mã mới mới được nạp; bật tắt extension là chưa đủ.
- Global Menu không đọc menu thật của ứng dụng: nó gửi phím tắt chung (Ctrl+C, Ctrl+V, ...), nên một số mục không có tác dụng.
- Nếu extensions.gnome.org cập nhật Global Menu, bản vá có thể không áp dụng được nữa (script sẽ báo và bỏ qua).
- Trạng thái "wifi tắt" (gạch chéo) chưa được thử trên máy thật vì tắt wifi sẽ mất kết nối của người phát triển.
- Chưa có đề xuất nào cho Wayland.

Giấy phép: MIT (xem `LICENSE`). Tài liệu bên thứ ba: `NOTICE.md`.
