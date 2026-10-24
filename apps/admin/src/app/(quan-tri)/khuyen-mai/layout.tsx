import type { ReactNode } from "react";
import { ModuleGate } from "@/components/ModuleGate";

export default function PromotionsLayout({ children }: { children: ReactNode }) {
  return <ModuleGate module="promotions">{children}</ModuleGate>;
}
