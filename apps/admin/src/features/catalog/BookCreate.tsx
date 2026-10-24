"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import { ArrowLeft } from "lucide-react";
import { PageHeader } from "@/components/PageHeader";
import { CARD } from "@/components/form-styles";
import { createBook } from "./api";
import { BookForm } from "./BookForm";
import { EMPTY_BOOK_FORM } from "./forms";
import { useSaveBook } from "./use-save-book";

/** Tạo đầu sách rồi chuyển sang màn chi tiết để thêm ấn bản và SKU. */
export function BookCreate() {
  const router = useRouter();
  const saveBook = useSaveBook();

  return (
    <div className="flex max-w-4xl flex-col gap-6">
      <Link href="/sach" className="text-muted hover:text-foreground flex min-h-11 w-fit items-center gap-2">
        <ArrowLeft size={16} aria-hidden="true" /> Danh sách đầu sách
      </Link>
      <PageHeader
        title="Thêm đầu sách"
        description="Bước 1/3: thông tin chung. Sau khi tạo, anh/chị thêm ấn bản (ISBN, số QĐXB) rồi thêm SKU (loại bìa, giá)."
      />
      <section className={`${CARD} p-5 sm:p-6`}>
        <BookForm
          mode="create"
          defaultValues={EMPTY_BOOK_FORM}
          onSave={async (body) => {
            const book = await createBook(body);
            saveBook(book);
            router.push(`/sach/${book.id}`);
          }}
        />
      </section>
    </div>
  );
}
