import type { ReactNode } from "react";
import { ModuleGate } from "@/components/ModuleGate";

export default function UsersLayout({ children }: { children: ReactNode }) {
  return <ModuleGate module="users">{children}</ModuleGate>;
}
