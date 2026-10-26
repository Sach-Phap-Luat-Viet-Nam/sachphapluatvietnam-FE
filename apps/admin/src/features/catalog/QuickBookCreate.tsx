"use client";

import { useEffect, useId, useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { Controller, useFieldArray, useForm, useWatch } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { ArrowLeft, Plus, Trash2 } from "lucide-react";
import { Button } from "@slvn/ui";
import { slugify } from "@slvn/utils";
import { Field, fieldA11y } from "@/components/Field";
import { FormActions } from "@/components/FormActions";
import { ImageField } from "@/components/ImageField";
import { PageHeader } from "@/components/PageHeader";
import { ErrorStatus } from "@/components/QueryStatus";
import { CARD, CHECKBOX, FIELD_ERROR, INPUT, LABEL, SELECT } from "@/components/form-styles";
import { adminErrorMessage, showServerError } from "@/lib/admin-errors";
import { catalogKeys, createAuthor, createCategory, fetchAuthors, fetchCategories, quickCreateBook } from "./api";
import { categoryRows } from "./category-tree";
import { emptyQuickBookForm, toQuickBookBody } from "./forms";
import { BOOK_TYPE_LABELS, BOOK_TYPES, COVER_TYPE_LABELS, COVER_TYPES } from "./labels";
import { ReferencePicker } from "./ReferencePicker";
import { quickBookFormSchema } from "./schemas";
import type { QuickBookFormValues } from "./schemas";
import { useSaveBook } from "./use-save-book";

const PUBLISHER_KEY = "slvn.admin.last-publisher";

/** Nhà xuất bản dùng lần trước, để điền sẵn vì cùng một đợt sách thường cùng nhà xuất bản. */
function readLastPublisher(): string {
  try {
    return localStorage.getItem(PUBLISHER_KEY) ?? "";
  } catch {
    return "";
  }
}

function rememberPublisher(publisher: string) {
  try {
    localStorage.setItem(PUBLISHER_KEY, publisher);
  } catch {
    // Trình duyệt chặn lưu trữ (chế độ riêng tư): bỏ qua, chỉ mất tiện ích điền sẵn.
  }
}

async function searchAuthors(q: string, limit: number) {
  const page = await fetchAuthors({ q, page: 1, limit });
  return page.items.map((author) => ({ id: author.id, label: author.name }));
}

async function createAuthorByName(name: string) {
  const author = await createAuthor({ name, slug: slugify(name), biography: null, sortOrder: 0 });
  return { id: author.id, label: author.name };
}

const QUICK_FIELDS = [
  "title",
  "slug",
  "bookType",
  "categoryIds",
  "authors",
  "isbn",
  "publisher",
  "publishingDecisionNo",
  "editionName",
  "publishYear",
  "pages",
  "weightGram",
  "coverImageUrl",
] as const;

/**
 * Tạo nhanh một cuốn sách trong một màn: thông tin sách + ấn bản đầu tiên + SKU (thường chỉ một). Lưu bằng một request
 * (`POST /admin/books/quick`, một transaction) rồi mở màn chi tiết để bổ sung mô tả, mục lục, SEO.
 */
export function QuickBookCreate() {
  const router = useRouter();
  const saveBook = useSaveBook();
  const prefix = useId();
  const id = (name: string) => `${prefix}-${name}`;
  const [slugEdited, setSlugEdited] = useState(false);
  const {
    register,
    control,
    handleSubmit,
    setError,
    setValue,
    getValues,
    formState: { errors, isSubmitting },
  } = useForm<QuickBookFormValues>({
    resolver: zodResolver(quickBookFormSchema),
    defaultValues: emptyQuickBookForm(new Date().getFullYear()),
  });
  const { fields, append, remove } = useFieldArray({ control, name: "skus" });

  // Điền sẵn nhà xuất bản lần trước sau khi trang chạy ở trình duyệt (localStorage không có lúc render ở server).
  useEffect(() => {
    if (!getValues("publisher")) setValue("publisher", readLastPublisher());
  }, [getValues, setValue]);

  const titleField = register("title", {
    onChange: (event: { target: { value: string } }) => {
      if (!slugEdited) setValue("slug", slugify(event.target.value), { shouldValidate: Boolean(errors.slug) });
    },
  });
  const title = useWatch({ control, name: "title" });
  const usedCovers = useWatch({ control, name: "skus" }).map((sku) => sku.coverType);
  const nextCover = COVER_TYPES.find((cover) => !usedCovers.includes(cover));

  const onSubmit = async (values: QuickBookFormValues) => {
    try {
      const book = await quickCreateBook(toQuickBookBody(values));
      rememberPublisher(values.publisher.trim());
      saveBook(book);
      router.push(`/sach/${book.id}`);
    } catch (error) {
      showServerError(error, QUICK_FIELDS, setError);
    }
  };

  const text = (
    name: (typeof QUICK_FIELDS)[number],
    label: string,
    options: { optional?: boolean; hint?: string } = {},
  ) => (
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
    <div className="flex max-w-4xl flex-col gap-6">
      <Link href="/sach" className="text-muted hover:text-foreground flex min-h-11 w-fit items-center gap-2">
        <ArrowLeft size={16} aria-hidden="true" /> Danh sách đầu sách
      </Link>
      <PageHeader
        title="Tạo nhanh sách"
        description="Nhập sách, ấn bản và SKU trong một màn. Lưu xong có thể bổ sung mô tả, mục lục, SEO ở màn chi tiết."
      />

      <form onSubmit={handleSubmit(onSubmit)} noValidate className="flex flex-col gap-6">
        <section aria-labelledby={id("book")} className={`${CARD} flex flex-col gap-5 p-5 sm:p-6`}>
          <h2 id={id("book")} className="text-xl font-semibold">
            1. Sách
          </h2>
          <div className="grid gap-5 md:grid-cols-2">
            <Field id={id("title")} label="Tên sách" error={errors.title?.message} className="md:col-span-2">
              <input
                type="text"
                {...titleField}
                {...fieldA11y(id("title"), errors.title?.message)}
                // Mở màn là gõ tên sách ngay.
                autoFocus
                className={INPUT}
              />
            </Field>
            <Field
              id={id("slug")}
              label="Slug (đường dẫn)"
              error={errors.slug?.message}
              hint="Tự tạo từ tên sách, sửa được. Dùng trong URL /sach/<slug>."
            >
              <input
                type="text"
                {...register("slug", { onChange: () => setSlugEdited(true) })}
                {...fieldA11y(id("slug"), errors.slug?.message, true)}
                className={INPUT}
              />
            </Field>
            <Field id={id("bookType")} label="Loại sách" error={errors.bookType?.message}>
              <select
                {...register("bookType")}
                {...fieldA11y(id("bookType"), errors.bookType?.message)}
                className={SELECT}
              >
                {BOOK_TYPES.map((value) => (
                  <option key={value} value={value}>
                    {BOOK_TYPE_LABELS[value]}
                  </option>
                ))}
              </select>
            </Field>
          </div>

          <Controller
            control={control}
            name="authors"
            render={({ field }) => (
              <ReferencePicker
                id={id("authors")}
                label="Tác giả"
                value={field.value}
                onChange={field.onChange}
                search={searchAuthors}
                queryKey={[...catalogKeys.authorLists, "picker"]}
                placeholder="Gõ tên tác giả để tìm hoặc tạo mới…"
                onCreate={createAuthorByName}
              />
            )}
          />

          <CategoryChoice control={control} />
        </section>

        <section aria-labelledby={id("edition")} className={`${CARD} flex flex-col gap-5 p-5 sm:p-6`}>
          <h2 id={id("edition")} className="text-xl font-semibold">
            2. Ấn bản
          </h2>
          <div className="grid gap-5 md:grid-cols-2">
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
            {text("publisher", "Nhà xuất bản", { hint: "Nhớ lần nhập trước." })}
            {text("editionName", "Tên ấn bản", { optional: true, hint: "Ví dụ: Tái bản lần 3 – 2026." })}
            {text("publishYear", "Năm xuất bản", { optional: true })}
            {text("pages", "Số trang", { optional: true })}
            {text("weightGram", "Khối lượng (gam)", { optional: true })}
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
                alt={`Bìa sách ${title}`}
                value={field.value}
                onChange={field.onChange}
                error={errors.coverImageUrl?.message}
              />
            )}
          />
        </section>

        <section aria-labelledby={id("skus")} className={`${CARD} flex flex-col gap-5 p-5 sm:p-6`}>
          <h2 id={id("skus")} className="text-xl font-semibold">
            3. SKU và giá
          </h2>
          <ul className="flex flex-col gap-5">
            {fields.map((field, index) => {
              const skuErrors = errors.skus?.[index];
              return (
                <li key={field.id} className="border-border grid gap-5 rounded-md border p-4 md:grid-cols-4">
                  <Field id={id(`sku-${index}-code`)} label="Mã SKU" error={skuErrors?.skuCode?.message}>
                    <input
                      type="text"
                      {...register(`skus.${index}.skuCode`)}
                      {...fieldA11y(id(`sku-${index}-code`), skuErrors?.skuCode?.message)}
                      className={`${INPUT} uppercase`}
                    />
                  </Field>
                  <Field id={id(`sku-${index}-cover`)} label="Loại bìa" error={skuErrors?.coverType?.message}>
                    <select
                      {...register(`skus.${index}.coverType`)}
                      {...fieldA11y(id(`sku-${index}-cover`), skuErrors?.coverType?.message)}
                      className={SELECT}
                    >
                      {COVER_TYPES.map((value) => (
                        <option key={value} value={value}>
                          {COVER_TYPE_LABELS[value]}
                        </option>
                      ))}
                    </select>
                  </Field>
                  <Field id={id(`sku-${index}-list`)} label="Giá bìa (VNĐ)" error={skuErrors?.listPrice?.message}>
                    <input
                      type="text"
                      inputMode="numeric"
                      {...register(`skus.${index}.listPrice`, {
                        // Giá bán thường bằng giá bìa: điền sẵn khi chưa nhập giá bán, sửa được.
                        onBlur: () => {
                          if (!getValues(`skus.${index}.salePrice`)) {
                            setValue(`skus.${index}.salePrice`, getValues(`skus.${index}.listPrice`));
                          }
                        },
                      })}
                      {...fieldA11y(id(`sku-${index}-list`), skuErrors?.listPrice?.message)}
                      className={`${INPUT} tabular-nums`}
                    />
                  </Field>
                  <Field id={id(`sku-${index}-sale`)} label="Giá bán (VNĐ)" error={skuErrors?.salePrice?.message}>
                    <input
                      type="text"
                      inputMode="numeric"
                      {...register(`skus.${index}.salePrice`)}
                      {...fieldA11y(id(`sku-${index}-sale`), skuErrors?.salePrice?.message)}
                      className={`${INPUT} tabular-nums`}
                    />
                  </Field>
                  {fields.length > 1 && (
                    <div className="md:col-span-4">
                      <Button
                        variant="ghost"
                        size="sm"
                        onClick={() => remove(index)}
                        aria-label={`Xóa SKU ${index + 1}`}
                      >
                        <Trash2 size={16} aria-hidden="true" /> Xóa SKU
                      </Button>
                    </div>
                  )}
                </li>
              );
            })}
          </ul>
          {errors.skus?.root?.message && (
            <p role="alert" className={FIELD_ERROR}>
              {errors.skus.root.message}
            </p>
          )}
          {nextCover && (
            <Button
              variant="outline"
              className="w-fit"
              onClick={() =>
                append({ skuCode: "", coverType: nextCover, listPrice: "", salePrice: "", allowPreorder: false })
              }
            >
              <Plus size={18} aria-hidden="true" /> Thêm SKU {COVER_TYPE_LABELS[nextCover].toLowerCase()}
            </Button>
          )}
        </section>

        <label className="flex min-h-11 items-center gap-2">
          <input type="checkbox" {...register("publishNow")} className={CHECKBOX} />
          Hiển thị và mở bán ngay (bỏ chọn thì lưu ở trạng thái Nháp)
        </label>

        <FormActions
          pending={isSubmitting}
          submitLabel="Tạo sách"
          onCancel={() => router.push("/sach")}
          error={errors.root?.server?.message}
        />
      </form>
    </div>
  );
}

/** Chọn danh mục bằng hộp kiểm theo cây, kèm tạo nhanh danh mục gốc ngay tại chỗ. */
function CategoryChoice({ control }: { control: ReturnType<typeof useForm<QuickBookFormValues>>["control"] }) {
  const queryClient = useQueryClient();
  const categories = useQuery({ queryKey: catalogKeys.categories, queryFn: fetchCategories });
  const [name, setName] = useState("");
  const [creating, setCreating] = useState(false);
  const [error, setError] = useState<string | null>(null);

  return (
    <fieldset className="flex flex-col gap-3">
      <legend className={LABEL}>
        Danh mục <span className="text-muted font-normal">(không bắt buộc)</span>
      </legend>
      <Controller
        control={control}
        name="categoryIds"
        render={({ field }) => (
          <>
            {categories.isError ? (
              <ErrorStatus error={categories.error} onRetry={() => void categories.refetch()} />
            ) : categories.isPending ? (
              <p role="status" className="text-muted text-sm">
                Đang tải danh mục…
              </p>
            ) : categories.data.length === 0 ? (
              <p className="text-muted text-sm">Chưa có danh mục, thêm ngay bên dưới.</p>
            ) : (
              <ul className="border-border grid max-h-60 gap-1 overflow-y-auto rounded-md border p-3 sm:grid-cols-2">
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
                              : field.value.filter((item) => item !== row.id),
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
            <div className="flex flex-col gap-2 sm:flex-row">
              <label htmlFor="quick-new-category" className="sr-only">
                Tên danh mục mới
              </label>
              <input
                id="quick-new-category"
                type="text"
                value={name}
                onChange={(event) => setName(event.target.value)}
                placeholder="Tên danh mục mới (tạo ở cấp gốc)"
                className={INPUT}
              />
              <Button
                variant="outline"
                className="h-12 shrink-0"
                disabled={creating || name.trim() === ""}
                onClick={async () => {
                  setCreating(true);
                  setError(null);
                  try {
                    const created = await createCategory({
                      name: name.trim(),
                      slug: slugify(name),
                      parentId: null,
                      sortOrder: 0,
                    });
                    await queryClient.invalidateQueries({ queryKey: catalogKeys.categories });
                    field.onChange([...field.value, created.id]);
                    setName("");
                  } catch (failure) {
                    setError(adminErrorMessage(failure));
                  } finally {
                    setCreating(false);
                  }
                }}
              >
                <Plus size={16} aria-hidden="true" /> {creating ? "Đang tạo…" : "Thêm danh mục"}
              </Button>
            </div>
            {error && (
              <p role="alert" className={FIELD_ERROR}>
                {error}
              </p>
            )}
          </>
        )}
      />
    </fieldset>
  );
}
