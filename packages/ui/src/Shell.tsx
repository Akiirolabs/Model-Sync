import type { ReactNode } from "react";

export function Shell({
  statusText,
  children,
}: {
  statusText?: string;
  children: ReactNode;
}) {
  return (
    <div className="ms-shell">
      <div className="ms-shell-status">{statusText ?? "model-sync"}</div>
      {children}
    </div>
  );
}
