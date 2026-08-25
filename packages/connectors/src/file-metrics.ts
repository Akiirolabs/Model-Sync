import { normalizeMetricsText, type TrainingSeries } from "@model-sync/core";

export function ingestFileMetrics(
  text: string,
  options: { runId: string; source?: string; maxBytes?: number },
): TrainingSeries {
  return normalizeMetricsText(text, {
    runId: options.runId,
    source: options.source ?? "file-metrics",
    maxBytes: options.maxBytes,
  });
}
