import type { ReactNode } from "react";
import { ModuleGate } from "@/components/ModuleGate";
import { CatalogTabs } from "@/features/catalog/CatalogTabs";

export default function CatalogLayout({ children }: { children: ReactNode }) {
  return (
    <ModuleGate module="catalog">
      <div className="flex flex-col gap-6">
        <CatalogTabs />
        {children}
      </div>
    </ModuleGate>
  );
}
