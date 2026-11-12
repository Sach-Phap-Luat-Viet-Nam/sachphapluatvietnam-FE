# Điều khoản sử dụng và Chính sách bảo mật

Ngày soạn: 12/11/2026. Trạng thái: **dự thảo để chủ website rà soát**, chưa có ngày hiệu lực.

Lần rà soát tiếp theo: đối chiếu Điều 38 Luật Bảo vệ quyền lợi người tiêu dùng theo bản hợp nhất 47/VBHN-VPQH và Điều 5, 6 Nghị định 356/2025/NĐ-CP; bổ sung trường hợp chấm dứt và hoàn tiền theo luật, thời hạn xử lý quyền dữ liệu theo từng loại, điều chỉnh mô tả phiên refresh có thể gia hạn. Các hạn này là nghĩa vụ pháp luật theo điều kiện áp dụng, không phải xác nhận cửa hàng đã có quy trình đáp ứng.

## Kết quả triển khai

- `/dieu-khoan-su-dung`: 18 mục về tài khoản, sản phẩm, đặt hàng, tiền, giao nhận và hậu mãi.
- `/chinh-sach-bao-mat`: 16 mục về dữ liệu, cookie, nhà cung cấp, lưu trữ và yêu cầu của chủ thể dữ liệu.
- Hai trang có thông báo dự thảo, mục lục, liên kết chéo, kênh Zalo hỗ trợ và `noindex`. Chưa đưa vào sitemap.
- Form đăng ký mở hai tài liệu trong tab mới, giữ form đang nhập. Checkbox vẫn mặc định bỏ chọn, giữ nguyên validation và request `acceptTerms`.
- Chân trang có cả hai liên kết, kể cả khi khách không đăng nhập.
- Nguồn nội dung duy nhất: `apps/storefront/src/features/legal/content.ts`. Bản Markdown để duyệt ở `docs/legal/`; khi sửa nguồn cần xuất lại hai bản này.

## Căn cứ rà soát tính năng

| Luồng / dữ liệu              | Nguồn đối chiếu                                                        | Điểm phản ánh trong nội dung                                                                                                         |
| ---------------------------- | ---------------------------------------------------------------------- | ------------------------------------------------------------------------------------------------------------------------------------ |
| Đăng ký, đồng ý              | BE `docs/features/auth.md`, FE `RegisterForm.tsx`, `packages/auth/src` | `acceptTerms`, lưu timestamp/version ở BE; chưa xác minh email/quên mật khẩu tự phục vụ; không đồng nhất đồng ý đăng ký với tiếp thị |
| Phiên, hỗ trợ đăng nhập hộ   | BE auth; FE session/realtime/impersonation                             | Một nơi đăng nhập, kết thúc phiên, nhớ thiết bị khi áp dụng; phiên hỗ trợ có quyền thao tác, log chưa đầy đủ                         |
| Danh mục, ấn bản cũ, đọc thử | FE `storefront-ordering.md`, catalog                                   | Bìa/ấn bản/ISBN, mốc cập nhật pháp luật, cảnh báo bản cũ, phạm vi bản đọc thử                                                        |
| Giỏ và Mua ngay              | BE cart/ordering; FE buy-now, ordering                                 | Giỏ chưa giữ tồn; gộp giỏ; Mua ngay giữ giỏ; giới hạn số lượng và lỗi tạo đơn                                                        |
| Combo, giá và mã             | BE promotion; FE combo, checkout-promotion                             | Bộ cố định, cuốn dư, điều kiện áp, không hứa cộng mọi mã; không cam kết thuật toán tối ưu mọi tổ hợp                                 |
| Giao hàng                    | BE shipping; FE checkout                                               | Giá theo tỉnh/trọng lượng, ngưỡng không chốt cứng, ETA dự kiến, chưa có API hãng vận chuyển                                          |
| Chuyển khoản                 | BE sepay-payment/ordering; FE BankTransferInfo                         | Đúng tiền/mã/hạn, thiếu/thừa/chia nhỏ/trùng/đến muộn không tự khớp; không tự hoàn tiền                                               |
| Hạn chế COD                  | BE CustomerRiskService và ordering; FE preview                         | Đơn mở/giao thất bại theo SĐT; phương thức khác và đường yêu cầu kiểm tra                                                            |
| Tra cứu/hủy                  | FE OrderLookup/MyOrder; BE ordering                                    | Mã + SĐT không có OTP, bảo vệ thông tin; guest chưa tự hủy trên FE; điều kiện hủy phụ thuộc trạng thái                               |
| Đổi trả/hoàn tiền            | BE ordering: hạn chế; FE trạng thái                                    | Viết quy trình tiếp nhận thủ công, không hứa portal đổi trả, hoàn tự động, mốc 7/30 ngày hoặc đổi ý miễn phí chưa được chốt          |
| Hóa đơn                      | BE auth/ordering; FE checkout/account                                  | Form chỉ tiếp nhận thông tin, chưa phát hành HĐĐT tự động; không miễn nghĩa vụ hóa đơn                                               |
| Hồ sơ và địa chỉ             | BE auth; FE account, Checkout, WardSelect                              | Dữ liệu tự chọn, tối đa 10 địa chỉ, bản chụp đơn cũ không đổi theo hồ sơ                                                             |
| Ảnh                          | BE auth, FE user-avatar                                                | Upload trực tiếp Cloudinary; gỡ hồ sơ chưa xóa tệp ở dịch vụ ảnh                                                                     |
| Storage và popup             | FE recently-viewed, theme, tour, popup, session                        | 9 sách, dấu popup, giao diện, cờ phiên; local/session storage khác dữ liệu server                                                    |
| Nhà cung cấp                 | BE staff-notification, sepay, auth; FE deploy/session/ZaloContact      | Zalo bot gửi dữ liệu giảm bớt nhưng chưa ẩn danh; SePay/QR; Cloudinary; Pusher có điều kiện; vùng hosting chưa xác nhận              |

Đối chiếu code khi tài liệu cũ khác tính năng: checkout hiện có dropdown phường/xã; không suy ra rằng mọi form địa chỉ đều đã có dropdown. Không ghi cam kết email/ZNS xác nhận đơn, API xóa tài khoản hoặc nhật ký kiểm toán đầy đủ vì chưa có.

## Các điểm chủ website cần hoàn thiện trước khi áp dụng chính thức

1. **Chủ thể cung cấp dịch vụ và kiểm soát dữ liệu:** đã bổ sung tên CÔNG TY TNHH SÁCH LUẬT VIỆT NAM, mã số thuế 0316181465 và địa chỉ 77 Đường S9, Phường Tây Thạnh, Thành phố Hồ Chí Minh, Việt Nam theo ảnh do chủ dự án cung cấp. Cần xác nhận người/bộ phận tiếp nhận khiếu nại và yêu cầu dữ liệu, địa chỉ nhận thư khiếu nại và quyền sử dụng hai số Zalo hiện có; chưa có căn cứ để tự điền email.
2. **Bán hàng:** cách tính/hiển thị thuế trong giá, thời điểm và thông báo xác nhận giao kết, lịch xử lý/giao hàng và việc đồng kiểm với hãng giao thực tế. Chốt phương thức cung cấp xác nhận/chứng từ cho khách, không chỉ màn hình có thể mất sau F5.
3. **Đổi trả:** lỗi nào được xử lý theo quy trình riêng, quyền đổi ý nếu có, thời hạn nội bộ, địa chỉ gửi lại, bên chịu phí, chứng cứ thay thế; không loại trừ quyền luật định, không bắt buộc video mở hộp.
4. **Tiền:** người phụ trách đối soát giao dịch sai/trùng/muộn, quy trình xác minh tài khoản hoàn, lịch phản hồi/hoàn thực tế và cách theo dõi. Những trường hợp BE không tự khớp phải có người xử lý, không chỉ đổi nội dung tài liệu.
5. **Lưu trữ:** chốt bảng thời hạn cụ thể cho hồ sơ, đơn/chứng từ, giao dịch SePay, bằng chứng đồng ý, log IP/an toàn, phiên hỗ trợ, tin nhóm Zalo, ảnh và backup; phân biệt nghĩa vụ giữ chứng từ với mục đích tùy chọn. Thiết lập tác vụ xóa và cơ chế ngăn phục hồi dữ liệu đã xóa.
6. **Nhà cung cấp:** xác nhận đơn vị hosting/database/Redis/CDN thực tế, vùng máy chủ, nhà xử lý phụ, hãng vận chuyển, bên hóa đơn/kế toán, cấu hình bật Pusher/Zalo; kiểm tra hợp đồng và nghĩa vụ khi chuyển dữ liệu ra ngoài Việt Nam. Không coi việc liệt kê nhãn dịch vụ trong policy là hoàn thành nghĩa vụ này.
7. **Quyền dữ liệu:** người tiếp nhận, kênh thay thế ngoài Zalo, xác minh tương xứng và mốc xử lý theo quy định. Luồng thủ công cần bao phủ dữ liệu BE, Cloudinary, nhóm Zalo và backup; API xóa tài khoản chưa có.
8. **Đồng ý:** thống nhất notice tại đăng ký và khi đặt hàng vãng lai, căn cứ từng mục đích, bảo vệ dữ liệu trẻ em, lựa chọn riêng nếu bật tiếp thị/theo dõi không thiết yếu. Một cờ `acceptTerms` không tự chứng minh đồng ý cho mọi mục đích. Không tự thêm opt-in quảng cáo.
9. **Phiên bản:** sau khi chốt nội dung, đồng bộ bản chính thức với `Auth:TermsVersion` bên BE và lưu bản cũ. Doc BE nêu `2026-11-06`; FE không có API đọc phiên bản. Chưa thay cấu hình BE vì đây là bản dự thảo. Chưa có luồng hỏi lại khách cũ, không tuyên bố họ tự đồng ý bản mới.
10. **Phát hành:** điền thông tin còn thiếu, rà soát pháp lý/vận hành, chốt ngày hiệu lực, thay thông báo dự thảo, quyết định index/sitemap và triển khai đúng phiên bản. Không tự chuyển ngày soạn thành ngày hiệu lực.

## Nguồn pháp lý tham chiếu

Tra cứu ngày 12/11/2026 trên nguồn cơ quan nhà nước, dùng làm cơ sở rà soát, không sao chép mẫu điều khoản của cửa hàng khác:

- [Luật Bảo vệ quyền lợi người tiêu dùng 19/2023/QH15](https://chinhphu.vn/?classid=1&docid=208363&pageid=27160&typegroupid=3): kiểm tra nghĩa vụ thông tin và quyền người mua trong giao dịch từ xa; không đặt điều khoản miễn trách nhiệm toàn bộ hay tước quyền khiếu nại.
- [Luật Bảo vệ quyền lợi người tiêu dùng – văn bản hợp nhất 47/VBHN-VPQH](https://datafiles.chinhphu.vn/cpp/files/vbpq/2026/3/47-vbhn-vpqh.pdf): đối chiếu Điều 25, 37 và 38 về điều khoản không có hiệu lực, thông tin và giao kết từ xa.
- [Nghị định 55/2024/NĐ-CP](https://xaydungchinhsach.chinhphu.vn/toan-van-nghi-dinh-55--2024-nd-cp-quy-dinh-chi-tiet-mot-so-dieu-cua-luat-bao-ve-quyen-loi-nguoi-tieu-dung-119240521113013883.htm): nguồn đối chiếu bổ sung cho thông tin giao dịch và trách nhiệm kinh doanh.
- [Luật Bảo vệ dữ liệu cá nhân 91/2025/QH15](https://vanban.chinhphu.vn/?classid=1&docid=214590&pageid=27160&typegroup=): có hiệu lực từ 01/01/2026; không chỉ viện dẫn khung năm 2023.
- [Nghị định 356/2025/NĐ-CP – bản ký](https://datafiles.chinhphu.vn/cpp/files/vbpq/2026/01/356-nd.signed.pdf) và [hướng dẫn/cảnh báo của Bộ Công an](https://bocongan.gov.vn/chinh-sach-phap-luat/bai-viet/canh-giac-nguy-co-vi-pham-phap-luat-trong-bao-ve-du-lieu-ca-nhan-khach-hang-1787901431): cần đối chiếu thời hạn thực hiện quyền, hồ sơ xử lý/chuyển dữ liệu và trách nhiệm thực tế khi hoàn thiện quy trình.

Tài liệu không khẳng định website đã được chứng nhận tuân thủ hoặc đã hoàn thành thủ tục pháp lý. Quyền luật định không phụ thuộc việc BE đã có nút/API để khách tự thực hiện hay chưa.
