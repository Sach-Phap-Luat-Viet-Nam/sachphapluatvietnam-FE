import type { ReactNode } from "react";
import { ModuleGate } from "@/components/ModuleGate";

export default function StaffLayout({ children }: { children: ReactNode }) {
  return <ModuleGate module="users">{children}</ModuleGate>;
}
