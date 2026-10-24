import type { ReactNode } from "react";
import { ModuleGate } from "@/components/ModuleGate";
import { InventoryTabs } from "@/features/inventory/InventoryTabs";

export default function InventoryLayout({ children }: { children: ReactNode }) {
  return (
    <ModuleGate module="inventory">
      <div className="flex flex-col gap-6">
        <InventoryTabs />
        {children}
      </div>
    </ModuleGate>
  );
}
