import { z } from "zod";

// Biến `NEXT_PUBLIC_*` được Next.js thay giá trị lúc build nên phải ghi đủ tên `process.env.NEXT_PUBLIC_...`.
// Chỉ chứa giá trị công khai, dùng được ở cả server và trình duyệt.

const publicEnvSchema = z.object({
  /** `addresses`: giả lập API sổ địa chỉ bằng MSW trong trình duyệt (chỉ dùng khi dev, backend chưa có API). */
  NEXT_PUBLIC_API_MOCKING: z.enum(["addresses"]).optional(),
});

export const publicEnv = publicEnvSchema.parse({
  NEXT_PUBLIC_API_MOCKING: process.env.NEXT_PUBLIC_API_MOCKING || undefined,
});
