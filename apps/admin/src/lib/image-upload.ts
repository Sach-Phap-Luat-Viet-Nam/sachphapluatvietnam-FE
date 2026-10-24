import { z } from "zod";
import { unwrap } from "@slvn/api-client";
import { browserApi } from "@slvn/auth";

// Upload ảnh có ký lên Cloudinary (docs/features/catalog.md, mục Ảnh bìa): file đi thẳng từ trình duyệt lên
// Cloudinary, backend chỉ ký. Docs chưa ghi kiểu của `timestamp`, `allowedFormats` nên nhận cả số/chuỗi/mảng.

const uploadSignatureSchema = z.object({
  uploadUrl: z.url(),
  apiKey: z.string(),
  timestamp: z.union([z.number(), z.string()]).transform(String),
  folder: z.string(),
  allowedFormats: z.union([z.string(), z.array(z.string())]).transform((value) =>
    Array.isArray(value) ? value.join(",") : value,
  ),
  signature: z.string(),
});
export type UploadSignature = z.infer<typeof uploadSignatureSchema>;

const cloudinaryResultSchema = z.object({ secure_url: z.url() });

export type UploadTarget = "cover" | "popup";

const SIGNATURE_PATHS = {
  cover: "/api/v1/admin/uploads/cover-signature",
  popup: "/api/v1/admin/uploads/popup-signature",
} as const;

/** Giới hạn phía FE để không gửi file quá lớn; Cloudinary vẫn tự kiểm tra theo gói tài khoản. */
export const MAX_IMAGE_BYTES = 10 * 1024 * 1024;

/** Lỗi khi gửi file lên Cloudinary (không phải lỗi của API backend). */
export class ImageUploadError extends Error {
  constructor(message: string) {
    super(message);
    this.name = "ImageUploadError";
  }
}

/** Form gửi lên Cloudinary: phải đúng các tham số đã ký, thêm/bớt tham số thì chữ ký sai. */
export function cloudinaryFormData(file: Blob, signature: UploadSignature): FormData {
  const form = new FormData();
  form.append("file", file);
  form.append("api_key", signature.apiKey);
  form.append("timestamp", signature.timestamp);
  form.append("folder", signature.folder);
  form.append("allowed_formats", signature.allowedFormats);
  form.append("signature", signature.signature);
  return form;
}

/** Lấy chữ ký rồi upload ảnh, trả `secure_url` để lưu vào `coverImageUrl` / `imageUrl`. */
export async function uploadImage(file: File, target: UploadTarget): Promise<string> {
  if (!file.type.startsWith("image/")) {
    throw new ImageUploadError("Anh/chị chọn file ảnh (JPG, PNG, WebP).");
  }
  if (file.size > MAX_IMAGE_BYTES) {
    throw new ImageUploadError("Ảnh lớn hơn 10 MB, anh/chị giảm dung lượng rồi thử lại.");
  }

  const signature = uploadSignatureSchema.parse(await unwrap(browserApi().POST(SIGNATURE_PATHS[target])));
  const response = await fetch(signature.uploadUrl, { method: "POST", body: cloudinaryFormData(file, signature) });
  if (!response.ok) {
    // Cloudinary trả 400 khi sai định dạng ảnh hoặc chữ ký hết hạn (1 giờ).
    throw new ImageUploadError("Không tải được ảnh lên. Anh/chị kiểm tra định dạng ảnh rồi thử lại.");
  }
  return cloudinaryResultSchema.parse(await response.json()).secure_url;
}

/** Chèn `f_auto,q_auto` để Cloudinary tự chọn định dạng và nén khi hiển thị; link khác giữ nguyên. */
export function optimizedImageUrl(url: string): string {
  const marker = "/image/upload/";
  if (!url.startsWith("https://res.cloudinary.com/") || !url.includes(marker) || url.includes("f_auto")) {
    return url;
  }
  return url.replace(marker, `${marker}f_auto,q_auto/`);
}
