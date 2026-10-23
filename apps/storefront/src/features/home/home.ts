/** Nội dung băng chữ chạy: các nhãn "Cập nhật đến" khác nhau của sách mới, giữ thứ tự xuất hiện. */
export function tickerItems(books: readonly { updatedToText: string | null }[]): string[] {
  const seen = new Set<string>();
  for (const book of books) {
    const text = book.updatedToText?.trim();
    if (text) seen.add(text);
  }
  return [...seen];
}

export interface DustMote {
  left: number;
  bottom: number;
  duration: number;
  delay: number;
}

/** Vị trí bụi sáng cố định (không random) để HTML server và client giống nhau. */
export function dustMotes(count = 18): DustMote[] {
  return Array.from({ length: count }, (_, i) => ({
    left: 48 + ((i * 37) % 50),
    bottom: 60 + ((i * 53) % 260),
    duration: 9 + ((i * 7) % 8),
    delay: -((i * 13) % 14),
  }));
}
