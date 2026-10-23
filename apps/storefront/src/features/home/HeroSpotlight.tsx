"use client";

import { useEffect, useRef } from "react";
import type { ReactNode } from "react";

const PROPERTIES = ["--lamp-x", "--lamp-y", "--tilt-x", "--tilt-y"] as const;

export interface HeroSpotlightProps {
  children: ReactNode;
  className?: string;
}

/**
 * Section hero có ánh đèn và độ nghiêng sách theo chuột. Chỉ đặt biến CSS (không render lại React) và bỏ qua trên
 * màn hình cảm ứng hoặc khi người dùng bật giảm chuyển động.
 */
export function HeroSpotlight({ children, className }: HeroSpotlightProps) {
  const ref = useRef<HTMLElement>(null);

  useEffect(() => {
    const section = ref.current;
    if (!section) return;
    if (!matchMedia("(pointer: fine)").matches || matchMedia("(prefers-reduced-motion: reduce)").matches) return;

    let frame = 0;
    const move = (event: PointerEvent) => {
      cancelAnimationFrame(frame);
      frame = requestAnimationFrame(() => {
        const rect = section.getBoundingClientRect();
        const x = (event.clientX - rect.left) / rect.width;
        const y = (event.clientY - rect.top) / rect.height;
        section.style.setProperty("--lamp-x", `${(x * 100).toFixed(1)}%`);
        section.style.setProperty("--lamp-y", `${(y * 100).toFixed(1)}%`);
        section.style.setProperty("--tilt-y", `${((x - 0.5) * 22).toFixed(2)}deg`);
        section.style.setProperty("--tilt-x", `${((0.5 - y) * 14).toFixed(2)}deg`);
      });
    };
    const leave = () => {
      cancelAnimationFrame(frame);
      for (const property of PROPERTIES) section.style.removeProperty(property);
    };

    section.addEventListener("pointermove", move);
    section.addEventListener("pointerleave", leave);
    return () => {
      cancelAnimationFrame(frame);
      section.removeEventListener("pointermove", move);
      section.removeEventListener("pointerleave", leave);
    };
  }, []);

  return (
    <section ref={ref} className={className}>
      {children}
    </section>
  );
}
