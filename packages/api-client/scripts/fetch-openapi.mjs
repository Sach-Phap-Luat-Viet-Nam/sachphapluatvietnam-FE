// Tải OpenAPI từ backend đang chạy về `openapi/v1.json`, sau đó chạy `pnpm api:generate` để sinh lại type.
import { writeFile } from "node:fs/promises";

const url = process.env.OPENAPI_URL ?? "http://localhost:5279/openapi/v1.json";
const output = new URL("../openapi/v1.json", import.meta.url);

const response = await fetch(url);
if (!response.ok) {
  console.error(`Không tải được OpenAPI từ ${url}: HTTP ${response.status}`);
  process.exit(1);
}

const spec = await response.json();
await writeFile(output, `${JSON.stringify(spec, null, 2)}\n`);
console.warn(`Đã lưu OpenAPI từ ${url} vào openapi/v1.json`);
