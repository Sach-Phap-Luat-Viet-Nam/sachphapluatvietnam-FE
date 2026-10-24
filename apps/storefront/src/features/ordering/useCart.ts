import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { sessionOwner, useSession } from "@/lib/use-session";
import { addCartItem, fetchCart, removeCartItem, setCartItemQuantity } from "./api";
import { EMPTY_CART } from "./schemas";
import type { Cart } from "./schemas";

/**
 * Key của giỏ theo người đang dùng. Đăng nhập/đăng xuất là đổi key nên giỏ được tải lại; lần tải đầu sau đăng nhập
 * gửi cả Bearer và cookie `sl_cart`, backend gộp giỏ khách vào giỏ tài khoản.
 */
function useCartKey() {
  const session = useSession();
  // Chờ biết phiên rồi mới tải để không gọi giỏ khách rồi lại gọi giỏ tài khoản ngay sau đó.
  return { key: ["cart", sessionOwner(session)] as const, ready: session.status !== "unknown" };
}

/** Giỏ hiện tại. Server không đọc được cookie giỏ của khách nên giỏ chỉ tải ở trình duyệt. */
export function useCart() {
  const { key, ready } = useCartKey();
  return useQuery({ queryKey: key, queryFn: fetchCart, enabled: ready, staleTime: 30_000 });
}

/** Key chung của mọi thao tác sửa giỏ, dùng với `useIsMutating` để biết giỏ đang được cập nhật. */
export const CART_MUTATION_KEY = ["cart"] as const;

/**
 * Mọi API giỏ trả lại toàn bộ giỏ: thay cache bằng response. Lỗi (hết hàng, ngừng bán) thì tải lại giỏ.
 * Chung `scope` nên các thao tác chạy lần lượt: response của lần sửa trước không về sau và ghi đè lần sửa mới hơn.
 */
function useCartMutation<Variables>(mutationFn: (variables: Variables) => Promise<Cart>) {
  const queryClient = useQueryClient();
  const { key } = useCartKey();
  return useMutation({
    mutationKey: CART_MUTATION_KEY,
    scope: { id: "cart" },
    mutationFn,
    onSuccess: (cart) => queryClient.setQueryData(key, cart),
    onError: () => queryClient.invalidateQueries({ queryKey: key }),
  });
}

export interface CartLineChange {
  skuId: number;
  quantity: number;
}

/** Cộng thêm sách vào giỏ. */
export function useAddToCart() {
  return useCartMutation(({ skuId, quantity }: CartLineChange) => addCartItem(skuId, quantity));
}

/** Đặt số lượng một dòng. */
export function useSetCartQuantity() {
  return useCartMutation(({ skuId, quantity }: CartLineChange) => setCartItemQuantity(skuId, quantity));
}

export function useRemoveCartItem() {
  return useCartMutation((skuId: number) => removeCartItem(skuId));
}

/** Làm trống giỏ trong cache sau khi đặt hàng thành công (backend đã xóa giỏ), không gọi thêm API. */
export function useClearCartCache(): () => void {
  const queryClient = useQueryClient();
  const { key } = useCartKey();
  return () => queryClient.setQueryData(key, EMPTY_CART);
}

/** Tải lại giỏ, ví dụ khi đặt hàng bị `OUT_OF_STOCK` để xem `availableQuantity` mới. */
export function useRefreshCart(): () => void {
  const queryClient = useQueryClient();
  const { key } = useCartKey();
  return () => void queryClient.invalidateQueries({ queryKey: key });
}
