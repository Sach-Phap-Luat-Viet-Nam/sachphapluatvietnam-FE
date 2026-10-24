import { buttonClassName } from "@slvn/ui";

export const LABEL = "text-foreground text-base font-medium";
export const INPUT =
  "bg-background text-foreground border-border h-12 w-full rounded-md border px-3.5 text-base transition-colors focus:border-primary aria-invalid:border-danger";
export const TEXTAREA =
  "bg-background text-foreground border-border min-h-28 w-full rounded-md border px-3.5 py-3 text-base leading-7 transition-colors focus:border-primary aria-invalid:border-danger";
export const SELECT = `${INPUT} pr-8`;
export const CHECKBOX = "accent-primary size-5 shrink-0";
export const SUBMIT = buttonClassName({ size: "lg", className: "w-full font-semibold" });
export const HINT = "text-muted text-sm leading-6";
export const FIELD_ERROR = "text-danger text-sm";
export const FORM_ERROR = "border-danger/40 bg-danger/5 text-danger rounded-md border px-4 py-3 text-sm leading-6";
export const FORM_SUCCESS =
  "border-success/40 bg-success/5 text-success rounded-md border px-4 py-3 text-sm leading-6 font-medium";
export const CARD = "bg-background border-border rounded-lg border";
