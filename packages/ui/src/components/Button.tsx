import type { ButtonHTMLAttributes } from "react";

import { cn } from "../cn";

export type ButtonVariant = "primary" | "accent" | "outline" | "ghost";
export type ButtonSize = "sm" | "md" | "lg";

const VARIANT_CLASSES: Record<ButtonVariant, string> = {
  primary: "bg-primary text-primary-foreground hover:bg-primary-hover",
  accent: "bg-accent text-accent-foreground hover:bg-accent-hover",
  outline: "border border-border bg-background text-foreground hover:bg-surface",
  ghost: "text-foreground hover:bg-surface",
};

const SIZE_CLASSES: Record<ButtonSize, string> = {
  sm: "h-9 px-3",
  md: "h-11 px-4",
  lg: "h-12 px-6",
};

export interface ButtonClassOptions {
  variant?: ButtonVariant;
  size?: ButtonSize;
  className?: string;
}

/**
 * Class của nút, dùng được cho cả thẻ khác như `next/link` để link trông giống nút.
 *
 * @example <Link href="/gio-hang" className={buttonClassName({ variant: "outline" })}>Xem giỏ</Link>
 */
export function buttonClassName({ variant = "primary", size = "md", className }: ButtonClassOptions = {}): string {
  return cn(
    "inline-flex items-center justify-center gap-2 rounded-md text-base font-medium transition-colors",
    "focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-primary",
    "disabled:pointer-events-none disabled:opacity-50",
    VARIANT_CLASSES[variant],
    SIZE_CLASSES[size],
    className,
  );
}

export interface ButtonProps extends ButtonHTMLAttributes<HTMLButtonElement> {
  variant?: ButtonVariant;
  size?: ButtonSize;
}

/** Nút bấm theo theme chung. Mặc định `type="button"` để không vô tình submit form. */
export function Button({ variant, size, className, type = "button", ...props }: ButtonProps) {
  return <button type={type} className={buttonClassName({ variant, size, className })} {...props} />;
}
