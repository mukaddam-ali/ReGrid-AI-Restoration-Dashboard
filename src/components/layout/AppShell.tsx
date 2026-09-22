import type { ReactNode } from "react";
import { SimulatedDataBadge } from "@/components/ui/SimulatedDataBadge";
import { Sidebar } from "./Sidebar";

export function AppShell({ children }: { children: ReactNode }) {
  return (
    <div className="app-shell">
      <Sidebar />
      <div className="app-content">
        <header className="app-topbar">
          <SimulatedDataBadge />
        </header>
        <main className="app-main">{children}</main>
      </div>
    </div>
  );
}
