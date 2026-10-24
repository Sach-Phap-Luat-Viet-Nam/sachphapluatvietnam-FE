import { categoryRows, categoryWithDescendants } from "./category-tree";
import type { Category } from "./schemas";

function category(id: number, name: string, parentId: number | null, sortOrder = 0): Category {
  return { id, name, slug: `dm-${id}`, parentId, sortOrder };
}

const CATEGORIES = [
  category(7, "Hợp đồng", 3, 2),
  category(3, "Dân sự", null, 1),
  category(9, "Thừa kế", 3, 1),
  category(1, "Hình sự", null, 2),
  category(12, "Mẫu hợp đồng", 7),
];

describe("categoryRows", () => {
  it("xếp cha trước con theo sortOrder, kèm độ sâu và đường dẫn", () => {
    expect(categoryRows(CATEGORIES).map((row) => [row.id, row.depth, row.path])).toEqual([
      [3, 0, "Dân sự"],
      [9, 1, "Dân sự › Thừa kế"],
      [7, 1, "Dân sự › Hợp đồng"],
      [12, 2, "Dân sự › Hợp đồng › Mẫu hợp đồng"],
      [1, 0, "Hình sự"],
    ]);
  });

  it("đưa danh mục mất cha lên gốc", () => {
    expect(categoryRows([category(5, "Mồ côi", 99)])).toMatchObject([{ id: 5, depth: 0 }]);
  });

  it("không lặp vô hạn khi dữ liệu có vòng", () => {
    expect(categoryRows([category(1, "A", 2), category(2, "B", 1), category(3, "C", null)])).toHaveLength(1);
  });
});

describe("categoryWithDescendants", () => {
  it("gồm chính nó và mọi con cháu", () => {
    expect([...categoryWithDescendants(CATEGORIES, 3)].sort((a, b) => a - b)).toEqual([3, 7, 9, 12]);
    expect([...categoryWithDescendants(CATEGORIES, 1)]).toEqual([1]);
  });
});
