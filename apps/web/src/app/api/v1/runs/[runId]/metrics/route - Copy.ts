import {
  assertWithinByteLimit,
  normalizeMetricsJson,
  normalizeMetricsText,
  TrainingSeriesSchema,
} from "@model-sync/core";
import { NextResponse } from "next/server";
import { z } from "zod";
import { jsonError, requireApiKey } from "@/lib/api/guard";
import { getDb } from "@/lib/db/client";
import { appendEvent, touchRun } from "@/lib/db/helpers";
import type { MetricsRow, RunRow } from "@/lib/db/schema";

type Ctx = { params: Promise<{ runId: string }> };

const BodySchema = z.object({
  text: z.string().optional(),
  json: z.unknown().optional(),
});

export async function GET(req: Request, ctx: Ctx) {
  const denied = requireApiKey(req);
  if (denied) return denied;

  const { runId } = await ctx.params;
  const db = getDb();
  const row = db
    .prepare(`SELECT run_id, series_json, source, ingested_at FROM metrics WHERE run_id = ?`)
    .get(runId) as MetricsRow | undefined;
  if (!row) return jsonError("No metrics for run", 404);

  const series = TrainingSeriesSchema.parse({
    runId,
    series: JSON.parse(row.series_json),
    source: row.source,
    ingestedAt: row.ingested_at,
  });
  return NextResponse.json(series);
}

export async function POST(req: Request, ctx: Ctx) {
  const denied = requireApiKey(req);
  if (denied) return denied;

  const { runId } = await ctx.params;
  const db = getDb();
  const run = db.prepare(`SELECT id FROM runs WHERE id = ?`).get(runId) as
    | Pick<RunRow, "id">
    | undefined;
  if (!run) return jsonError("Run not found", 404);

  const maxBytes = Number(process.env.MODEL_SYNC_MAX_UPLOAD_BYTES ?? 5_242_880);
  let body: unknown;
  try {
    body = await req.json();
  } catch {
    return jsonError("Invalid JSON", 400);
  }

  const parsed = BodySchema.safeParse(body);
  if (!parsed.success) return jsonError("Invalid body", 400);
  if (!parsed.data.text && parsed.data.json === undefined) {
    return jsonError("Provide text or json metrics", 400);
  }

  try {
    let series;
    if (parsed.data.text !== undefined) {
      assertWithinByteLimit(Buffer.byteLength(parsed.data.text, "utf8"), maxBytes);
      series = normalizeMetricsText(parsed.data.text, { runId, source: "upload", maxBytes });
    } else {
      const raw = JSON.stringify(parsed.data.json);
      assertWithinByteLimit(Buffer.byteLength(raw, "utf8"), maxBytes);
      series = normalizeMetricsJson(parsed.data.json, { runId, source: "upload" });
    }

    const ingestedAt = series.ingestedAt ?? new Date().toISOString();
    db.prepare(
      `INSERT INTO metrics (run_id, series_json, source, ingested_at)
       VALUES (?, ?, ?, ?)
       ON CONFLICT(run_id) DO UPDATE SET
         series_json = excluded.series_json,
         source = excluded.source,
         ingested_at = excluded.ingested_at`,
    ).run(runId, JSON.stringify(series.series), series.source, ingestedAt);

    touchRun(runId, "ready");
    const event = appendEvent(
      runId,
      "metrics_ingested",
      `Ingested ${series.series.length} metric series`,
      { source: series.source, seriesCount: series.series.length },
    );

    return NextResponse.json({ series, event });
  } catch (err) {
    return jsonError(err instanceof Error ? err.message : "Ingest failed", 400);
  }
}
