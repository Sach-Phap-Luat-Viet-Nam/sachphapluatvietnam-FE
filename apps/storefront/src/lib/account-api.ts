import { z } from "zod";
import { unwrap } from "@slvn/api-client";
import { browserApi } from "@slvn/auth";

// Hồ sơ (`/me`) và sổ địa chỉ (`/me/addresses`) của khách đang đăng nhập. Dùng chung cho trang tài khoản và form đặt
// hàng. Gọi từ trình duyệt bằng `browserApi` (gắn Bearer, tự refresh khi 401).

/** Nghề nghiệp (`Occupation`) khách tự chọn ở hồ sơ. */
export const OCCUPATIONS = ["student", "lawyer", "accountant", "other"] as const;
export type Occupation = (typeof OCCUPATIONS)[number];

/** `UserResponse` của `/me` (docs/api_reference.md, mục Auth và tài khoản). */
export const profileSchema = z.object({
  id: z.number(),
  email: z.string(),
  fullName: z.string(),
  phoneNumber: z.string().nullable(),
  birthDate: z.string().nullable(),
  occupation: z.string().nullable(),
});
export type Profile = z.infer<typeof profileSchema>;

/** `UpdateProfileRequest`: PATCH gửi đủ cả 4 field, `null` là xóa. */
export interface UpdateProfileBody {
  fullName: string;
  phoneNumber: string | null;
  birthDate: string | null;
  occupation: Occupation | null;
}

/** `AddressResponse` (đề xuất, docs/features/address-book.md). */
export const addressSchema = z.object({
  id: z.number(),
  recipientName: z.string(),
  phone: z.string(),
  province: z.string(),
  ward: z.string(),
  streetAddress: z.string(),
  isDefault: z.boolean(),
});
export type Address = z.infer<typeof addressSchema>;

/** `UpsertAddressRequest` (đề xuất). */
export type AddressBody = Omit<Address, "id">;

/** `1 Xuân Thủy, Phường Cầu Giấy, Hà Nội`. */
export function addressLine(address: Pick<Address, "streetAddress" | "ward" | "province">): string {
  return [address.streetAddress, address.ward, address.province].join(", ");
}

/** Mỗi tài khoản lưu tối đa ngần này địa chỉ (đề xuất cho backend). */
export const MAX_ADDRESSES = 10;

export async function fetchProfile(): Promise<Profile> {
  return profileSchema.parse(await unwrap(browserApi().GET("/api/v1/me")));
}

export async function updateProfile(body: UpdateProfileBody): Promise<Profile> {
  const data = await unwrap(
    browserApi().PATCH("/api/v1/me", {
      body: {
        fullName: body.fullName,
        phoneNumber: body.phoneNumber,
        birthDate: body.birthDate,
        // @ts-expect-error OpenAPI sinh enum `Occupation` thành number; backend nhận chuỗi snake_case (`lawyer`).
        occupation: body.occupation,
      },
    }),
  );
  return profileSchema.parse(data);
}

/** Địa chỉ đã lưu, địa chỉ mặc định đứng đầu. */
export async function fetchAddresses(): Promise<Address[]> {
  const data = addressSchema.array().parse(await unwrap(browserApi().GET("/api/v1/me/addresses")));
  return [...data].sort((a, b) => Number(b.isDefault) - Number(a.isDefault));
}

export async function createAddress(body: AddressBody): Promise<Address> {
  return addressSchema.parse(await unwrap(browserApi().POST("/api/v1/me/addresses", { body })));
}

export async function updateAddress(id: number, body: AddressBody): Promise<Address> {
  const data = await unwrap(browserApi().PUT("/api/v1/me/addresses/{id}", { params: { path: { id } }, body }));
  return addressSchema.parse(data);
}

export async function deleteAddress(id: number): Promise<void> {
  await unwrap(browserApi().DELETE("/api/v1/me/addresses/{id}", { params: { path: { id } } }));
}
