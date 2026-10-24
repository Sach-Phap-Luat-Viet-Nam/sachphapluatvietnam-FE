"use client";

import { useState } from "react";
import Image from "next/image";
import { useMutation } from "@tanstack/react-query";
import { Pencil } from "lucide-react";
import { Button } from "@slvn/ui";
import { formatDate } from "@slvn/utils";
import { ConfirmButton } from "@/components/ConfirmButton";
import { StatusBadge } from "@/components/StatusBadge";
import { CARD, FORM_ERROR } from "@/components/form-styles";
import { adminErrorMessage } from "@/lib/admin-errors";
import { optimizedImageUrl } from "@/lib/image-upload";
import { setLatestEdition, updateEdition } from "./api";
import { EditionForm } from "./EditionForm";
import { editionToFormValues, legalDocumentLabel } from "./forms";
import { EDITION_STATUS_LABELS, editionStatusTone, enumLabel } from "./labels";
import type { Edition } from "./schemas";
import { SkuTable } from "./SkuTable";
import { useSaveBook } from "./use-save-book";

/** Tên hiển thị của ấn bản: tên ấn bản, không có thì dùng ISBN. */
export function editionTitle(edition: Pick<Edition, "editionName" | "isbn">): string {
  return edition.editionName ?? `Ấn bản ISBN ${edition.isbn}`;
}

export interface EditionCardProps {
  bookTitle: string;
  edition: Edition;
}

/** Một ấn bản: tóm tắt thông tin, sửa, đặt làm ấn bản mới nhất, và SKU. */
export function EditionCard({ bookTitle, edition }: EditionCardProps) {
  const saveBook = useSaveBook();
  const [editing, setEditing] = useState(false);
  const setLatest = useMutation({ mutationFn: () => setLatestEdition(edition.id), onSuccess: saveBook });
  const title = editionTitle(edition);

  const details: Array<[string, string | null]> = [
    ["ISBN", edition.isbn],
    ["Nhà xuất bản", edition.publisher],
    ["Số QĐXB", edition.publishingDecisionNo],
    ["Năm xuất bản", edition.publishYear === null ? null : String(edition.publishYear)],
    ["Ngày phát hành", formatDate(edition.releaseDate)],
    ["Cập nhật đến", edition.updatedToText],
  ];

  return (
    <article aria-labelledby={`edition-${edition.id}`} className={`${CARD} flex flex-col gap-5 p-5`}>
      <header className="flex flex-wrap items-start justify-between gap-3">
        <div className="flex flex-col gap-2">
          <h3 id={`edition-${edition.id}`} className="text-lg font-semibold">
            {title}
          </h3>
          <div className="flex flex-wrap gap-2">
            <StatusBadge tone={editionStatusTone(edition.status)}>
              {enumLabel(EDITION_STATUS_LABELS, edition.status)}
            </StatusBadge>
            {edition.isLatest && <StatusBadge tone="info">Ấn bản mới nhất</StatusBadge>}
          </div>
        </div>
        {!editing && (
          <div className="flex flex-wrap gap-2">
            {!edition.isLatest && (
              <ConfirmButton
                question="Đặt làm ấn bản mới nhất?"
                confirmLabel="Đặt mới nhất"
                pending={setLatest.isPending}
                onConfirm={() => setLatest.mutate()}
              >
                Đặt làm ấn bản mới nhất
              </ConfirmButton>
            )}
            <Button variant="outline" size="sm" onClick={() => setEditing(true)}>
              <Pencil size={16} aria-hidden="true" /> Sửa ấn bản
            </Button>
          </div>
        )}
      </header>

      {setLatest.isError && (
        <p role="alert" className={FORM_ERROR}>
          {adminErrorMessage(setLatest.error)}
        </p>
      )}

      {editing ? (
        <EditionForm
          bookTitle={bookTitle}
          defaultValues={editionToFormValues(edition)}
          submitLabel="Lưu ấn bản"
          onCancel={() => setEditing(false)}
          onSave={async (body) => {
            saveBook(await updateEdition(edition.id, body));
            setEditing(false);
          }}
        />
      ) : (
        <div className="flex flex-col gap-4 sm:flex-row">
          <div className="bg-surface border-border flex h-40 w-30 shrink-0 items-center justify-center overflow-hidden rounded border">
            {edition.coverImageUrl ? (
              <Image
                src={optimizedImageUrl(edition.coverImageUrl)}
                alt={`Bìa sách ${bookTitle}, ${title}`}
                width={120}
                height={160}
                unoptimized
                className="h-full w-full object-cover"
              />
            ) : (
              <span className="text-muted px-2 text-center text-sm">Chưa có ảnh bìa</span>
            )}
          </div>
          <div className="flex min-w-0 flex-col gap-3">
            <dl className="grid gap-x-6 gap-y-2 text-sm sm:grid-cols-[auto_1fr]">
              {details.map(([label, value]) => (
                <div key={label} className="contents">
                  <dt className="text-muted">{label}</dt>
                  <dd>{value ?? "—"}</dd>
                </div>
              ))}
            </dl>
            {edition.legalDocuments.length > 0 && (
              <p className="text-sm">
                <span className="text-muted">Văn bản cập nhật: </span>
                {edition.legalDocuments.map(legalDocumentLabel).join("; ")}
              </p>
            )}
          </div>
        </div>
      )}

      <SkuTable edition={edition} />
    </article>
  );
}
