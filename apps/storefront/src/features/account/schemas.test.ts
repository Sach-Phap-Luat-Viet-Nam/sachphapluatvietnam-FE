import { describe, expect, it } from "vitest";
import {
  EMPTY_ADDRESS,
  addressFormSchema,
  profileFormSchema,
  profileFormValues,
  toAddressBody,
  toUpdateProfileBody,
} from "./schemas";

const profile = {
  id: 12,
  email: "khach@example.com",
  fullName: "Nguyễn Văn A",
  phoneNumber: null,
  birthDate: null,
  occupation: "robot",
  defaultAddress: null,
  invoiceInfo: null,
};

describe("profile form", () => {
  it("fills the form from the profile, ignoring unknown occupations", () => {
    expect(profileFormValues(profile)).toEqual({
      fullName: "Nguyễn Văn A",
      phoneNumber: "",
      birthDate: "",
      occupation: "",
    });
  });

  it("validates the phone, birth date and name", () => {
    const valid = { fullName: "A", phoneNumber: "", birthDate: "1995-05-20", occupation: "lawyer" as const };
    expect(profileFormSchema.safeParse(valid).success).toBe(true);
    expect(profileFormSchema.safeParse({ ...valid, fullName: " " }).success).toBe(false);
    expect(profileFormSchema.safeParse({ ...valid, phoneNumber: "12345" }).success).toBe(false);
    expect(profileFormSchema.safeParse({ ...valid, birthDate: "2999-01-01" }).success).toBe(false);
  });

  it("sends all four fields and null for empty ones", () => {
    expect(
      toUpdateProfileBody({ fullName: " Nguyễn Văn B ", phoneNumber: "090 123 4567", birthDate: "", occupation: "" }),
    ).toEqual({ fullName: "Nguyễn Văn B", phoneNumber: "0901234567", birthDate: null, occupation: null });
  });
});

describe("address form", () => {
  it("requires every address field and a valid phone", () => {
    expect(addressFormSchema.safeParse(EMPTY_ADDRESS).success).toBe(false);
    const filled = {
      recipientName: "Nguyễn Văn A",
      phone: "0901 234 567",
      province: "Hà Nội",
      ward: "Phường Cầu Giấy",
      streetAddress: "1 Xuân Thủy",
      isDefault: true,
    };
    expect(addressFormSchema.safeParse(filled).success).toBe(true);
    expect(toAddressBody({ ...filled, province: " Hà Nội " })).toEqual({ ...filled, phone: "0901234567" });
  });
});
