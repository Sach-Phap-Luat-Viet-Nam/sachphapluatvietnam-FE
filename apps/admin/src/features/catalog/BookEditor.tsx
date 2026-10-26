"use client";

import { useState } from "react";
import Link from "next/link";
import { useQuery } from "@tanstack/react-query";
import { ArrowLeft, Plus } from "lucide-react";
import { isApiError } from "@slvn/api-client";
import { Button } from "@slvn/ui";
import { PageHeader } from "@/components/PageHeader";
import { ErrorStatus, LoadingStatus } from "@/components/QueryStatus";
import { StatusBadge } from "@/components/StatusBadge";
import { CARD } from "@/components/form-styles";
import { addEdition, catalogKeys, fetchBook, updateBook } from "./api";
import { BookForm } from "./BookForm";
import { EditionCard } from "./EditionCard";
import { EditionForm } from "./EditionForm";
import { bookToFormValues, EMPTY_EDITION_FORM, newEditionFormFrom } from "./forms";
import { BOOK_STATUS_LABELS, bookStatusTone, enumLabel } from "./labels";
import type { AdminBook } from "./schemas";
import { useSaveBook } from "./use-save-book";

function BackLink() {
  return (
    <Link href="/sach" className="text-muted hover:text-foreground flex min-h-11 w-fit items-center gap-2">
      <ArrowLeft size={16} aria-hidden="true" /> Danh sách đầu sách
    </Link>
  );
}

/** Màn chi tiết đầu sách: thông tin chung, ấn bản và SKU. */
export function BookEditor({ bookId }: { bookId: number }) {
  const book = useQuery({ queryKey: catalogKeys.book(bookId), queryFn: () => fetchBook(bookId) });

  if (book.isPending) {
    return <LoadingStatus />;
  }
  if (book.isError) {
    return (
      <div className="flex flex-col gap-4">
        <BackLink />
        <ErrorStatus
          error={book.error}
          overrides={{ NOT_FOUND: "Không tìm thấy đầu sách này." }}
          onRetry={isApiError(book.error) && book.error.status === 404 ? undefined : () => void book.refetch()}
        />
      </div>
    );
  }
  return <BookEditorContent book={book.data} />;
}

function BookEditorContent({ book }: { book: AdminBook }) {
  const saveBook = useSaveBook();
  const [addingEdition, setAddingEdition] = useState(false);
  const latestEdition = book.editions.find((edition) => edition.isLatest) ?? book.editions[0];

  return (
    <div className="flex max-w-5xl flex-col gap-8">
      <div className="flex flex-col gap-3">
        <BackLink />
        <PageHeader
          title={book.title}
          description={
            <span className="flex flex-wrap items-center gap-2">
              <StatusBadge tone={bookStatusTone(book.status)}>{enumLabel(BOOK_STATUS_LABELS, book.status)}</StatusBadge>
              <span>/sach/{book.slug}</span>
            </span>
          }
        />
      </div>

      <section aria-labelledby="book-info" className={`${CARD} flex flex-col gap-5 p-5 sm:p-6`}>
        <h2 id="book-info" className="text-xl font-semibold">
          Thông tin chung
        </h2>
        <BookForm
          key={book.id}
          mode="edit"
          defaultValues={bookToFormValues(book)}
          onSave={async (body) => saveBook(await updateBook(book.id, body))}
        />
      </section>

      <section aria-labelledby="book-editions" className="flex flex-col gap-4">
        <div className="flex flex-wrap items-start justify-between gap-3">
          <div className="flex flex-col gap-1">
            <h2 id="book-editions" className="text-xl font-semibold">
              Ấn bản ({book.editions.length})
            </h2>
            <p className="text-muted leading-7">
              Ấn bản đầu tiên tự thành ấn bản mới nhất. Website bán ấn bản “Đang bán”/“Thanh lý” có SKU, và báo “Đã có
              ấn bản mới” trên các ấn bản cũ.
            </p>
          </div>
          {!addingEdition && (
            <Button onClick={() => setAddingEdition(true)}>
              <Plus size={18} aria-hidden="true" /> Thêm ấn bản
            </Button>
          )}
        </div>

        {addingEdition && (
          <section aria-labelledby="new-edition" className={`${CARD} flex flex-col gap-5 p-5`}>
            <h3 id="new-edition" className="text-lg font-semibold">
              Ấn bản mới
            </h3>
            {latestEdition && (
              <p className="text-muted leading-7">
                Đã điền sẵn nhà xuất bản, khổ, số trang, khối lượng và văn bản pháp luật từ ấn bản mới nhất. Anh/chị
                nhập ISBN, số QĐXB, tên ấn bản và ảnh bìa của ấn bản mới.
              </p>
            )}
            <EditionForm
              bookTitle={book.title}
              defaultValues={
                latestEdition ? newEditionFormFrom(latestEdition, new Date().getFullYear()) : EMPTY_EDITION_FORM
              }
              submitLabel="Thêm ấn bản"
              onCancel={() => setAddingEdition(false)}
              onSave={async (body) => {
                saveBook(await addEdition(book.id, body));
                setAddingEdition(false);
              }}
            />
          </section>
        )}

        {book.editions.length === 0 && !addingEdition ? (
          <p className={`${CARD} text-muted p-5`}>
            Chưa có ấn bản. Sách chỉ hiện trên website khi có ấn bản đã công bố.
          </p>
        ) : (
          book.editions.map((edition) => <EditionCard key={edition.id} bookTitle={book.title} edition={edition} />)
        )}
      </section>
    </div>
  );
}
