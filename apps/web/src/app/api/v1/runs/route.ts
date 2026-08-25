import { CreateRunInputSchema } from "@model-sync/core";
import { NextResponse } from "next/server";
import { jsonError, requireApiKey } from "@/lib/api/guard";
import { getDb } from "@/lib/db/client";
import { appendEvent, nowIso } from "@/lib/db/helpers";
import type { RunRow } from "@/lib/db/schema";

export async function GET(req: Request) {
  const denied = requireApiKey(req);
  if (denied) return denied;

  const db = getDb();
  const rows = db
    .prepare(
      `SELECT id, name, model_tag, notes, status, created_at, updated_at
       FROM runs ORDER BY updated_at DESC`,
    )
    .all() as RunRow[];

  return NextResponse.json(
    rows.map((r) => ({
      id: r.id,
      name: r.name,
      modelTag: r.model_tag,
      notes: r.notes,
      status: r.status,
      createdAt: r.created_at,
      updatedAt: r.updated_at,
    })),
  );
}

export async function POST(req: Request) {
  const denied = requireApiKey(req);
  if (denied) return denied;

  let body: unknown;
  try {
    body = await req.json();
  } catch {
    return jsonError("Invalid JSON", 400);
  }

  const parsed = CreateRunInputSchema.safeParse(body);
  if (!parsed.success) {
    return jsonError(parsed.error.issues[0]?.message ?? "Invalid input", 400);
  }

  const id = crypto.randomUUID();
  const ts = nowIso();
  const db = getDb();
  db.prepare(
    `INSERT INTO runs (id, name, model_tag, notes, status, created_at, updated_at)
     VALUES (?, ?, ?, ?, 'draft', ?, ?)`,
  ).run(id, parsed.data.name, parsed.data.modelTag, parsed.data.notes ?? "", ts, ts);

  appendEvent(id, "run_created", `Run created: ${parsed.data.name}`, {
    modelTag: parsed.data.modelTag,
  });

  return NextResponse.json(
    {
      id,
      name: parsed.data.name,
      modelTag: parsed.data.modelTag,
      notes: parsed.data.notes ?? "",
      status: "draft",
      createdAt: ts,
      updatedAt: ts,
    },
    { status: 201 },
  );
}
