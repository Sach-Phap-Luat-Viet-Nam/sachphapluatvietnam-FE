import type { ReactNode } from "react";
import { ModuleGate } from "@/components/ModuleGate";
import { ContentTabs } from "@/features/static-pages/ContentTabs";

export default function ContentLayout({ children }: { children: ReactNode }) {
  return (
    <ModuleGate module="content">
      <div className="flex flex-col gap-6">
        <ContentTabs />
        {children}
      </div>
    </ModuleGate>
  );
}
