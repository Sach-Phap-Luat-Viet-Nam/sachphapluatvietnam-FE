"use client";

import { useId, useState } from "react";
import type { KeyboardEvent } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { Lightbulb, Search } from "lucide-react";
import { useQuery } from "@tanstack/react-query";
import { cn } from "@slvn/ui";
import { formatPrice } from "@slvn/utils";
import { useDebouncedValue } from "@/lib/use-debounced-value";
import { bookPath } from "./book-detail";
import { BookCover } from "./BookCover";
import { catalogHref, nextSuggestionIndex, suggestionTerm } from "./catalog";
import { catalogKeys, fetchSuggestions } from "./client-api";

export interface SearchSuggestProps {
  /** `id` của ô nhập, để `<label htmlFor>` của form bọc ngoài trỏ tới. */
  inputId: string;
  placeholder: string;
  maxLength: number;
}

interface Option {
  key: string;
  href: string;
}

/**
 * Ô tìm kiếm có gợi ý khi gõ (combobox theo WAI-ARIA): ngừng gõ 250 ms thì gọi `GET /books?q=` lấy vài cuốn khớp, cuối
 * danh sách là "Xem tất cả kết quả". Ô vẫn nằm trong form GET `/sach` của header nên Enter khi chưa chọn gợi ý (hoặc khi
 * chưa tải JavaScript) là tìm như cũ. Mũi tên lên/xuống chọn gợi ý, Enter mở, Esc đóng.
 */
export function SearchSuggest({ inputId, placeholder, maxLength }: SearchSuggestProps) {
  const listId = useId();
  const router = useRouter();
  const [value, setValue] = useState("");
  const [open, setOpen] = useState(false);
  const [active, setActive] = useState(-1);
  const term = suggestionTerm(useDebouncedValue(value, 250));

  const suggestions = useQuery({
    queryKey: catalogKeys.suggestions(term ?? ""),
    queryFn: ({ signal }) => fetchSuggestions(term ?? "", signal),
    enabled: term !== null,
    staleTime: 60_000,
  });

  const books = term !== null ? (suggestions.data ?? []) : [];
  const options: Option[] = term
    ? [
        ...books.map((book) => ({ key: String(book.id), href: bookPath(book.slug) })),
        { key: "all", href: catalogHref({}, { q: term }) },
      ]
    : [];
  const showNoMatch = term !== null && suggestions.isSuccess && books.length === 0;
  const expanded = open && term !== null && (suggestions.isSuccess || suggestions.isError);
  const optionId = (index: number) => `${listId}-${index}`;

  const close = () => {
    setOpen(false);
    setActive(-1);
  };

  const handleKeyDown = (event: KeyboardEvent<HTMLInputElement>) => {
    if (event.key === "Escape") {
      close();
      return;
    }
    if (!expanded || !options.length) return;
    if (event.key === "ArrowDown" || event.key === "ArrowUp") {
      event.preventDefault();
      const step = event.key === "ArrowDown" ? 1 : -1;
      setActive((current) => nextSuggestionIndex(current, step, options.length));
    } else if (event.key === "Enter" && active >= 0) {
      const option = options[active];
      if (option) {
        event.preventDefault();
        close();
        router.push(option.href);
      }
    }
  };

  return (
    <div
      className="flex min-w-0 flex-1"
      onBlur={(event) => {
        // Rời hẳn ô và danh sách gợi ý (Tab sang chỗ khác, bấm ra ngoài) mới đóng; bấm vào gợi ý thì giữ để Link chạy.
        if (!event.currentTarget.contains(event.relatedTarget)) close();
      }}
    >
      <input
        id={inputId}
        name="q"
        type="search"
        role="combobox"
        aria-autocomplete="list"
        aria-expanded={expanded}
        aria-controls={listId}
        aria-activedescendant={expanded && active >= 0 ? optionId(active) : undefined}
        autoComplete="off"
        placeholder={placeholder}
        maxLength={maxLength}
        value={value}
        onChange={(event) => {
          setValue(event.target.value);
          setOpen(true);
          setActive(-1);
        }}
        onFocus={() => setOpen(true)}
        onKeyDown={handleKeyDown}
        className="text-ivory min-w-0 flex-1 bg-transparent px-3 outline-none [&::-webkit-search-cancel-button]:hidden"
      />
      <div
        className={cn(
          "bg-panel border-gold/40 absolute inset-x-0 top-[calc(100%+4px)] z-30 border shadow-[0_24px_40px_-20px_rgb(0_0_0/0.9)]",
          !expanded && "hidden",
        )}
      >
        <ul id={listId} role="listbox" aria-label="Gợi ý sách" className="flex flex-col py-1.5">
          {books.map((book, index) => (
            <li key={book.id} id={optionId(index)} role="option" aria-selected={active === index}>
              <Link
                href={bookPath(book.slug)}
                tabIndex={-1}
                onClick={close}
                className={cn(
                  "hover:bg-gold/10 flex items-center gap-3.5 px-4 py-2.5 transition-colors",
                  active === index && "bg-gold/10",
                )}
              >
                <BookCover book={book} size="mini" className="h-16 w-12 shrink-0 p-1 sm:p-1" />
                <span className="flex min-w-0 flex-1 flex-col gap-0.5">
                  <span className="line-clamp-2 leading-snug">{book.title}</span>
                  {book.editionName && <span className="text-mist truncate text-sm">{book.editionName}</span>}
                </span>
                {book.salePrice !== null && (
                  <span className="text-gold-pale shrink-0 font-semibold">{formatPrice(book.salePrice)}</span>
                )}
              </Link>
            </li>
          ))}
          {term !== null && (
            <li id={optionId(books.length)} role="option" aria-selected={active === books.length}>
              <Link
                href={catalogHref({}, { q: term })}
                tabIndex={-1}
                onClick={close}
                className={cn(
                  "text-gold hover:bg-gold/10 flex items-center gap-2.5 px-4 py-3 text-[15px] transition-colors",
                  books.length > 0 && "border-gold/20 border-t",
                  active === books.length && "bg-gold/10",
                )}
              >
                <Search size={16} aria-hidden="true" />
                Xem tất cả kết quả cho “{term}”
              </Link>
            </li>
          )}
        </ul>
        {showNoMatch && (
          <p className="text-sand border-gold/20 flex gap-2.5 border-t px-4 py-3 text-sm leading-6">
            <Lightbulb size={16} aria-hidden="true" className="text-upcoming mt-1 shrink-0" />
            Chưa có sách khớp. Thử từ khóa ngắn hơn, tên tác giả hoặc mã ISBN.
          </p>
        )}
        {suggestions.isError && (
          <p className="text-mist border-gold/20 border-t px-4 py-3 text-sm">Chưa tải được gợi ý. Nhấn Enter để tìm.</p>
        )}
      </div>
    </div>
  );
}
