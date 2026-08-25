import { runDiagnosis, TrainingSeriesSchema } from "@model-sync/core";
import { NextResponse } from "next/server";
import { jsonError, requireApiKey, requireDiagnoseRateLimit } from "@/lib/api/guard";
import { getDb } from "@/lib/db/client";
import { appendEvent, touchRun } from "@/lib/db/helpers";
import type { DiagnosisRow, MetricsRow, RunRow } from "@/lib/db/schema";

type Ctx = { params: Promise<{ runId: string }> };

export async function POST(req: Request, ctx: Ctx) {
  const denied = requireApiKey(req);
  if (denied) return denied;
  const limited = requireDiagnoseRateLimit(req);
  if (limited) return limited;

  const { runId } = await ctx.params;
  const db = getDb();
  const run = db.prepare(`SELECT id FROM runs WHERE id = ?`).get(runId) as
    | Pick<RunRow, "id">
    | undefined;
  if (!run) return jsonError("Run not found", 404);

  const metricRow = db
    .prepare(`SELECT run_id, series_json, source, ingested_at FROM metrics WHERE run_id = ?`)
    .get(runId) as MetricsRow | undefined;
  if (!metricRow) return jsonError("Ingest metrics before diagnosing", 400);

  const series = TrainingSeriesSchema.parse({
    runId,
    series: JSON.parse(metricRow.series_json),
    source: metricRow.source,
    ingestedAt: metricRow.ingested_at,
  });

  const result = runDiagnosis(runId, series);
  db.prepare(
    `INSERT INTO diagnoses (run_id, result_json, analyzed_at)
     VALUES (?, ?, ?)
     ON CONFLICT(run_id) DO UPDATE SET
       result_json = excluded.result_json,
       analyzed_at = excluded.analyzed_at`,
  ).run(runId, JSON.stringify(result), result.analyzedAt);

  touchRun(runId, "diagnosed");
  appendEvent(
    runId,
    "diagnosis_completed",
    `Diagnosis complete — ${result.findingCount} finding(s)`,
    { findingCount: result.findingCount },
  );

  return NextResponse.json(result);
}

export async function GET(req: Request, ctx: Ctx) {
  const denied = requireApiKey(req);
  if (denied) return denied;

  const { runId } = await ctx.params;
  const db = getDb();
  const row = db
    .prepare(`SELECT run_id, result_json, analyzed_at FROM diagnoses WHERE run_id = ?`)
    .get(runId) as DiagnosisRow | undefined;
  if (!row) return jsonError("No diagnosis yet", 404);
  return NextResponse.json(JSON.parse(row.result_json));
}
