"use client";

import { useState } from "react";
import type { InputHTMLAttributes } from "react";
import Link from "next/link";
import { useForm, useWatch } from "react-hook-form";
import type { UseFormRegisterReturn } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { ArrowRight, RefreshCw } from "lucide-react";
import { isApiError } from "@slvn/api-client";
import { fieldErrors } from "@slvn/auth";
import { cn } from "@slvn/ui";
import { formatPrice } from "@slvn/utils";
import { BookLoader } from "@/components/BookLoader";
import { FORM_ERROR, INPUT, LABEL, SUBMIT } from "@/components/form-styles";
import { placeOrder } from "./api";
import { checkoutBlocker } from "./cart";
import { CartSummary } from "./CartSummary";
import { CHECKOUT_DEFAULTS, CHECKOUT_FIELDS, checkoutSchema, toCreateOrderBody } from "./order-forms";
import type { CheckoutValues, PaymentMethod } from "./order-forms";
import { orderingErrorMessage } from "./errors";
import { PAYMENT_METHOD_LABELS, label } from "./labels";
import { OrderPlaced } from "./OrderPlaced";
import { BANK_ACCOUNT, availablePaymentMethods } from "./payment";
import type { BankAccount } from "./payment";
import type { Order } from "./schemas";
import { useCart, useClearCartCache, useRefreshCart } from "./useCart";

/** Lỗi do giỏ đã đổi (hết hàng, ngừng bán, trống): tải lại giỏ và gợi ý quay về giỏ để sửa. */
const CART_ERROR_CODES = new Set(["CART_EMPTY", "SKU_NOT_AVAILABLE", "MAX_QTY_EXCEEDED", "OUT_OF_STOCK"]);

const PAYMENT_HINTS: Record<PaymentMethod, string> = {
  cod: "Trả tiền mặt cho nhân viên giao hàng khi nhận sách.",
  bank_transfer: "Chuyển khoản trong 30 phút sau khi đặt, nội dung là mã đơn hàng.",
};

interface TextFieldProps extends InputHTMLAttributes<HTMLInputElement> {
  id: string;
  label: string;
  registration: UseFormRegisterReturn;
  error?: string;
}

function TextField({ id, label, registration, error, className, ...props }: TextFieldProps) {
  return (
    <div className={cn("flex flex-col gap-2", className)}>
      <label htmlFor={id} className={LABEL}>
        {label}
      </label>
      <input
        id={id}
        {...props}
        {...registration}
        aria-invalid={Boolean(error)}
        aria-describedby={error ? `${id}-error` : undefined}
        className={cn(INPUT, "border-border")}
      />
      {error && (
        <p id={`${id}-error`} role="alert" className="text-danger text-sm">
          {error}
        </p>
      )}
    </div>
  );
}

const SECTION_TITLE = "font-editorial text-2xl font-bold";

interface CheckoutFormProps {
  methods: PaymentMethod[];
  /** Lý do giỏ chưa đặt được (ngừng bán, thiếu hàng): vẫn giữ form để khách không mất thông tin đã nhập. */
  blocker: string | null;
  onPlaced: (order: Order) => void;
}

function CheckoutForm({ methods, blocker, onPlaced }: CheckoutFormProps) {
  // Một key cho mỗi lần vào trang thanh toán; gửi lại (bấm nhiều lần, retry) thì backend trả đúng đơn đã tạo.
  const [idempotencyKey, setIdempotencyKey] = useState(() => crypto.randomUUID());
  const [cartChanged, setCartChanged] = useState(false);
  const clearCart = useClearCartCache();
  const refreshCart = useRefreshCart();
  const {
    register,
    control,
    handleSubmit,
    setError,
    formState: { errors, isSubmitting },
  } = useForm<CheckoutValues>({
    resolver: zodResolver(checkoutSchema),
    defaultValues: { ...CHECKOUT_DEFAULTS, paymentMethod: methods[0] ?? "cod" },
  });
  const wantsInvoice = useWatch({ control, name: "wantsInvoice" });

  const onSubmit = async (values: CheckoutValues) => {
    const body = toCreateOrderBody(values);
    setCartChanged(false);
    try {
      let order: Order;
      try {
        order = await placeOrder(body, idempotencyKey);
      } catch (error) {
        // Key đã dùng cho đơn của người khác/số điện thoại khác: sinh key mới rồi gửi lại một lần.
        if (!isApiError(error) || error.code !== "IDEMPOTENCY_KEY_REUSED") throw error;
        const freshKey = crypto.randomUUID();
        setIdempotencyKey(freshKey);
        order = await placeOrder(body, freshKey);
      }
      clearCart();
      onPlaced(order);
    } catch (error) {
      const invalidFields = fieldErrors(error, CHECKOUT_FIELDS);
      invalidFields.forEach(({ field, message }) => setError(field, { message }));
      if (invalidFields.length === 0) {
        setError("root.server", { message: orderingErrorMessage(error) });
      }
      if (isApiError(error) && CART_ERROR_CODES.has(error.code)) {
        setCartChanged(true);
        refreshCart();
      }
    }
  };

  const invoice = errors.invoiceInfo;
  return (
    <form onSubmit={handleSubmit(onSubmit)} noValidate className="flex flex-col gap-10">
      <fieldset className="flex flex-col gap-5">
        <legend className={cn(SECTION_TITLE, "mb-5")}>Người nhận</legend>
        <TextField
          id="customerName"
          label="Họ và tên"
          autoComplete="name"
          registration={register("customerName")}
          error={errors.customerName?.message}
        />
        <div className="grid gap-5 sm:grid-cols-2">
          <TextField
            id="phone"
            label="Số điện thoại"
            type="tel"
            inputMode="tel"
            autoComplete="tel"
            placeholder="0901234567"
            registration={register("phone")}
            error={errors.phone?.message}
          />
          <TextField
            id="email"
            label="Email (không bắt buộc)"
            type="email"
            autoComplete="email"
            registration={register("email")}
            error={errors.email?.message}
          />
        </div>
      </fieldset>

      <fieldset className="flex flex-col gap-5">
        <legend className={cn(SECTION_TITLE, "mb-5")}>Địa chỉ giao hàng</legend>
        <div className="grid gap-5 sm:grid-cols-2">
          <TextField
            id="province"
            label="Tỉnh/Thành phố"
            autoComplete="address-level1"
            registration={register("shippingAddress.province")}
            error={errors.shippingAddress?.province?.message}
          />
          <TextField
            id="ward"
            label="Phường/Xã"
            autoComplete="address-level2"
            registration={register("shippingAddress.ward")}
            error={errors.shippingAddress?.ward?.message}
          />
        </div>
        <TextField
          id="streetAddress"
          label="Số nhà, tên đường"
          autoComplete="street-address"
          registration={register("shippingAddress.streetAddress")}
          error={errors.shippingAddress?.streetAddress?.message}
        />
      </fieldset>

      <fieldset className="flex flex-col gap-3">
        <legend className={cn(SECTION_TITLE, "mb-5")}>Thanh toán</legend>
        {methods.map((method) => (
          <label
            key={method}
            className="border-border has-checked:border-gold has-checked:bg-gold/8 has-focus-visible:outline-gold flex cursor-pointer gap-4 border px-5 py-4 transition-colors has-focus-visible:outline-2 has-focus-visible:outline-offset-4"
          >
            <input type="radio" value={method} {...register("paymentMethod")} className="accent-gold mt-1 size-4.5" />
            <span>
              <span className="block font-medium">{label(PAYMENT_METHOD_LABELS, method)}</span>
              <span className="text-mist mt-1 block text-sm">{PAYMENT_HINTS[method]}</span>
            </span>
          </label>
        ))}
        {errors.paymentMethod && (
          <p role="alert" className="text-danger text-sm">
            {errors.paymentMethod.message}
          </p>
        )}
      </fieldset>

      <fieldset className="flex flex-col gap-5">
        <legend className="sr-only">Hóa đơn</legend>
        <label className="text-sand flex min-h-8 w-fit items-center gap-3 text-[15px]">
          <input type="checkbox" {...register("wantsInvoice")} className="accent-gold size-4.5" />
          Xuất hóa đơn công ty
        </label>
        {wantsInvoice && (
          <div className="border-gold/25 grid gap-5 border-l pl-5 sm:grid-cols-2">
            <TextField
              id="invoiceCompanyName"
              label="Tên công ty"
              autoComplete="organization"
              className="sm:col-span-2"
              registration={register("invoiceInfo.companyName")}
              error={invoice?.companyName?.message}
            />
            <TextField
              id="invoiceTaxCode"
              label="Mã số thuế"
              inputMode="numeric"
              placeholder="0101234567"
              registration={register("invoiceInfo.taxCode")}
              error={invoice?.taxCode?.message}
            />
            <TextField
              id="invoiceEmail"
              label="Email nhận hóa đơn"
              type="email"
              registration={register("invoiceInfo.email")}
              error={invoice?.email?.message}
            />
            <TextField
              id="invoiceAddress"
              label="Địa chỉ công ty"
              className="sm:col-span-2"
              registration={register("invoiceInfo.address")}
              error={invoice?.address?.message}
            />
          </div>
        )}
      </fieldset>

      <div className="flex flex-col gap-2">
        <label htmlFor="note" className={LABEL}>
          Ghi chú cho đơn hàng (không bắt buộc)
        </label>
        <textarea
          id="note"
          rows={3}
          placeholder="Ví dụ: giao giờ hành chính"
          {...register("note")}
          aria-invalid={Boolean(errors.note)}
          aria-describedby={errors.note ? "note-error" : undefined}
          className={cn(INPUT, "border-border h-auto py-3")}
        />
        {errors.note && (
          <p id="note-error" role="alert" className="text-danger text-sm">
            {errors.note.message}
          </p>
        )}
      </div>

      <div className="flex flex-col gap-4">
        {blocker && <p className="text-upcoming text-sm leading-6">{blocker}</p>}
        <button type="submit" disabled={isSubmitting || blocker !== null} className={SUBMIT}>
          {isSubmitting ? "Đang đặt hàng…" : "Đặt hàng"}
          <ArrowRight size={18} />
        </button>
        {errors.root?.server && (
          <p role="alert" className={FORM_ERROR}>
            {errors.root.server.message}
            {cartChanged && (
              <>
                {" "}
                <Link href="/gio-hang" className="link-underline text-gold font-medium">
                  Xem lại giỏ hàng
                </Link>
              </>
            )}
          </p>
        )}
      </div>
    </form>
  );
}

export interface CheckoutProps {
  /** Mặc định lấy cấu hình trong `payment.ts`; truyền vào để test. */
  bankAccount?: BankAccount | null;
}

/** Trang thanh toán: form thông tin giao hàng bên cạnh tóm tắt giỏ, đặt xong thì hiện màn cảm ơn tại chỗ. */
export function Checkout({ bankAccount = BANK_ACCOUNT }: CheckoutProps) {
  const { data: cart, isError, error, refetch, isFetching } = useCart();
  // Giữ đơn vừa tạo trong state (không lưu vào storage) vì đơn có thông tin cá nhân của khách.
  const [placed, setPlaced] = useState<Order | null>(null);

  if (placed) {
    return <OrderPlaced order={placed} bankAccount={bankAccount} />;
  }

  if (isError) {
    return (
      <div className="flex flex-col items-start gap-4">
        <p role="alert" className={FORM_ERROR}>
          Chưa tải được giỏ sách. {orderingErrorMessage(error)}
        </p>
        <button
          type="button"
          onClick={() => void refetch()}
          disabled={isFetching}
          className="link-underline text-gold flex min-h-11 items-center gap-2"
        >
          <RefreshCw size={16} /> Thử lại
        </button>
      </div>
    );
  }

  if (!cart) {
    return <BookLoader label="Đang chuẩn bị đơn hàng" />;
  }

  if (!cart.items.length) {
    return (
      <div className="border-gold/25 flex min-h-80 flex-col items-center justify-center gap-4 border px-6 text-center">
        <h2 className="font-editorial text-3xl font-bold">Giỏ sách đang trống</h2>
        <p className="text-mist">Bạn chọn sách trước rồi quay lại để đặt hàng.</p>
        <Link href="/sach" className={cn(SUBMIT, "mt-2 px-7")}>
          Vào tủ sách <ArrowRight size={18} />
        </Link>
      </div>
    );
  }

  return (
    <div className="grid items-start gap-12 lg:grid-cols-[1fr_380px]">
      <CheckoutForm
        methods={availablePaymentMethods(bankAccount)}
        blocker={checkoutBlocker(cart)}
        onPlaced={setPlaced}
      />
      <div className="flex flex-col gap-4 lg:sticky lg:top-6">
        <CartSummary
          cart={cart}
          action={
            <ul className="border-gold/20 divide-gold/10 flex flex-col divide-y border-t text-sm">
              {cart.items.map((item) => (
                <li key={item.skuId} className="flex flex-col gap-1.5 py-3.5 last:pb-0">
                  <span className="text-ivory line-clamp-2 leading-6" title={item.bookTitle}>
                    {item.bookTitle}
                  </span>
                  <span className="flex items-baseline justify-between gap-4">
                    <span className="text-mist">
                      SL: {item.quantity} × {formatPrice(item.unitPrice)}
                    </span>
                    <span className="text-sand shrink-0 font-semibold">{formatPrice(item.lineTotal)}</span>
                  </span>
                </li>
              ))}
            </ul>
          }
        />
        <Link href="/gio-hang" className="link-underline text-gold w-fit text-sm">
          Sửa giỏ hàng
        </Link>
      </div>
    </div>
  );
}
