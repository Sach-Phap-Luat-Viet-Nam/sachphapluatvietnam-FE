"use client";

import { useState } from "react";
import { Controller, useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { useQuery } from "@tanstack/react-query";
import { Button } from "@slvn/ui";
import { slugify } from "@slvn/utils";
import { Field, fieldA11y } from "@/components/Field";
import { ErrorStatus } from "@/components/QueryStatus";
import { CHECKBOX, FORM_ERROR, FORM_SUCCESS, INPUT, LABEL, SELECT, TEXTAREA } from "@/components/form-styles";
import { showServerError } from "@/lib/admin-errors";
import { catalogKeys, fetchAuthors, fetchCategories } from "./api";
import { categoryRows } from "./category-tree";
import { toBookBody } from "./forms";
import type { BookBody } from "./forms";
import {
  BOOK_STATUS_LABELS,
  BOOK_STATUSES,
  BOOK_TYPE_LABELS,
  BOOK_TYPES,
  TARGET_AUDIENCE_LABELS,
  TARGET_AUDIENCES,
} from "./labels";
import { ReferencePicker } from "./ReferencePicker";
import { bookFormSchema } from "./schemas";
import type { BookFormValues } from "./schemas";

const BOOK_FIELDS = [
  "title",
  "slug",
  "bookType",
  "status",
  "description",
  "targetAudiences",
  "metaTitle",
  "metaDescription",
  "categoryIds",
  "authors",
] as const;

async function searchAuthors(q: string, limit: number) {
  const page = await fetchAuthors({ q, page: 1, limit });
  return page.items.map((author) => ({ id: author.id, label: author.name }));
}

export interface BookFormProps {
  defaultValues: BookFormValues;
  /** `create`: tự gợi ý slug theo tên sách cho đến khi người dùng sửa slug. */
  mode: "create" | "edit";
  onSave: (body: BookBody) => Promise<void>;
}

/** Form thông tin đầu sách (tạo mới và sửa). */
export function BookForm({ defaultValues, mode, onSave }: BookFormProps) {
  const [slugEdited, setSlugEdited] = useState(mode === "edit");
  const [saved, setSaved] = useState(false);
  const categories = useQuery({ queryKey: catalogKeys.categories, queryFn: fetchCategories });
  const {
    register,
    control,
    handleSubmit,
    setError,
    setValue,
    getValues,
    reset,
    formState: { errors, isSubmitting, isDirty },
  } = useForm<BookFormValues>({ resolver: zodResolver(bookFormSchema), defaultValues });

  const titleField = register("title", {
    onChange: (event: { target: { value: string } }) => {
      setSaved(false);
      if (!slugEdited) {
        setValue("slug", slugify(event.target.value), { shouldValidate: Boolean(errors.slug) });
      }
    },
  });

  const onSubmit = async (values: BookFormValues) => {
    setSaved(false);
    try {
      await onSave(toBookBody(values));
      // Giữ giá trị vừa lưu làm mốc "chưa sửa" mới.
      reset(values);
      setSaved(true);
    } catch (error) {
      showServerError(error, BOOK_FIELDS, setError);
    }
  };

  return (
    <form onSubmit={handleSubmit(onSubmit)} noValidate className="flex flex-col gap-6">
      <div className="grid gap-5 md:grid-cols-2">
        <Field id="book-title" label="Tên sách" error={errors.title?.message} className="md:col-span-2">
          <input type="text" {...titleField} {...fieldA11y("book-title", errors.title?.message)} className={INPUT} />
        </Field>

        <Field
          id="book-slug"
          label="Slug (đường dẫn)"
          error={errors.slug?.message}
          hint={
            mode === "edit"
              ? "Đổi slug sẽ đổi URL /sach/<slug> đang public. Chỉ đổi khi thật cần (cần redirect 301 cho link cũ)."
              : "Tự tạo từ tên sách, sửa được. Dùng trong URL /sach/<slug>."
          }
          className="md:col-span-2"
        >
          <div className="flex gap-2">
            <input
              type="text"
              {...register("slug", { onChange: () => setSlugEdited(true) })}
              {...fieldA11y("book-slug", errors.slug?.message, true)}
              className={INPUT}
            />
            <Button
              variant="outline"
              className="h-12 shrink-0"
              onClick={() => setValue("slug", slugify(getValues("title")), { shouldDirty: true, shouldValidate: true })}
            >
              Tạo từ tên sách
            </Button>
          </div>
        </Field>

        <Field id="book-type" label="Loại sách" error={errors.bookType?.message}>
          <select {...register("bookType")} {...fieldA11y("book-type", errors.bookType?.message)} className={SELECT}>
            {BOOK_TYPES.map((value) => (
              <option key={value} value={value}>
                {BOOK_TYPE_LABELS[value]}
              </option>
            ))}
          </select>
        </Field>

        <Field
          id="book-status"
          label="Trạng thái"
          error={errors.status?.message}
          hint="Chỉ “Đang hiển thị” mới hiện trên website. Không xóa được đầu sách: muốn gỡ thì chọn “Ẩn”."
        >
          <select
            {...register("status")}
            {...fieldA11y("book-status", errors.status?.message, true)}
            className={SELECT}
          >
            {BOOK_STATUSES.map((value) => (
              <option key={value} value={value}>
                {BOOK_STATUS_LABELS[value]}
              </option>
            ))}
          </select>
        </Field>
      </div>

      <fieldset className="flex flex-col gap-3">
        <legend className={LABEL}>
          Đối tượng bạn đọc <span className="text-muted font-normal">(không bắt buộc)</span>
        </legend>
        <div className="flex flex-wrap gap-x-6 gap-y-2">
          {TARGET_AUDIENCES.map((value) => (
            <label key={value} className="flex min-h-11 items-center gap-2">
              <input type="checkbox" value={value} {...register("targetAudiences")} className={CHECKBOX} />
              {TARGET_AUDIENCE_LABELS[value]}
            </label>
          ))}
        </div>
      </fieldset>

      <fieldset className="flex flex-col gap-3">
        <legend className={LABEL}>
          Danh mục <span className="text-muted font-normal">(không bắt buộc)</span>
        </legend>
        {categories.isError ? (
          <ErrorStatus error={categories.error} onRetry={() => void categories.refetch()} />
        ) : categories.isPending ? (
          <p role="status" className="text-muted text-sm">
            Đang tải danh mục…
          </p>
        ) : categories.data.length === 0 ? (
          <p className="text-muted text-sm">Chưa có danh mục. Anh/chị tạo danh mục ở tab “Danh mục”.</p>
        ) : (
          <Controller
            control={control}
            name="categoryIds"
            render={({ field }) => (
              <ul className="border-border grid max-h-72 gap-1 overflow-y-auto rounded-md border p-3 sm:grid-cols-2">
                {categoryRows(categories.data).map((row) => (
                  <li key={row.id}>
                    <label
                      className="flex min-h-10 items-center gap-2"
                      // Thụt lề theo độ sâu trong cây (giá trị động).
                      style={{ paddingLeft: `${row.depth * 1.25}rem` }}
                    >
                      <input
                        type="checkbox"
                        checked={field.value.includes(row.id)}
                        onChange={(event) =>
                          field.onChange(
                            event.target.checked
                              ? [...field.value, row.id]
                              : field.value.filter((id) => id !== row.id),
                          )
                        }
                        className={CHECKBOX}
                      />
                      {row.name}
                    </label>
                  </li>
                ))}
              </ul>
            )}
          />
        )}
      </fieldset>

      <Controller
        control={control}
        name="authors"
        render={({ field }) => (
          <ReferencePicker
            id="book-authors"
            label="Tác giả"
            value={field.value}
            onChange={field.onChange}
            search={searchAuthors}
            queryKey={[...catalogKeys.authorLists, "picker"]}
            placeholder="Gõ tên tác giả để tìm…"
          />
        )}
      />

      <Field
        id="book-description"
        label="Mô tả"
        optional
        error={errors.description?.message}
        hint="Nội dung HTML hiển thị trên trang chi tiết sách."
      >
        <textarea
          rows={8}
          {...register("description")}
          {...fieldA11y("book-description", errors.description?.message, true)}
          className={TEXTAREA}
        />
      </Field>

      <div className="grid gap-5 md:grid-cols-2">
        <Field
          id="book-meta-title"
          label="Tiêu đề SEO"
          optional
          error={errors.metaTitle?.message}
          hint="Để trống thì website dùng tên sách. Tối đa 255 ký tự."
        >
          <input
            type="text"
            {...register("metaTitle")}
            {...fieldA11y("book-meta-title", errors.metaTitle?.message, true)}
            className={INPUT}
          />
        </Field>
        <Field
          id="book-meta-description"
          label="Mô tả SEO"
          optional
          error={errors.metaDescription?.message}
          hint="Đoạn mô tả hiện trên Google. Tối đa 500 ký tự."
        >
          <textarea
            rows={3}
            {...register("metaDescription")}
            {...fieldA11y("book-meta-description", errors.metaDescription?.message, true)}
            className={TEXTAREA}
          />
        </Field>
      </div>

      <div className="flex flex-col gap-3">
        <Button type="submit" size="lg" disabled={isSubmitting} className="w-fit font-semibold">
          {isSubmitting ? "Đang lưu…" : mode === "create" ? "Tạo đầu sách" : "Lưu thông tin sách"}
        </Button>
        {errors.root?.server && (
          <p role="alert" className={FORM_ERROR}>
            {errors.root.server.message}
          </p>
        )}
        {saved && !isDirty && (
          <p role="status" className={FORM_SUCCESS}>
            Đã lưu thông tin sách.
          </p>
        )}
      </div>
    </form>
  );
}
