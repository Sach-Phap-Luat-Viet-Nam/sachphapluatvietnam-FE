import { unwrap } from "@slvn/api-client";
import { browserApi } from "@slvn/auth";
import type { SettingsBody, ZoneBody } from "./shipping-form";
import { shippingSettingsSchema, zoneListSchema, zoneSchema } from "./schemas";
import type { ShippingSettings, Zone } from "./schemas";

// API Admin vận chuyển (docs/features/checkout-promotion-shipping.md, mục 7.2): `super_admin`, `order_manager`,
// bắt buộc 2FA.

export async function fetchZones(): Promise<Zone[]> {
  const data = await unwrap(browserApi().GET("/api/v1/admin/shipping/zones"));
  const parsed = zoneListSchema.parse(data);
  return Array.isArray(parsed) ? parsed : parsed.items;
}

export async function createZone(body: ZoneBody): Promise<Zone> {
  return zoneSchema.parse(await unwrap(browserApi().POST("/api/v1/admin/shipping/zones", { body })));
}

export async function updateZone(id: number, body: ZoneBody): Promise<Zone> {
  const data = await unwrap(browserApi().PUT("/api/v1/admin/shipping/zones/{id}", { params: { path: { id } }, body }));
  return zoneSchema.parse(data);
}

/** Xóa vùng cùng danh sách tỉnh của vùng. */
export async function deleteZone(id: number): Promise<void> {
  await unwrap(browserApi().DELETE("/api/v1/admin/shipping/zones/{id}", { params: { path: { id } } }));
}

export async function fetchShippingSettings(): Promise<ShippingSettings> {
  return shippingSettingsSchema.parse(await unwrap(browserApi().GET("/api/v1/admin/shipping/settings")));
}

export async function saveShippingSettings(body: SettingsBody): Promise<ShippingSettings> {
  return shippingSettingsSchema.parse(await unwrap(browserApi().PUT("/api/v1/admin/shipping/settings", { body })));
}

export const shippingKeys = {
  zones: ["shipping", "zones"] as const,
  settings: ["shipping", "settings"] as const,
};
