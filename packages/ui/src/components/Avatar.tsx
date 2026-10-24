"use client";

import { useState } from "react";
import { avatarImageUrl, nameInitials } from "@slvn/utils";

import { cn } from "../cn";

export interface AvatarProps {
  /** Họ tên chủ tài khoản: lấy chữ cái đầu khi chưa có ảnh. */
  name: string;
  /** `avatarUrl` của tài khoản; `null` (chưa có ảnh) hoặc ảnh lỗi thì hiện chữ cái đầu của tên. */
  url: string | null | undefined;
  /** Cạnh hiển thị (px); ảnh Cloudinary được lấy ở cỡ gấp đôi cho màn retina. */
  size: number;
  /** Mô tả ảnh. Bỏ trống khi tên đã hiện ngay cạnh avatar (avatar chỉ để trang trí). */
  alt?: string;
  className?: string;
}

/**
 * Ảnh đại diện tròn của tài khoản (docs/features/user-avatar.md). Màu nền chữ cái đầu theo token `primary`; app đổi
 * qua `className`. Dùng `<img>` thay `next/image` vì package không phụ thuộc Next.js và link đã được Cloudinary nén.
 */
export function Avatar({ name, url, size, alt = "", className }: AvatarProps) {
  // Nhớ link bị lỗi (ảnh đã bị xóa, mất mạng) để chuyển sang chữ cái đầu; đổi link mới thì thử tải lại.
  const [failedUrl, setFailedUrl] = useState<string | null>(null);

  if (url && url !== failedUrl) {
    return (
      // eslint-disable-next-line @next/next/no-img-element -- package dùng chung không phụ thuộc next/image.
      <img
        src={avatarImageUrl(url, size * 2)}
        alt={alt}
        width={size}
        height={size}
        loading="lazy"
        decoding="async"
        onError={() => setFailedUrl(url)}
        className={cn("shrink-0 rounded-full object-cover", className)}
      />
    );
  }

  return (
    <span
      role={alt ? "img" : undefined}
      aria-label={alt || undefined}
      aria-hidden={alt ? undefined : true}
      // Cỡ chữ theo cạnh avatar là giá trị động nên để inline style.
      style={{ width: size, height: size, fontSize: Math.round(size * 0.4) }}
      className={cn(
        "bg-primary text-primary-foreground inline-flex shrink-0 items-center justify-center rounded-full leading-none font-semibold select-none",
        className,
      )}
    >
      {nameInitials(name)}
    </span>
  );
}
