import type { Finding, FixDocument, RecommendedFix } from "../types";

export function documentFix(input: {
  runId: string;
  finding: Finding;
  fix: RecommendedFix;
  status: "applied" | "dismissed";
}): FixDocument {
  const createdAt = new Date().toISOString();
  const evidence = input.finding.evidence
    .map((e) => `- ${e.metric}: ${e.detail}${e.value !== undefined ? ` (${e.value})` : ""}`)
    .join("\n");
  const actions = input.fix.actions.map((a) => `- ${a}`).join("\n");

  return {
    id: crypto.randomUUID(),
    runId: input.runId,
    findingId: input.finding.id,
    fixId: input.fix.id,
    title: `${input.fix.title} · ${input.finding.title}`,
    bodyMarkdown: [
      `# ${input.fix.title}`,
      "",
      `Status: **${input.status}**`,
      `Finding: ${input.finding.title} (${input.finding.severity})`,
      `Analyzer: \`${input.finding.analyzerId}\``,
      "",
      "## Why",
      input.finding.explanation,
      "",
      "## Evidence",
      evidence || "- none",
      "",
      "## Summary",
      input.fix.summary,
      "",
      "## Actions",
      actions,
    ].join("\n"),
    status: input.status,
    createdAt,
    updatedAt: createdAt,
  };
}
