/** Nhãn của một giá trị enum; backend có thể thêm giá trị mới nên giá trị lạ giữ nguyên mã. */
export function enumLabel(labels: Record<string, string>, value: string): string {
  return Object.hasOwn(labels, value) ? (labels[value] ?? value) : value;
}
