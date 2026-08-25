import { NextResponse } from "next/server";
import { jsonError, requireApiKey } from "@/lib/api/guard";
import { getDb } from "@/lib/db/client";
import type { RunRow } from "@/lib/db/schema";

type Ctx = { params: Promise<{ runId: string }> };

export async function GET(req: Request, ctx: Ctx) {
  const denied = requireApiKey(req);
  if (denied) return denied;

  const { runId } = await ctx.params;
  const db = getDb();
  const row = db
    .prepare(
      `SELECT id, name, model_tag, notes, status, created_at, updated_at FROM runs WHERE id = ?`,
    )
    .get(runId) as RunRow | undefined;
  if (!row) return jsonError("Run not found", 404);

  return NextResponse.json({
    id: row.id,
    name: row.name,
    modelTag: row.model_tag,
    notes: row.notes,
    status: row.status,
    createdAt: row.created_at,
    updatedAt: row.updated_at,
  });
}
