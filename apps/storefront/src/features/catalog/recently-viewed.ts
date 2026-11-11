import { z } from "zod";

type RecentStore = Pick<Storage, "getItem" | "setItem">;

/** Tăng phiên bản khi đổi cấu trúc dữ liệu lưu. */
export const RECENTLY_VIEWED_KEY = "recently-viewed:v1";
/** Số sách nhớ tối đa (gồm cả cuốn đang xem). */
export const MAX_RECENTLY_VIEWED = 9;

/**
 * Chỉ lưu thông tin nhận diện, **không** lưu giá hay tồn kho: dữ liệu nằm trên máy khách có thể cũ nhiều ngày, giá và
 * trạng thái bán luôn phải lấy từ backend (trang chi tiết).
 */
const recentBookSchema = z.object({
  id: z.number(),
  slug: z.string().min(1),
  title: z.string(),
  coverImageUrl: z.string().nullable(),
});
export type RecentBook = z.infer<typeof recentBookSchema>;

/** Chuỗi đã lưu trong storage, `""` khi chưa có hoặc storage bị chặn (ném lỗi ở chế độ riêng tư). */
export function readRecentlyViewedRaw(store: RecentStore | null): string {
  try {
    return store?.getItem(RECENTLY_VIEWED_KEY) ?? "";
  } catch {
    return "";
  }
}

/** Danh sách mới xem nhất trước từ chuỗi đã lưu; dữ liệu hỏng thì coi như chưa xem cuốn nào. */
export function parseRecentlyViewed(raw: string): RecentBook[] {
  if (!raw) return [];
  try {
    const parsed = recentBookSchema.array().safeParse(JSON.parse(raw));
    return parsed.success ? parsed.data.slice(0, MAX_RECENTLY_VIEWED) : [];
  } catch {
    // JSON hỏng: bỏ qua, mục "Đã xem gần đây" chỉ là phần thêm.
    return [];
  }
}

export function readRecentlyViewed(store: RecentStore | null): RecentBook[] {
  return parseRecentlyViewed(readRecentlyViewedRaw(store));
}

/** Đưa cuốn vừa xem lên đầu (bỏ bản cũ cùng sách), giữ tối đa `MAX_RECENTLY_VIEWED` cuốn. */
export function addRecentlyViewed(list: readonly RecentBook[], book: RecentBook): RecentBook[] {
  return [book, ...list.filter((item) => item.id !== book.id)].slice(0, MAX_RECENTLY_VIEWED);
}

/** Ghi lại danh sách; storage đầy hoặc bị chặn thì bỏ qua. */
export function writeRecentlyViewed(store: RecentStore | null, list: readonly RecentBook[]): void {
  try {
    store?.setItem(RECENTLY_VIEWED_KEY, JSON.stringify(list));
  } catch {
    // Không ghi được thì lần sau chỉ thiếu cuốn này trong danh sách, không ảnh hưởng trang.
  }
}
