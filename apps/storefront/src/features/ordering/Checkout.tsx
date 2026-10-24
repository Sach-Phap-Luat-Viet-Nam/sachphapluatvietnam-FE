"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import Link from "next/link";
import { useQuery } from "@tanstack/react-query";
import { useForm, useWatch } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { ArrowRight, RefreshCw } from "lucide-react";
import { isApiError } from "@slvn/api-client";
import { fieldErrors } from "@slvn/auth";
import { cn } from "@slvn/ui";
import { formatPrice } from "@slvn/utils";
import { BookLoader } from "@/components/BookLoader";
import { FORM_ERROR, INPUT, LABEL, SUBMIT } from "@/components/form-styles";
import { TextField } from "@/components/TextField";
import { coverTypeLabel } from "@/lib/labels";
import { MAX_ADDRESSES } from "@/lib/account-api";
import type { Address, AddressBody } from "@/lib/account-api";
import { useAddresses, useProfile, useSaveAddress } from "@/lib/use-account";
import { fetchBuyNowBook, placeBuyNowOrder, placeOrder } from "./api";
import { buyNowLine } from "./buy-now";
import type { BuyNowSelection } from "./buy-now";
import { checkoutBlocker } from "./cart";
import { CartLineCover } from "./CartLineCover";
import { CartSummary } from "./CartSummary";
import { CHECKOUT_DEFAULTS, CHECKOUT_FIELDS, checkoutSchema, toCreateOrderBody } from "./order-forms";
import type { CheckoutValues, CreateOrderBody, PaymentMethod } from "./order-forms";
import { orderingErrorMessage } from "./errors";
import { PAYMENT_METHOD_LABELS, label } from "./labels";
import { OrderPlaced } from "./OrderPlaced";
import { BANK_ACCOUNT, availablePaymentMethods } from "./payment";
import { SavedAddressPicker } from "./SavedAddressPicker";
import type { AddressChoice } from "./SavedAddressPicker";
import type { BankAccount } from "./payment";
import type { Order } from "./schemas";
import { useCart, useClearCartCache, useRefreshCart } from "./useCart";

/** Lỗi do sách khách chọn đã đổi (hết hàng, ngừng bán, giỏ trống): tải lại dữ liệu và gợi ý quay lại để sửa. */
const STALE_SELECTION_CODES = new Set(["CART_EMPTY", "SKU_NOT_AVAILABLE", "MAX_QTY_EXCEEDED", "OUT_OF_STOCK"]);

/** Mua ngay không dùng giỏ: câu chữ "xóa khỏi giỏ" của thông báo mặc định không đúng ngữ cảnh. */
const BUY_NOW_MESSAGES: Record<string, string> = {
  SKU_NOT_AVAILABLE: "Sách này hiện không còn bán.",
  OUT_OF_STOCK: "Sách không còn đủ số lượng bạn chọn. Bạn vui lòng quay lại trang sách để chọn lại số lượng.",
};

const PAYMENT_HINTS: Record<PaymentMethod, string> = {
  cod: "Trả tiền mặt cho nhân viên giao hàng khi nhận sách.",
  bank_transfer: "Chuyển khoản trong 30 phút sau khi đặt, nội dung là mã đơn hàng.",
};

const SECTION_TITLE = "font-editorial text-2xl font-bold";

/** Khi đơn bị từ chối vì sách đã đổi: link để khách quay lại sửa lựa chọn, và việc tải lại dữ liệu. */
interface StaleSelectionRecovery {
  href: string;
  label: string;
  reload: () => void;
  /** Câu chữ riêng theo `code`, thay thông báo mặc định của `orderingErrorMessage`. */
  messages?: Record<string, string>;
}

interface CheckoutFormProps {
  methods: PaymentMethod[];
  /** Lý do chưa đặt được (ngừng bán, thiếu hàng): vẫn giữ form để khách không mất thông tin đã nhập. */
  blocker: string | null;
  /** Gửi đơn: từ giỏ (`placeOrder`) hoặc Mua ngay (`placeBuyNowOrder`). */
  submitOrder: (order: CreateOrderBody, idempotencyKey: string) => Promise<Order>;
  recovery: StaleSelectionRecovery;
  /** `addressToSave`: địa chỉ khách muốn lưu vào sổ địa chỉ sau khi đặt (thành viên). */
  onPlaced: (order: Order, addressToSave: AddressBody | null) => void;
}

function CheckoutForm({ methods, blocker, submitOrder, recovery, onPlaced }: CheckoutFormProps) {
  // Một key cho mỗi lần vào trang thanh toán; gửi lại (bấm nhiều lần, retry) thì backend trả đúng đơn đã tạo.
  const [idempotencyKey, setIdempotencyKey] = useState(() => crypto.randomUUID());
  const [selectionChanged, setSelectionChanged] = useState(false);
  const {
    register,
    control,
    handleSubmit,
    setError,
    getValues,
    setValue,
    formState: { errors, isSubmitting },
  } = useForm<CheckoutValues>({
    resolver: zodResolver(checkoutSchema),
    defaultValues: { ...CHECKOUT_DEFAULTS, paymentMethod: methods[0] ?? "cod" },
  });
  const wantsInvoice = useWatch({ control, name: "wantsInvoice" });

  // Thành viên: điền sẵn từ hồ sơ và sổ địa chỉ (lib/use-account). Khách vãng lai hai query này không chạy.
  const { data: profile } = useProfile();
  const { data: savedAddresses } = useAddresses();
  const [addressChoice, setAddressChoice] = useState<AddressChoice | null>(null);
  const [saveToBook, setSaveToBook] = useState(false);
  // Chưa chọn gì thì theo địa chỉ mặc định (đứng đầu sổ); sổ trống hoặc chưa có API thì là "địa chỉ khác".
  const selectedAddress: AddressChoice = addressChoice ?? savedAddresses?.[0]?.id ?? "other";

  const fillAddress = useCallback(
    (address: Address) => {
      setValue("customerName", address.recipientName);
      setValue("phone", address.phone);
      setValue("shippingAddress", {
        province: address.province,
        ward: address.ward,
        streetAddress: address.streetAddress,
      });
    },
    [setValue],
  );

  // Chỉ điền vào ô còn trống để không ghi đè thứ khách đã gõ trước khi dữ liệu tải xong.
  useEffect(() => {
    if (!profile) return;
    const fills = [
      ["customerName", profile.fullName],
      ["phone", profile.phoneNumber ?? ""],
      ["email", profile.email],
    ] as const;
    for (const [field, value] of fills) {
      if (value && !getValues(field).trim()) setValue(field, value);
    }
  }, [profile, getValues, setValue]);

  // Điền địa chỉ mặc định một lần khi sổ địa chỉ tải xong.
  const appliedDefault = useRef(false);
  useEffect(() => {
    const preferred = savedAddresses?.[0];
    if (appliedDefault.current || !preferred) return;
    appliedDefault.current = true;
    const { province, ward, streetAddress } = getValues("shippingAddress");
    if (!province.trim() && !ward.trim() && !streetAddress.trim()) fillAddress(preferred);
  }, [savedAddresses, getValues, fillAddress]);

  const chooseAddress = (choice: AddressChoice) => {
    setAddressChoice(choice);
    const address = savedAddresses?.find((item) => item.id === choice);
    if (address) {
      fillAddress(address);
      return;
    }
    // Địa chỉ khác: xóa phần địa chỉ để khách nhập mới, giữ người nhận.
    setValue("shippingAddress", { province: "", ward: "", streetAddress: "" });
  };

  const canSaveAddress =
    savedAddresses !== undefined && selectedAddress === "other" && savedAddresses.length < MAX_ADDRESSES;

  const onSubmit = async (values: CheckoutValues) => {
    const body = toCreateOrderBody(values);
    setSelectionChanged(false);
    try {
      let order: Order;
      try {
        order = await submitOrder(body, idempotencyKey);
      } catch (error) {
        // Key đã dùng cho đơn của người khác/số điện thoại khác: sinh key mới rồi gửi lại một lần.
        if (!isApiError(error) || error.code !== "IDEMPOTENCY_KEY_REUSED") throw error;
        const freshKey = crypto.randomUUID();
        setIdempotencyKey(freshKey);
        order = await submitOrder(body, freshKey);
      }
      onPlaced(
        order,
        canSaveAddress && saveToBook
          ? {
              recipientName: body.customerName,
              phone: body.phone,
              ...body.shippingAddress,
              isDefault: savedAddresses?.length === 0,
            }
          : null,
      );
    } catch (error) {
      const invalidFields = fieldErrors(error, CHECKOUT_FIELDS);
      invalidFields.forEach(({ field, message }) => setError(field, { message }));
      if (invalidFields.length === 0) {
        setError("root.server", { message: orderingErrorMessage(error, recovery.messages) });
      }
      if (isApiError(error) && STALE_SELECTION_CODES.has(error.code)) {
        setSelectionChanged(true);
        recovery.reload();
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
        {savedAddresses && savedAddresses.length > 0 && (
          <SavedAddressPicker addresses={savedAddresses} value={selectedAddress} onChange={chooseAddress} />
        )}
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
        {canSaveAddress && (
          <label className="text-sand flex min-h-8 w-fit items-center gap-3 text-[15px]">
            <input
              type="checkbox"
              checked={saveToBook}
              onChange={(event) => setSaveToBook(event.target.checked)}
              className="accent-gold size-4.5"
            />
            Lưu địa chỉ này vào sổ địa chỉ
          </label>
        )}
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
            {selectionChanged && (
              <>
                {" "}
                <Link href={recovery.href} className="link-underline text-gold font-medium">
                  {recovery.label}
                </Link>
              </>
            )}
          </p>
        )}
      </div>
    </form>
  );
}

type PlacedHandler = CheckoutFormProps["onPlaced"];

interface CheckoutModeProps {
  methods: PaymentMethod[];
  onPlaced: PlacedHandler;
}

/** Không đặt được (giỏ trống, link Mua ngay sai, sách không còn): lời giải thích và một link đi tiếp. */
function CheckoutNotice({
  title,
  message,
  href,
  label,
}: {
  title: string;
  message: string;
  href: string;
  label: string;
}) {
  return (
    <div className="border-gold/25 flex min-h-80 flex-col items-center justify-center gap-4 border px-6 text-center">
      <h2 className="font-editorial text-3xl font-bold">{title}</h2>
      <p className="text-mist">{message}</p>
      <Link href={href} className={cn(SUBMIT, "mt-2 px-7")}>
        {label} <ArrowRight size={18} />
      </Link>
    </div>
  );
}

function LoadError({ message, retrying, onRetry }: { message: string; retrying: boolean; onRetry: () => void }) {
  return (
    <div className="flex flex-col items-start gap-4">
      <p role="alert" className={FORM_ERROR}>
        {message}
      </p>
      <button
        type="button"
        onClick={onRetry}
        disabled={retrying}
        className="link-underline text-gold flex min-h-11 items-center gap-2"
      >
        <RefreshCw size={16} /> Thử lại
      </button>
    </div>
  );
}

/** Đặt từ giỏ: tóm tắt các dòng trong giỏ; đặt xong thì làm trống giỏ trong cache (backend đã xóa giỏ). */
function CartCheckout({ methods, onPlaced }: CheckoutModeProps) {
  const { data: cart, isError, error, refetch, isFetching } = useCart();
  const clearCart = useClearCartCache();
  const refreshCart = useRefreshCart();

  if (isError) {
    return (
      <LoadError
        message={`Chưa tải được giỏ sách. ${orderingErrorMessage(error)}`}
        retrying={isFetching}
        onRetry={() => void refetch()}
      />
    );
  }

  if (!cart) {
    return <BookLoader label="Đang chuẩn bị đơn hàng" />;
  }

  if (!cart.items.length) {
    return (
      <CheckoutNotice
        title="Giỏ sách đang trống"
        message="Bạn chọn sách trước rồi quay lại để đặt hàng."
        href="/sach"
        label="Vào tủ sách"
      />
    );
  }

  return (
    <div className="grid items-start gap-12 lg:grid-cols-[1fr_380px]">
      <CheckoutForm
        methods={methods}
        blocker={checkoutBlocker(cart)}
        submitOrder={placeOrder}
        recovery={{ href: "/gio-hang", label: "Xem lại giỏ hàng", reload: refreshCart }}
        onPlaced={(order, addressToSave) => {
          clearCart();
          onPlaced(order, addressToSave);
        }}
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

/**
 * "Mua ngay": tóm tắt một dòng dựng từ `GET /books/{slug}` (không đọc giỏ), đặt bằng `POST /orders/buy-now`. Giỏ của
 * khách giữ nguyên nên đặt xong không động vào cache giỏ.
 */
function BuyNowCheckout({ selection, methods, onPlaced }: CheckoutModeProps & { selection: BuyNowSelection }) {
  const book = useQuery({
    queryKey: ["buy-now-book", selection.slug],
    queryFn: () => fetchBuyNowBook(selection.slug),
  });
  const bookHref = `/sach/${selection.slug}`;

  if (book.isError) {
    if (isApiError(book.error) && book.error.status === 404) {
      return (
        <CheckoutNotice
          title="Không tìm thấy sách"
          message="Sách bạn chọn mua không còn trong tủ sách."
          href="/sach"
          label="Vào tủ sách"
        />
      );
    }
    return (
      <LoadError
        message={`Chưa tải được thông tin sách. ${orderingErrorMessage(book.error)}`}
        retrying={book.isFetching}
        onRetry={() => void book.refetch()}
      />
    );
  }

  if (!book.data) {
    return <BookLoader label="Đang chuẩn bị đơn hàng" />;
  }

  const line = buyNowLine(book.data, selection);
  if (!line) {
    return (
      <CheckoutNotice
        title="Sách không còn bán"
        message="Loại sách bạn chọn không còn bán. Bạn chọn lại trên trang sách nhé."
        href={bookHref}
        label="Quay lại trang sách"
      />
    );
  }

  const details = [line.editionName, coverTypeLabel(line.coverType)].filter(Boolean).join(" · ");
  return (
    <div className="grid items-start gap-12 lg:grid-cols-[1fr_380px]">
      <CheckoutForm
        methods={methods}
        blocker={line.blocker}
        submitOrder={(order, idempotencyKey) => placeBuyNowOrder(selection, order, idempotencyKey)}
        recovery={{
          href: bookHref,
          label: "Quay lại trang sách",
          reload: () => void book.refetch(),
          messages: BUY_NOW_MESSAGES,
        }}
        onPlaced={onPlaced}
      />
      <div className="flex flex-col gap-4 lg:sticky lg:top-6">
        <CartSummary
          cart={{ subtotal: line.lineTotal, totalQuantity: line.quantity }}
          action={
            <div className="border-gold/20 flex gap-4 border-t pt-4 text-sm">
              <CartLineCover title={line.bookTitle} coverImageUrl={line.coverImageUrl} skuId={line.skuId} />
              <div className="flex min-w-0 flex-1 flex-col gap-1.5">
                <span className="text-ivory line-clamp-2 leading-6" title={line.bookTitle}>
                  {line.bookTitle}
                </span>
                {details && <span className="text-mist">{details}</span>}
                <span className="flex items-baseline justify-between gap-4">
                  <span className="text-mist">
                    SL: {line.quantity} × {formatPrice(line.unitPrice)}
                  </span>
                  <span className="text-sand shrink-0 font-semibold">{formatPrice(line.lineTotal)}</span>
                </span>
              </div>
            </div>
          }
        />
        <Link href={bookHref} className="link-underline text-gold w-fit text-sm">
          Quay lại trang sách
        </Link>
      </div>
    </div>
  );
}

export interface CheckoutProps {
  /** Mặc định lấy cấu hình trong `payment.ts`; truyền vào để test. */
  bankAccount?: BankAccount | null;
  /** Lựa chọn "Mua ngay" đọc từ URL (`parseBuyNowParams`); `null` là đặt từ giỏ. */
  buyNow?: BuyNowSelection | "invalid" | null;
}

/**
 * Trang thanh toán: form thông tin giao hàng bên cạnh tóm tắt giỏ (hoặc một dòng Mua ngay), đặt xong thì hiện màn cảm ơn
 * tại chỗ.
 */
export function Checkout({ bankAccount = BANK_ACCOUNT, buyNow = null }: CheckoutProps) {
  // Giữ đơn vừa tạo trong state (không lưu vào storage) vì đơn có thông tin cá nhân của khách.
  const [placed, setPlaced] = useState<Order | null>(null);
  const saveAddress = useSaveAddress();
  const methods = availablePaymentMethods(bankAccount);

  const handlePlaced = (order: Order, addressToSave: AddressBody | null) => {
    setPlaced(order);
    if (addressToSave) saveAddress.mutate(addressToSave);
  };

  if (placed) {
    return (
      <div className="flex flex-col gap-4">
        {/* Đơn đã tạo xong; lưu địa chỉ chỉ là tiện ích nên lỗi thì báo nhẹ, không chặn màn cảm ơn. */}
        <p aria-live="polite" className="text-sm empty:hidden">
          {saveAddress.isSuccess && <span className="text-ok">Đã lưu địa chỉ vào sổ địa chỉ.</span>}
          {saveAddress.isError && (
            <span className="text-upcoming">
              Chưa lưu được địa chỉ vào sổ địa chỉ, bạn có thể thêm lại ở trang{" "}
              <Link href="/tai-khoan" className="link-underline text-gold">
                Tài khoản
              </Link>
              .
            </span>
          )}
        </p>
        <OrderPlaced order={placed} bankAccount={bankAccount} />
      </div>
    );
  }

  if (buyNow === "invalid") {
    return (
      <CheckoutNotice
        title="Liên kết không hợp lệ"
        message="Liên kết Mua ngay thiếu thông tin hoặc đã bị sửa. Bạn chọn lại sách trong tủ sách nhé."
        href="/sach"
        label="Vào tủ sách"
      />
    );
  }

  return buyNow ? (
    // Đổi lựa chọn là đơn khác: tạo lại form để có `Idempotency-Key` mới.
    <BuyNowCheckout
      key={`${buyNow.slug}:${buyNow.skuId}:${buyNow.quantity}`}
      selection={buyNow}
      methods={methods}
      onPlaced={handlePlaced}
    />
  ) : (
    <CartCheckout methods={methods} onPlaced={handlePlaced} />
  );
}
