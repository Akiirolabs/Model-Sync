/**
 * Row shapes for the SQLite schema.
 * Kept as plain types so storage stays easy to audit without an ORM layer.
 */

export type RunRow = {
  id: string;
  name: string;
  model_tag: string;
  notes: string;
  status: string;
  created_at: string;
  updated_at: string;
};

export type MetricsRow = {
  run_id: string;
  series_json: string;
  source: string;
  ingested_at: string;
};

export type DiagnosisRow = {
  run_id: string;
  result_json: string;
  analyzed_at: string;
};

export type HistoryEventRow = {
  id: string;
  run_id: string;
  type: string;
  message: string;
  payload_json: string;
  created_at: string;
};

export type FixDocumentRow = {
  id: string;
  run_id: string;
  finding_id: string;
  fix_id: string;
  title: string;
  body_markdown: string;
  status: string;
  created_at: string;
  updated_at: string;
};

export type ApiKeyRow = {
  id: string;
  label: string;
  key_hash: string;
  created_at: string;
  revoked_at: string | null;
};

export type RateLimitRow = {
  key: string;
  count: number;
  window_start: number;
};
