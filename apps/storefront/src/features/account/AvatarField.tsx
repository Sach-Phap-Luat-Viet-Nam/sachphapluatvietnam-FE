"use client";

import { useId } from "react";
import { Check, ImageUp, Trash2 } from "lucide-react";
import { Avatar, cn } from "@slvn/ui";
import { FORM_ERROR } from "@/components/form-styles";
import type { Profile } from "@/lib/account-api";
import { AVATAR_ACCEPT, avatarErrorMessage } from "@/lib/avatar-api";
import { useChangeAvatar } from "@/lib/use-account";
import { useSession } from "@/lib/use-session";

const ACTION =
  "border-border hover:border-gold hover:text-gold flex min-h-11 items-center gap-2 border px-4 text-sm transition-colors";

/**
 * Ảnh đại diện ở trang tài khoản: chọn ảnh từ máy (lưu ngay, không cần bấm "Lưu thông tin") hoặc xóa ảnh. Phiên đăng nhập
 * hộ chỉ xem, không đổi ảnh của khách (giống việc không ghi giao diện sáng/tối lên tài khoản khách).
 */
export function AvatarField({ profile }: { profile: Profile }) {
  const id = useId();
  const session = useSession();
  const change = useChangeAvatar();
  const readOnly = session.status === "authenticated" && session.impersonation !== undefined;
  const uploading = change.isPending && change.variables !== null;
  const removing = change.isPending && change.variables === null;

  return (
    <div className="flex flex-wrap items-center gap-5">
      <Avatar
        name={profile.fullName}
        url={profile.avatarUrl}
        size={88}
        alt={`Ảnh đại diện của ${profile.fullName}`}
        className="bg-gold/15 text-gold border-gold/50 border"
      />
      <div className="flex min-w-0 flex-1 flex-col gap-2.5">
        {readOnly ? (
          <p className="text-mist text-sm">Phiên đăng nhập hộ không đổi được ảnh đại diện của khách.</p>
        ) : (
          <>
            <div className="flex flex-wrap gap-2.5">
              {/* Nhãn là nút hiển thị; ô chọn file ẩn bên trong vẫn nhận focus bàn phím (viền focus vẽ trên nhãn). */}
              <label
                className={cn(
                  ACTION,
                  "has-focus-visible:outline-gold cursor-pointer has-focus-visible:outline-2 has-focus-visible:outline-offset-4",
                  change.isPending && "pointer-events-none opacity-60",
                )}
              >
                <ImageUp size={16} />
                {uploading ? "Đang tải ảnh lên…" : profile.avatarUrl ? "Đổi ảnh" : "Tải ảnh lên"}
                <input
                  type="file"
                  accept={AVATAR_ACCEPT}
                  disabled={change.isPending}
                  aria-describedby={`${id}-hint`}
                  onChange={(event) => {
                    const file = event.target.files?.[0];
                    // Cho phép chọn lại cùng file sau khi lỗi.
                    event.target.value = "";
                    if (file) change.mutate(file);
                  }}
                  className="sr-only"
                />
              </label>
              {profile.avatarUrl && (
                <button
                  type="button"
                  onClick={() => change.mutate(null)}
                  disabled={change.isPending}
                  className={cn(ACTION, "text-mist disabled:opacity-60")}
                >
                  <Trash2 size={16} />
                  {removing ? "Đang xóa…" : "Xóa ảnh"}
                </button>
              )}
            </div>
            <p id={`${id}-hint`} className="text-mist text-sm">
              Ảnh JPG, PNG hoặc WebP, tối đa 10 MB.
            </p>
          </>
        )}
        <p aria-live="polite" className="text-sm empty:hidden">
          {change.isSuccess && (
            <span className="text-ok flex items-center gap-2">
              <Check size={16} /> {change.variables ? "Đã đổi ảnh đại diện." : "Đã xóa ảnh đại diện."}
            </span>
          )}
        </p>
        {change.isError && (
          <p role="alert" className={FORM_ERROR}>
            {avatarErrorMessage(change.error)}
          </p>
        )}
      </div>
    </div>
  );
}
