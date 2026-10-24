import { keepPreviousData, useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { sessionOwner, useSession } from "@/lib/use-session";
import { cancelOrder, fetchMyOrder, fetchMyOrders } from "./api";

/** Đơn chỉ tải khi đã đăng nhập (API cần Bearer); key gắn với người dùng để đổi tài khoản không lẫn dữ liệu. */
function useOrdersKey() {
  const session = useSession();
  return { session, base: ["orders", sessionOwner(session)] as const };
}

/** Trang `page` của "Đơn của tôi". Giữ dữ liệu trang cũ trong lúc tải trang mới để danh sách không nháy. */
export function useMyOrders(page: number) {
  const { session, base } = useOrdersKey();
  const query = useQuery({
    queryKey: [...base, "list", page],
    queryFn: () => fetchMyOrders(page),
    enabled: session.status === "authenticated",
    placeholderData: keepPreviousData,
  });
  return { session, ...query };
}

export function useMyOrder(code: string) {
  const { session, base } = useOrdersKey();
  const query = useQuery({
    queryKey: [...base, "detail", code],
    queryFn: () => fetchMyOrder(code),
    enabled: session.status === "authenticated",
  });
  return { session, ...query };
}

/** Hủy đơn: thay chi tiết bằng đơn backend trả về, tải lại danh sách. Lỗi (đơn vừa đổi trạng thái) thì tải lại đơn. */
export function useCancelOrder(code: string) {
  const queryClient = useQueryClient();
  const { base } = useOrdersKey();
  const detailKey = [...base, "detail", code];
  return useMutation({
    mutationFn: (reason: string | null) => cancelOrder(code, reason),
    onSuccess: (order) => {
      queryClient.setQueryData(detailKey, order);
      void queryClient.invalidateQueries({ queryKey: [...base, "list"] });
    },
    onError: () => queryClient.invalidateQueries({ queryKey: detailKey }),
  });
}
