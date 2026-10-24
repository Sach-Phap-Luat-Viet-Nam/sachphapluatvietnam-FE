"use client";

import { useState } from "react";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { Button } from "@slvn/ui";
import { Field, fieldA11y } from "@/components/Field";
import { ErrorStatus, LoadingStatus } from "@/components/QueryStatus";
import { StatusBadge } from "@/components/StatusBadge";
import { CARD, FORM_ERROR, INPUT, TEXTAREA } from "@/components/form-styles";
import { adminErrorMessage, showServerError } from "@/lib/admin-errors";
import { addCoupon, fetchCoupons, generateCoupons, promotionKeys, updateCoupon } from "./api";
import { couponFormSchema, generateFormSchema } from "./schemas";
import type { Coupon, CouponFormInput, CouponFormValues, GenerateFormInput, GenerateFormValues } from "./schemas";

const TH = "px-4 py-3 font-medium";
const FIELD_ERRORS = ["code", "usageLimit"] as const;
const GENERATE_FIELDS = ["count", "prefix", "usageLimit"] as const;

const limitOrUndefined = (value: string) => (value === "" ? undefined : Number(value));

/** Mã giảm giá của một chương trình `mode = coupon`: thêm mã lẻ, sinh hàng loạt, bật/tắt từng mã. */
export function CouponManager({ promotionId }: { promotionId: number }) {
  const queryClient = useQueryClient();
  const coupons = useQuery({ queryKey: promotionKeys.coupons(promotionId), queryFn: () => fetchCoupons(promotionId) });
  const refresh = () =>
    Promise.all([
      queryClient.invalidateQueries({ queryKey: promotionKeys.coupons(promotionId) }),
      queryClient.invalidateQueries({ queryKey: promotionKeys.lists }),
    ]);
  const toggle = useMutation({
    mutationFn: (coupon: Coupon) =>
      updateCoupon(coupon.id, { isActive: !coupon.isActive, usageLimit: coupon.usageLimit ?? null }),
    onSuccess: refresh,
  });
  const [generated, setGenerated] = useState<string[]>([]);

  return (
    <section aria-labelledby="coupon-title" className={`${CARD} flex flex-col gap-6 p-5 sm:p-6`}>
      <div className="flex flex-col gap-1">
        <h2 id="coupon-title" className="text-lg font-semibold">
          Mã giảm giá
        </h2>
        <p className="text-muted text-sm leading-6">
          Mã gồm 4–40 ký tự chữ, số, gạch ngang hoặc gạch dưới; hệ thống tự viết hoa. Khách nhập mã ở bước thanh toán.
        </p>
      </div>

      <div className="grid gap-6 md:grid-cols-2">
        <AddCouponForm promotionId={promotionId} onDone={refresh} />
        <GenerateForm promotionId={promotionId} onDone={refresh} onGenerated={setGenerated} />
      </div>

      {generated.length > 0 && (
        <div className="flex flex-col gap-2">
          <label htmlFor="generated-codes" className="font-medium">
            {generated.length} mã vừa sinh (sao chép để gửi khách)
          </label>
          <textarea
            id="generated-codes"
            readOnly
            rows={Math.min(8, generated.length)}
            value={generated.join("\n")}
            onFocus={(event) => event.currentTarget.select()}
            className={TEXTAREA}
          />
        </div>
      )}

      {toggle.isError && (
        <p role="alert" className={FORM_ERROR}>
          {adminErrorMessage(toggle.error)}
        </p>
      )}
      {coupons.isPending ? (
        <LoadingStatus />
      ) : coupons.isError ? (
        <ErrorStatus error={coupons.error} onRetry={() => void coupons.refetch()} />
      ) : coupons.data.length === 0 ? (
        <p className="text-muted">Chưa có mã nào.</p>
      ) : (
        <div className="border-border overflow-x-auto rounded-md border">
          <table className="w-full text-left text-sm">
            <caption className="sr-only">Mã giảm giá của chương trình</caption>
            <thead className="bg-surface text-muted">
              <tr>
                <th scope="col" className={TH}>
                  Mã
                </th>
                <th scope="col" className={TH}>
                  Đã dùng / giới hạn
                </th>
                <th scope="col" className={TH}>
                  Trạng thái
                </th>
                <th scope="col" className={TH}>
                  <span className="sr-only">Thao tác</span>
                </th>
              </tr>
            </thead>
            <tbody className="divide-border divide-y">
              {coupons.data.map((coupon) => (
                <tr key={coupon.id}>
                  <td className="px-4 py-3 font-mono font-medium">{coupon.code}</td>
                  <td className="px-4 py-3">
                    {coupon.usedCount}/{coupon.usageLimit ?? "không giới hạn"}
                  </td>
                  <td className="px-4 py-3">
                    <StatusBadge tone={coupon.isActive ? "success" : "neutral"}>
                      {coupon.isActive ? "Đang bật" : "Đã tắt"}
                    </StatusBadge>
                  </td>
                  <td className="px-4 py-3 text-right">
                    <Button
                      variant="ghost"
                      size="sm"
                      disabled={toggle.isPending && toggle.variables?.id === coupon.id}
                      aria-label={`${coupon.isActive ? "Tắt" : "Bật"} mã ${coupon.code}`}
                      onClick={() => toggle.mutate(coupon)}
                    >
                      {coupon.isActive ? "Tắt mã" : "Bật mã"}
                    </Button>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
    </section>
  );
}

function AddCouponForm({ promotionId, onDone }: { promotionId: number; onDone: () => Promise<unknown> }) {
  const {
    register,
    handleSubmit,
    reset,
    setError,
    formState: { errors, isSubmitting },
  } = useForm<CouponFormInput, unknown, CouponFormValues>({
    resolver: zodResolver(couponFormSchema),
    defaultValues: { code: "", usageLimit: "" },
  });

  return (
    <form
      noValidate
      aria-label="Thêm mã"
      className="flex flex-col gap-4"
      onSubmit={handleSubmit(async (values) => {
        try {
          await addCoupon(promotionId, { code: values.code, usageLimit: limitOrUndefined(values.usageLimit) });
          reset();
          await onDone();
        } catch (error) {
          // `COUPON_CODE_DUPLICATE` (409) và `PROMOTION_NOT_COUPON` (422) hiện ở lỗi chung của form.
          showServerError(error, FIELD_ERRORS, setError);
        }
      })}
    >
      <h3 className="font-medium">Thêm một mã</h3>
      <Field id="coupon-code" label="Mã" error={errors.code?.message}>
        <input
          type="text"
          autoCapitalize="characters"
          {...register("code")}
          {...fieldA11y("coupon-code", errors.code?.message)}
          className={INPUT}
        />
      </Field>
      <Field
        id="coupon-limit"
        label="Số lượt dùng"
        optional
        error={errors.usageLimit?.message}
        hint="Để trống: không giới hạn."
      >
        <input
          type="text"
          inputMode="numeric"
          {...register("usageLimit")}
          {...fieldA11y("coupon-limit", errors.usageLimit?.message, true)}
          className={INPUT}
        />
      </Field>
      {errors.root?.server && (
        <p role="alert" className={FORM_ERROR}>
          {errors.root.server.message}
        </p>
      )}
      <Button type="submit" disabled={isSubmitting} className="w-fit">
        {isSubmitting ? "Đang thêm…" : "Thêm mã"}
      </Button>
    </form>
  );
}

function GenerateForm({
  promotionId,
  onDone,
  onGenerated,
}: {
  promotionId: number;
  onDone: () => Promise<unknown>;
  onGenerated: (codes: string[]) => void;
}) {
  const {
    register,
    handleSubmit,
    setError,
    formState: { errors, isSubmitting },
  } = useForm<GenerateFormInput, unknown, GenerateFormValues>({
    resolver: zodResolver(generateFormSchema),
    defaultValues: { count: "10", prefix: "", usageLimit: "" },
  });

  return (
    <form
      noValidate
      aria-label="Sinh mã hàng loạt"
      className="flex flex-col gap-4"
      onSubmit={handleSubmit(async (values) => {
        try {
          const codes = await generateCoupons(promotionId, {
            count: Number(values.count),
            ...(values.prefix ? { prefix: values.prefix } : {}),
            ...(values.usageLimit ? { usageLimit: Number(values.usageLimit) } : {}),
          });
          onGenerated(codes);
          await onDone();
        } catch (error) {
          showServerError(error, GENERATE_FIELDS, setError);
        }
      })}
    >
      <h3 className="font-medium">Sinh mã hàng loạt</h3>
      <div className="grid gap-4 sm:grid-cols-2">
        <Field id="gen-count" label="Số mã" error={errors.count?.message}>
          <input
            type="text"
            inputMode="numeric"
            {...register("count")}
            {...fieldA11y("gen-count", errors.count?.message)}
            className={INPUT}
          />
        </Field>
        <Field id="gen-prefix" label="Tiền tố" optional error={errors.prefix?.message}>
          <input
            type="text"
            autoCapitalize="characters"
            {...register("prefix")}
            {...fieldA11y("gen-prefix", errors.prefix?.message)}
            className={INPUT}
          />
        </Field>
      </div>
      <Field
        id="gen-limit"
        label="Lượt dùng mỗi mã"
        optional
        error={errors.usageLimit?.message}
        hint="Để trống: mỗi mã dùng 1 lần."
      >
        <input
          type="text"
          inputMode="numeric"
          {...register("usageLimit")}
          {...fieldA11y("gen-limit", errors.usageLimit?.message, true)}
          className={INPUT}
        />
      </Field>
      {errors.root?.server && (
        <p role="alert" className={FORM_ERROR}>
          {errors.root.server.message}
        </p>
      )}
      <Button type="submit" variant="outline" disabled={isSubmitting} className="w-fit">
        {isSubmitting ? "Đang sinh…" : "Sinh mã"}
      </Button>
    </form>
  );
}
