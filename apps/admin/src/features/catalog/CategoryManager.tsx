"use client";

import { useState } from "react";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { Pencil, Plus } from "lucide-react";
import { Button } from "@slvn/ui";
import { slugify } from "@slvn/utils";
import { ConfirmButton } from "@/components/ConfirmButton";
import { Field, fieldA11y } from "@/components/Field";
import { FormActions } from "@/components/FormActions";
import { PageHeader } from "@/components/PageHeader";
import { ErrorStatus, LoadingStatus } from "@/components/QueryStatus";
import { CARD, FORM_ERROR, INPUT, SELECT } from "@/components/form-styles";
import { adminErrorMessage, showServerError } from "@/lib/admin-errors";
import { catalogKeys, createCategory, deleteCategory, fetchCategories, updateCategory } from "./api";
import { categoryRows, categoryWithDescendants } from "./category-tree";
import type { CategoryRow } from "./category-tree";
import { categoryToFormValues, EMPTY_CATEGORY_FORM, toCategoryBody } from "./forms";
import { categoryFormSchema } from "./schemas";
import type { Category, CategoryFormValues } from "./schemas";

const CATEGORY_FIELDS = ["name", "slug", "parentId", "sortOrder"] as const;

/** Cây danh mục: thêm, sửa (đổi tên, slug, danh mục cha, thứ tự), xóa mềm. */
export function CategoryManager() {
  const queryClient = useQueryClient();
  const categories = useQuery({ queryKey: catalogKeys.categories, queryFn: fetchCategories });
  const [editing, setEditing] = useState<Category | "new" | null>(null);
  const remove = useMutation({
    mutationFn: deleteCategory,
    onSuccess: () => queryClient.invalidateQueries({ queryKey: catalogKeys.categories }),
  });

  const saved = async () => {
    setEditing(null);
    await queryClient.invalidateQueries({ queryKey: catalogKeys.categories });
  };

  return (
    <div className="flex max-w-5xl flex-col gap-6">
      <PageHeader
        title="Danh mục"
        description="Cây danh mục hiện trên menu website. Thứ tự nhỏ đứng trước; cùng thứ tự thì xếp theo tên."
        actions={
          editing === null && (
            <Button onClick={() => setEditing("new")}>
              <Plus size={18} aria-hidden="true" /> Thêm danh mục
            </Button>
          )
        }
      />

      {categories.isError ? (
        <ErrorStatus error={categories.error} onRetry={() => void categories.refetch()} />
      ) : categories.isPending ? (
        <LoadingStatus />
      ) : (
        <>
          {editing !== null && (
            <section aria-labelledby="category-form-title" className={`${CARD} flex flex-col gap-4 p-5`}>
              <h2 id="category-form-title" className="text-lg font-semibold">
                {editing === "new" ? "Thêm danh mục" : `Sửa danh mục “${editing.name}”`}
              </h2>
              <CategoryForm
                key={editing === "new" ? "new" : editing.id}
                category={editing === "new" ? null : editing}
                categories={categories.data}
                onCancel={() => setEditing(null)}
                onSaved={saved}
              />
            </section>
          )}

          {remove.isError && (
            <p role="alert" className={FORM_ERROR}>
              {adminErrorMessage(remove.error)}
            </p>
          )}

          {categories.data.length === 0 ? (
            <p className={`${CARD} text-muted p-6`}>Chưa có danh mục nào.</p>
          ) : (
            <ul aria-label="Cây danh mục" className={`${CARD} divide-border divide-y`}>
              {categoryRows(categories.data).map((row) => (
                <CategoryItem
                  key={row.id}
                  row={row}
                  deleting={remove.isPending && remove.variables === row.id}
                  onEdit={() => setEditing(row)}
                  onDelete={() => remove.mutate(row.id)}
                />
              ))}
            </ul>
          )}
        </>
      )}
    </div>
  );
}

interface CategoryItemProps {
  row: CategoryRow;
  deleting: boolean;
  onEdit: () => void;
  onDelete: () => void;
}

function CategoryItem({ row, deleting, onEdit, onDelete }: CategoryItemProps) {
  return (
    <li className="flex flex-wrap items-center justify-between gap-3 px-4 py-3">
      {/* Thụt lề theo độ sâu trong cây (giá trị động). */}
      <div className="flex min-w-0 flex-col" style={{ paddingLeft: `${row.depth * 1.5}rem` }}>
        <span className="font-medium">
          {row.depth > 0 && (
            <span aria-hidden="true" className="text-muted">
              └{" "}
            </span>
          )}
          {row.name}
        </span>
        <span className="text-muted text-sm">
          {row.path !== row.name && <span className="sr-only">{row.path} · </span>}
          {row.slug} · thứ tự {row.sortOrder}
        </span>
      </div>
      <div className="flex flex-wrap gap-2">
        <Button variant="ghost" size="sm" onClick={onEdit} aria-label={`Sửa ${row.name}`}>
          <Pencil size={16} aria-hidden="true" /> Sửa
        </Button>
        <ConfirmButton
          question={`Xóa danh mục “${row.name}”?`}
          confirmLabel="Xóa"
          pending={deleting}
          onConfirm={onDelete}
        >
          Xóa
        </ConfirmButton>
      </div>
    </li>
  );
}

interface CategoryFormProps {
  category: Category | null;
  categories: Category[];
  onCancel: () => void;
  onSaved: () => Promise<void>;
}

function CategoryForm({ category, categories, onCancel, onSaved }: CategoryFormProps) {
  const [slugEdited, setSlugEdited] = useState(category !== null);
  const {
    register,
    handleSubmit,
    setError,
    setValue,
    formState: { errors, isSubmitting },
  } = useForm<CategoryFormValues>({
    resolver: zodResolver(categoryFormSchema),
    defaultValues: category ? categoryToFormValues(category) : EMPTY_CATEGORY_FORM,
  });
  // Không cho chọn chính nó hoặc con cháu làm cha (CATEGORY_PARENT_INVALID).
  const blocked = category ? categoryWithDescendants(categories, category.id) : new Set<number>();
  const parentOptions = categoryRows(categories).filter((row) => !blocked.has(row.id));

  return (
    <form
      noValidate
      onSubmit={handleSubmit(async (values) => {
        try {
          const body = toCategoryBody(values);
          await (category ? updateCategory(category.id, body) : createCategory(body));
          await onSaved();
        } catch (error) {
          showServerError(error, CATEGORY_FIELDS, setError);
        }
      })}
      className="grid gap-4 md:grid-cols-2"
    >
      <Field id="category-name" label="Tên danh mục" error={errors.name?.message}>
        <input
          type="text"
          {...register("name", {
            onChange: (event: { target: { value: string } }) => {
              if (!slugEdited) {
                setValue("slug", slugify(event.target.value));
              }
            },
          })}
          {...fieldA11y("category-name", errors.name?.message)}
          className={INPUT}
        />
      </Field>
      <Field
        id="category-slug"
        label="Slug"
        error={errors.slug?.message}
        hint="Dùng trong URL /danh-muc/<slug>. Đổi slug sẽ đổi URL đang public."
      >
        <input
          type="text"
          {...register("slug", { onChange: () => setSlugEdited(true) })}
          {...fieldA11y("category-slug", errors.slug?.message, true)}
          className={INPUT}
        />
      </Field>
      <Field id="category-parent" label="Danh mục cha" error={errors.parentId?.message}>
        <select {...register("parentId")} {...fieldA11y("category-parent", errors.parentId?.message)} className={SELECT}>
          <option value="">— Danh mục gốc —</option>
          {parentOptions.map((row) => (
            <option key={row.id} value={String(row.id)}>
              {row.path}
            </option>
          ))}
        </select>
      </Field>
      <Field id="category-order" label="Thứ tự" error={errors.sortOrder?.message} hint="Số nhỏ đứng trước.">
        <input
          type="text"
          inputMode="numeric"
          {...register("sortOrder")}
          {...fieldA11y("category-order", errors.sortOrder?.message, true)}
          className={INPUT}
        />
      </Field>
      <FormActions
        pending={isSubmitting}
        submitLabel={category ? "Lưu danh mục" : "Thêm danh mục"}
        onCancel={onCancel}
        error={errors.root?.server?.message}
        className="md:col-span-2"
      />
    </form>
  );
}
