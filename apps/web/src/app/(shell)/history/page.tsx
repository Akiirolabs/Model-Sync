"use client";

import { DataTable, Workspace } from "@model-sync/ui";
import { useCallback, useEffect, useState } from "react";
import { api } from "@/lib/client-api";

type Run = { id: string; name: string };
type Event = {
  id: string;
  type: string;
  message: string;
  createdAt: string;
};
type FixDoc = {
  id: string;
  title: string;
  status: string;
  bodyMarkdown: string;
  updatedAt: string;
};

export default function HistoryPage() {
  const [runs, setRuns] = useState<Run[]>([]);
  const [runId, setRunId] = useState("");
  const [events, setEvents] = useState<Event[]>([]);
  const [fixes, setFixes] = useState<FixDoc[]>([]);
  const [selectedFix, setSelectedFix] = useState<FixDoc | null>(null);
  const [error, setError] = useState<string | null>(null);

  const load = useCallback(async (id: string) => {
    const [ev, fx] = await Promise.all([
      api<Event[]>(`/api/v1/runs/${id}/history`),
      api<FixDoc[]>(`/api/v1/runs/${id}/fixes`),
    ]);
    setEvents(ev);
    setFixes(fx);
    setSelectedFix(fx[0] ?? null);
  }, []);

  useEffect(() => {
    void (async () => {
      try {
        const list = await api<Run[]>("/api/v1/runs");
        setRuns(list);
        const stored = localStorage.getItem("model-sync:active-run");
        const id =
          stored && list.some((r) => r.id === stored) ? stored : list[0]?.id ?? "";
        setRunId(id);
        if (id) await load(id);
      } catch (e) {
        setError(e instanceof Error ? e.message : "Failed to load");
      }
    })();
  }, [load]);

  async function onSelectRun(id: string) {
    setRunId(id);
    localStorage.setItem("model-sync:active-run", id);
    setError(null);
    try {
      await load(id);
    } catch (e) {
      setError(e instanceof Error ? e.message : "Failed to load history");
    }
  }

  return (
    <Workspace title="History" subtitle="Append-only timeline and fix documents">
      <div className="ms-field" style={{ maxWidth: 360, marginBottom: 12 }}>
        <label className="ms-label" htmlFor="run">
          Run
        </label>
        <select
          id="run"
          className="ms-select"
          value={runId}
          onChange={(e) => void onSelectRun(e.target.value)}
        >
          {runs.map((r) => (
            <option key={r.id} value={r.id}>
              {r.name}
            </option>
          ))}
        </select>
      </div>
      {error ? <p className="ms-sev-critical">{error}</p> : null}

      <div className="ms-grid-2">
        <div className="ms-panel">
          <h2 className="ms-panel-title">Timeline</h2>
          <DataTable
            rows={events}
            rowKey={(e) => e.id}
            emptyMessage="No events yet."
            columns={[
              {
                key: "when",
                header: "When",
                render: (e) => new Date(e.createdAt).toLocaleString(),
              },
              { key: "type", header: "Type", render: (e) => e.type },
              { key: "msg", header: "Message", render: (e) => e.message },
            ]}
          />
        </div>
        <div className="ms-panel">
          <h2 className="ms-panel-title">Fix documents</h2>
          <div className="ms-stack" style={{ marginBottom: 8 }}>
            {fixes.map((f) => (
              <button
                key={f.id}
                type="button"
                className="ms-btn"
                onClick={() => setSelectedFix(f)}
              >
                {f.title} · {f.status}
              </button>
            ))}
            {fixes.length === 0 ? <p className="ms-muted">No fix docs yet.</p> : null}
          </div>
          {selectedFix ? <pre className="ms-pre">{selectedFix.bodyMarkdown}</pre> : null}
        </div>
      </div>
    </Workspace>
  );
}
