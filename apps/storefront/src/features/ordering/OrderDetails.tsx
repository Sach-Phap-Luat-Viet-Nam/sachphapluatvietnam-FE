import type { ReactNode } from "react";
import { formatDateTime, formatPrice } from "@slvn/utils";
import { coverTypeLabel } from "@/lib/labels";
import { ORDER_STATUS_LABELS, PAYMENT_METHOD_LABELS, PAYMENT_STATUS_LABELS, label } from "./labels";
import type { Order } from "./schemas";

function Row({ term, children, strong = false }: { term: string; children: ReactNode; strong?: boolean }) {
  return (
    <div className={strong ? "flex justify-between gap-4 text-lg font-semibold" : "flex justify-between gap-4"}>
      <dt className={strong ? undefined : "text-sand"}>{term}</dt>
      <dd className={strong ? "text-gold-pale" : undefined}>{children}</dd>
    </div>
  );
}

/** Chi tiết một đơn: trạng thái, sách, tiền, giao hàng, hóa đơn và dòng thời gian trạng thái (FR-40). */
export function OrderDetails({ order }: { order: Order }) {
  const address = order.shippingAddress;

  return (
    <div className="flex flex-col gap-8">
      <dl className="grid gap-x-8 gap-y-4 sm:grid-cols-3">
        <div>
          <dt className="text-gold text-[11px] tracking-[0.26em] uppercase">Trạng thái</dt>
          <dd className="mt-1.5 text-lg font-semibold">{label(ORDER_STATUS_LABELS, order.status)}</dd>
        </div>
        <div>
          <dt className="text-gold text-[11px] tracking-[0.26em] uppercase">Thanh toán</dt>
          <dd className="mt-1.5">
            {label(PAYMENT_METHOD_LABELS, order.paymentMethod)}
            <span className="text-mist block text-sm">{label(PAYMENT_STATUS_LABELS, order.paymentStatus)}</span>
          </dd>
        </div>
        <div>
          <dt className="text-gold text-[11px] tracking-[0.26em] uppercase">Ngày đặt</dt>
          <dd className="mt-1.5">{formatDateTime(order.createdAt)}</dd>
        </div>
      </dl>

      <section aria-labelledby={`${order.orderCode}-items`}>
        <h3 id={`${order.orderCode}-items`} className="font-editorial text-2xl font-bold">
          Sách trong đơn
        </h3>
        <ul className="border-gold/20 mt-3 border-t">
          {order.items.map((item) => (
            <li
              key={item.skuId}
              className="border-gold/20 flex flex-wrap justify-between gap-x-6 gap-y-1 border-b py-4"
            >
              <div className="min-w-0">
                <p className="font-medium">{item.bookTitle}</p>
                <p className="text-mist text-sm">
                  {[item.editionName, coverTypeLabel(item.coverType), `ISBN ${item.isbn}`].filter(Boolean).join(" · ")}
                </p>
              </div>
              <p className="text-sand text-right">
                {item.quantity} × {formatPrice(item.unitPrice)}
                {item.discountAmount > 0 && (
                  <span className="text-ok block text-sm">−{formatPrice(item.discountAmount)}</span>
                )}
                <span className="text-ivory block font-semibold">{formatPrice(item.lineTotal)}</span>
              </p>
            </li>
          ))}
        </ul>
        {order.appliedPromotions.length > 0 && (
          <ul aria-label="Ưu đãi đã áp" className="text-ok mt-4 ml-auto flex max-w-sm flex-col gap-1 text-sm">
            {order.appliedPromotions.map((promotion) => (
              // `promotionId` của combo là id combo nên có thể trùng id một chương trình: khóa kèm `kind`.
              <li key={`${promotion.kind}-${promotion.promotionId}`} className="flex justify-between gap-4">
                <span>
                  {promotion.name}
                  {promotion.couponCode && ` (mã ${promotion.couponCode})`}
                </span>
                <span className="shrink-0">−{formatPrice(promotion.amount)}</span>
              </li>
            ))}
          </ul>
        )}
        <dl className="mt-4 ml-auto flex max-w-sm flex-col gap-2.5 text-[15px]">
          <Row term="Tạm tính">{formatPrice(order.subtotal)}</Row>
          {order.discount > 0 && <Row term="Giảm giá">−{formatPrice(order.discount)}</Row>}
          <Row term="Phí vận chuyển">{order.shippingFee ? formatPrice(order.shippingFee) : "Miễn phí"}</Row>
          {order.shippingDiscount > 0 && <Row term="Giảm phí ship">−{formatPrice(order.shippingDiscount)}</Row>}
          <div className="border-gold/25 border-t pt-2.5">
            <Row term="Tổng thanh toán" strong>
              {formatPrice(order.total)}
            </Row>
          </div>
        </dl>
      </section>

      <div className="grid gap-8 sm:grid-cols-2">
        <section aria-labelledby={`${order.orderCode}-shipping`}>
          <h3 id={`${order.orderCode}-shipping`} className="font-editorial text-xl font-bold">
            Giao đến
          </h3>
          <address className="text-sand mt-2 leading-7 not-italic">
            {order.customerName} · {order.phone}
            <br />
            {[address.streetAddress, address.ward, address.province].join(", ")}
            {order.email && (
              <>
                <br />
                {order.email}
              </>
            )}
          </address>
          {order.note && <p className="text-mist mt-2 text-sm">Ghi chú: {order.note}</p>}
        </section>
        {order.invoiceInfo && (
          <section aria-labelledby={`${order.orderCode}-invoice`}>
            <h3 id={`${order.orderCode}-invoice`} className="font-editorial text-xl font-bold">
              Hóa đơn công ty
            </h3>
            <p className="text-sand mt-2 leading-7">
              {order.invoiceInfo.companyName}
              <br />
              MST {order.invoiceInfo.taxCode}
              <br />
              {order.invoiceInfo.address}
              <br />
              {order.invoiceInfo.email}
            </p>
          </section>
        )}
      </div>

      {order.history.length > 0 && (
        <section aria-labelledby={`${order.orderCode}-history`}>
          <h3 id={`${order.orderCode}-history`} className="font-editorial text-xl font-bold">
            Lịch sử đơn hàng
          </h3>
          <ol className="border-gold/40 mt-3 ml-1.5 flex flex-col gap-4 border-l pl-5">
            {order.history.map((entry) => (
              <li key={`${entry.toStatus}-${entry.createdAt}`} className="relative">
                <span aria-hidden="true" className="bg-gold absolute top-2 -left-[25px] size-2 rounded-full" />
                <p className="font-medium">{label(ORDER_STATUS_LABELS, entry.toStatus)}</p>
                <p className="text-mist text-sm">
                  <time dateTime={entry.createdAt}>{formatDateTime(entry.createdAt)}</time>
                  {entry.note && ` · ${entry.note}`}
                </p>
              </li>
            ))}
          </ol>
        </section>
      )}
    </div>
  );
}
