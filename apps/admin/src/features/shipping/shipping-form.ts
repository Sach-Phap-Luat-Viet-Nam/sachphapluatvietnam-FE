import type { SettingsFormValues, ShippingSettings, Zone, ZoneFormValues } from "./schemas";

export function emptyZoneForm(sortOrder = 0): ZoneFormValues {
  return {
    name: "",
    isActive: true,
    sortOrder: String(sortOrder),
    provinces: [],
    baseWeightGram: "1000",
    baseFee: "20000",
    stepWeightGram: "500",
    stepFee: "5000",
    etaMinDays: "2",
    etaMaxDays: "4",
  };
}

export function zoneToFormValues(zone: Zone): ZoneFormValues {
  return {
    name: zone.name,
    isActive: zone.isActive,
    sortOrder: String(zone.sortOrder),
    provinces: zone.provinces,
    baseWeightGram: String(zone.baseWeightGram),
    baseFee: String(zone.baseFee),
    stepWeightGram: String(zone.stepWeightGram),
    stepFee: String(zone.stepFee),
    etaMinDays: String(zone.etaMinDays),
    etaMaxDays: String(zone.etaMaxDays),
  };
}

/** Body `UpsertZone`. */
export function toZoneBody(values: ZoneFormValues) {
  return {
    name: values.name.trim(),
    isActive: values.isActive,
    sortOrder: Number(values.sortOrder),
    provinces: values.provinces,
    baseWeightGram: Number(values.baseWeightGram),
    baseFee: Number(values.baseFee),
    stepWeightGram: Number(values.stepWeightGram),
    stepFee: Number(values.stepFee),
    etaMinDays: Number(values.etaMinDays),
    etaMaxDays: Number(values.etaMaxDays),
  };
}
export type ZoneBody = ReturnType<typeof toZoneBody>;

export function settingsToFormValues(settings: ShippingSettings): SettingsFormValues {
  return {
    freeShippingThreshold: settings.freeShippingThreshold === null ? "" : String(settings.freeShippingThreshold),
    packagingWeightGram: String(settings.packagingWeightGram),
    defaultBookWeightGram: String(settings.defaultBookWeightGram),
    flatFee: String(settings.flatFee),
  };
}

/** Body `ShippingSettings` (không có `isDefault`, chỉ có ở response). */
export function toSettingsBody(values: SettingsFormValues) {
  return {
    freeShippingThreshold: values.freeShippingThreshold === "" ? null : Number(values.freeShippingThreshold),
    packagingWeightGram: Number(values.packagingWeightGram),
    defaultBookWeightGram: Number(values.defaultBookWeightGram),
    flatFee: Number(values.flatFee),
  };
}
export type SettingsBody = ReturnType<typeof toSettingsBody>;

/**
 * Phí minh họa cho ô "Tính thử": `baseFee` cho `baseWeightGram` đầu, mỗi `stepWeightGram` tiếp theo (làm tròn lên) cộng
 * `stepFee`. Chỉ để Admin hình dung biểu phí; số thật luôn do backend tính.
 */
export function estimateShippingFee(
  zone: Pick<Zone, "baseWeightGram" | "baseFee" | "stepWeightGram" | "stepFee">,
  weightGram: number,
): number {
  const extra = Math.max(0, weightGram - zone.baseWeightGram);
  const steps = zone.stepWeightGram > 0 ? Math.ceil(extra / zone.stepWeightGram) : 0;
  return zone.baseFee + steps * zone.stepFee;
}
