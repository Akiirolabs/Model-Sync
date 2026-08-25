"use client";

import { Workspace } from "@model-sync/ui";
import { useCallback, useEffect, useMemo, useState } from "react";
import { api } from "@/lib/client-api";

type Run = { id: string; name: string; modelTag: string; status: string };

type Finding = {
  id: string;
  analyzerId: string;
  title: string;
  severity: string;
  confidence: number;
  explanation: string;
  evidence: { metric: string; detail: string; value?: number }[];
  recommendedFixes: { id: string; title: string; summary: string; actions: string[] }[];
};

type Diagnosis = {
  runId: string;
  analyzedAt: string;
  findingCount: number;
  findings: Finding[];
};

const SAMPLE_CSV = `step,train_loss,val_loss,grad_norm
0,1.20,1.25,2.1
1,0.95,1.10,2.4
2,0.70,1.05,3.0
3,0.50,1.15,4.2
4,0.35,1.25,6.5
5,0.25,1.35,9.0
6,0.18,1.45,12.0
7,0.12,1.55,15.5
8,0.09,1.65,22.0
9,0.07,1.80,35.0`;

export default function DiagnosePage() {
  const [runs, setRuns] = useState<Run[]>([]);
  const [runId, setRunId] = useState("");
  const [metricsText, setMetricsText] = useState(SAMPLE_CSV);
  const [diagnosis, setDiagnosis] = useState<Diagnosis | null>(null);
  const [message, setMessage] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);

  const loadRuns = useCallback(async () => {
    const list = await api<Run[]>("/api/v1/runs");
    setRuns(list);
    const stored = localStorage.getItem("model-sync:active-run");
    if (stored && list.some((r) => r.id === stored)) {
      setRunId(stored);
    } else if (list[0]) {
      setRunId(list[0].id);
    }
  }, []);

  useEffect(() => {
    void loadRuns().catch((e) => setError(e instanceof Error ? e.message : "Load failed"));
  }, [loadRuns]);

  useEffect(() => {
    if (runId) localStorage.setItem("model-sync:active-run", runId);
  }, [runId]);

  const activeRun = useMemo(() => runs.find((r) => r.id === runId), [runs, runId]);

  async function ingestAndDiagnose() {
    if (!runId) {
      setError("Create a run first");
      return;
    }
    setBusy(true);
    setError(null);
    setMessage(null);
    try {
      await api(`/api/v1/runs/${runId}/metrics`, {
        method: "POST",
        body: JSON.stringify({ text: metricsText }),
      });
      const result = await api<Diagnosis>(`/api/v1/runs/${runId}/diagnose`, {
        method: "POST",
      });
      setDiagnosis(result);
      setMessage(`Diagnosed ${result.findingCount} finding(s)`);
      await loadRuns();
    } catch (e) {
      setError(e instanceof Error ? e.message : "Diagnose failed");
    } finally {
      setBusy(false);
    }
  }

  async function applyFix(finding: Finding, fixId: string) {
    try {
      await api(`/api/v1/runs/${runId}/fixes`, {
        method: "POST",
        body: JSON.stringify({ findingId: finding.id, fixId, status: "applied" }),
      });
      setMessage(`Applied fix and wrote documentation to history`);
    } catch (e) {
      setError(e instanceof Error ? e.message : "Apply failed");
    }
  }

  return (
    <Workspace
      title="Diagnose"
      subtitle={activeRun ? `${activeRun.name} · ${activeRun.modelTag}` : "Select a run"}
      actions={
        <button className="ms-btn ms-btn-primary" type="button" disabled={busy} onClick={() => void ingestAndDiagnose()}>
          {busy ? "Working…" : "Ingest + diagnose"}
        </button>
      }
    >
      <div className="ms-grid-2">
        <div className="ms-stack">
          <div className="ms-panel">
            <h2 className="ms-panel-title">Run</h2>
            <select
              className="ms-select"
              value={runId}
              onChange={(e) => setRunId(e.target.value)}
            >
              {runs.length === 0 ? <option value="">No runs</option> : null}
              {runs.map((r) => (
                <option key={r.id} value={r.id}>
                  {r.name} ({r.status})
                </option>
              ))}
            </select>
          </div>
          <div className="ms-panel">
            <h2 className="ms-panel-title">Metrics (CSV / JSON)</h2>
            <textarea
              className="ms-textarea"
              style={{ minHeight: 220, maxWidth: "100%" }}
              value={metricsText}
              onChange={(e) => setMetricsText(e.target.value)}
              spellCheck={false}
            />
            <p className="ms-muted ms-mono" style={{ marginTop: 6 }}>
              Sample includes overfitting + rising grad_norm
            </p>
          </div>
          {error ? <p className="ms-sev-critical">{error}</p> : null}
          {message ? <p className="ms-muted">{message}</p> : null}
        </div>

        <div className="ms-panel" style={{ overflow: "auto" }}>
          <h2 className="ms-panel-title">Findings</h2>
          {!diagnosis ? (
            <p className="ms-muted">Run ingest + diagnose to populate this canvas.</p>
          ) : diagnosis.findings.length === 0 ? (
            <p className="ms-muted">No issues detected for this series.</p>
          ) : (
            diagnosis.findings.map((f) => (
              <article key={f.id} className="ms-finding">
                <div className="ms-row">
                  <strong>{f.title}</strong>
                  <span className={`ms-sev-${f.severity}`}>{f.severity}</span>
                  <span className="ms-mono ms-muted">
                    {(f.confidence * 100).toFixed(0)}% · {f.analyzerId}
                  </span>
                </div>
                <p style={{ margin: "6px 0", maxWidth: 720 }}>{f.explanation}</p>
                <ul className="ms-mono ms-muted" style={{ margin: "0 0 8px", paddingLeft: 16 }}>
                  {f.evidence.map((e, i) => (
                    <li key={`${f.id}-${i}`}>
                      {e.metric}: {e.detail}
                      {e.value !== undefined ? ` (${e.value})` : ""}
                    </li>
                  ))}
                </ul>
                <div className="ms-stack">
                  {f.recommendedFixes.map((fix) => (
                    <div key={fix.id} className="ms-row">
                      <span>{fix.title}</span>
                      <button
                        type="button"
                        className="ms-btn"
                        onClick={() => void applyFix(f, fix.id)}
                      >
                        Apply + document
                      </button>
                    </div>
                  ))}
                </div>
              </article>
            ))
          )}
        </div>
      </div>
    </Workspace>
  );
}
