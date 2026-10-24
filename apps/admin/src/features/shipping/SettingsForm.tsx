"use client";

import { useState } from "react";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { Field, fieldA11y } from "@/components/Field";
import { FormActions } from "@/components/FormActions";
import { FORM_SUCCESS, INPUT } from "@/components/form-styles";
import { showServerError } from "@/lib/admin-errors";
import { settingsToFormValues, toSettingsBody } from "./shipping-form";
import type { SettingsBody } from "./shipping-form";
import { settingsFormSchema } from "./schemas";
import type { SettingsFormValues, ShippingSettings } from "./schemas";

const SETTINGS_FIELDS = ["freeShippingThreshold", "packagingWeightGram", "defaultBookWeightGram", "flatFee"] as const;

export interface SettingsFormProps {
  settings: ShippingSettings;
  /** Trả bản đã lưu để form điền lại theo đúng giá trị server giữ. */
  onSave: (body: SettingsBody) => Promise<ShippingSettings>;
}

/** Cấu hình chung: ngưỡng miễn phí vận chuyển, trọng lượng bao bì, trọng lượng sách mặc định, phí cố định. */
export function SettingsForm({ settings, onSave }: SettingsFormProps) {
  const {
    register,
    handleSubmit,
    setError,
    reset,
    formState: { errors, isSubmitting },
  } = useForm<SettingsFormValues>({
    resolver: zodResolver(settingsFormSchema),
    defaultValues: settingsToFormValues(settings),
  });

  const [saved, setSaved] = useState(false);

  return (
    <form
      noValidate
      onSubmit={handleSubmit(async (values) => {
        setSaved(false);
        try {
          reset(settingsToFormValues(await onSave(toSettingsBody(values))));
          setSaved(true);
        } catch (error) {
          showServerError(error, SETTINGS_FIELDS, setError);
        }
      })}
      className="flex flex-col gap-5"
    >
      {settings.isDefault && (
        <p role="note" className="bg-surface border-border text-muted rounded-md border px-4 py-3 text-sm leading-6">
          Chưa có ai lưu cấu hình, hệ thống đang dùng giá trị mặc định bên dưới.
        </p>
      )}
      <div className="grid gap-5 md:grid-cols-2">
        <Field
          id="settings-threshold"
          label="Miễn phí vận chuyển từ đơn (₫)"
          optional
          error={errors.freeShippingThreshold?.message}
          hint="Để trống: tắt miễn phí vận chuyển theo ngưỡng."
        >
          <input
            type="text"
            inputMode="numeric"
            {...register("freeShippingThreshold")}
            {...fieldA11y("settings-threshold", errors.freeShippingThreshold?.message, true)}
            className={INPUT}
          />
        </Field>
        <Field
          id="settings-flat"
          label="Phí cố định (₫)"
          error={errors.flatFee?.message}
          hint="Dùng khi khách chưa chọn tỉnh hoặc chưa có vùng nào."
        >
          <input
            type="text"
            inputMode="numeric"
            {...register("flatFee")}
            {...fieldA11y("settings-flat", errors.flatFee?.message, true)}
            className={INPUT}
          />
        </Field>
        <Field
          id="settings-packaging"
          label="Trọng lượng bao bì mỗi đơn (gram)"
          error={errors.packagingWeightGram?.message}
        >
          <input
            type="text"
            inputMode="numeric"
            {...register("packagingWeightGram")}
            {...fieldA11y("settings-packaging", errors.packagingWeightGram?.message)}
            className={INPUT}
          />
        </Field>
        <Field
          id="settings-book-weight"
          label="Trọng lượng sách mặc định (gram)"
          error={errors.defaultBookWeightGram?.message}
          hint="Dùng khi ấn bản chưa nhập trọng lượng."
        >
          <input
            type="text"
            inputMode="numeric"
            {...register("defaultBookWeightGram")}
            {...fieldA11y("settings-book-weight", errors.defaultBookWeightGram?.message, true)}
            className={INPUT}
          />
        </Field>
      </div>
      <FormActions pending={isSubmitting} submitLabel="Lưu cấu hình" error={errors.root?.server?.message} />
      {saved && (
        <p role="status" className={FORM_SUCCESS}>
          Đã lưu cấu hình vận chuyển.
        </p>
      )}
    </form>
  );
}
