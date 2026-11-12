import { ClipboardCheck, PackageCheck, Truck, CircleCheck, ReceiptText } from "lucide-react";
import { cn } from "@slvn/ui";
import { formatDateTime } from "@slvn/utils";
import type { Order } from "./schemas";

const steps = [
  {
    title: "Đơn đã đặt",
    icon: ReceiptText,
    statuses: ["pending_payment", "pending_confirm", "preorder_waiting", "paid"],
  },
  { title: "Đã xác nhận", icon: ClipboardCheck, statuses: ["confirmed"] },
  { title: "Chuẩn bị hàng", icon: PackageCheck, statuses: ["packing", "ready_to_ship"] },
  { title: "Đang giao", icon: Truck, statuses: ["shipping"] },
  { title: "Đã nhận hàng", icon: CircleCheck, statuses: ["delivered", "completed"] },
];

export function OrderProgress({ order }: { order: Order }) {
  // Hủy / đổi trả không đồng nghĩa với việc đã hoàn thành các bước giao hàng.
  const current = steps.findIndex((step) => step.statuses.includes(order.status));
  if (current < 0) return null;
  return (
    <ol
      aria-label="Tiến trình đơn hàng"
      className="grid grid-cols-1 gap-5 px-5 py-8 sm:grid-cols-5 sm:gap-0 sm:px-8 sm:py-10"
    >
      {steps.map((step, index) => {
        const Icon = step.icon;
        const reached = index <= current;
        const entry = order.history.find((item) => step.statuses.includes(item.toStatus));
        const date = index === 0 ? order.createdAt : entry?.createdAt;
        return (
          <li
            key={step.title}
            aria-current={index === current ? "step" : undefined}
            className="relative flex items-center gap-4 sm:flex-col sm:gap-3 sm:text-center"
          >
            {index > 0 && (
              <span
                aria-hidden="true"
                className={cn(
                  "absolute top-7 right-1/2 hidden h-0.5 w-full sm:block",
                  reached ? "bg-gold" : "bg-ivory/15",
                )}
              />
            )}
            <span
              aria-hidden="true"
              className={cn(
                "bg-panel relative z-10 flex size-14 shrink-0 items-center justify-center rounded-full border-2",
                reached ? "border-gold text-gold" : "border-ivory/15 text-mist",
              )}
            >
              <Icon size={25} strokeWidth={1.5} />
            </span>
            <div className="relative z-10 px-2">
              <p className={cn("text-sm font-medium", reached ? "text-ivory" : "text-mist")}>{step.title}</p>
              {reached && date && (
                <time dateTime={date} className="text-mist mt-1 block text-xs leading-5">
                  {formatDateTime(date)}
                </time>
              )}
            </div>
          </li>
        );
      })}
    </ol>
  );
}
