"use client";

import { useState } from "react";
import Link from "next/link";
import { keepPreviousData, useQuery } from "@tanstack/react-query";
import { Plus, Search } from "lucide-react";
import { Button, buttonClassName } from "@slvn/ui";
import { formatDateTime } from "@slvn/utils";
import { PageHeader } from "@/components/PageHeader";
import { Pagination } from "@/components/Pagination";
import { ErrorStatus, LoadingStatus } from "@/components/QueryStatus";
import { StatusBadge } from "@/components/StatusBadge";
import { CARD, INPUT, SELECT } from "@/components/form-styles";
import { BOOKS_PAGE_SIZE, catalogKeys, fetchBooks } from "./api";
import { BOOK_STATUS_LABELS, BOOK_STATUSES, BOOK_TYPE_LABELS, bookStatusTone, enumLabel } from "./labels";

/** Danh sách đầu sách mọi trạng thái: tìm theo tên/slug/ISBN, lọc trạng thái, phân trang. */
export function BookList() {
  const [query, setQuery] = useState({ q: "", status: "", page: 1 });
  const [draft, setDraft] = useState({ q: "", status: "" });
  const books = useQuery({
    queryKey: catalogKeys.books(query),
    queryFn: () => fetchBooks(query),
    placeholderData: keepPreviousData,
  });

  return (
    <div className="flex flex-col gap-6">
      <PageHeader
        title="Đầu sách"
        description="Tạo, sửa đầu sách cùng ấn bản và SKU. Đầu sách không xóa được, muốn gỡ khỏi website thì chuyển sang “Ẩn”."
        actions={
          <Link href="/sach/tao-moi" className={buttonClassName()}>
            <Plus size={18} aria-hidden="true" /> Thêm đầu sách
          </Link>
        }
      />

      <form
        role="search"
        aria-label="Tìm đầu sách"
        onSubmit={(event) => {
          event.preventDefault();
          setQuery({ q: draft.q.trim(), status: draft.status, page: 1 });
        }}
        className="flex flex-col gap-3 sm:flex-row sm:items-end"
      >
        <div className="flex flex-1 flex-col gap-2">
          <label htmlFor="book-search" className="text-base font-medium">
            Tên sách, slug hoặc ISBN
          </label>
          <input
            id="book-search"
            type="search"
            value={draft.q}
            onChange={(event) => setDraft({ ...draft, q: event.target.value })}
            className={INPUT}
          />
        </div>
        <div className="flex flex-col gap-2 sm:w-52">
          <label htmlFor="book-status-filter" className="text-base font-medium">
            Trạng thái
          </label>
          <select
            id="book-status-filter"
            value={draft.status}
            onChange={(event) => setDraft({ ...draft, status: event.target.value })}
            className={SELECT}
          >
            <option value="">Tất cả</option>
            {BOOK_STATUSES.map((status) => (
              <option key={status} value={status}>
                {BOOK_STATUS_LABELS[status]}
              </option>
            ))}
          </select>
        </div>
        <Button type="submit" size="lg" variant="outline">
          <Search size={18} aria-hidden="true" /> Tìm
        </Button>
      </form>

      {books.isError ? (
        <ErrorStatus error={books.error} onRetry={() => void books.refetch()} />
      ) : books.isPending ? (
        <LoadingStatus />
      ) : books.data.items.length === 0 ? (
        <p className={`${CARD} text-muted p-6`}>
          {query.q || query.status ? "Không có đầu sách phù hợp." : "Chưa có đầu sách nào. Bấm “Thêm đầu sách” để bắt đầu."}
        </p>
      ) : (
        <>
          <div className={`${CARD} overflow-x-auto`}>
            <table className="w-full min-w-2xl text-left">
              <caption className="sr-only">Danh sách đầu sách</caption>
              <thead className="border-border text-muted border-b text-sm">
                <tr>
                  <th scope="col" className="px-4 py-3 font-medium">
                    Tên sách
                  </th>
                  <th scope="col" className="px-4 py-3 font-medium">
                    Loại
                  </th>
                  <th scope="col" className="px-4 py-3 font-medium">
                    Trạng thái
                  </th>
                  <th scope="col" className="px-4 py-3 text-right font-medium">
                    Ấn bản
                  </th>
                  <th scope="col" className="px-4 py-3 font-medium">
                    Sửa lần cuối
                  </th>
                </tr>
              </thead>
              <tbody>
                {books.data.items.map((book) => (
                  <tr key={book.id} className="border-border border-b last:border-b-0">
                    <td className="px-4 py-3">
                      <Link href={`/sach/${book.id}`} className="text-primary font-medium hover:underline">
                        {book.title}
                      </Link>
                      <span className="text-muted block text-sm">{book.slug}</span>
                    </td>
                    <td className="px-4 py-3">{enumLabel(BOOK_TYPE_LABELS, book.bookType)}</td>
                    <td className="px-4 py-3">
                      <StatusBadge tone={bookStatusTone(book.status)}>
                        {enumLabel(BOOK_STATUS_LABELS, book.status)}
                      </StatusBadge>
                    </td>
                    <td className="px-4 py-3 text-right">{book.editionCount}</td>
                    <td className="text-muted px-4 py-3 text-sm">{formatDateTime(book.updatedAt)}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
          <Pagination
            page={books.data.meta.page}
            limit={books.data.meta.limit || BOOKS_PAGE_SIZE}
            total={books.data.meta.total}
            onPageChange={(page) => setQuery({ ...query, page })}
          />
        </>
      )}
    </div>
  );
}
