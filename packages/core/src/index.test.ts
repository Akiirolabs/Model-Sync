import { describe, expect, it } from "vitest";
import { normalizeMetricsText, runDiagnosis } from "./index";

const SAMPLE_CSV = `step,train_loss,val_loss,grad_norm
0,1.20,1.25,2.1
1,0.95,1.10,2.4
2,0.70,1.05,3.0
3,0.50,1.15,4.2
4,0.35,1.25,6.5
5,0.25,1.35,9.0
6,0.18,1.45,12.0
7,0.12,1.55,15.5
8,0.09,1.65,22.0
9,0.07,1.80,35.0`;

describe("ingest + diagnose", () => {
  it("parses CSV and flags overfitting plus exploding grads", () => {
    const series = normalizeMetricsText(SAMPLE_CSV, { runId: "run-1" });
    expect(series.series.map((s) => s.name).sort()).toEqual([
      "grad_norm",
      "train_loss",
      "val_loss",
    ]);

    const result = runDiagnosis("run-1", series);
    const ids = result.findings.map((f) => f.analyzerId).sort();
    expect(ids).toContain("overfitting");
    expect(ids).toContain("gradient-health");
  });
});
