"use client";

import { useState } from "react";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { keepPreviousData, useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { Pencil, Plus } from "lucide-react";
import { Button } from "@slvn/ui";
import { slugify } from "@slvn/utils";
import { ConfirmButton } from "@/components/ConfirmButton";
import { Field, fieldA11y } from "@/components/Field";
import { FormActions } from "@/components/FormActions";
import { PageHeader } from "@/components/PageHeader";
import { Pagination } from "@/components/Pagination";
import { ErrorStatus, LoadingStatus } from "@/components/QueryStatus";
import { CARD, FORM_ERROR, INPUT, TEXTAREA } from "@/components/form-styles";
import { adminErrorMessage, showServerError } from "@/lib/admin-errors";
import { useDebouncedValue } from "@/lib/use-debounced-value";
import { catalogKeys, createAuthor, deleteAuthor, fetchAuthors, updateAuthor } from "./api";
import { authorToFormValues, EMPTY_AUTHOR_FORM, toAuthorBody } from "./forms";
import { authorFormSchema } from "./schemas";
import type { Author, AuthorFormValues } from "./schemas";

const PAGE_SIZE = 20;
const AUTHOR_FIELDS = ["name", "slug", "biography", "sortOrder"] as const;

/** Tác giả: tìm, thêm, sửa, xóa mềm. */
export function AuthorManager() {
  const queryClient = useQueryClient();
  const [q, setQ] = useState("");
  const [page, setPage] = useState(1);
  const debouncedQ = useDebouncedValue(q.trim());
  const query = { q: debouncedQ, page, limit: PAGE_SIZE };
  const authors = useQuery({
    queryKey: catalogKeys.authors(query),
    queryFn: () => fetchAuthors(query),
    placeholderData: keepPreviousData,
  });
  const [editing, setEditing] = useState<Author | "new" | null>(null);
  const refresh = () => queryClient.invalidateQueries({ queryKey: catalogKeys.authorLists });
  const remove = useMutation({ mutationFn: deleteAuthor, onSuccess: refresh });

  return (
    <div className="flex max-w-5xl flex-col gap-6">
      <PageHeader
        title="Tác giả"
        description="Tác giả / nhóm biên soạn gắn với đầu sách."
        actions={
          editing === null && (
            <Button onClick={() => setEditing("new")}>
              <Plus size={18} aria-hidden="true" /> Thêm tác giả
            </Button>
          )
        }
      />

      {editing !== null && (
        <section aria-labelledby="author-form-title" className={`${CARD} flex flex-col gap-4 p-5`}>
          <h2 id="author-form-title" className="text-lg font-semibold">
            {editing === "new" ? "Thêm tác giả" : `Sửa tác giả “${editing.name}”`}
          </h2>
          <AuthorForm
            key={editing === "new" ? "new" : editing.id}
            author={editing === "new" ? null : editing}
            onCancel={() => setEditing(null)}
            onSaved={async () => {
              setEditing(null);
              await refresh();
            }}
          />
        </section>
      )}

      <div className="flex flex-col gap-2 sm:max-w-md">
        <label htmlFor="author-search" className="font-medium">
          Tìm tác giả
        </label>
        <input
          id="author-search"
          type="search"
          value={q}
          onChange={(event) => {
            setQ(event.target.value);
            setPage(1);
          }}
          className={INPUT}
        />
      </div>

      {remove.isError && (
        <p role="alert" className={FORM_ERROR}>
          {adminErrorMessage(remove.error)}
        </p>
      )}

      {authors.isError ? (
        <ErrorStatus error={authors.error} onRetry={() => void authors.refetch()} />
      ) : authors.isPending ? (
        <LoadingStatus />
      ) : authors.data.items.length === 0 ? (
        <p className={`${CARD} text-muted p-6`}>{debouncedQ ? "Không có tác giả phù hợp." : "Chưa có tác giả nào."}</p>
      ) : (
        <>
          <ul aria-label="Danh sách tác giả" className={`${CARD} divide-border divide-y`}>
            {authors.data.items.map((author) => (
              <li key={author.id} className="flex flex-wrap items-center justify-between gap-3 px-4 py-3">
                <div className="flex min-w-0 flex-col">
                  <span className="font-medium">{author.name}</span>
                  <span className="text-muted text-sm">
                    {author.slug} · thứ tự {author.sortOrder}
                  </span>
                </div>
                <div className="flex flex-wrap gap-2">
                  <Button variant="ghost" size="sm" onClick={() => setEditing(author)} aria-label={`Sửa ${author.name}`}>
                    <Pencil size={16} aria-hidden="true" /> Sửa
                  </Button>
                  <ConfirmButton
                    question={`Xóa tác giả “${author.name}”?`}
                    confirmLabel="Xóa"
                    pending={remove.isPending && remove.variables === author.id}
                    onConfirm={() => remove.mutate(author.id)}
                  >
                    Xóa
                  </ConfirmButton>
                </div>
              </li>
            ))}
          </ul>
          <Pagination
            page={authors.data.meta.page}
            limit={authors.data.meta.limit || PAGE_SIZE}
            total={authors.data.meta.total}
            onPageChange={setPage}
          />
        </>
      )}
    </div>
  );
}

interface AuthorFormProps {
  author: Author | null;
  onCancel: () => void;
  onSaved: () => Promise<void>;
}

function AuthorForm({ author, onCancel, onSaved }: AuthorFormProps) {
  const [slugEdited, setSlugEdited] = useState(author !== null);
  const {
    register,
    handleSubmit,
    setError,
    setValue,
    formState: { errors, isSubmitting },
  } = useForm<AuthorFormValues>({
    resolver: zodResolver(authorFormSchema),
    defaultValues: author ? authorToFormValues(author) : EMPTY_AUTHOR_FORM,
  });

  return (
    <form
      noValidate
      onSubmit={handleSubmit(async (values) => {
        try {
          const body = toAuthorBody(values);
          await (author ? updateAuthor(author.id, body) : createAuthor(body));
          await onSaved();
        } catch (error) {
          showServerError(error, AUTHOR_FIELDS, setError);
        }
      })}
      className="grid gap-4 md:grid-cols-2"
    >
      <Field id="author-name" label="Tên tác giả" error={errors.name?.message}>
        <input
          type="text"
          {...register("name", {
            onChange: (event: { target: { value: string } }) => {
              if (!slugEdited) {
                setValue("slug", slugify(event.target.value));
              }
            },
          })}
          {...fieldA11y("author-name", errors.name?.message)}
          className={INPUT}
        />
      </Field>
      <Field id="author-slug" label="Slug" error={errors.slug?.message}>
        <input
          type="text"
          {...register("slug", { onChange: () => setSlugEdited(true) })}
          {...fieldA11y("author-slug", errors.slug?.message)}
          className={INPUT}
        />
      </Field>
      <Field id="author-order" label="Thứ tự" error={errors.sortOrder?.message} hint="Số nhỏ đứng trước.">
        <input
          type="text"
          inputMode="numeric"
          {...register("sortOrder")}
          {...fieldA11y("author-order", errors.sortOrder?.message, true)}
          className={INPUT}
        />
      </Field>
      <Field id="author-bio" label="Giới thiệu" optional error={errors.biography?.message} className="md:col-span-2">
        <textarea
          rows={4}
          {...register("biography")}
          {...fieldA11y("author-bio", errors.biography?.message)}
          className={TEXTAREA}
        />
      </Field>
      <FormActions
        pending={isSubmitting}
        submitLabel={author ? "Lưu tác giả" : "Thêm tác giả"}
        onCancel={onCancel}
        error={errors.root?.server?.message}
        className="md:col-span-2"
      />
    </form>
  );
}
