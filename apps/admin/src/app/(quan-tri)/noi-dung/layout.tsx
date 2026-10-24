import type { ReactNode } from "react";
import { ModuleGate } from "@/components/ModuleGate";

export default function ContentLayout({ children }: { children: ReactNode }) {
  return <ModuleGate module="content">{children}</ModuleGate>;
}
