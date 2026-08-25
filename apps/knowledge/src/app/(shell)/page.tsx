"use client";

import { Workspace } from "@model-sync/ui";
import Link from "next/link";

export default function WorkspacePage() {
  return (
    <Workspace
      title="Workspace"
      subtitle="Verify claims · keep evidence pointers · expire stale answers"
    >
      <div className="ms-stack" style={{ maxWidth: 520 }}>
        <p className="ms-muted" style={{ margin: 0, lineHeight: 1.5 }}>
          Knowledge tracks open loops: claims that need a file, URL, or folder pointer, and a date
          they stop being trusted. Create a source, ingest CSV claims, verify, then apply documents
          into history.
        </p>
        <div className="ms-row">
          <Link className="ms-btn ms-btn-primary" href="/sources">
            Open sources
          </Link>
          <Link className="ms-btn" href="/verify">
            Verify
          </Link>
          <Link className="ms-btn" href="/connect">
            Connectors
          </Link>
        </div>
        <p className="ms-mono ms-muted" style={{ marginTop: 24 }}>
          API → /api/v1/* · port 3002
        </p>
      </div>
    </Workspace>
  );
}
