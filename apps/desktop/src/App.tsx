import { Shell, Rail, Workspace } from "@model-sync/ui";
import { useMemo, useState } from "react";
import { readWatchedFile, isTauri } from "./fs-bridge";

/**
 * Desktop shell: same dense chrome as web, plus scoped local file watch helpers.
 * Full dashboard lives in the web app; desktop bridges local paths securely.
 */
export function App() {
  const [path, setPath] = useState("../../data/fixtures/sample-metrics.csv");
  const [preview, setPreview] = useState<string>("");
  const [error, setError] = useState<string | null>(null);
  const [section, setSection] = useState<"bridge" | "help">("bridge");

  const items = useMemo(
    () => [
      {
        id: "bridge",
        label: "FS bridge",
        active: section === "bridge",
        onClick: () => setSection("bridge"),
      },
      {
        id: "help",
        label: "Help",
        active: section === "help",
        onClick: () => setSection("help"),
      },
    ],
    [section],
  );

  async function loadFile() {
    setError(null);
    try {
      const text = await readWatchedFile(path);
      setPreview(text.slice(0, 2000));
    } catch (e) {
      setError(e instanceof Error ? e.message : "Read failed");
    }
  }

  return (
    <Shell statusText={isTauri() ? "desktop · tauri" : "desktop · browser preview"}>
      <Rail label="Desktop" items={items} />
      {section === "bridge" ? (
        <Workspace
          title="Local metrics bridge"
          subtitle="Scoped path reads for training logs"
          actions={
            <a className="ms-btn" href="http://localhost:3000/diagnose" target="_blank" rel="noreferrer">
              Open web diagnose
            </a>
          }
        >
          <div className="ms-field">
            <label className="ms-label" htmlFor="path">
              Relative path (under allowed root)
            </label>
            <input
              id="path"
              className="ms-input"
              value={path}
              onChange={(e) => setPath(e.target.value)}
            />
          </div>
          <div className="ms-row">
            <button type="button" className="ms-btn" onClick={() => void loadFile()}>
              Read file
            </button>
          </div>
          {error ? <p style={{ color: "var(--ms-danger)" }}>{error}</p> : null}
          {preview ? (
            <pre className="ms-mono ms-muted" style={{ marginTop: 12, whiteSpace: "pre-wrap" }}>
              {preview}
            </pre>
          ) : (
            <p className="ms-muted" style={{ marginTop: 12 }}>
              Run the web app (`pnpm dev`) for full diagnose/history. Desktop adds sandboxed FS access.
            </p>
          )}
        </Workspace>
      ) : (
        <Workspace title="Help" subtitle="Security model">
          <p className="ms-muted" style={{ maxWidth: 560, lineHeight: 1.5 }}>
            Tauri commands only resolve paths under the configured allowlist. Path traversal is rejected
            in both the Rust command and shared `@model-sync/core` guards. No shell execution is exposed.
          </p>
        </Workspace>
      )}
    </Shell>
  );
}
