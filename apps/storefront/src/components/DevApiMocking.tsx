"use client";

import dynamic from "next/dynamic";
import { publicEnv } from "@/lib/public-env";

// `ssr: false`: `msw/browser` không có bản cho server, và chỉ tải MSW khi bật giả lập.
const DevApiMockingWorker = dynamic(
  () => import("./DevApiMockingWorker").then((module) => module.DevApiMockingWorker),
  { ssr: false },
);

/** Bật MSW trong trình duyệt khi `NEXT_PUBLIC_API_MOCKING=addresses` để thử sổ địa chỉ trước khi backend có API. */
export function DevApiMocking() {
  return publicEnv.NEXT_PUBLIC_API_MOCKING === "addresses" ? <DevApiMockingWorker /> : null;
}
