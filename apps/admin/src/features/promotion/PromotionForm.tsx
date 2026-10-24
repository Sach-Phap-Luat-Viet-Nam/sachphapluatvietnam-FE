"use client";

import { Controller, useForm, useWatch } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { DateTimeInput } from "@/components/DateTimeInput";
import { Field, fieldA11y } from "@/components/Field";
import { FormActions } from "@/components/FormActions";
import { CHECKBOX, INPUT, LABEL, SELECT, TEXTAREA } from "@/components/form-styles";
import { showServerError } from "@/lib/admin-errors";
import {
  AUDIENCES,
  AUDIENCE_LABELS,
  DISCOUNT_TYPES,
  DISCOUNT_TYPE_LABELS,
  PROMOTION_KINDS,
  PROMOTION_KIND_LABELS,
  PROMOTION_MODES,
  PROMOTION_MODE_LABELS,
  SCOPE_TARGET_LABELS,
  SCOPE_TYPES,
  SCOPE_TYPE_LABELS,
} from "./labels";
import { toPromotionBody } from "./promotion-form";
import type { PromotionBody } from "./promotion-form";
import { promotionFormSchema } from "./schemas";
import type { PromotionFormValues } from "./schemas";

const PROMOTION_FIELDS = [
  "name",
  "title",
  "description",
  "kind",
  "mode",
  "discountType",
  "discountValue",
  "maxDiscountAmount",
  "minOrderAmount",
  "scopeType",
  "targetIds",
  "excludeOnSaleItems",
  "audience",
  "usageLimit",
  "perCustomerLimit",
  "startsAt",
  "endsAt",
  "isActive",
  "isPublic",
  "priority",
] as const;

const SECTION = "flex flex-col gap-5 border-border border-t pt-6";
const SECTION_TITLE = "text-lg font-semibold";

export interface PromotionFormProps {
  defaultValues: PromotionFormValues;
  submitLabel: string;
  onSave: (body: PromotionBody) => Promise<void>;
  onCancel: () => void;
}

function DateTimeField({
  control,
  name,
  label,
  optional,
  hint,
  error,
}: {
  control: ReturnType<typeof useForm<PromotionFormValues>>["control"];
  name: "startsAt" | "endsAt";
  label: string;
  optional?: boolean;
  hint: string;
  error?: string;
}) {
  const id = `promotion-${name}`;
  return (
    <Field id={id} label={label} optional={optional} error={error} hint={hint}>
      <Controller
        control={control}
        name={name}
        render={({ field }) => (
          <DateTimeInput
            id={id}
            value={field.value}
            onChange={field.onChange}
            onBlur={field.onBlur}
            invalid={Boolean(error)}
            describedBy={[`${id}-hint`, error ? `${id}-error` : ""].filter(Boolean).join(" ")}
          />
        )}
      />
    </Field>
  );
}

/** Form chương trình khuyến mãi (docs/features/checkout-promotion-shipping.md, mục 7.1). */
export function PromotionForm({ defaultValues, submitLabel, onSave, onCancel }: PromotionFormProps) {
  const {
    register,
    control,
    handleSubmit,
    setError,
    formState: { errors, isSubmitting },
  } = useForm<PromotionFormValues>({ resolver: zodResolver(promotionFormSchema), defaultValues });
  const kind = useWatch({ control, name: "kind" });
  const discountType = useWatch({ control, name: "discountType" });
  const scopeType = useWatch({ control, name: "scopeType" });
  const freeShipping = kind === "free_shipping";
  const percent = discountType === "percent";
  const scoped = !freeShipping && scopeType !== "all";

  return (
    <form
      noValidate
      onSubmit={handleSubmit(async (values) => {
        try {
          await onSave(toPromotionBody(values));
        } catch (error) {
          showServerError(error, PROMOTION_FIELDS, setError);
        }
      })}
      className="flex flex-col gap-6"
    >
      <p className="bg-surface border-border text-muted rounded-md border px-4 py-3 text-sm leading-6">
        Mỗi đơn chỉ áp tối đa <strong>một</strong> chương trình giảm giá đơn và <strong>một</strong> chương trình giảm
        phí ship, lấy chương trình giảm nhiều nhất; không cộng dồn.
      </p>

      <div className="flex flex-col gap-5">
        <Field
          id="promotion-name"
          label="Tên nội bộ"
          error={errors.name?.message}
          hint="Chỉ nhân viên thấy. Tối đa 255 ký tự."
        >
          <input
            type="text"
            {...register("name")}
            {...fieldA11y("promotion-name", errors.name?.message, true)}
            className={INPUT}
          />
        </Field>
        <Field
          id="promotion-title"
          label="Tiêu đề hiển thị cho khách"
          error={errors.title?.message}
          hint="Hiện ở trang Khuyến mãi và bước thanh toán. Tối đa 255 ký tự."
        >
          <input
            type="text"
            {...register("title")}
            {...fieldA11y("promotion-title", errors.title?.message, true)}
            className={INPUT}
          />
        </Field>
        <Field
          id="promotion-description"
          label="Mô tả"
          optional
          error={errors.description?.message}
          hint="Nội dung quảng cáo dài, hiện ở trang Khuyến mãi. Tối đa 1000 ký tự."
        >
          <textarea
            rows={3}
            {...register("description")}
            {...fieldA11y("promotion-description", errors.description?.message, true)}
            className={TEXTAREA}
          />
        </Field>
      </div>

      <fieldset className={SECTION}>
        <legend className={SECTION_TITLE}>Loại ưu đãi</legend>
        <div className="grid gap-5 md:grid-cols-2">
          <div className="flex flex-col gap-2">
            <span className={LABEL}>Ưu đãi</span>
            {PROMOTION_KINDS.map((value) => (
              <label key={value} className="flex min-h-11 items-center gap-2">
                <input type="radio" value={value} {...register("kind")} className={CHECKBOX} />
                {PROMOTION_KIND_LABELS[value]}
              </label>
            ))}
          </div>
          <div className="flex flex-col gap-2">
            <span className={LABEL}>Cách áp dụng</span>
            {PROMOTION_MODES.map((value) => (
              <label key={value} className="flex min-h-11 items-center gap-2">
                <input type="radio" value={value} {...register("mode")} className={CHECKBOX} />
                {PROMOTION_MODE_LABELS[value]}
              </label>
            ))}
          </div>
        </div>
        <p className="text-muted text-sm leading-6">
          Chương trình “Khách nhập mã giảm giá” cần thêm mã sau khi lưu (ở trang sửa).
        </p>
      </fieldset>

      <fieldset className={SECTION}>
        <legend className={SECTION_TITLE}>Mức giảm</legend>
        <div className="grid gap-5 md:grid-cols-2">
          <Field id="promotion-discount-type" label="Kiểu giảm">
            <select id="promotion-discount-type" {...register("discountType")} className={SELECT}>
              {DISCOUNT_TYPES.map((value) => (
                <option key={value} value={value}>
                  {DISCOUNT_TYPE_LABELS[value]}
                </option>
              ))}
            </select>
          </Field>
          <Field
            id="promotion-discount-value"
            label={percent ? "Phần trăm giảm" : "Số tiền giảm (₫)"}
            error={errors.discountValue?.message}
            hint={
              percent
                ? freeShipping
                  ? "1–100. Nhập 100 để miễn phí vận chuyển."
                  : "1–100. Backend giới hạn mức giảm tối đa trên đơn theo cấu hình (mặc định 50%)."
                : "Số nguyên VNĐ lớn hơn 0."
            }
          >
            <input
              type="text"
              inputMode="numeric"
              {...register("discountValue")}
              {...fieldA11y("promotion-discount-value", errors.discountValue?.message, true)}
              className={INPUT}
            />
          </Field>
          {percent && (
            <Field
              id="promotion-max-discount"
              label="Giảm tối đa (₫)"
              optional
              error={errors.maxDiscountAmount?.message}
              hint="Trần số tiền giảm khi giảm theo phần trăm."
            >
              <input
                type="text"
                inputMode="numeric"
                {...register("maxDiscountAmount")}
                {...fieldA11y("promotion-max-discount", errors.maxDiscountAmount?.message, true)}
                className={INPUT}
              />
            </Field>
          )}
          <Field
            id="promotion-min-order"
            label="Giá trị đơn tối thiểu (₫)"
            error={errors.minOrderAmount?.message}
            hint="Nhập 0 nếu không yêu cầu."
          >
            <input
              type="text"
              inputMode="numeric"
              {...register("minOrderAmount")}
              {...fieldA11y("promotion-min-order", errors.minOrderAmount?.message, true)}
              className={INPUT}
            />
          </Field>
        </div>
      </fieldset>

      <fieldset className={SECTION} disabled={freeShipping}>
        <legend className={SECTION_TITLE}>Phạm vi áp dụng</legend>
        {freeShipping ? (
          <p className="text-muted text-sm leading-6">
            Chương trình phí vận chuyển luôn áp cho cả đơn: không giới hạn sách và không loại sách đang giảm giá.
          </p>
        ) : (
          <>
            <div className="grid gap-5 md:grid-cols-2">
              <Field id="promotion-scope" label="Áp dụng cho">
                <select id="promotion-scope" {...register("scopeType")} className={SELECT}>
                  {SCOPE_TYPES.map((value) => (
                    <option key={value} value={value}>
                      {SCOPE_TYPE_LABELS[value]}
                    </option>
                  ))}
                </select>
              </Field>
              <label className="flex min-h-11 items-center gap-2 self-end">
                <input type="checkbox" {...register("excludeOnSaleItems")} className={CHECKBOX} />
                <span className="font-medium">Không áp cho sách đang giảm giá sẵn</span>
              </label>
            </div>
            {scoped && (
              <Field
                id="promotion-targets"
                label={SCOPE_TARGET_LABELS[scopeType as keyof typeof SCOPE_TARGET_LABELS]}
                error={errors.targetIds?.message}
                hint="Từ 1 đến 500 ID, cách nhau bằng dấu phẩy hoặc xuống dòng. Xem ID ở trang Sách."
              >
                <textarea
                  rows={3}
                  {...register("targetIds")}
                  {...fieldA11y("promotion-targets", errors.targetIds?.message, true)}
                  className={TEXTAREA}
                />
              </Field>
            )}
          </>
        )}
      </fieldset>

      <fieldset className={SECTION}>
        <legend className={SECTION_TITLE}>Đối tượng và giới hạn</legend>
        <div className="grid gap-5 md:grid-cols-2">
          <Field id="promotion-audience" label="Đối tượng">
            <select id="promotion-audience" {...register("audience")} className={SELECT}>
              {AUDIENCES.map((value) => (
                <option key={value} value={value}>
                  {AUDIENCE_LABELS[value]}
                </option>
              ))}
            </select>
          </Field>
          <span aria-hidden="true" className="hidden md:block" />
          <Field
            id="promotion-usage-limit"
            label="Tổng số lượt dùng"
            optional
            error={errors.usageLimit?.message}
            hint="Để trống: không giới hạn."
          >
            <input
              type="text"
              inputMode="numeric"
              {...register("usageLimit")}
              {...fieldA11y("promotion-usage-limit", errors.usageLimit?.message, true)}
              className={INPUT}
            />
          </Field>
          <Field
            id="promotion-per-customer"
            label="Số lượt mỗi khách"
            optional
            error={errors.perCustomerLimit?.message}
            hint="Khách chưa đăng nhập được nhận diện qua số điện thoại."
          >
            <input
              type="text"
              inputMode="numeric"
              {...register("perCustomerLimit")}
              {...fieldA11y("promotion-per-customer", errors.perCustomerLimit?.message, true)}
              className={INPUT}
            />
          </Field>
        </div>
      </fieldset>

      <fieldset className={SECTION}>
        <legend className={SECTION_TITLE}>Lịch chạy và hiển thị</legend>
        <div className="grid gap-5 md:grid-cols-2">
          <DateTimeField
            control={control}
            name="startsAt"
            label="Bắt đầu (giờ Việt Nam)"
            hint="Dạng ngày/tháng/năm giờ:phút, ví dụ 01/11/2026 08:00."
            error={errors.startsAt?.message}
          />
          <DateTimeField
            control={control}
            name="endsAt"
            label="Kết thúc (giờ Việt Nam)"
            optional
            hint="“Đến hết 31/12/2026” nhập 01/01/2027 00:00. Để trống: chưa có hạn."
            error={errors.endsAt?.message}
          />
          <Field
            id="promotion-priority"
            label="Độ ưu tiên"
            error={errors.priority?.message}
            hint="0–1000. Hai chương trình giảm bằng nhau thì chương trình ưu tiên cao hơn được chọn."
          >
            <input
              type="text"
              inputMode="numeric"
              {...register("priority")}
              {...fieldA11y("promotion-priority", errors.priority?.message, true)}
              className={INPUT}
            />
          </Field>
          <div className="flex flex-col justify-center gap-1">
            <label className="flex min-h-11 items-center gap-2">
              <input type="checkbox" {...register("isActive")} className={CHECKBOX} />
              <span className="font-medium">Bật chương trình</span>
            </label>
            <label className="flex min-h-11 items-center gap-2">
              <input type="checkbox" {...register("isPublic")} className={CHECKBOX} />
              <span className="font-medium">Hiện ở trang Khuyến mãi</span>
            </label>
          </div>
        </div>
        <p className="text-muted text-sm leading-6">Bỏ chọn “Hiện ở trang Khuyến mãi” cho mã riêng gửi từng khách.</p>
      </fieldset>

      <FormActions
        pending={isSubmitting}
        submitLabel={submitLabel}
        onCancel={onCancel}
        error={errors.root?.server?.message}
      />
    </form>
  );
}
