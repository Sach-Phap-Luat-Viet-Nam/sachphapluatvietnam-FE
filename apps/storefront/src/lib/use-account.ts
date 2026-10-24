import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { isApiError } from "@slvn/api-client";
import { isImpersonating, refreshSession } from "@slvn/auth";
import { removeAvatar, uploadAvatar } from "./avatar-api";
import {
  createAddress,
  deleteAddress,
  deleteInvoiceInfo,
  fetchAddresses,
  fetchProfile,
  saveInvoiceInfo,
  setDefaultAddress,
  updateAddress,
  updateProfile,
} from "./account-api";
import type { Address, AddressBody, InvoiceInfoBody, Profile, UpdateProfileBody } from "./account-api";
import { sessionOwner, useSession } from "./use-session";

/** Dữ liệu tài khoản chỉ tải khi đã đăng nhập; key gắn với người dùng để đổi tài khoản không lẫn dữ liệu. */
function useAccountKeys() {
  const session = useSession();
  const base = ["account", sessionOwner(session)] as const;
  return { session, base, profile: [...base, "profile"], addresses: [...base, "addresses"] };
}

export function useProfile() {
  const { session, profile } = useAccountKeys();
  const query = useQuery({ queryKey: profile, queryFn: fetchProfile, enabled: session.status === "authenticated" });
  return { session, ...query };
}

/** Lưu hồ sơ. Đổi họ tên thì refresh phiên để tên trên header cập nhật theo. */
export function useUpdateProfile() {
  const queryClient = useQueryClient();
  const keys = useAccountKeys();
  return useMutation({
    mutationFn: (body: UpdateProfileBody) => updateProfile(body),
    onSuccess: async (profile: Profile, body) => {
      const previous = queryClient.getQueryData<Profile>(keys.profile);
      queryClient.setQueryData(keys.profile, profile);
      if (previous && previous.fullName !== body.fullName) {
        await refreshSession();
      }
    },
  });
}

/**
 * Đổi (`File`) hoặc bỏ (`null`) ảnh đại diện. Xong thì cập nhật hồ sơ trong cache và refresh phiên để avatar trên header
 * đổi theo, như khi đổi họ tên. Phiên đăng nhập hộ không refresh được (sẽ kết thúc phiên) nên bỏ qua bước này.
 */
export function useChangeAvatar() {
  const queryClient = useQueryClient();
  const keys = useAccountKeys();
  return useMutation({
    mutationFn: async (file: File | null) => (file ? uploadAvatar(file) : removeAvatar().then(() => null)),
    onSuccess: async (avatarUrl) => {
      queryClient.setQueryData<Profile>(keys.profile, (profile) => (profile ? { ...profile, avatarUrl } : profile));
      if (!isImpersonating()) await refreshSession();
    },
  });
}

/**
 * Sổ địa chỉ. `unavailable` = backend đang chạy chưa có API (404 chung, không phải `ADDRESS_NOT_FOUND`): ẩn tính năng
 * thay vì báo lỗi, khách vẫn nhập địa chỉ khi đặt hàng.
 */
export function useAddresses() {
  const { session, addresses } = useAccountKeys();
  const query = useQuery({
    queryKey: addresses,
    queryFn: fetchAddresses,
    enabled: session.status === "authenticated",
  });
  const unavailable = isApiError(query.error) && query.error.status === 404 && query.error.code !== "ADDRESS_NOT_FOUND";
  return { session, unavailable, ...query };
}

/** Các API sửa sổ địa chỉ trả lại cả sổ: thay cache bằng response; địa chỉ mặc định đổi nên tải lại hồ sơ. */
function useAddressBookMutation<Variables>(mutationFn: (variables: Variables) => Promise<Address[] | void>) {
  const queryClient = useQueryClient();
  const keys = useAccountKeys();
  return useMutation({
    mutationFn,
    onSuccess: (addresses) => {
      if (addresses) queryClient.setQueryData(keys.addresses, addresses);
      else void queryClient.invalidateQueries({ queryKey: keys.addresses });
      void queryClient.invalidateQueries({ queryKey: keys.profile });
    },
    // Lỗi (địa chỉ vừa bị xóa ở tab khác, đủ 10 địa chỉ): tải lại sổ cho khớp backend.
    onError: () => queryClient.invalidateQueries({ queryKey: keys.addresses }),
  });
}

/** Thêm (không có `id`) hoặc sửa địa chỉ. */
export function useSaveAddress() {
  return useAddressBookMutation(({ id, ...body }: AddressBody & { id?: number }) =>
    id === undefined ? createAddress(body) : updateAddress(id, body),
  );
}

export function useSetDefaultAddress() {
  return useAddressBookMutation((id: number) => setDefaultAddress(id));
}

export function useDeleteAddress() {
  return useAddressBookMutation((id: number) => deleteAddress(id));
}

/** Lưu (`body`) hoặc xóa (`null`) thông tin xuất hóa đơn, cập nhật `invoiceInfo` trong hồ sơ. */
export function useSaveInvoiceInfo() {
  const queryClient = useQueryClient();
  const keys = useAccountKeys();
  return useMutation({
    mutationFn: async (body: InvoiceInfoBody | null) => (body ? saveInvoiceInfo(body) : deleteInvoiceInfo()),
    onSuccess: (invoiceInfo) =>
      queryClient.setQueryData<Profile>(keys.profile, (profile) =>
        profile ? { ...profile, invoiceInfo: invoiceInfo ?? null } : profile,
      ),
  });
}
