import { describe, expect, it } from "vitest";
import { profileSchema } from "./account-api";

const USER_RESPONSE = {
  id: 2,
  email: "khach@example.com",
  fullName: "Khách hàng thử",
  phoneNumber: null,
  birthDate: null,
  occupation: null,
  roles: ["customer"],
  twoFactorEnabled: false,
  requiresTwoFactorSetup: false,
};

describe("profileSchema", () => {
  it("reads profiles from backends that do not send the address book fields yet", () => {
    expect(profileSchema.parse(USER_RESPONSE)).toMatchObject({ defaultAddress: null, invoiceInfo: null });
  });

  it("reads the default address and invoice info", () => {
    const invoiceInfo = {
      companyName: "Công ty TNHH Luật ABC",
      taxCode: "0101234567",
      address: "1 Tràng Tiền, Hà Nội",
      email: "ketoan@abc.vn",
      updatedAt: "2026-10-24T05:30:00Z",
    };
    expect(profileSchema.parse({ ...USER_RESPONSE, defaultAddress: null, invoiceInfo }).invoiceInfo).toEqual(
      invoiceInfo,
    );
  });
});
