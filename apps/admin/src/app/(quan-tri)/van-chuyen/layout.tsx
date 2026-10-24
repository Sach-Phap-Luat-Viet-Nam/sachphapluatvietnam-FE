import type { ReactNode } from "react";
import { ModuleGate } from "@/components/ModuleGate";

export default function ShippingLayout({ children }: { children: ReactNode }) {
  return <ModuleGate module="shipping">{children}</ModuleGate>;
}
