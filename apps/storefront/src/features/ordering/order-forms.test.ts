import { describe, expect, it } from "vitest";
import { CHECKOUT_DEFAULTS, checkoutSchema, orderLookupSchema, toCreateOrderBody } from "./order-forms";
import type { CheckoutValues } from "./order-forms";

const filled: CheckoutValues = {
  ...CHECKOUT_DEFAULTS,
  customerName: " Nguyễn Văn A ",
  phone: "090 123 4567",
  shippingAddress: { province: "Hà Nội", ward: "Phường Cầu Giấy", streetAddress: "1 Xuân Thủy" },
};

function issues(values: CheckoutValues) {
  const result = checkoutSchema.safeParse(values);
  return result.success ? {} : Object.fromEntries(result.error.issues.map((issue) => [issue.path.join("."), issue]));
}

describe("checkoutSchema", () => {
  it("requires the recipient and address", () => {
    expect(Object.keys(issues(CHECKOUT_DEFAULTS))).toEqual(
      expect.arrayContaining([
        "customerName",
        "phone",
        "shippingAddress.province",
        "shippingAddress.ward",
        "shippingAddress.streetAddress",
      ]),
    );
    expect(issues(filled)).toEqual({});
  });

  it("accepts Vietnamese phone formats only", () => {
    expect(issues({ ...filled, phone: "+84901234567" })).toEqual({});
    expect(issues({ ...filled, phone: "0901.234.567" })).toEqual({});
    expect(issues({ ...filled, phone: "901234567" })).toHaveProperty("phone");
    expect(issues({ ...filled, phone: "09012345678" })).toHaveProperty("phone");
  });

  it("validates the optional email", () => {
    expect(issues({ ...filled, email: "" })).toEqual({});
    expect(issues({ ...filled, email: "khach@" })).toHaveProperty("email");
  });

  it("only validates invoice fields when an invoice is requested", () => {
    const invoice = { companyName: "", taxCode: "123", address: "", email: "" };
    expect(issues({ ...filled, invoiceInfo: invoice })).toEqual({});
    expect(Object.keys(issues({ ...filled, wantsInvoice: true, invoiceInfo: invoice }))).toEqual([
      "invoiceInfo.companyName",
      "invoiceInfo.taxCode",
      "invoiceInfo.address",
      "invoiceInfo.email",
    ]);
    const valid = { companyName: "Công ty A", taxCode: "0101234567-001", address: "Hà Nội", email: "kt@a.vn" };
    expect(issues({ ...filled, wantsInvoice: true, invoiceInfo: valid })).toEqual({});
  });
});

describe("toCreateOrderBody", () => {
  it("trims values, normalizes the phone and sends null for empty optional fields", () => {
    expect(toCreateOrderBody({ ...filled, note: "  " })).toEqual({
      customerName: "Nguyễn Văn A",
      phone: "0901234567",
      email: null,
      shippingAddress: { province: "Hà Nội", ward: "Phường Cầu Giấy", streetAddress: "1 Xuân Thủy" },
      paymentMethod: "cod",
      invoiceInfo: null,
      note: null,
    });
  });

  it("includes the invoice only when requested", () => {
    const invoiceInfo = { companyName: " Công ty A ", taxCode: "0101234567", address: "Hà Nội", email: "kt@a.vn" };
    expect(toCreateOrderBody({ ...filled, invoiceInfo }).invoiceInfo).toBeNull();
    expect(toCreateOrderBody({ ...filled, wantsInvoice: true, invoiceInfo }).invoiceInfo).toEqual({
      ...invoiceInfo,
      companyName: "Công ty A",
    });
  });
});

describe("orderLookupSchema", () => {
  it("uppercases the order code and normalizes the phone", () => {
    expect(orderLookupSchema.parse({ orderCode: " slvn2610230001 ", phone: "090 123 4567" })).toEqual({
      orderCode: "SLVN2610230001",
      phone: "0901234567",
    });
    expect(orderLookupSchema.safeParse({ orderCode: "", phone: "123" }).success).toBe(false);
  });
});
