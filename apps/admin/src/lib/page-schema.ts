import { z } from "zod";

/** Danh sách phân trang `{ items, meta }` theo quy ước chung của backend (docs/api_reference.md, mục Phân trang). */
export function pageSchema<Item extends z.ZodType>(item: Item) {
  return z.object({
    items: z.array(item),
    meta: z.object({ page: z.number(), limit: z.number(), total: z.number() }),
  });
}

export interface Page<Item> {
  items: Item[];
  meta: { page: number; limit: number; total: number };
}
