import { z } from "zod";
import { isApiError, unwrap } from "@slvn/api-client";
import { authErrorMessage, browserApi } from "@slvn/auth";

// Ảnh đại diện của khách đang đăng nhập (docs/features/user-avatar.md): file đi thẳng từ trình duyệt lên Cloudinary,
// backend chỉ ký và lưu link. Khác ảnh bìa ở admin: chữ ký ghi đè đúng một `public_id` của tài khoản, không có `folder`,
// nên không dùng chung form với `apps/admin/src/lib/image-upload.ts`.

/** `ReplaceUploadSignatureResponse`. */
const avatarSignatureSchema = z.object({
  uploadUrl: z.url(),
  apiKey: z.string(),
  timestamp: z.number().transform(String),
  publicId: z.string(),
  allowedFormats: z.string(),
  signature: z.string(),
});
export type AvatarSignature = z.infer<typeof avatarSignatureSchema>;

const cloudinaryResultSchema = z.object({ secure_url: z.url() });
const avatarResponseSchema = z.object({ avatarUrl: z.string() });

/** Định dạng Cloudinary nhận (`allowedFormats` của chữ ký là `jpg,jpeg,png,webp`). */
export const AVATAR_ACCEPT = "image/jpeg,image/png,image/webp";
/** Giới hạn phía FE để không gửi file quá lớn, cùng mức `MAX_IMAGE_BYTES` của admin. */
export const MAX_AVATAR_BYTES = 10 * 1024 * 1024;

/** Lỗi trước khi tới backend: file không hợp lệ hoặc Cloudinary từ chối. `message` hiện thẳng cho khách. */
export class AvatarUploadError extends Error {
  constructor(message: string) {
    super(message);
    this.name = "AvatarUploadError";
  }
}

/** Form gửi lên Cloudinary: đúng các tham số đã ký, thêm/bớt tham số thì chữ ký sai. */
export function avatarFormData(file: Blob, signature: AvatarSignature): FormData {
  const form = new FormData();
  form.append("file", file);
  form.append("api_key", signature.apiKey);
  form.append("timestamp", signature.timestamp);
  form.append("public_id", signature.publicId);
  form.append("overwrite", "true");
  form.append("allowed_formats", signature.allowedFormats);
  form.append("signature", signature.signature);
  return form;
}

/**
 * Upload ảnh rồi lưu làm avatar, trả link đã lưu. Chữ ký lấy ngay trước khi upload vì Cloudinary chỉ nhận chữ ký
 * trong vòng 1 giờ.
 */
export async function uploadAvatar(file: File): Promise<string> {
  if (!AVATAR_ACCEPT.split(",").includes(file.type)) {
    throw new AvatarUploadError("Bạn chọn ảnh JPG, PNG hoặc WebP.");
  }
  if (file.size > MAX_AVATAR_BYTES) {
    throw new AvatarUploadError("Ảnh lớn hơn 10 MB, bạn chọn ảnh nhỏ hơn rồi thử lại.");
  }

  const signature = avatarSignatureSchema.parse(await unwrap(browserApi().POST("/api/v1/me/avatar/upload-signature")));
  const response = await fetch(signature.uploadUrl, { method: "POST", body: avatarFormData(file, signature) });
  if (!response.ok) {
    // Cloudinary trả 400 khi sai định dạng, ảnh vượt giới hạn của gói hoặc chữ ký hết hạn.
    throw new AvatarUploadError("Không tải được ảnh lên. Bạn thử lại với ảnh JPG, PNG hoặc WebP khác.");
  }
  const { secure_url: avatarUrl } = cloudinaryResultSchema.parse(await response.json());
  // Lưu đúng `secure_url` vừa nhận: link mới có version khác nên trình duyệt không hiện ảnh cũ trong cache.
  const saved = await unwrap(browserApi().PUT("/api/v1/me/avatar", { body: { avatarUrl } }));
  return avatarResponseSchema.parse(saved).avatarUrl;
}

/** Bỏ avatar (204); ảnh trên Cloudinary bị ghi đè ở lần upload sau. */
export async function removeAvatar(): Promise<void> {
  await unwrap(browserApi().DELETE("/api/v1/me/avatar"));
}

const UPLOAD_FAILED = "Tải ảnh không thành công, bạn thử lại nhé.";

const AVATAR_MESSAGES: Record<string, string> = {
  UPLOAD_NOT_CONFIGURED: "Chưa tải được ảnh lúc này, bạn thử lại sau.",
  AVATAR_URL_INVALID: UPLOAD_FAILED,
  VALIDATION_ERROR: UPLOAD_FAILED,
};

/** Thông báo tiếng Việt cho lỗi khi đổi/xóa avatar. */
export function avatarErrorMessage(error: unknown): string {
  if (error instanceof AvatarUploadError) return error.message;
  if (isApiError(error)) return AVATAR_MESSAGES[error.code] ?? authErrorMessage(error);
  return authErrorMessage(error);
}
