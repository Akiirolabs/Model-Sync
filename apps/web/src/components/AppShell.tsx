"use client";

import { Shell, Rail } from "@model-sync/ui";
import { usePathname } from "next/navigation";
import type { ReactNode } from "react";

const NAV = [
  { id: "workspace", label: "Workspace", href: "/" },
  { id: "runs", label: "Runs", href: "/runs" },
  { id: "diagnose", label: "Diagnose", href: "/diagnose" },
  { id: "history", label: "History", href: "/history" },
  { id: "connect", label: "Connect", href: "/connect" },
] as const;

export function AppShell({ children }: { children: ReactNode }) {
  const pathname = usePathname();

  return (
    <Shell statusText="local · orchestrator">
      <Rail
        label="Navigate"
        items={NAV.map((item) => ({
          ...item,
          active:
            item.href === "/"
              ? pathname === "/"
              : pathname === item.href || pathname.startsWith(`${item.href}/`),
        }))}
      />
      {children}
    </Shell>
  );
}
