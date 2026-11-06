import Link from "next/link";
import { Lightbulb } from "lucide-react";
import { isUnaccentedQuery } from "./catalog";

/** Số danh mục gốc tối đa gợi ý khi không có kết quả. */
const MAX_CATEGORY_SUGGESTIONS = 8;

export interface NoResultsProps {
  /** Từ khóa đang tìm (`""` khi không tìm theo từ khóa). */
  query: string;
  /** Link bỏ các bộ lọc khác nhưng giữ từ khóa; `null` khi không có bộ lọc nào ngoài từ khóa. */
  keepQueryHref: string | null;
  /** Danh mục gốc để khách chuyển sang duyệt theo danh mục. */
  categories: readonly { slug: string; name: string }[];
}

/**
 * Trạng thái không có kết quả ở tủ sách: nói rõ vì sao có thể không ra (backend tìm có phân biệt dấu) và đưa khách sang
 * lối khác (bỏ bộ lọc, duyệt danh mục) thay vì để trang trống.
 */
export function NoResults({ query, keepQueryHref, categories }: NoResultsProps) {
  const unaccented = isUnaccentedQuery(query);
  const shownCategories = categories.slice(0, MAX_CATEGORY_SUGGESTIONS);

  return (
    <div className="border-gold/25 flex flex-col items-center gap-5 border px-6 py-12 text-center">
      <h3 className="font-editorial text-3xl font-bold">Chưa tìm thấy sách phù hợp</h3>
      <p className="text-mist max-w-lg">
        {query ? (
          <>
            Không có sách nào khớp với <span className="text-ivory">“{query}”</span>
            {keepQueryHref ? " trong bộ lọc đang chọn." : "."}
          </>
        ) : (
          "Không có sách nào trong bộ lọc đang chọn."
        )}
      </p>

      {unaccented && (
        <p className="border-upcoming/50 bg-upcoming/10 flex max-w-lg gap-3 border px-4 py-3 text-left leading-7">
          <Lightbulb size={20} className="text-upcoming mt-1 shrink-0" />
          <span>
            Tủ sách đang tìm theo <strong>tiếng Việt có dấu</strong>. Thử gõ “bộ luật dân sự” thay vì “bo luat dan su”.
          </span>
        </p>
      )}

      {query && (
        <ul className="text-sand flex max-w-lg list-disc flex-col gap-1 pl-5 text-left leading-7">
          <li>Dùng từ khóa ngắn hơn, ví dụ chỉ tên bộ luật hoặc lĩnh vực.</li>
          <li>Tìm theo mã ISBN in ở bìa sau sách.</li>
        </ul>
      )}

      <div className="flex flex-wrap items-center justify-center gap-x-6 gap-y-3">
        {keepQueryHref && (
          <Link href={keepQueryHref} className="link-underline text-gold">
            Bỏ bộ lọc, giữ từ khóa
          </Link>
        )}
        <Link href="/sach" className="link-underline text-gold">
          Xem tất cả sách
        </Link>
      </div>

      {shownCategories.length > 0 && (
        <nav aria-label="Duyệt theo danh mục" className="flex flex-col items-center gap-3">
          <span className="text-mist text-sm">Hoặc xem theo danh mục</span>
          <ul className="flex flex-wrap justify-center gap-2">
            {shownCategories.map((category) => (
              <li key={category.slug}>
                <Link
                  href={`/sach?category=${encodeURIComponent(category.slug)}`}
                  className="border-border hover:border-gold flex min-h-11 items-center border px-4 transition-colors"
                >
                  {category.name}
                </Link>
              </li>
            ))}
          </ul>
        </nav>
      )}
    </div>
  );
}
