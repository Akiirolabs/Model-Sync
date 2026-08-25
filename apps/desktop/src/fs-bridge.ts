/**
 * Desktop FS bridge — uses Tauri invoke when available; falls back to fetch
 * of the web fixture in browser preview mode.
 */

export function isTauri(): boolean {
  return typeof window !== "undefined" && "__TAURI_INTERNALS__" in window;
}

export async function readWatchedFile(relativePath: string): Promise<string> {
  if (isTauri()) {
    const { invoke } = await import("@tauri-apps/api/core");
    return invoke<string>("read_metrics_file", { relativePath });
  }

  // Browser preview: only allow the known sample fixture via web server
  if (relativePath.includes("sample-metrics.csv")) {
    const res = await fetch("http://localhost:3000/api/v1/connectors");
    if (!res.ok) {
      throw new Error("Start the web app to preview fixtures, or run inside Tauri");
    }
    throw new Error(
      "Browser preview cannot read disk. Use `pnpm --filter @model-sync/desktop dev` with Tauri, or paste metrics in the web Diagnose page.",
    );
  }
  throw new Error("Path not allowed outside Tauri runtime");
}
