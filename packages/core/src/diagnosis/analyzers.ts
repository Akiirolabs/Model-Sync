import type { Finding, MetricSeries, TrainingSeries } from "../types";

function byName(series: TrainingSeries, pattern: RegExp): MetricSeries | undefined {
  return series.series.find((s) => pattern.test(s.name));
}

function last(points: { value: number }[]): number | undefined {
  return points[points.length - 1]?.value;
}

function first(points: { value: number }[]): number | undefined {
  return points[0]?.value;
}

function slope(points: { step: number; value: number }[]): number {
  if (points.length < 2) return 0;
  const a = points[0];
  const b = points[points.length - 1];
  if (!a || !b) return 0;
  const dx = b.step - a.step;
  if (dx === 0) return 0;
  return (b.value - a.value) / dx;
}

export function analyzeOverfitting(series: TrainingSeries): Finding[] {
  const train = byName(series, /train.*loss|^loss$/i);
  const val = byName(series, /val.*loss|valid.*loss|eval.*loss/i);
  if (!train || !val) return [];

  const trainFirst = first(train.points);
  const trainLast = last(train.points);
  const valFirst = first(val.points);
  const valLast = last(val.points);
  if (
    trainFirst === undefined ||
    trainLast === undefined ||
    valFirst === undefined ||
    valLast === undefined
  ) {
    return [];
  }

  const trainImproved = trainLast < trainFirst * 0.75;
  const valWorsened = valLast > valFirst * 1.05;
  const gap = valLast / Math.max(trainLast, 1e-6);

  if (!trainImproved || !valWorsened || gap < 1.4) return [];

  return [
    {
      id: "finding-overfit",
      analyzerId: "overfitting",
      title: "Validation loss diverged from training loss",
      severity: gap > 8 ? "critical" : "high",
      confidence: Math.min(0.95, 0.55 + Math.min(gap / 20, 0.4)),
      explanation:
        "Training loss kept falling while validation loss rose. The model is likely memorizing the train set.",
      evidence: [
        { metric: train.name, detail: "train loss decreased", value: trainLast },
        { metric: val.name, detail: "val loss increased", value: valLast },
        { metric: "val/train gap", detail: "final ratio", value: Number(gap.toFixed(2)) },
      ],
      recommendedFixes: [
        {
          id: "fix-regularize",
          title: "Add regularization / early stop",
          summary: "Stop when val loss bottoms out; add dropout, weight decay, or more data.",
          actions: [
            "Enable early stopping on val_loss",
            "Increase weight decay or dropout",
            "Reduce model capacity or add augmentations",
          ],
        },
      ],
    },
  ];
}

export function analyzeGradients(series: TrainingSeries): Finding[] {
  const grads = byName(series, /grad.*norm|grad_norm/i);
  if (!grads) return [];
  const start = first(grads.points);
  const end = last(grads.points);
  if (start === undefined || end === undefined || start <= 0) return [];
  const ratio = end / start;
  if (ratio < 4) return [];

  return [
    {
      id: "finding-grad-explode",
      analyzerId: "gradient-health",
      title: "Gradient norm is exploding",
      severity: ratio > 10 ? "critical" : "high",
      confidence: Math.min(0.92, 0.5 + Math.min(ratio / 40, 0.4)),
      explanation:
        "grad_norm grew sharply across steps. Unclipped updates can destabilize training.",
      evidence: [
        { metric: grads.name, detail: "start", value: start },
        { metric: grads.name, detail: "end", value: end },
        { metric: grads.name, detail: "end/start ratio", value: Number(ratio.toFixed(2)) },
      ],
      recommendedFixes: [
        {
          id: "fix-clip-grads",
          title: "Clip gradients",
          summary: "Cap global grad norm and consider a lower learning rate.",
          actions: [
            "Set max_grad_norm (e.g. 1.0)",
            "Lower the learning rate",
            "Check mixed-precision loss scaling",
          ],
        },
      ],
    },
  ];
}

export function analyzeInstability(series: TrainingSeries): Finding[] {
  const val = byName(series, /val.*loss|valid.*loss|eval.*loss/i);
  if (!val || val.points.length < 4) return [];

  let flips = 0;
  for (let i = 2; i < val.points.length; i++) {
    const a = val.points[i - 2]?.value;
    const b = val.points[i - 1]?.value;
    const c = val.points[i]?.value;
    if (a === undefined || b === undefined || c === undefined) continue;
    const d1 = b - a;
    const d2 = c - b;
    if (d1 * d2 < 0) flips += 1;
  }

  const s = slope(val.points);
  if (flips < Math.max(3, val.points.length / 3) && Math.abs(s) < 0.05) return [];
  if (flips < 3) return [];

  return [
    {
      id: "finding-unstable",
      analyzerId: "instability",
      title: "Validation loss is unstable",
      severity: "medium",
      confidence: 0.62,
      explanation:
        "Validation loss oscillates across steps, which often points to a noisy batch size or an aggressive learning rate.",
      evidence: [
        { metric: val.name, detail: "sign flips in consecutive deltas", value: flips },
      ],
      recommendedFixes: [
        {
          id: "fix-lr-schedule",
          title: "Smooth the optimization",
          summary: "Increase batch size or use a cosine/warmup schedule.",
          actions: [
            "Add LR warmup",
            "Increase batch size if memory allows",
            "Switch to AdamW with a cosine schedule",
          ],
        },
      ],
    },
  ];
}

export const ANALYZERS = [analyzeOverfitting, analyzeGradients, analyzeInstability];
