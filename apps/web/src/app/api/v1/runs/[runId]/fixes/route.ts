import {
  DiagnosisResultSchema,
  documentFix,
  type Finding,
} from "@model-sync/core";
import { NextResponse } from "next/server";
import { z } from "zod";
import { jsonError, requireApiKey } from "@/lib/api/guard";
import { getDb } from "@/lib/db/client";
import { appendEvent, nowIso } from "@/lib/db/helpers";
import type { DiagnosisRow, FixDocumentRow, RunRow } from "@/lib/db/schema";

type Ctx = { params: Promise<{ runId: string }> };

const BodySchema = z.object({
  findingId: z.string().min(1),
  fixId: z.string().min(1),
  status: z.enum(["applied", "dismissed"]).default("applied"),
});

export async function GET(req: Request, ctx: Ctx) {
  const denied = requireApiKey(req);
  if (denied) return denied;
  const { runId } = await ctx.params;
  const db = getDb();
  const rows = db
    .prepare(
      `SELECT id, run_id, finding_id, fix_id, title, body_markdown, status, created_at, updated_at
       FROM fix_documents WHERE run_id = ? ORDER BY updated_at DESC`,
    )
    .all(runId) as FixDocumentRow[];

  return NextResponse.json(
    rows.map((r) => ({
      id: r.id,
      runId: r.run_id,
      findingId: r.finding_id,
      fixId: r.fix_id,
      title: r.title,
      bodyMarkdown: r.body_markdown,
      status: r.status,
      createdAt: r.created_at,
      updatedAt: r.updated_at,
    })),
  );
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

  let body: unknown;
  try {
    body = await req.json();
  } catch {
    return jsonError("Invalid JSON", 400);
  }
  const parsed = BodySchema.safeParse(body);
  if (!parsed.success) return jsonError("Invalid body", 400);

  const diag = db
    .prepare(`SELECT run_id, result_json, analyzed_at FROM diagnoses WHERE run_id = ?`)
    .get(runId) as DiagnosisRow | undefined;
  if (!diag) return jsonError("Diagnose the run first", 400);

  const result = DiagnosisResultSchema.parse(JSON.parse(diag.result_json));
  const finding = result.findings.find((f: Finding) => f.id === parsed.data.findingId);
  if (!finding) return jsonError("Finding not found", 404);

  const fix = finding.recommendedFixes.find((f) => f.id === parsed.data.fixId);
  if (!fix) return jsonError("Fix not found", 404);

  const doc = documentFix({
    runId,
    finding,
    fix,
    status: parsed.data.status === "dismissed" ? "dismissed" : "applied",
  });

  db.prepare(
    `INSERT INTO fix_documents
      (id, run_id, finding_id, fix_id, title, body_markdown, status, created_at, updated_at)
     VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)`,
  ).run(
    doc.id,
    doc.runId,
    doc.findingId,
    doc.fixId,
    doc.title,
    doc.bodyMarkdown,
    doc.status,
    doc.createdAt,
    nowIso(),
  );

  appendEvent(
    runId,
    parsed.data.status === "dismissed" ? "fix_dismissed" : "fix_applied",
    `${parsed.data.status === "dismissed" ? "Dismissed" : "Applied"} fix: ${fix.title}`,
    { findingId: finding.id, fixId: fix.id, documentId: doc.id },
  );

  return NextResponse.json(doc, { status: 201 });
}
