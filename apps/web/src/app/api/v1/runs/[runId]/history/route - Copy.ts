import { NextResponse } from "next/server";
import { jsonError, requireApiKey } from "@/lib/api/guard";
import { getDb } from "@/lib/db/client";
import type { HistoryEventRow, RunRow } from "@/lib/db/schema";

type Ctx = { params: Promise<{ runId: string }> };

export async function GET(req: Request, ctx: Ctx) {
  const denied = requireApiKey(req);
  if (denied) return denied;

  const { runId } = await ctx.params;
  const db = getDb();
  const run = db.prepare(`SELECT id FROM runs WHERE id = ?`).get(runId) as
    | Pick<RunRow, "id">
    | undefined;
  if (!run) return jsonError("Run not found", 404);

  const rows = db
    .prepare(
      `SELECT id, run_id, type, message, payload_json, created_at
       FROM history_events WHERE run_id = ? ORDER BY created_at ASC`,
    )
    .all(runId) as HistoryEventRow[];

  return NextResponse.json(
    rows.map((r) => ({
      id: r.id,
      runId: r.run_id,
      type: r.type,
      message: r.message,
      payload: JSON.parse(r.payload_json || "{}"),
      createdAt: r.created_at,
    })),
  );
}
