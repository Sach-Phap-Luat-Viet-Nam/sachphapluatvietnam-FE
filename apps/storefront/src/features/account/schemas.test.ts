import { describe, expect, it } from "vitest";
import {
  EMPTY_ADDRESS,
  addressFormSchema,
  maskBirthDate,
  parseBirthDate,
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
  avatarUrl: null,
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
    const valid = { fullName: "A", phoneNumber: "", birthDate: "20/05/1995", occupation: "lawyer" as const };
    expect(profileFormSchema.safeParse(valid).success).toBe(true);
    expect(profileFormSchema.safeParse({ ...valid, fullName: " " }).success).toBe(false);
    expect(profileFormSchema.safeParse({ ...valid, phoneNumber: "12345" }).success).toBe(false);
    expect(profileFormSchema.safeParse({ ...valid, birthDate: "01/01/2999" }).success).toBe(false);
    expect(profileFormSchema.safeParse({ ...valid, birthDate: "1995-05-20" }).success).toBe(false);
  });

  it("reads birth dates as dd/mm/yyyy and rejects days that do not exist", () => {
    expect(parseBirthDate("20/05/1995")).toBe("1995-05-20");
    expect(parseBirthDate("29/02/2000")).toBe("2000-02-29");
    expect(parseBirthDate("29/02/2001")).toBeNull();
    expect(parseBirthDate("31/04/1995")).toBeNull();
    expect(parseBirthDate("05/20/1995")).toBeNull();
    expect(parseBirthDate("2/5/1995")).toBeNull();
  });

  it("inserts slashes while typing the birth date", () => {
    expect(maskBirthDate("2")).toBe("2");
    expect(maskBirthDate("2005")).toBe("20/05");
    expect(maskBirthDate("20051995")).toBe("20/05/1995");
    expect(maskBirthDate("20/05/1995 9")).toBe("20/05/1995");
  });

  it("shows the saved birth date as dd/mm/yyyy and sends it back as yyyy-mm-dd", () => {
    expect(profileFormValues({ ...profile, birthDate: "1995-05-20" }).birthDate).toBe("20/05/1995");
    expect(
      toUpdateProfileBody({ fullName: "A", phoneNumber: "", birthDate: "20/05/1995", occupation: "" }).birthDate,
    ).toBe("1995-05-20");
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
