"use client";

import { DataTable, Workspace } from "@model-sync/ui";
import { useCallback, useEffect, useState } from "react";
import { api } from "@/lib/client-api";

type Run = {
  id: string;
  name: string;
  modelTag: string;
  notes: string;
  status: string;
  createdAt: string;
  updatedAt: string;
};

export default function RunsPage() {
  const [rows, setRows] = useState<Run[]>([]);
  const [name, setName] = useState("");
  const [modelTag, setModelTag] = useState("");
  const [notes, setNotes] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);

  const load = useCallback(async () => {
    try {
      setRows(await api<Run[]>("/api/v1/runs"));
    } catch (e) {
      setError(e instanceof Error ? e.message : "Failed to load");
    }
  }, []);

  useEffect(() => {
    void load();
  }, [load]);

  async function createRun(e: React.FormEvent) {
    e.preventDefault();
    setBusy(true);
    setError(null);
    try {
      await api("/api/v1/runs", {
        method: "POST",
        body: JSON.stringify({ name, modelTag, notes }),
      });
      setName("");
      setModelTag("");
      setNotes("");
      await load();
    } catch (err) {
      setError(err instanceof Error ? err.message : "Create failed");
    } finally {
      setBusy(false);
    }
  }

  return (
    <Workspace title="Runs" subtitle="Create and select training experiments">
      <div className="ms-grid-2">
        <form className="ms-panel" onSubmit={createRun}>
          <h2 className="ms-panel-title">New run</h2>
          <div className="ms-field">
            <label className="ms-label" htmlFor="name">
              Name
            </label>
            <input
              id="name"
              className="ms-input"
              value={name}
              onChange={(e) => setName(e.target.value)}
              required
              maxLength={200}
            />
          </div>
          <div className="ms-field">
            <label className="ms-label" htmlFor="tag">
              Model tag
            </label>
            <input
              id="tag"
              className="ms-input"
              value={modelTag}
              onChange={(e) => setModelTag(e.target.value)}
              required
              maxLength={120}
              placeholder="e.g. resnet18-ft"
            />
          </div>
          <div className="ms-field">
            <label className="ms-label" htmlFor="notes">
              Notes
            </label>
            <textarea
              id="notes"
              className="ms-textarea"
              value={notes}
              onChange={(e) => setNotes(e.target.value)}
              maxLength={4000}
            />
          </div>
          {error ? <p className="ms-sev-critical">{error}</p> : null}
          <button className="ms-btn ms-btn-primary" type="submit" disabled={busy}>
            {busy ? "Creating…" : "Create run"}
          </button>
        </form>

        <div className="ms-panel">
          <h2 className="ms-panel-title">All runs</h2>
          <DataTable
            rows={rows}
            rowKey={(r) => r.id}
            emptyMessage="No runs yet — create one on the left."
            columns={[
              { key: "name", header: "Name", render: (r) => r.name },
              { key: "tag", header: "Model", render: (r) => r.modelTag },
              { key: "status", header: "Status", render: (r) => r.status },
              {
                key: "updated",
                header: "Updated",
                render: (r) => new Date(r.updatedAt).toLocaleString(),
              },
              {
                key: "id",
                header: "Id",
                render: (r) => (
                  <button
                    type="button"
                    className="ms-btn"
                    onClick={() => {
                      localStorage.setItem("model-sync:active-run", r.id);
                      window.location.href = "/diagnose";
                    }}
                  >
                    Open
                  </button>
                ),
              },
            ]}
          />
        </div>
      </div>
    </Workspace>
  );
}
