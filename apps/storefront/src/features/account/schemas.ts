import { z } from "zod";
import { vnDateKey } from "@slvn/utils";
import { OCCUPATIONS } from "@/lib/account-api";
import type { AddressBody, Occupation, Profile, UpdateProfileBody } from "@/lib/account-api";
import { PHONE_MESSAGE, isValidPhone, normalizePhone } from "@/lib/phone";

export const OCCUPATION_LABELS: Record<Occupation, string> = {
  student: "Sinh viên",
  lawyer: "Luật sư",
  accountant: "Kế toán",
  other: "Khác",
};

const tooLong = (max: number) => `Tối đa ${max} ký tự.`;

function text(label: string, max: number) {
  return z.string().trim().min(1, `Vui lòng nhập ${label}.`).max(max, tooLong(max));
}

const DATE_PATTERN = /^\d{4}-\d{2}-\d{2}$/;

/** Form hồ sơ; tên field trùng `UpdateProfileRequest` để map lỗi validate của backend. */
export const profileFormSchema = z.object({
  fullName: text("họ tên", 255),
  phoneNumber: z
    .string()
    .trim()
    .refine((value) => value === "" || isValidPhone(value), PHONE_MESSAGE),
  birthDate: z
    .string()
    .refine((value) => value === "" || DATE_PATTERN.test(value), "Ngày sinh chưa hợp lệ.")
    // So sánh chuỗi `YYYY-MM-DD` theo ngày Việt Nam: không cho chọn ngày trong tương lai.
    .refine((value) => value === "" || value <= vnDateKey(new Date()), "Ngày sinh không được ở tương lai."),
  occupation: z.union([z.literal(""), z.enum(OCCUPATIONS)]),
});
export type ProfileFormValues = z.infer<typeof profileFormSchema>;

export const PROFILE_FIELDS = ["fullName", "phoneNumber", "birthDate", "occupation"] as const;

function isOccupation(value: string | null): value is Occupation {
  return OCCUPATIONS.some((occupation) => occupation === value);
}

export function profileFormValues(profile: Profile): ProfileFormValues {
  return {
    fullName: profile.fullName,
    phoneNumber: profile.phoneNumber ?? "",
    birthDate: profile.birthDate ?? "",
    occupation: isOccupation(profile.occupation) ? profile.occupation : "",
  };
}

/** PATCH `/me` gửi đủ 4 field; ô để trống gửi `null` (xóa giá trị cũ). */
export function toUpdateProfileBody(values: ProfileFormValues): UpdateProfileBody {
  const phone = values.phoneNumber.trim();
  return {
    fullName: values.fullName.trim(),
    phoneNumber: phone ? normalizePhone(phone) : null,
    birthDate: values.birthDate || null,
    occupation: values.occupation || null,
  };
}

/** Form một địa chỉ giao hàng; tên field trùng `UpsertAddressRequest` (đề xuất). */
export const addressFormSchema = z.object({
  recipientName: text("tên người nhận", 255),
  phone: z.string().trim().refine(isValidPhone, PHONE_MESSAGE),
  province: text("tỉnh/thành phố", 100),
  ward: text("phường/xã", 100),
  streetAddress: text("số nhà, tên đường", 500),
  isDefault: z.boolean(),
});
export type AddressFormValues = z.infer<typeof addressFormSchema>;

export const ADDRESS_FIELDS = ["recipientName", "phone", "province", "ward", "streetAddress"] as const;

export const EMPTY_ADDRESS: AddressFormValues = {
  recipientName: "",
  phone: "",
  province: "",
  ward: "",
  streetAddress: "",
  isDefault: false,
};

export function toAddressBody(values: AddressFormValues): AddressBody {
  return {
    recipientName: values.recipientName.trim(),
    phone: normalizePhone(values.phone.trim()),
    province: values.province.trim(),
    ward: values.ward.trim(),
    streetAddress: values.streetAddress.trim(),
    isDefault: values.isDefault,
  };
}
