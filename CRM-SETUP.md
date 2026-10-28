# Lead Hub CRM — hướng dẫn kiểm thử

## Đường dẫn

- Landing page: `/`
- CRM: `/admin/crm`

Trang CRM dùng mã OTP gửi tới email quản trị đã cấu hình trong `ADMIN_EMAIL`. Không dùng service key ở trình duyệt.

## Kiểm thử form

1. Mở landing page với URL có UTM, ví dụ `?utm_source=facebook&utm_medium=paid&utm_campaign=coaching`.
2. Gửi form với tên, email, số điện thoại và tình huống cụ thể.
3. Xác nhận QR xuất hiện, số tiền là `25.000.000 VNĐ` và giữ nguyên mã chuyển khoản.
4. Vào `/admin/crm`, đăng nhập bằng mã OTP, kiểm tra lead nằm ở cột **Mới**.
5. Kiểm tra nguồn, UTM, score, lý do score và lịch sử hoạt động.

## Kiểm thử lead trùng

1. Gửi lại form với cùng email nhưng nội dung tình huống khác.
2. CRM phải giữ một lead duy nhất theo email, cập nhật thông tin mới và thêm một hoạt động `form_submitted`.
3. Có thể kiểm tra thêm bằng cùng số điện thoại trong một lần gửi khác.

## Kiểm thử kéo thả

1. Kéo thẻ lead từ **Mới** sang **Đã liên hệ**.
2. Chờ trạng thái lưu xong rồi tải lại trang.
3. Lead phải vẫn nằm ở **Đã liên hệ**; lịch sử hoạt động có thêm `stage_changed`.

## Kiểm thử score

Score được tách thành Phù hợp, Ý định và Tương tác. Hệ thống chỉ tính từ dữ liệu thực có: độ cụ thể của nhu cầu, thông tin liên hệ, nguồn/UTM và số hoạt động. Khi thiếu dữ liệu, lý do hiển thị rõ là chưa đủ dữ liệu; không gán testimonial, doanh thu hoặc kết quả giả.

## Migration

Migration nằm tại `supabase/migrations/20261028_lead_hub_crm.sql` và đã được áp dụng vào Supabase project hiện tại. Hai bảng `leads` và `lead_activities` bật RLS; quyền đọc/ghi trực tiếp của `anon` và `authenticated` bị thu hồi. Chỉ API server đã xác thực CRM mới truy cập dữ liệu.
