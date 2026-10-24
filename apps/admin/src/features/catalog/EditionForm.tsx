"use client";

import { useId } from "react";
import { Controller, useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { Field, fieldA11y } from "@/components/Field";
import { FormActions } from "@/components/FormActions";
import { ImageField } from "@/components/ImageField";
import { INPUT, SELECT, TEXTAREA } from "@/components/form-styles";
import { showServerError } from "@/lib/admin-errors";
import { catalogKeys, fetchLegalDocuments } from "./api";
import { legalDocumentLabel, toEditionBody } from "./forms";
import type { EditionBody } from "./forms";
import { EDITION_STATUS_LABELS, EDITION_STATUSES } from "./labels";
import { ReferencePicker } from "./ReferencePicker";
import { editionFormSchema } from "./schemas";
import type { EditionFormValues } from "./schemas";

const EDITION_FIELDS = [
  "isbn",
  "publisher",
  "publishingDecisionNo",
  "status",
  "registrationNo",
  "editionName",
  "publishYear",
  "updatedToText",
  "updatedToDate",
  "pages",
  "size",
  "weightGram",
  "coverImageUrl",
  "previewFileUrl",
  "tableOfContents",
  "releaseDate",
] as const;

async function searchLegalDocuments(q: string, limit: number) {
  const page = await fetchLegalDocuments({ q, page: 1, limit });
  return page.items.map((document) => ({ id: document.id, label: legalDocumentLabel(document) }));
}

export interface EditionFormProps {
  defaultValues: EditionFormValues;
  submitLabel: string;
  /** Tên sách, dùng làm mô tả ảnh bìa. */
  bookTitle: string;
  onSave: (body: EditionBody) => Promise<void>;
  onCancel: () => void;
}

/** Form ấn bản: thông tin xuất bản (BR-04: bắt buộc ISBN và số QĐXB), "Cập nhật đến", ảnh bìa, văn bản pháp luật. */
export function EditionForm({ defaultValues, submitLabel, bookTitle, onSave, onCancel }: EditionFormProps) {
  const prefix = useId();
  const id = (name: string) => `${prefix}-${name}`;
  const {
    register,
    control,
    handleSubmit,
    setError,
    formState: { errors, isSubmitting },
  } = useForm<EditionFormValues>({ resolver: zodResolver(editionFormSchema), defaultValues });

  const onSubmit = async (values: EditionFormValues) => {
    try {
      await onSave(toEditionBody(values));
    } catch (error) {
      showServerError(error, EDITION_FIELDS, setError);
    }
  };

  const text = (name: (typeof EDITION_FIELDS)[number], label: string, options: { optional?: boolean; hint?: string } = {}) => (
    <Field id={id(name)} label={label} optional={options.optional} hint={options.hint} error={errors[name]?.message}>
      <input
        type="text"
        {...register(name)}
        {...fieldA11y(id(name), errors[name]?.message, Boolean(options.hint))}
        className={INPUT}
      />
    </Field>
  );

  return (
    <form onSubmit={handleSubmit(onSubmit)} noValidate className="flex flex-col gap-6">
      <div className="grid gap-5 md:grid-cols-2">
        {text("editionName", "Tên ấn bản", { optional: true, hint: "Ví dụ: Tái bản lần 3 – 2026." })}
        <Field
          id={id("status")}
          label="Trạng thái bán"
          error={errors.status?.message}
          hint="Chỉ “Đang bán” và “Thanh lý” mới mua được trên website."
        >
          <select {...register("status")} {...fieldA11y(id("status"), errors.status?.message, true)} className={SELECT}>
            {EDITION_STATUSES.map((value) => (
              <option key={value} value={value}>
                {EDITION_STATUS_LABELS[value]}
              </option>
            ))}
          </select>
        </Field>
        <Field
          id={id("isbn")}
          label="ISBN-13"
          error={errors.isbn?.message}
          hint="13 số, bắt đầu 978 hoặc 979; được nhập kèm dấu gạch."
        >
          <input
            type="text"
            inputMode="numeric"
            {...register("isbn")}
            {...fieldA11y(id("isbn"), errors.isbn?.message, true)}
            className={INPUT}
          />
        </Field>
        {text("publishingDecisionNo", "Số quyết định xuất bản (QĐXB)")}
        {text("publisher", "Nhà xuất bản")}
        {text("registrationNo", "Số đăng ký xuất bản", { optional: true })}
        {text("publishYear", "Năm xuất bản", { optional: true })}
        <Field
          id={id("releaseDate")}
          label="Ngày phát hành"
          optional
          error={errors.releaseDate?.message}
          hint="Nên nhập: website sắp xếp “Mới nhất” theo ngày này."
        >
          <input
            type="date"
            {...register("releaseDate")}
            {...fieldA11y(id("releaseDate"), errors.releaseDate?.message, true)}
            className={INPUT}
          />
        </Field>
        {text("updatedToText", "Nhãn “Cập nhật đến”", {
          optional: true,
          hint: "Ví dụ: Cập nhật đến Bộ luật Dân sự 91/2015/QH13.",
        })}
        <Field id={id("updatedToDate")} label="Cập nhật đến ngày" optional error={errors.updatedToDate?.message}>
          <input
            type="date"
            {...register("updatedToDate")}
            {...fieldA11y(id("updatedToDate"), errors.updatedToDate?.message)}
            className={INPUT}
          />
        </Field>
        {text("pages", "Số trang", { optional: true })}
        {text("size", "Khổ sách", { optional: true, hint: "Ví dụ: 16x24 cm." })}
        {text("weightGram", "Khối lượng (gam)", { optional: true })}
        {text("previewFileUrl", "Link file đọc thử", { optional: true })}
      </div>

      <Controller
        control={control}
        name="coverImageUrl"
        render={({ field }) => (
          <ImageField
            id={id("cover")}
            label="Ảnh bìa"
            optional
            target="cover"
            alt={`Bìa sách ${bookTitle}`}
            value={field.value}
            onChange={field.onChange}
            error={errors.coverImageUrl?.message}
          />
        )}
      />

      <Field id={id("tableOfContents")} label="Mục lục" optional error={errors.tableOfContents?.message}>
        <textarea
          rows={6}
          {...register("tableOfContents")}
          {...fieldA11y(id("tableOfContents"), errors.tableOfContents?.message)}
          className={TEXTAREA}
        />
      </Field>

      <Controller
        control={control}
        name="legalDocuments"
        render={({ field }) => (
          <ReferencePicker
            id={id("legal-documents")}
            label="Văn bản pháp luật được cập nhật"
            value={field.value}
            onChange={field.onChange}
            search={searchLegalDocuments}
            queryKey={[...catalogKeys.legalDocumentLists, "picker"]}
            placeholder="Gõ số hiệu (91/2015/QH13) hoặc tên văn bản…"
          />
        )}
      />

      <FormActions
        pending={isSubmitting}
        submitLabel={submitLabel}
        onCancel={onCancel}
        error={errors.root?.server?.message}
      />
    </form>
  );
}
