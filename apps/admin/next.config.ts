import path from "node:path";
import type { NextConfig } from "next";

// Dockerfile đặt NEXT_OUTPUT=standalone (docs/deploy-self-host.md); Vercel giữ output mặc định.
const standalone =
  process.env.NEXT_OUTPUT === "standalone"
    ? // Trace từ gốc monorepo để bản standalone có cả packages/*.
      { output: "standalone" as const, outputFileTracingRoot: path.join(import.meta.dirname, "../..") }
    : {};

const config: NextConfig = { transpilePackages: ["@slvn/auth", "@slvn/ui", "@slvn/utils"], ...standalone };
export default config;
