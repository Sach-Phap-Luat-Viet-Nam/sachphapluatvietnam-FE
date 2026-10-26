/** Một sách trong bộ combo: SKU và số cuốn trong một bộ. */
export interface ComboLine {
  skuId: number;
  quantity: number;
}

export interface AddComboResult {
  /** Số dòng sách đã thêm vào giỏ trước khi dừng. */
  added: number;
  /** Lỗi của dòng đầu tiên thất bại, `null` khi thêm đủ cả bộ. */
  error: unknown;
}

/** Tổng số cuốn trong một bộ. */
export function comboCopies(lines: readonly ComboLine[]): number {
  return lines.reduce((sum, line) => sum + line.quantity, 0);
}

/**
 * Thêm lần lượt từng sách của một bộ vào giỏ (mỗi SKU `quantity` cuốn). Dừng ở dòng đầu tiên lỗi (hết hàng, giỏ đầy…)
 * và báo đã thêm được mấy dòng để khách biết giỏ đang ở trạng thái nào. Thêm tuần tự vì mọi thao tác giỏ chạy lần lượt.
 * Backend tự nhận diện bộ trong giỏ và áp giá combo khi thanh toán nên không gửi giá.
 */
export async function addComboToCart(
  lines: readonly ComboLine[],
  add: (line: ComboLine) => Promise<unknown>,
): Promise<AddComboResult> {
  let added = 0;
  for (const { skuId, quantity } of lines) {
    try {
      await add({ skuId, quantity });
    } catch (error) {
      return { added, error };
    }
    added += 1;
  }
  return { added, error: null };
}
