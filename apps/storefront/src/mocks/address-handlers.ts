import { http, HttpResponse } from "msw";
import { MAX_ADDRESSES } from "@/lib/account-api";
import type { Address, AddressBody } from "@/lib/account-api";

// Giả lập API sổ địa chỉ theo backend (`MeController`, `AddressBook`) cho unit test (msw/node). Dữ liệu chỉ nằm trong
// bộ nhớ.

function problem(status: number, code: string, title: string) {
  return HttpResponse.json({ title, status, code, traceId: "mock" }, { status });
}

function isAddressBody(value: unknown): value is AddressBody {
  if (!value || typeof value !== "object") return false;
  const fields = ["recipientName", "phone", "province", "ward", "streetAddress"];
  return fields.every((field) => typeof Reflect.get(value, field) === "string") && "isDefault" in value;
}

const notFound = () => problem(404, "ADDRESS_NOT_FOUND", "Không tìm thấy địa chỉ");

/** Handler cho `/api/v1/me/addresses`, mỗi lần gọi là một sổ địa chỉ riêng (để test không dính nhau). */
export function addressHandlers(initial: Address[] = []) {
  let addresses = initial.map((address) => ({ ...address }));
  let nextId = Math.max(0, ...addresses.map((address) => address.id)) + 1;
  let clock = Date.parse("2026-10-24T00:00:00Z");
  const now = () => new Date((clock += 1000)).toISOString();

  // Như backend: mặc định đứng đầu, rồi đến địa chỉ cập nhật gần nhất.
  const book = () =>
    [...addresses].sort(
      (a, b) => Number(b.isDefault) - Number(a.isDefault) || b.updatedAt.localeCompare(a.updatedAt) || b.id - a.id,
    );
  const makeDefault = (id: number) => {
    addresses = addresses.map((address) => ({ ...address, isDefault: address.id === id }));
  };

  return [
    http.get("*/api/v1/me/addresses", () => HttpResponse.json(book())),
    http.post("*/api/v1/me/addresses", async ({ request }) => {
      const body: unknown = await request.json();
      if (!isAddressBody(body)) return problem(400, "VALIDATION_ERROR", "Dữ liệu chưa hợp lệ");
      if (addresses.length >= MAX_ADDRESSES) {
        return problem(422, "ADDRESS_LIMIT_REACHED", `Sổ địa chỉ tối đa ${MAX_ADDRESSES} địa chỉ`);
      }
      const address = { ...body, id: nextId++, isDefault: false, updatedAt: now() };
      addresses.push(address);
      if (body.isDefault || addresses.length === 1) makeDefault(address.id);
      return HttpResponse.json(book(), { status: 201 });
    }),
    http.put("*/api/v1/me/addresses/:id", async ({ params, request }) => {
      const id = Number(params.id);
      const body: unknown = await request.json();
      if (!isAddressBody(body)) return problem(400, "VALIDATION_ERROR", "Dữ liệu chưa hợp lệ");
      if (!addresses.some((address) => address.id === id)) return notFound();
      // `isDefault: false` không bỏ cờ mặc định.
      addresses = addresses.map((address) =>
        address.id === id ? { ...body, id, isDefault: address.isDefault, updatedAt: now() } : address,
      );
      if (body.isDefault) makeDefault(id);
      return HttpResponse.json(book());
    }),
    http.post("*/api/v1/me/addresses/:id/default", ({ params }) => {
      const id = Number(params.id);
      if (!addresses.some((address) => address.id === id)) return notFound();
      makeDefault(id);
      return HttpResponse.json(book());
    }),
    http.delete("*/api/v1/me/addresses/:id", ({ params }) => {
      const id = Number(params.id);
      const removed = addresses.find((address) => address.id === id);
      if (!removed) return notFound();
      addresses = addresses.filter((address) => address.id !== id);
      // Xóa địa chỉ mặc định thì địa chỉ cập nhật gần nhất còn lại thành mặc định.
      const next = book()[0];
      if (removed.isDefault && next) makeDefault(next.id);
      return new HttpResponse(null, { status: 204 });
    }),
  ];
}
