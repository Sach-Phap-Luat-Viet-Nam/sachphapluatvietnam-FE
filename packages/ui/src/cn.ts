import { clsx } from "clsx";
import type { ClassValue } from "clsx";
import { twMerge } from "tailwind-merge";

/** Ghép class Tailwind có điều kiện, class sau ghi đè class trước cùng nhóm (ví dụ `px-2` và `px-4`). */
export function cn(...inputs: ClassValue[]): string {
  return twMerge(clsx(inputs));
}
