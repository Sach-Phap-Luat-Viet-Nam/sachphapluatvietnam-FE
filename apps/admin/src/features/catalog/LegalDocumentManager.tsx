"use client";

import { useState } from "react";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { keepPreviousData, useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { Pencil, Plus } from "lucide-react";
import { Button } from "@slvn/ui";
import { formatDate } from "@slvn/utils";
import { ConfirmButton } from "@/components/ConfirmButton";
import { Field, fieldA11y } from "@/components/Field";
import { FormActions } from "@/components/FormActions";
import { PageHeader } from "@/components/PageHeader";
import { Pagination } from "@/components/Pagination";
import { ErrorStatus, LoadingStatus } from "@/components/QueryStatus";
import { CARD, FORM_ERROR, INPUT, SELECT } from "@/components/form-styles";
import { adminErrorMessage, showServerError } from "@/lib/admin-errors";
import { useDebouncedValue } from "@/lib/use-debounced-value";
import { catalogKeys, createLegalDocument, deleteLegalDocument, fetchLegalDocuments, updateLegalDocument } from "./api";
import { EMPTY_LEGAL_DOCUMENT_FORM, legalDocumentToFormValues, toLegalDocumentBody } from "./forms";
import { enumLabel, LEGAL_DOCUMENT_TYPE_LABELS, LEGAL_DOCUMENT_TYPES } from "./labels";
import { legalDocumentFormSchema } from "./schemas";
import type { LegalDocument, LegalDocumentFormValues } from "./schemas";

const PAGE_SIZE = 20;
const LEGAL_DOCUMENT_FIELDS = ["docNumber", "docType", "title", "issuedDate", "effectiveDate"] as const;

/** Văn bản pháp luật mà ấn bản cập nhật: tìm theo số hiệu/trích yếu, thêm, sửa, xóa mềm. */
export function LegalDocumentManager() {
  const queryClient = useQueryClient();
  const [q, setQ] = useState("");
  const [page, setPage] = useState(1);
  const debouncedQ = useDebouncedValue(q.trim());
  const query = { q: debouncedQ, page, limit: PAGE_SIZE };
  const documents = useQuery({
    queryKey: catalogKeys.legalDocuments(query),
    queryFn: () => fetchLegalDocuments(query),
    placeholderData: keepPreviousData,
  });
  const [editing, setEditing] = useState<LegalDocument | "new" | null>(null);
  const refresh = () => queryClient.invalidateQueries({ queryKey: catalogKeys.legalDocumentLists });
  const remove = useMutation({ mutationFn: deleteLegalDocument, onSuccess: refresh });

  return (
    <div className="flex max-w-5xl flex-col gap-6">
      <PageHeader
        title="Văn bản pháp luật"
        description="Văn bản gắn với ấn bản sách; khách lọc sách theo số hiệu văn bản trên website."
        actions={
          editing === null && (
            <Button onClick={() => setEditing("new")}>
              <Plus size={18} aria-hidden="true" /> Thêm văn bản
            </Button>
          )
        }
      />

      {editing !== null && (
        <section aria-labelledby="legal-form-title" className={`${CARD} flex flex-col gap-4 p-5`}>
          <h2 id="legal-form-title" className="text-lg font-semibold">
            {editing === "new" ? "Thêm văn bản" : `Sửa văn bản ${editing.docNumber}`}
          </h2>
          <LegalDocumentForm
            key={editing === "new" ? "new" : editing.id}
            document={editing === "new" ? null : editing}
            onCancel={() => setEditing(null)}
            onSaved={async () => {
              setEditing(null);
              await refresh();
            }}
          />
        </section>
      )}

      <div className="flex flex-col gap-2 sm:max-w-md">
        <label htmlFor="legal-search" className="font-medium">
          Tìm theo số hiệu hoặc trích yếu
        </label>
        <input
          id="legal-search"
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

      {documents.isError ? (
        <ErrorStatus error={documents.error} onRetry={() => void documents.refetch()} />
      ) : documents.isPending ? (
        <LoadingStatus />
      ) : documents.data.items.length === 0 ? (
        <p className={`${CARD} text-muted p-6`}>{debouncedQ ? "Không có văn bản phù hợp." : "Chưa có văn bản nào."}</p>
      ) : (
        <>
          <ul aria-label="Danh sách văn bản pháp luật" className={`${CARD} divide-border divide-y`}>
            {documents.data.items.map((document) => (
              <li key={document.id} className="flex flex-wrap items-center justify-between gap-3 px-4 py-3">
                <div className="flex min-w-0 flex-col">
                  <span className="font-medium">
                    {document.docNumber} – {document.title}
                  </span>
                  <span className="text-muted text-sm">
                    {enumLabel(LEGAL_DOCUMENT_TYPE_LABELS, document.docType)}
                    {document.issuedDate && ` · ban hành ${formatDate(document.issuedDate)}`}
                    {document.effectiveDate && ` · hiệu lực ${formatDate(document.effectiveDate)}`}
                  </span>
                </div>
                <div className="flex flex-wrap gap-2">
                  <Button
                    variant="ghost"
                    size="sm"
                    onClick={() => setEditing(document)}
                    aria-label={`Sửa ${document.docNumber}`}
                  >
                    <Pencil size={16} aria-hidden="true" /> Sửa
                  </Button>
                  <ConfirmButton
                    question={`Xóa văn bản ${document.docNumber}?`}
                    confirmLabel="Xóa"
                    pending={remove.isPending && remove.variables === document.id}
                    onConfirm={() => remove.mutate(document.id)}
                  >
                    Xóa
                  </ConfirmButton>
                </div>
              </li>
            ))}
          </ul>
          <Pagination
            page={documents.data.meta.page}
            limit={documents.data.meta.limit || PAGE_SIZE}
            total={documents.data.meta.total}
            onPageChange={setPage}
          />
        </>
      )}
    </div>
  );
}

interface LegalDocumentFormProps {
  document: LegalDocument | null;
  onCancel: () => void;
  onSaved: () => Promise<void>;
}

function LegalDocumentForm({ document, onCancel, onSaved }: LegalDocumentFormProps) {
  const {
    register,
    handleSubmit,
    setError,
    formState: { errors, isSubmitting },
  } = useForm<LegalDocumentFormValues>({
    resolver: zodResolver(legalDocumentFormSchema),
    defaultValues: document ? legalDocumentToFormValues(document) : EMPTY_LEGAL_DOCUMENT_FORM,
  });

  return (
    <form
      noValidate
      onSubmit={handleSubmit(async (values) => {
        try {
          const body = toLegalDocumentBody(values);
          await (document ? updateLegalDocument(document.id, body) : createLegalDocument(body));
          await onSaved();
        } catch (error) {
          showServerError(error, LEGAL_DOCUMENT_FIELDS, setError);
        }
      })}
      className="grid gap-4 md:grid-cols-2"
    >
      <Field id="legal-number" label="Số hiệu" error={errors.docNumber?.message} hint="Ví dụ: 91/2015/QH13.">
        <input
          type="text"
          {...register("docNumber")}
          {...fieldA11y("legal-number", errors.docNumber?.message, true)}
          className={INPUT}
        />
      </Field>
      <Field id="legal-type" label="Loại văn bản" error={errors.docType?.message}>
        <select {...register("docType")} {...fieldA11y("legal-type", errors.docType?.message)} className={SELECT}>
          {LEGAL_DOCUMENT_TYPES.map((value) => (
            <option key={value} value={value}>
              {LEGAL_DOCUMENT_TYPE_LABELS[value]}
            </option>
          ))}
        </select>
      </Field>
      <Field id="legal-title" label="Trích yếu" error={errors.title?.message} className="md:col-span-2">
        <input
          type="text"
          {...register("title")}
          {...fieldA11y("legal-title", errors.title?.message)}
          className={INPUT}
        />
      </Field>
      <Field id="legal-issued" label="Ngày ban hành" optional error={errors.issuedDate?.message}>
        <input
          type="date"
          {...register("issuedDate")}
          {...fieldA11y("legal-issued", errors.issuedDate?.message)}
          className={INPUT}
        />
      </Field>
      <Field id="legal-effective" label="Ngày hiệu lực" optional error={errors.effectiveDate?.message}>
        <input
          type="date"
          {...register("effectiveDate")}
          {...fieldA11y("legal-effective", errors.effectiveDate?.message)}
          className={INPUT}
        />
      </Field>
      <FormActions
        pending={isSubmitting}
        submitLabel={document ? "Lưu văn bản" : "Thêm văn bản"}
        onCancel={onCancel}
        error={errors.root?.server?.message}
        className="md:col-span-2"
      />
    </form>
  );
}
