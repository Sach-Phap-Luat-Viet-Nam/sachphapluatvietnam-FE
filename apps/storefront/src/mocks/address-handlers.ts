import { http, HttpResponse } from "msw";
import { MAX_ADDRESSES } from "@/lib/account-api";
import type { Address, AddressBody } from "@/lib/account-api";

// Giả lập API sổ địa chỉ đề xuất (docs/features/address-book.md) khi backend chưa làm: dùng trong unit test (msw/node)
// và khi chạy dev với `NEXT_PUBLIC_API_MOCKING=addresses` (msw/browser). Dữ liệu chỉ nằm trong bộ nhớ.

function problem(status: number, code: string, title: string) {
  return HttpResponse.json({ title, status, code, traceId: "mock" }, { status });
}

function isAddressBody(value: unknown): value is AddressBody {
  if (!value || typeof value !== "object") return false;
  const fields = ["recipientName", "phone", "province", "ward", "streetAddress"];
  return fields.every((field) => typeof Reflect.get(value, field) === "string") && "isDefault" in value;
}

/** Handler cho `/api/v1/me/addresses`, mỗi lần gọi là một sổ địa chỉ riêng (để test không dính nhau). */
export function addressHandlers(initial: Address[] = []) {
  let addresses = initial.map((address) => ({ ...address }));
  let nextId = Math.max(0, ...addresses.map((address) => address.id)) + 1;

  // Quy tắc đề xuất: luôn có đúng một địa chỉ mặc định nếu sổ không trống.
  const keepOneDefault = (preferredId?: number) => {
    const defaultId = preferredId ?? addresses.find((address) => address.isDefault)?.id ?? addresses[0]?.id;
    addresses = addresses.map((address) => ({ ...address, isDefault: address.id === defaultId }));
  };

  return [
    http.get("*/api/v1/me/addresses", () => HttpResponse.json(addresses)),
    http.post("*/api/v1/me/addresses", async ({ request }) => {
      const body: unknown = await request.json();
      if (!isAddressBody(body)) return problem(400, "VALIDATION_ERROR", "Dữ liệu chưa hợp lệ");
      if (addresses.length >= MAX_ADDRESSES) {
        return problem(422, "ADDRESS_LIMIT_REACHED", `Mỗi tài khoản lưu tối đa ${MAX_ADDRESSES} địa chỉ`);
      }
      const address = { ...body, id: nextId++ };
      addresses.push(address);
      keepOneDefault(body.isDefault || addresses.length === 1 ? address.id : undefined);
      return HttpResponse.json(
        addresses.find((item) => item.id === address.id),
        { status: 201 },
      );
    }),
    http.put("*/api/v1/me/addresses/:id", async ({ params, request }) => {
      const id = Number(params.id);
      const body: unknown = await request.json();
      if (!isAddressBody(body)) return problem(400, "VALIDATION_ERROR", "Dữ liệu chưa hợp lệ");
      if (!addresses.some((address) => address.id === id)) return problem(404, "NOT_FOUND", "Không tìm thấy địa chỉ");
      addresses = addresses.map((address) => (address.id === id ? { ...body, id } : address));
      keepOneDefault(body.isDefault ? id : undefined);
      return HttpResponse.json(addresses.find((address) => address.id === id));
    }),
    http.delete("*/api/v1/me/addresses/:id", ({ params }) => {
      const id = Number(params.id);
      if (!addresses.some((address) => address.id === id)) return problem(404, "NOT_FOUND", "Không tìm thấy địa chỉ");
      addresses = addresses.filter((address) => address.id !== id);
      keepOneDefault();
      return new HttpResponse(null, { status: 204 });
    }),
  ];
}
