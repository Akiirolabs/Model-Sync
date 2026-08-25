"use client";

import { DataTable, Workspace } from "@model-sync/ui";
import { useEffect, useState } from "react";
import { api } from "@/lib/client-api";

type ConnectorInfo = {
  id: string;
  label: string;
  status: string;
  description: string;
};

export default function ConnectPage() {
  const [rows, setRows] = useState<ConnectorInfo[]>([]);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    void api<ConnectorInfo[]>("/api/v1/connectors")
      .then(setRows)
      .catch((e) => setError(e instanceof Error ? e.message : "Failed"));
  }, []);

  return (
    <Workspace
      title="Connect"
      subtitle="Pluggable metric sources — file ready; MLflow & W&B stubs"
    >
      {error ? <p className="ms-sev-critical">{error}</p> : null}
      <div className="ms-panel">
        <DataTable
          rows={rows}
          rowKey={(r) => r.id}
          emptyMessage="No connectors registered."
          columns={[
            { key: "label", header: "Connector", render: (r) => r.label },
            { key: "id", header: "Id", render: (r) => r.id },
            { key: "status", header: "Status", render: (r) => r.status },
            { key: "desc", header: "Notes", render: (r) => r.description },
          ]}
        />
      </div>
      <p className="ms-muted" style={{ marginTop: 12, maxWidth: 640 }}>
        External projects should use <span className="ms-mono">@model-sync/sdk</span> against{" "}
        <span className="ms-mono">/api/v1</span> with header{" "}
        <span className="ms-mono">x-api-key</span>. See{" "}
        <span className="ms-mono">docs/integration.md</span>.
      </p>
    </Workspace>
  );
}
