import { z } from "zod";
import { unwrap } from "@slvn/api-client";
import { browserApi } from "@slvn/auth";

// Hồ sơ (`/me`), sổ địa chỉ (`/me/addresses`) và thông tin xuất hóa đơn (`/me/invoice-info`) của khách đang đăng nhập
// (backend `MeController`, docs/features/auth.md của backend). Dùng chung cho trang tài khoản và form đặt hàng. Gọi từ
// trình duyệt bằng `browserApi` (gắn Bearer, tự refresh khi 401).

/** Nghề nghiệp (`Occupation`) khách tự chọn ở hồ sơ. */
export const OCCUPATIONS = ["student", "lawyer", "accountant", "other"] as const;
export type Occupation = (typeof OCCUPATIONS)[number];

/** `AddressResponse`. `recipientName`/`phone` điền vào `customerName`/`phone` khi đặt hàng. */
export const addressSchema = z.object({
  id: z.number(),
  recipientName: z.string(),
  phone: z.string(),
  province: z.string(),
  ward: z.string(),
  streetAddress: z.string(),
  isDefault: z.boolean(),
  updatedAt: z.string(),
});
export type Address = z.infer<typeof addressSchema>;

/** `UpsertAddressRequest`. `isDefault: false` không bỏ được cờ mặc định (sổ không rỗng luôn có một địa chỉ mặc định). */
export type AddressBody = Omit<Address, "id" | "updatedAt">;

/** `InvoiceInfoResponse`. */
export const invoiceInfoSchema = z.object({
  companyName: z.string(),
  taxCode: z.string(),
  address: z.string(),
  email: z.string(),
  updatedAt: z.string(),
});
export type InvoiceInfo = z.infer<typeof invoiceInfoSchema>;

/** `UpsertInvoiceInfoRequest`. */
export type InvoiceInfoBody = Omit<InvoiceInfo, "updatedAt">;

/**
 * `MeResponse` của `GET/PATCH /me`: hồ sơ kèm địa chỉ mặc định và thông tin hóa đơn (`null` khi chưa có). Backend bản cũ
 * chưa trả hai field này (chỉ có các field của `UserResponse`) nên thiếu thì coi như `null`.
 */
export const profileSchema = z.object({
  id: z.number(),
  email: z.string(),
  fullName: z.string(),
  phoneNumber: z.string().nullable(),
  birthDate: z.string().nullable(),
  occupation: z.string().nullable(),
  /** Thiếu ở backend chưa có tính năng avatar: coi như chưa có ảnh. */
  avatarUrl: z.string().nullable().default(null),
  defaultAddress: addressSchema.nullable().default(null),
  invoiceInfo: invoiceInfoSchema.nullable().default(null),
});
export type Profile = z.infer<typeof profileSchema>;

/** `UpdateProfileRequest`: PATCH gửi đủ cả 4 field, `null` là xóa. */
export interface UpdateProfileBody {
  fullName: string;
  phoneNumber: string | null;
  birthDate: string | null;
  occupation: Occupation | null;
}

/** `1 Xuân Thủy, Phường Cầu Giấy, Hà Nội`. */
export function addressLine(address: Pick<Address, "streetAddress" | "ward" | "province">): string {
  return [address.streetAddress, address.ward, address.province].join(", ");
}

/** Mỗi tài khoản lưu tối đa ngần này địa chỉ (`AddressBook.MaxAddresses`, quá thì `ADDRESS_LIMIT_REACHED`). */
export const MAX_ADDRESSES = 10;

const addressBookSchema = addressSchema.array();

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

// Các API sổ địa chỉ trả cả sổ, backend đã sắp: mặc định đứng đầu, rồi đến địa chỉ cập nhật gần nhất.

export async function fetchAddresses(): Promise<Address[]> {
  return addressBookSchema.parse(await unwrap(browserApi().GET("/api/v1/me/addresses")));
}

/** Thêm địa chỉ → 201 cả sổ. Địa chỉ đầu tiên tự thành mặc định. */
export async function createAddress(body: AddressBody): Promise<Address[]> {
  return addressBookSchema.parse(await unwrap(browserApi().POST("/api/v1/me/addresses", { body })));
}

export async function updateAddress(id: number, body: AddressBody): Promise<Address[]> {
  const data = await unwrap(browserApi().PUT("/api/v1/me/addresses/{id}", { params: { path: { id } }, body }));
  return addressBookSchema.parse(data);
}

export async function setDefaultAddress(id: number): Promise<Address[]> {
  const data = await unwrap(browserApi().POST("/api/v1/me/addresses/{id}/default", { params: { path: { id } } }));
  return addressBookSchema.parse(data);
}

/** 204. Xóa địa chỉ mặc định thì địa chỉ cập nhật gần nhất còn lại thành mặc định. */
export async function deleteAddress(id: number): Promise<void> {
  await unwrap(browserApi().DELETE("/api/v1/me/addresses/{id}", { params: { path: { id } } }));
}

export async function saveInvoiceInfo(body: InvoiceInfoBody): Promise<InvoiceInfo> {
  return invoiceInfoSchema.parse(await unwrap(browserApi().PUT("/api/v1/me/invoice-info", { body })));
}

/** 204. */
export async function deleteInvoiceInfo(): Promise<void> {
  await unwrap(browserApi().DELETE("/api/v1/me/invoice-info"));
}
