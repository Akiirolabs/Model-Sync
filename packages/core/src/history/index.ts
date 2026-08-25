import type { HistoryEvent, HistoryEventType } from "../types";

export function createHistoryEvent(input: {
  runId: string;
  type: HistoryEventType;
  message: string;
  payload?: Record<string, unknown>;
}): HistoryEvent {
  return {
    id: crypto.randomUUID(),
    runId: input.runId,
    type: input.type,
    message: input.message,
    payload: input.payload,
    createdAt: new Date().toISOString(),
  };
}
