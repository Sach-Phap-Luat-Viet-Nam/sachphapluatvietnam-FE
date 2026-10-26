# Mua combo bộ sách (storefront)

## Mục đích

Khách xem và mua **combo bộ sách cố định** với giá combo thấp hơn mua lẻ (FR-16). Ví dụ sách AB gồm tập 1 và tập 2, mua lẻ
mỗi cuốn 50.000đ, mua cả bộ 70.000đ. Đặc tả backend (quy tắc tính giá, API, CSDL) ở `docs/features/promotion.md` của repo
backend, mục Combo; file này chỉ mô tả phần FE.

## Luồng xử lý (màn hình, route, app storefront/admin)

App **storefront**. Combo không có SKU hay tồn kho riêng: đơn vẫn gồm các SKU lẻ, backend tự nhận diện bộ sách trong giỏ và
áp giá combo (khách thêm lẻ từng cuốn vẫn được giá combo). Vì vậy FE **không gửi giá** và **không đổi giỏ hàng**.

1. **Trang combo** `/combo/{slug}` (`app/combo/[slug]/page.tsx`, Server Component, cache 60 giây như trang sách):
   - Bên trái: ảnh combo (`imageUrl`) nếu có. Không có ảnh riêng mà combo gồm **1–2 sách** thì dựng **mô hình 3D** từng
     cuốn từ `items[].coverImageUrl` (`ComboBooks3D` dùng `Book3D` cỡ `combo`, hai cuốn đứng cạnh nhau, nghiêng theo chuột
     như trang chi tiết sách; một cuốn thì cỡ `detail`; cuốn chưa có ảnh bìa dùng bìa vẽ sẵn của `Book3D`). Combo từ 3
     sách trở lên dùng bìa phẳng (tối đa 4, `ComboCovers`) vì cột ảnh không đủ chỗ cho nhiều mô hình 3D.
   - Bên phải: tên, mô tả, **khối đặt mua** (giá combo, **giá gốc** gạch ngang, nhãn `−48%`, "Tiết kiệm … so với giá gốc", hạn áp dụng), nút
     mua và danh sách **"Trong combo"** (bìa, tên sách là liên kết tới `/sach/{slug}`, loại bìa/ấn bản, `× số cuốn`, giá lẻ).
   - Có `generateMetadata` (title, description, canonical, Open Graph) và JSON-LD `Product` + `Offer` + `BreadcrumbList`.
   - Combo không chạy/đã xóa/có sách không còn ở Catalog: `not-found.tsx` (404, không index).
2. **Nút mua** (`features/ordering/BuyComboButton.tsx`, client): thêm **lần lượt từng sách** của bộ vào giỏ bằng
   `POST /cart/items` (số cuốn = số cuốn trong một bộ), rồi:
   - **Thêm combo vào giỏ**: ở lại trang, hiện "Đã thêm combo (N cuốn) vào giỏ" + liên kết "Xem giỏ hàng".
   - **Mua ngay**: thêm xong chuyển sang `/thanh-toan` (luồng thanh toán giỏ hàng; "Mua ngay" của sách lẻ chỉ hỗ trợ một SKU
     nên combo dùng giỏ).
   - Một sách lỗi giữa chừng (hết hàng, ngừng bán, giỏ đầy…) thì **dừng**, báo lỗi theo `code` kèm số sách đã vào giỏ và liên
     kết kiểm tra giỏ. Thêm tuần tự vì mọi thao tác giỏ chạy lần lượt (`useCartMutation`).
   - Combo có sách ngừng bán (`isSellable = false`): thay nút bằng "Combo tạm ngừng bán".
3. **Nơi khách gặp combo**:
   - Trang chủ: khu **"Combo tiết kiệm"** (`ComboShelf`, tối đa 3 combo, sau phần "Mới phát hành"), có liên kết `Xem tất cả
combo` tới `/khuyen-mai#combo`. Không có combo hoặc không tải được thì ẩn cả khu.
   - `/khuyen-mai`: mục **"Combo bộ sách"** (`#combo`) dưới danh sách chương trình, liệt kê đủ (backend trả tối đa 50).
   - Trang chi tiết sách: mục **"Mua theo combo, tiết kiệm hơn"** (tối đa 2 combo) khi sách có SKU (ở bất kỳ ấn bản nào) nằm
     trong một combo đang chạy.
4. **Giỏ hàng và thanh toán**: không đổi giao diện. `POST /checkout/preview` đã tự trả `appliedPromotions` có `kind = "combo"`
   nên khối "Ưu đãi đã áp" của `CartSummary`/`CheckoutSummary` hiện "Combo … −30.000 ₫", và đơn đã đặt hiện ở `OrderDetails`.
   `promotionId` của combo là **id combo** (có thể trùng id một chương trình), nên `key` của danh sách ưu đãi là
   `kind-promotionId`.
5. **Không cộng dồn**: combo không cộng dồn với khuyến mãi giảm trên tổng đơn, backend chọn bên lợi hơn cho khách (hòa thì giữ
   chương trình). Trang combo có ghi chú này cho khách.
6. **Combo không còn lợi** (`savings = 0`): sách trong bộ đang có **lịch giá** làm tổng giá lẻ hiện hành (`retailPrice`)
   thấp hơn hoặc bằng giá combo (ví dụ mỗi tập đang 290.000đ nên mua lẻ 580.000đ, combo 625.000đ) thì backend **không áp
   combo**, khách trả giá lẻ. FE xử lý để không quảng cáo sai:
   - `getCombos()` (trang chủ, `/khuyen-mai`, mục trên trang sách) **bỏ** combo này (`hasSavings`).
   - Trang `/combo/{slug}` vẫn mở được nhưng hiện **giá khách thực trả** (`payablePrice` = nhỏ hơn của giá combo và giá lẻ),
     ghi chú "đang có giá ưu đãi, giá combo sẽ tự áp dụng trở lại khi hết ưu đãi" và **ẩn nút mua combo**; khách mua từng
     cuốn ở danh sách "Trong combo". JSON-LD `Offer.price` cũng là `payablePrice`.
   - Hết lịch giá thì combo tự có lợi trở lại và hiện lại ở mọi nơi (trang dựng lại mỗi 60 giây).

Hàm thuần: `features/combo/combo.ts` (đường dẫn, số cuốn, % tiết kiệm chỉ để hiển thị, lọc combo theo SKU, JSON-LD),
`features/ordering/buy-combo.ts` (thêm cả bộ vào giỏ, dừng ở lỗi đầu tiên).

## API backend sử dụng (method, route, mã lỗi được xử lý)

Hai route chưa có trong OpenAPI sinh ra, khai báo tạm ở `packages/api-client/src/pending-paths.ts` và parse bằng Zod
(`features/combo/schemas.ts`); bỏ khai báo tạm khi chạy lại `pnpm api:fetch && pnpm api:generate` với backend có combo.

| Method | Route                      | Dùng cho                                      | Xử lý                                                                                      |
| ------ | -------------------------- | --------------------------------------------- | ------------------------------------------------------------------------------------------ |
| GET    | `/api/v1/combos`           | Trang chủ, `/khuyen-mai`, mục trên trang sách | 200 → mảng `ComboResponse` (có thể rỗng); lỗi → ẩn khu combo, không báo lỗi trang          |
| GET    | `/api/v1/combos/{slug}`    | Trang `/combo/{slug}`                         | 200 → `ComboResponse`; 404 → trang không tìm thấy; lỗi khác → `error.tsx`                  |
| POST   | `/api/v1/cart/items`       | Nút mua combo (mỗi sách một lần)              | Lỗi hiện theo `code`: `OUT_OF_STOCK`, `SKU_NOT_AVAILABLE`, `MAX_QTY_EXCEEDED`, `CART_FULL` |
| POST   | `/api/v1/checkout/preview` | Giỏ và thanh toán (có sẵn)                    | `appliedPromotions[].kind = "combo"`                                                       |

`ComboResponse`: `{id, name, slug, description, imageUrl, comboPrice, retailPrice, listPrice, savings, items[], isSellable, startsAt,
endsAt}`; mỗi item `{skuId, skuCode, bookTitle, bookSlug, editionName, coverType, coverImageUrl, quantity, unitPrice,
isSellable}`. Mọi số tiền do backend tính: `retailPrice` là tổng giá **hiện hành** (đã gồm lịch giá) của một bộ, `listPrice`
là tổng **giá bìa** (giá gốc, không đổi khi có lịch giá). FE hiện giá cũ gạch ngang là `listPrice` và "Tiết kiệm" tính theo
giá gốc (`originalPrice`, `savingsAmount`, `savingsPercent` trong `combo.ts`), còn việc combo có được áp hay không (nút mua,
có hiện trong danh sách) dựa vào `savings` so với `retailPrice` (xem mục 6). `listPrice` là tùy chọn trong schema: backend
cũ chưa trả thì dùng `retailPrice` thay thế, nên FE lên trước backend vẫn chạy; lúc đó nhãn đổi thành "giá mua lẻ" (`originalPriceName`)
chứ không gọi là "giá gốc", vì giá gạch ngang chỉ là giá lẻ hiện hành.

## Cấu hình cần thiết (biến môi trường)

Không thêm biến mới (`API_BASE_URL`, như `storefront-shell.md`). Backend cần có migration `AddCombos` thì hai route trên mới
có dữ liệu; backend cũ trả 404 cho `/combos` thì các khu combo tự ẩn.

## Hạn chế / việc còn lại

- Chưa có trang danh sách `/combo` riêng (đặc tả chỉ có `/combo/{slug}`): combo xem ở trang chủ và mục Combo của
  `/khuyen-mai`.
- Giỏ hàng chưa hiện giá combo ở từng dòng và chưa gợi ý "mua thêm … để được giá combo"; khách thấy giá combo ở khối "Ưu đãi
  đã áp" của tóm tắt đơn.
- Thêm combo vào giỏ là nhiều lệnh `POST /cart/items` không nguyên tử: một sách lỗi thì các sách trước đó vẫn ở trong giỏ
  (đã báo cho khách). Mua nhiều bộ bấm lại nút (mỗi lần cộng thêm một bộ); mỗi SKU tối đa 20 cuốn trong giỏ.
- Chỉ có combo **bộ sách cố định**, chưa có "mua N cuốn bất kỳ trong nhóm".
- Ảnh combo (`imageUrl`) hiện ở khung 4:3 cắt giữa (`object-cover`); ảnh banner 16:9 có chữ sẽ bị cắt, nên dùng ảnh phù hợp
  khung này hoặc để trống để dùng bìa các sách.
- Chưa có màn quản lý combo ở app admin (backend đã có `/admin/combos`).
- `ComboCard` tạm bỏ tối ưu ảnh (`unoptimized`) như `BookCover`, chờ chốt CDN và `images.remotePatterns`.
- Chưa có `sitemap.ts` nên URL combo chưa nằm trong sitemap.
