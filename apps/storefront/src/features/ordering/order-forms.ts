import { z } from "zod";
import { PHONE_MESSAGE, isValidPhone, normalizePhone } from "@/lib/phone";
import { TAX_CODE_MESSAGE, isValidTaxCode } from "@/lib/tax-code";

export { isValidPhone, normalizePhone };

export const PAYMENT_METHODS = ["cod", "bank_transfer"] as const;
export type PaymentMethod = (typeof PAYMENT_METHODS)[number];

const EMAIL_MESSAGE = "Email chưa đúng định dạng.";

function isEmail(value: string): boolean {
  return z.email().safeParse(value).success;
}

const tooLong = (max: number) => `Tối đa ${max} ký tự.`;

function text(label: string, max: number) {
  return z.string().trim().min(1, `Vui lòng nhập ${label}.`).max(max, tooLong(max));
}

function optionalText(max: number) {
  return z.string().trim().max(max, tooLong(max));
}

const invoiceFieldsSchema = z.object({
  companyName: z.string(),
  taxCode: z.string(),
  address: z.string(),
  email: z.string(),
});

/** Form thanh toán. Tên field trùng đường dẫn lỗi validate của backend (`shippingAddress.ward`) để map lỗi về đúng ô. */
export const checkoutSchema = z
  .object({
    customerName: text("họ tên người nhận", 255),
    phone: z.string().trim().refine(isValidPhone, PHONE_MESSAGE),
    email: optionalText(256).refine((value) => value === "" || isEmail(value), EMAIL_MESSAGE),
    shippingAddress: z.object({
      province: text("tỉnh/thành phố", 100),
      ward: text("phường/xã", 100),
      streetAddress: text("số nhà, tên đường", 500),
    }),
    paymentMethod: z.enum(PAYMENT_METHODS, "Vui lòng chọn phương thức thanh toán."),
    wantsInvoice: z.boolean(),
    invoiceInfo: invoiceFieldsSchema,
    note: optionalText(1000),
  })
  .superRefine((values, context) => {
    if (!values.wantsInvoice) return;
    const invoice = values.invoiceInfo;
    const issue = (field: keyof typeof invoice, message: string) =>
      context.addIssue({ code: "custom", path: ["invoiceInfo", field], message });

    const companyName = invoice.companyName.trim();
    if (!companyName) issue("companyName", "Vui lòng nhập tên công ty.");
    else if (companyName.length > 255) issue("companyName", tooLong(255));

    if (!isValidTaxCode(invoice.taxCode)) issue("taxCode", TAX_CODE_MESSAGE);

    const address = invoice.address.trim();
    if (!address) issue("address", "Vui lòng nhập địa chỉ công ty.");
    else if (address.length > 500) issue("address", tooLong(500));

    const email = invoice.email.trim();
    if (!email) issue("email", "Vui lòng nhập email nhận hóa đơn.");
    else if (!isEmail(email) || email.length > 256) issue("email", EMAIL_MESSAGE);
  });
export type CheckoutValues = z.infer<typeof checkoutSchema>;

export const CHECKOUT_DEFAULTS: CheckoutValues = {
  customerName: "",
  phone: "",
  email: "",
  shippingAddress: { province: "", ward: "", streetAddress: "" },
  paymentMethod: "cod",
  wantsInvoice: false,
  invoiceInfo: { companyName: "", taxCode: "", address: "", email: "" },
  note: "",
};

/** Field có thể nhận lỗi validate từ backend (key camelCase của `errors` trong ProblemDetails). */
export const CHECKOUT_FIELDS = [
  "customerName",
  "phone",
  "email",
  "shippingAddress.province",
  "shippingAddress.ward",
  "shippingAddress.streetAddress",
  "paymentMethod",
  "invoiceInfo.companyName",
  "invoiceInfo.taxCode",
  "invoiceInfo.address",
  "invoiceInfo.email",
  "note",
] as const;

/** Form tra cứu đơn (`POST /api/v1/orders/lookup`). */
export const orderLookupSchema = z.object({
  orderCode: z
    .string()
    .trim()
    .min(1, "Vui lòng nhập mã đơn hàng.")
    .max(50, tooLong(50))
    .transform((code) => code.toUpperCase()),
  phone: z
    .string()
    .trim()
    .refine(isValidPhone, PHONE_MESSAGE)
    .transform((phone) => normalizePhone(phone)),
});
export type OrderLookupInput = z.input<typeof orderLookupSchema>;
export type OrderLookupValues = z.output<typeof orderLookupSchema>;

/** Body của `POST /api/v1/orders` (`CreateOrderRequest`). */
export interface CreateOrderBody {
  customerName: string;
  phone: string;
  email: string | null;
  shippingAddress: { province: string; ward: string; streetAddress: string };
  paymentMethod: PaymentMethod;
  invoiceInfo: { companyName: string; taxCode: string; address: string; email: string } | null;
  note: string | null;
  /** Mã giảm giá khách đã áp (chỉ gửi khi preview xác nhận hợp lệ). */
  couponCode?: string;
  /** `preview.total` lúc khách bấm đặt: backend tính lại ra số khác thì trả 409 `CHECKOUT_TOTAL_CHANGED`. */
  expectedTotal?: number;
}

/** Chuẩn hóa dữ liệu form (cắt khoảng trắng, chuỗi rỗng thành `null`) thành body tạo đơn. */
export function toCreateOrderBody(values: CheckoutValues): CreateOrderBody {
  const { shippingAddress: address, invoiceInfo: invoice } = values;
  return {
    customerName: values.customerName.trim(),
    phone: normalizePhone(values.phone.trim()),
    email: values.email.trim() || null,
    shippingAddress: {
      province: address.province.trim(),
      ward: address.ward.trim(),
      streetAddress: address.streetAddress.trim(),
    },
    paymentMethod: values.paymentMethod,
    invoiceInfo: values.wantsInvoice
      ? {
          companyName: invoice.companyName.trim(),
          taxCode: invoice.taxCode.trim(),
          address: invoice.address.trim(),
          email: invoice.email.trim(),
        }
      : null,
    note: values.note.trim() || null,
  };
}
