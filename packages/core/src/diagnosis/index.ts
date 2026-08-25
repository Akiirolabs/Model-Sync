import { ANALYZERS } from "./analyzers";
import { DiagnosisResultSchema, type DiagnosisResult, type TrainingSeries } from "../types";

export function runDiagnosis(runId: string, series: TrainingSeries): DiagnosisResult {
  const findings = ANALYZERS.flatMap((analyzer) => analyzer(series));
  return DiagnosisResultSchema.parse({
    runId,
    analyzedAt: new Date().toISOString(),
    findingCount: findings.length,
    findings,
  });
}
