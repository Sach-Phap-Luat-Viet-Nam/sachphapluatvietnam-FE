import { buttonClassName } from "@slvn/ui";

export const LABEL = "text-foreground text-base font-medium";
export const INPUT =
  "bg-background text-foreground border-border h-12 w-full rounded-md border px-3.5 text-base transition-colors focus:border-primary aria-invalid:border-danger";
export const SUBMIT = buttonClassName({ size: "lg", className: "w-full font-semibold" });
export const FIELD_ERROR = "text-danger text-sm";
export const FORM_ERROR = "border-danger/40 bg-danger/5 text-danger rounded-md border px-4 py-3 text-sm leading-6";
