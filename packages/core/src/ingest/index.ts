import { assertWithinByteLimit } from "../security";
import { TrainingSeriesSchema, type MetricSeries, type TrainingSeries } from "../types";

export type IngestOptions = {
  runId: string;
  source?: string;
  maxBytes?: number;
};

function nowIso(): string {
  return new Date().toISOString();
}

function findStepKey(headers: string[]): string | undefined {
  return headers.find((h) => /^(step|epoch|iteration|iter|global_step)$/i.test(h));
}

function parseCsv(text: string): MetricSeries[] {
  const lines = text
    .split(/\r?\n/)
    .map((l) => l.trim())
    .filter((l) => l.length > 0 && !l.startsWith("#"));
  if (lines.length < 2) {
    throw new Error("CSV must include a header row and at least one data row");
  }

  const headers = (lines[0] ?? "").split(",").map((h) => h.trim());
  const stepKey = findStepKey(headers) ?? headers[0];
  if (!stepKey) {
    throw new Error("CSV is missing a step/epoch column");
  }
  const stepIndex = headers.indexOf(stepKey);

  const seriesMap = new Map<string, MetricSeries>();
  for (let i = 0; i < headers.length; i++) {
    const name = headers[i];
    if (!name || i === stepIndex) continue;
    seriesMap.set(name, { name, points: [] });
  }

  for (let row = 1; row < lines.length; row++) {
    const cells = (lines[row] ?? "").split(",").map((c) => c.trim());
    const step = Number(cells[stepIndex]);
    if (!Number.isFinite(step)) {
      throw new Error(`Invalid step value on row ${row + 1}`);
    }
    headers.forEach((name, i) => {
      if (!name || i === stepIndex) return;
      const value = Number(cells[i]);
      if (!Number.isFinite(value)) return;
      seriesMap.get(name)?.points.push({ step, value });
    });
  }

  const series = [...seriesMap.values()].filter((s) => s.points.length > 0);
  if (series.length === 0) {
    throw new Error("CSV contained no numeric metric columns");
  }
  return series;
}

function fromObjectRows(rows: Record<string, unknown>[]): MetricSeries[] {
  if (rows.length === 0) {
    throw new Error("JSON metrics array is empty");
  }
  const keys = new Set<string>();
  for (const row of rows) {
    Object.keys(row).forEach((k) => keys.add(k));
  }
  const headerList = [...keys];
  const stepKey = findStepKey(headerList) ?? "step";
  const seriesMap = new Map<string, MetricSeries>();

  for (const row of rows) {
    const step = Number(row[stepKey]);
    if (!Number.isFinite(step)) {
      throw new Error("JSON row is missing a numeric step");
    }
    for (const [name, raw] of Object.entries(row)) {
      if (name === stepKey) continue;
      const value = Number(raw);
      if (!Number.isFinite(value)) continue;
      const existing = seriesMap.get(name) ?? { name, points: [] };
      existing.points.push({ step, value });
      seriesMap.set(name, existing);
    }
  }

  const series = [...seriesMap.values()].filter((s) => s.points.length > 0);
  if (series.length === 0) {
    throw new Error("JSON contained no numeric metric columns");
  }
  return series;
}

function parseJsonPayload(payload: unknown): MetricSeries[] {
  if (Array.isArray(payload)) {
    if (payload.every((row) => row && typeof row === "object" && !Array.isArray(row))) {
      return fromObjectRows(payload as Record<string, unknown>[]);
    }
    throw new Error("JSON array must contain metric row objects");
  }

  if (payload && typeof payload === "object") {
    const obj = payload as Record<string, unknown>;
    if (Array.isArray(obj.series)) {
      return TrainingSeriesSchema.shape.series.parse(obj.series);
    }
    if (Array.isArray(obj.rows)) {
      return parseJsonPayload(obj.rows);
    }
    const asRecord: Record<string, unknown>[] = [];
    // { train_loss: [1,2,3], val_loss: [...] }
    const names = Object.keys(obj);
    const arrays = names.filter((k) => Array.isArray(obj[k]));
    if (arrays.length > 0) {
      const length = (obj[arrays[0] ?? ""] as unknown[]).length;
      for (let i = 0; i < length; i++) {
        const row: Record<string, unknown> = { step: i };
        for (const name of arrays) {
          row[name] = (obj[name] as unknown[])[i];
        }
        asRecord.push(row);
      }
      return fromObjectRows(asRecord);
    }
  }

  throw new Error("Unrecognized metrics JSON shape");
}

export function normalizeMetricsText(text: string, options: IngestOptions): TrainingSeries {
  const maxBytes = options.maxBytes ?? 5_242_880;
  assertWithinByteLimit(new TextEncoder().encode(text).byteLength, maxBytes);
  const trimmed = text.trim();
  if (!trimmed) {
    throw new Error("Metrics payload is empty");
  }

  const series =
    trimmed.startsWith("{") || trimmed.startsWith("[")
      ? parseJsonPayload(JSON.parse(trimmed) as unknown)
      : parseCsv(trimmed);

  return TrainingSeriesSchema.parse({
    runId: options.runId,
    series,
    source: options.source ?? "upload",
    ingestedAt: nowIso(),
  });
}

export function normalizeMetricsJson(payload: unknown, options: IngestOptions): TrainingSeries {
  const series = parseJsonPayload(payload);
  return TrainingSeriesSchema.parse({
    runId: options.runId,
    series,
    source: options.source ?? "upload",
    ingestedAt: nowIso(),
  });
}
