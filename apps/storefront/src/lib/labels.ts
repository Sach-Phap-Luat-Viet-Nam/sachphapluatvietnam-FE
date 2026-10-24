/** Nhãn loại bìa (`CoverType`), dùng chung cho tủ sách, trang chi tiết sách và giỏ hàng. */
export const COVER_TYPE_LABELS = { paperback: "Bìa mềm", hardcover: "Bìa cứng" } as const;

function isCoverType(value: string): value is keyof typeof COVER_TYPE_LABELS {
  return Object.hasOwn(COVER_TYPE_LABELS, value);
}

/** Nhãn loại bìa; giá trị lạ (backend thêm loại mới) thì hiện nguyên giá trị. */
export function coverTypeLabel(coverType: string): string {
  return isCoverType(coverType) ? COVER_TYPE_LABELS[coverType] : coverType;
}
