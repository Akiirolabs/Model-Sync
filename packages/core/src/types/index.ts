import { z } from "zod";

export const MetricPointSchema = z.object({
  step: z.number(),
  value: z.number(),
});

export const MetricSeriesSchema = z.object({
  name: z.string().min(1),
  points: z.array(MetricPointSchema).min(1),
});

export const TrainingSeriesSchema = z.object({
  runId: z.string().min(1),
  series: z.array(MetricSeriesSchema),
  source: z.string().min(1).default("upload"),
  ingestedAt: z.string().optional(),
});

export type MetricPoint = z.infer<typeof MetricPointSchema>;
export type MetricSeries = z.infer<typeof MetricSeriesSchema>;
export type TrainingSeries = z.infer<typeof TrainingSeriesSchema>;

export const CreateRunInputSchema = z.object({
  name: z.string().min(1).max(200),
  modelTag: z.string().min(1).max(120),
  notes: z.string().max(4000).optional(),
});

export type CreateRunInput = z.infer<typeof CreateRunInputSchema>;

export const SeveritySchema = z.enum(["critical", "high", "medium", "low", "info"]);
export type Severity = z.infer<typeof SeveritySchema>;

export const EvidenceSchema = z.object({
  metric: z.string(),
  detail: z.string(),
  value: z.number().optional(),
});

export const RecommendedFixSchema = z.object({
  id: z.string(),
  title: z.string(),
  summary: z.string(),
  actions: z.array(z.string()),
});

export const FindingSchema = z.object({
  id: z.string(),
  analyzerId: z.string(),
  title: z.string(),
  severity: SeveritySchema,
  confidence: z.number().min(0).max(1),
  explanation: z.string(),
  evidence: z.array(EvidenceSchema),
  recommendedFixes: z.array(RecommendedFixSchema),
});

export const DiagnosisResultSchema = z.object({
  runId: z.string(),
  analyzedAt: z.string(),
  findingCount: z.number().int().nonnegative(),
  findings: z.array(FindingSchema),
});

export type Evidence = z.infer<typeof EvidenceSchema>;
export type RecommendedFix = z.infer<typeof RecommendedFixSchema>;
export type Finding = z.infer<typeof FindingSchema>;
export type DiagnosisResult = z.infer<typeof DiagnosisResultSchema>;

export const HistoryEventTypeSchema = z.enum([
  "run_created",
  "metrics_ingested",
  "diagnosis_completed",
  "fix_applied",
  "fix_dismissed",
]);

export type HistoryEventType = z.infer<typeof HistoryEventTypeSchema>;

export const HistoryEventSchema = z.object({
  id: z.string(),
  runId: z.string(),
  type: HistoryEventTypeSchema,
  message: z.string(),
  payload: z.record(z.unknown()).optional(),
  createdAt: z.string(),
});

export type HistoryEvent = z.infer<typeof HistoryEventSchema>;

export const FixDocumentStatusSchema = z.enum(["applied", "dismissed", "draft"]);

export const FixDocumentSchema = z.object({
  id: z.string(),
  runId: z.string(),
  findingId: z.string(),
  fixId: z.string(),
  title: z.string(),
  bodyMarkdown: z.string(),
  status: FixDocumentStatusSchema,
  createdAt: z.string(),
  updatedAt: z.string(),
});

export type FixDocument = z.infer<typeof FixDocumentSchema>;
