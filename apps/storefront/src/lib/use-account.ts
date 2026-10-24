import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { isApiError } from "@slvn/api-client";
import { refreshSession } from "@slvn/auth";
import {
  createAddress,
  deleteAddress,
  fetchAddresses,
  fetchProfile,
  updateAddress,
  updateProfile,
} from "./account-api";
import type { Address, AddressBody, Profile, UpdateProfileBody } from "./account-api";
import { sessionOwner, useSession } from "./use-session";

/** Dữ liệu tài khoản chỉ tải khi đã đăng nhập; key gắn với người dùng để đổi tài khoản không lẫn dữ liệu. */
function useAccountKey() {
  const session = useSession();
  return { session, base: ["account", sessionOwner(session)] as const };
}

export function useProfile() {
  const { session, base } = useAccountKey();
  const query = useQuery({
    queryKey: [...base, "profile"],
    queryFn: fetchProfile,
    enabled: session.status === "authenticated",
  });
  return { session, ...query };
}

/** Lưu hồ sơ. Đổi họ tên thì refresh phiên để tên trên header cập nhật theo. */
export function useUpdateProfile() {
  const queryClient = useQueryClient();
  const { base } = useAccountKey();
  return useMutation({
    mutationFn: (body: UpdateProfileBody) => updateProfile(body),
    onSuccess: async (profile: Profile, body) => {
      const previous = queryClient.getQueryData<Profile>([...base, "profile"]);
      queryClient.setQueryData([...base, "profile"], profile);
      if (previous && previous.fullName !== body.fullName) {
        await refreshSession();
      }
    },
  });
}

/**
 * Sổ địa chỉ. `unavailable` = backend chưa có API (404): ẩn tính năng thay vì báo lỗi, khách vẫn nhập địa chỉ khi đặt.
 */
export function useAddresses() {
  const { session, base } = useAccountKey();
  const query = useQuery({
    queryKey: [...base, "addresses"],
    queryFn: fetchAddresses,
    enabled: session.status === "authenticated",
  });
  const unavailable = isApiError(query.error) && query.error.status === 404;
  return { session, unavailable, ...query };
}

/** Thêm (không có `id`) hoặc sửa địa chỉ, rồi tải lại danh sách (đặt mặc định làm đổi cờ của địa chỉ khác). */
export function useSaveAddress() {
  const queryClient = useQueryClient();
  const { base } = useAccountKey();
  return useMutation({
    mutationFn: ({ id, ...body }: AddressBody & { id?: number }): Promise<Address> =>
      id === undefined ? createAddress(body) : updateAddress(id, body),
    onSettled: () => queryClient.invalidateQueries({ queryKey: [...base, "addresses"] }),
  });
}

export function useDeleteAddress() {
  const queryClient = useQueryClient();
  const { base } = useAccountKey();
  return useMutation({
    mutationFn: (id: number) => deleteAddress(id),
    onSettled: () => queryClient.invalidateQueries({ queryKey: [...base, "addresses"] }),
  });
}
