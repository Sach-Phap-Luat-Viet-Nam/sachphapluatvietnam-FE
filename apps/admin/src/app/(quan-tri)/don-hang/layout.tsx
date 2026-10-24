import type { ReactNode } from "react";
import { ModuleGate } from "@/components/ModuleGate";

export default function OrdersLayout({ children }: { children: ReactNode }) {
  return <ModuleGate module="orders">{children}</ModuleGate>;
}
