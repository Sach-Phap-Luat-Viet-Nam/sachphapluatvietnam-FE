import { keepPreviousData, useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { sessionOwner, useSession } from "@/lib/use-session";
import { cancelOrder, fetchMyOrder, fetchMyOrders, lookupOrder } from "./api";
import { paymentPollInterval } from "./payment";
import type { Order } from "./schemas";

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
    // Đơn chờ chuyển khoản: hỏi lại để tự chuyển sang "đã thanh toán" khi SePay xác nhận tiền.
    refetchInterval: (current) => paymentPollInterval(current.state.data, true),
  });
  return { session, ...query };
}

/**
 * Đơn vừa đặt ở màn cảm ơn. Đơn chuyển khoản chờ tiền thì hỏi lại định kỳ (thành viên: `GET /orders/{code}`, khách
 * vãng lai: tra cứu bằng mã + SĐT) để hiện "đã nhận tiền" mà không cần tải lại trang; lỗi tạm thời giữ nguyên dữ liệu cũ.
 */
export function useLiveOrder(placed: Order): Order {
  const session = useSession();
  const member = session.status === "authenticated";
  const { data } = useQuery({
    queryKey: ["placed-order", placed.orderCode],
    queryFn: () => (member ? fetchMyOrder(placed.orderCode) : lookupOrder(placed.orderCode, placed.phone)),
    initialData: placed,
    // Dữ liệu ban đầu là đơn vừa tạo: không gọi lại ngay, chỉ hỏi theo chu kỳ khi còn chờ tiền.
    staleTime: Infinity,
    refetchInterval: (current) => paymentPollInterval(current.state.data, member),
  });
  return data;
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
