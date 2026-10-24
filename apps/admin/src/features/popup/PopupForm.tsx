"use client";

import { Controller, useForm, useWatch } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { Field, fieldA11y } from "@/components/Field";
import { FormActions } from "@/components/FormActions";
import { ImageField } from "@/components/ImageField";
import { CHECKBOX, INPUT, LABEL } from "@/components/form-styles";
import { showServerError } from "@/lib/admin-errors";
import { DISPLAY_FREQUENCIES, DISPLAY_FREQUENCY_LABELS } from "./labels";
import { toPopupBody } from "./popup-form";
import type { PopupBody } from "./popup-form";
import { popupFormSchema } from "./schemas";
import type { PopupFormValues } from "./schemas";

const POPUP_FIELDS = [
  "title",
  "imageUrl",
  "linkUrl",
  "startsAt",
  "endsAt",
  "isActive",
  "priority",
  "displayFrequency",
] as const;

export interface PopupFormProps {
  defaultValues: PopupFormValues;
  submitLabel: string;
  onSave: (body: PopupBody) => Promise<void>;
  onCancel: () => void;
}

/** Form popup: ảnh, link, lịch chạy theo giờ Việt Nam, bật/tắt, độ ưu tiên, tần suất. */
export function PopupForm({ defaultValues, submitLabel, onSave, onCancel }: PopupFormProps) {
  const {
    register,
    control,
    handleSubmit,
    setError,
    formState: { errors, isSubmitting },
  } = useForm<PopupFormValues>({ resolver: zodResolver(popupFormSchema), defaultValues });
  const title = useWatch({ control, name: "title" });

  return (
    <form
      noValidate
      onSubmit={handleSubmit(async (values) => {
        try {
          await onSave(toPopupBody(values));
        } catch (error) {
          showServerError(error, POPUP_FIELDS, setError);
        }
      })}
      className="flex flex-col gap-6"
    >
      <Field
        id="popup-title"
        label="Tiêu đề"
        error={errors.title?.message}
        hint="Cũng là mô tả ảnh cho người dùng trình đọc màn hình. Tối đa 255 ký tự."
      >
        <input
          type="text"
          {...register("title")}
          {...fieldA11y("popup-title", errors.title?.message, true)}
          className={INPUT}
        />
      </Field>

      <Controller
        control={control}
        name="imageUrl"
        render={({ field }) => (
          <ImageField
            id="popup-image"
            label="Ảnh popup"
            target="popup"
            alt={title || "Ảnh popup"}
            value={field.value}
            onChange={field.onChange}
            error={errors.imageUrl?.message}
          />
        )}
      />

      <Field
        id="popup-link"
        label="Link khi bấm vào ảnh"
        optional
        error={errors.linkUrl?.message}
        hint="Đường dẫn trong site như /khuyen-mai, hoặc link đầy đủ https://…"
      >
        <input
          type="text"
          inputMode="url"
          {...register("linkUrl")}
          {...fieldA11y("popup-link", errors.linkUrl?.message, true)}
          className={INPUT}
        />
      </Field>

      <div className="grid gap-5 md:grid-cols-2">
        <Field id="popup-starts" label="Bắt đầu (giờ Việt Nam)" error={errors.startsAt?.message}>
          <input
            type="datetime-local"
            {...register("startsAt")}
            {...fieldA11y("popup-starts", errors.startsAt?.message)}
            className={INPUT}
          />
        </Field>
        <Field
          id="popup-ends"
          label="Kết thúc (giờ Việt Nam)"
          optional
          error={errors.endsAt?.message}
          hint="Để trống: chạy đến khi tắt."
        >
          <input
            type="datetime-local"
            {...register("endsAt")}
            {...fieldA11y("popup-ends", errors.endsAt?.message, true)}
            className={INPUT}
          />
        </Field>
        <Field
          id="popup-priority"
          label="Độ ưu tiên"
          error={errors.priority?.message}
          hint="0–1000. Nhiều popup cùng chạy thì website chỉ hiện popup ưu tiên cao nhất."
        >
          <input
            type="text"
            inputMode="numeric"
            {...register("priority")}
            {...fieldA11y("popup-priority", errors.priority?.message, true)}
            className={INPUT}
          />
        </Field>
        <label className="flex min-h-11 items-center gap-2 self-center">
          <input type="checkbox" {...register("isActive")} className={CHECKBOX} />
          <span className="font-medium">Bật popup</span>
        </label>
      </div>

      <fieldset className="flex flex-col gap-2">
        <legend className={LABEL}>Tần suất hiển thị với mỗi khách</legend>
        {DISPLAY_FREQUENCIES.map((value) => (
          <label key={value} className="flex min-h-11 items-center gap-2">
            <input type="radio" value={value} {...register("displayFrequency")} className={CHECKBOX} />
            {DISPLAY_FREQUENCY_LABELS[value]}
          </label>
        ))}
        <p className="text-muted text-sm leading-6">Sửa popup thì khách đã xem bản cũ sẽ thấy lại bản mới.</p>
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
