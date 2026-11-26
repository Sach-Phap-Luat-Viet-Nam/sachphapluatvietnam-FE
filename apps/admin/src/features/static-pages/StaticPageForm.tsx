"use client";

import { useState } from "react";
import { Controller, useForm, useWatch } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { Field, fieldA11y } from "@/components/Field";
import { FormActions } from "@/components/FormActions";
import { CHECKBOX, HINT, INPUT, TEXTAREA } from "@/components/form-styles";
import { showServerError } from "@/lib/admin-errors";
import { RichTextEditor } from "./RichTextEditor";
import { STOREFRONT_PAGE_SLUGS, suggestSlug, toStaticPageBody } from "./static-page-form";
import type { StaticPageBody } from "./static-page-form";
import { SLUG_MAX, staticPageFormSchema } from "./schemas";
import type { StaticPageFormValues } from "./schemas";

const FIELDS = ["title", "slug", "description", "contentHtml", "isPublished"] as const;

export interface StaticPageFormProps {
  defaultValues: StaticPageFormValues;
  submitLabel: string;
  /** Tạo mới: slug tự gợi ý theo tiêu đề cho tới khi người dùng tự sửa ô slug. */
  isNew?: boolean;
  onSave: (body: StaticPageBody) => Promise<void>;
  onCancel: () => void;
}

/** Form trang tĩnh: tiêu đề, đường dẫn, tóm tắt, nội dung WYSIWYG, xuất bản. */
export function StaticPageForm({ defaultValues, submitLabel, isNew = false, onSave, onCancel }: StaticPageFormProps) {
  const {
    register,
    control,
    handleSubmit,
    setError,
    setValue,
    formState: { errors, isSubmitting },
  } = useForm<StaticPageFormValues>({ resolver: zodResolver(staticPageFormSchema), defaultValues });
  const [slugTouched, setSlugTouched] = useState(!isNew);
  const slug = useWatch({ control, name: "slug" }).trim();
  const slugChanged = !isNew && slug !== defaultValues.slug;
  const routed = STOREFRONT_PAGE_SLUGS.includes(slug);

  const titleField = register("title", {
    onChange: (event: { target: { value: string } }) => {
      if (!slugTouched) {
        setValue("slug", suggestSlug(event.target.value, SLUG_MAX), { shouldDirty: true });
      }
    },
  });
  const slugField = register("slug", { onChange: () => setSlugTouched(true) });

  return (
    <form
      noValidate
      onSubmit={handleSubmit(async (values) => {
        try {
          await onSave(toStaticPageBody(values));
        } catch (error) {
          showServerError(error, FIELDS, setError);
        }
      })}
      className="flex flex-col gap-6"
    >
      <Field id="page-title" label="Tiêu đề" error={errors.title?.message} hint="Hiện ở đầu trang và tab trình duyệt.">
        <input
          type="text"
          {...titleField}
          {...fieldA11y("page-title", errors.title?.message, true)}
          className={INPUT}
        />
      </Field>

      <Field
        id="page-slug"
        label="Đường dẫn"
        error={errors.slug?.message}
        hint={`Địa chỉ trên website: /${slug || "duong-dan"}. Chữ thường không dấu, số và dấu gạch nối.`}
      >
        <input
          type="text"
          autoCapitalize="off"
          spellCheck={false}
          {...slugField}
          {...fieldA11y("page-slug", errors.slug?.message, true)}
          className={INPUT}
        />
      </Field>
      {slug !== "" && !routed && !errors.slug && (
        <p role="status" className="border-warning/40 bg-warning-surface text-warning rounded-md border px-4 py-3 text-sm">
          Website hiện chỉ có trang cho “dieu-khoan-su-dung” và “chinh-sach-bao-mat”. Trang này lưu được nhưng khách chưa
          xem được cho tới khi bổ sung đường dẫn bên Storefront.
        </p>
      )}
      {slugChanged && (
        <p role="status" className="border-warning/40 bg-warning-surface text-warning rounded-md border px-4 py-3 text-sm">
          Đổi đường dẫn làm link cũ (/{defaultValues.slug}) không mở được nữa, kể cả link trong form đăng ký và chân trang.
        </p>
      )}

      <Field
        id="page-description"
        label="Tóm tắt"
        optional
        error={errors.description?.message}
        hint="Một hai câu dưới tiêu đề, cũng là mô tả khi chia sẻ link. Tối đa 500 ký tự."
      >
        <textarea
          rows={3}
          {...register("description")}
          {...fieldA11y("page-description", errors.description?.message, true)}
          className={TEXTAREA}
        />
      </Field>

      <div className="flex flex-col gap-2">
        <span className="text-foreground text-base font-medium">
          Nội dung
        </span>
        <Controller
          control={control}
          name="contentHtml"
          render={({ field }) => (
            <RichTextEditor
              id="page-content"
              label="Nội dung"
              value={field.value}
              onChange={field.onChange}
              onBlur={field.onBlur}
              invalid={Boolean(errors.contentHtml)}
              describedBy={["page-content-hint", errors.contentHtml ? "page-content-error" : ""]
                .filter(Boolean)
                .join(" ")}
            />
          )}
        />
        <p id="page-content-hint" className={HINT}>
          Mỗi “Tiêu đề mục” thành một mục trong mục lục, website tự đánh số. Khối ghi chú đặt trước mục đầu tiên hiện
          như thông báo đầu trang (ví dụ “Bản dự thảo”).
        </p>
        {errors.contentHtml && (
          <p id="page-content-error" role="alert" className="text-danger text-sm">
            {errors.contentHtml.message}
          </p>
        )}
      </div>

      <label className="flex min-h-11 items-center gap-2">
        <input type="checkbox" {...register("isPublished")} className={CHECKBOX} />
        <span className="font-medium">Xuất bản trên website</span>
        <span className="text-muted text-sm">(bỏ chọn: khách mở link sẽ thấy trang không tồn tại)</span>
      </label>

      <FormActions
        pending={isSubmitting}
        submitLabel={submitLabel}
        onCancel={onCancel}
        error={errors.root?.server?.message}
      />
    </form>
  );
}
