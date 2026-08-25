import { createHistoryEvent } from "@model-sync/core";
import { getDb } from "./client";

export function nowIso(): string {
  return new Date().toISOString();
}

export function appendEvent(
  runId: string,
  type: Parameters<typeof createHistoryEvent>[0]["type"],
  message: string,
  payload?: Record<string, unknown>,
) {
  const event = createHistoryEvent({ runId, type, message, payload });
  const db = getDb();
  db.prepare(
    `INSERT INTO history_events (id, run_id, type, message, payload_json, created_at)
     VALUES (?, ?, ?, ?, ?, ?)`,
  ).run(
    event.id,
    event.runId,
    event.type,
    event.message,
    JSON.stringify(event.payload ?? {}),
    event.createdAt,
  );
  return event;
}

export function touchRun(runId: string, status?: string) {
  const db = getDb();
  if (status) {
    db.prepare(`UPDATE runs SET updated_at = ?, status = ? WHERE id = ?`).run(
      nowIso(),
      status,
      runId,
    );
  } else {
    db.prepare(`UPDATE runs SET updated_at = ? WHERE id = ?`).run(nowIso(), runId);
  }
}
