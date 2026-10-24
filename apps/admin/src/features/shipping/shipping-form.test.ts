import { describe, expect, it } from "vitest";
import { emptyZoneForm, estimateShippingFee, settingsToFormValues, toSettingsBody, toZoneBody } from "./shipping-form";
import { zoneFormSchema } from "./schemas";

const TARIFF = { baseWeightGram: 1000, baseFee: 20000, stepWeightGram: 500, stepFee: 5000 };

describe("estimateShippingFee", () => {
  it("matches the example in the docs: 1.900 g costs 30.000đ", () => {
    expect(estimateShippingFee(TARIFF, 1900)).toBe(30000);
  });

  it("charges only the base fee up to the base weight", () => {
    expect(estimateShippingFee(TARIFF, 400)).toBe(20000);
    expect(estimateShippingFee(TARIFF, 1000)).toBe(20000);
  });

  it("rounds every started step up", () => {
    expect(estimateShippingFee(TARIFF, 1001)).toBe(25000);
    expect(estimateShippingFee(TARIFF, 1500)).toBe(25000);
    expect(estimateShippingFee(TARIFF, 1501)).toBe(30000);
  });
});

describe("zoneFormSchema", () => {
  const valid = { ...emptyZoneForm(), name: "Nội thành", provinces: ["Hà Nội"] };

  it("accepts a complete zone and maps it to the request body", () => {
    const parsed = zoneFormSchema.parse(valid);
    expect(toZoneBody(parsed)).toEqual({
      name: "Nội thành",
      isActive: true,
      sortOrder: 0,
      provinces: ["Hà Nội"],
      baseWeightGram: 1000,
      baseFee: 20000,
      stepWeightGram: 500,
      stepFee: 5000,
      etaMinDays: 2,
      etaMaxDays: 4,
    });
  });

  it("requires a province and a valid delivery estimate", () => {
    const result = zoneFormSchema.safeParse({ ...valid, provinces: [], etaMinDays: "5", etaMaxDays: "3" });
    expect(result.success).toBe(false);
    const messages = result.error?.issues.map((issue) => issue.message) ?? [];
    expect(messages).toContain("Chọn ít nhất một tỉnh/thành.");
    expect(messages).toContain("Số ngày tối đa phải từ số ngày tối thiểu trở lên.");
  });

  it("rejects more than 60 days of delivery estimate", () => {
    expect(zoneFormSchema.safeParse({ ...valid, etaMaxDays: "61" }).success).toBe(false);
  });
});

describe("settings mapping", () => {
  it("turns an empty threshold into null (free shipping by threshold off)", () => {
    const form = settingsToFormValues({
      freeShippingThreshold: null,
      packagingWeightGram: 200,
      defaultBookWeightGram: 500,
      flatFee: 30000,
      isDefault: true,
    });
    expect(form.freeShippingThreshold).toBe("");
    expect(toSettingsBody(form)).toEqual({
      freeShippingThreshold: null,
      packagingWeightGram: 200,
      defaultBookWeightGram: 500,
      flatFee: 30000,
    });
  });
});
