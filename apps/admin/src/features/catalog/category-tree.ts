import type { Category } from "./schemas";

/** Danh mục kèm độ sâu trong cây, xếp theo thứ tự duyệt cây (cha trước, con ngay sau). */
export interface CategoryRow extends Category {
  depth: number;
  /** Đường dẫn tên từ gốc, ví dụ "Dân sự › Hợp đồng". */
  path: string;
}

function byOrder(a: Category, b: Category): number {
  return a.sortOrder - b.sortOrder || a.name.localeCompare(b.name, "vi");
}

/**
 * Dựng cây từ mảng phẳng của `GET /admin/categories` (theo `parentId`) rồi trải phẳng để hiển thị thụt lề.
 * Danh mục có cha không tồn tại (đã xóa) được đưa lên gốc để không bị mất khỏi danh sách.
 */
export function categoryRows(categories: readonly Category[]): CategoryRow[] {
  const ids = new Set(categories.map((category) => category.id));
  const children = new Map<number | null, Category[]>();
  for (const category of categories) {
    const parent = category.parentId !== null && ids.has(category.parentId) ? category.parentId : null;
    children.set(parent, [...(children.get(parent) ?? []), category]);
  }

  const rows: CategoryRow[] = [];
  const visit = (parent: number | null, depth: number, parentPath: string, seen: Set<number>) => {
    for (const category of [...(children.get(parent) ?? [])].sort(byOrder)) {
      // Dữ liệu vòng (không nên có, backend đã chặn) thì dừng để không lặp vô hạn.
      if (seen.has(category.id)) {
        continue;
      }
      const path = parentPath ? `${parentPath} › ${category.name}` : category.name;
      rows.push({ ...category, depth, path });
      visit(category.id, depth + 1, path, new Set([...seen, category.id]));
    }
  };
  visit(null, 0, "", new Set());
  return rows;
}

/** Id của danh mục và mọi danh mục con cháu: không được chọn làm cha (CATEGORY_PARENT_INVALID). */
export function categoryWithDescendants(categories: readonly Category[], id: number): Set<number> {
  const result = new Set([id]);
  let added = true;
  while (added) {
    added = false;
    for (const category of categories) {
      if (category.parentId !== null && result.has(category.parentId) && !result.has(category.id)) {
        result.add(category.id);
        added = true;
      }
    }
  }
  return result;
}
