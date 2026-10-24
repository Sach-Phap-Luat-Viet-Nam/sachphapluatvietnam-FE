import type { ReactNode } from "react";
import { ModuleGate } from "@/components/ModuleGate";

export default function CustomersLayout({ children }: { children: ReactNode }) {
  return <ModuleGate module="customers">{children}</ModuleGate>;
}
