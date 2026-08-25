"use client";

import { Workspace } from "@model-sync/ui";
import Link from "next/link";

export default function WorkspacePage() {
  return (
    <Workspace
      title="Workspace"
      subtitle="Diagnose training runs · document fixes · keep history"
    >
      <div className="ms-stack" style={{ maxWidth: 520 }}>
        <p className="ms-muted" style={{ margin: 0, lineHeight: 1.5 }}>
          Model Sync analyzes metrics for overfitting, instability, gradient health, and related
          failure modes. Create a run, ingest CSV/JSON metrics, diagnose, then apply fix documents
          into history.
        </p>
        <div className="ms-row">
          <Link className="ms-btn ms-btn-primary" href="/runs">
            Open runs
          </Link>
          <Link className="ms-btn" href="/diagnose">
            Diagnose
          </Link>
          <Link className="ms-btn" href="/connect">
            Connectors
          </Link>
        </div>
        <p className="ms-mono ms-muted" style={{ marginTop: 24 }}>
          SDK → @model-sync/sdk · API → /api/v1/*
        </p>
      </div>
    </Workspace>
  );
}
