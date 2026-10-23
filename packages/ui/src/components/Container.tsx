import type { HTMLAttributes } from "react";

import { cn } from "../cn";

export type ContainerProps = HTMLAttributes<HTMLDivElement>;

/** Khung nội dung căn giữa, giới hạn chiều rộng và có lề hai bên trên mobile. */
export function Container({ className, ...props }: ContainerProps) {
  return <div className={cn("mx-auto w-full max-w-7xl px-4 sm:px-6 lg:px-8", className)} {...props} />;
}
