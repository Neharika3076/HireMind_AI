export function scoreEvaluations(answers) {
  const completed = (answers || []).filter((answer) => answer.evaluationStatus === "completed" && answer.evaluation);
  const entries = completed.flatMap((answer) => answer.evaluation.criteria || []);
  if (!entries.length) return { score: null, confidence: 0, warnings: ["No validated answer evaluations are available."] };
  const possible = entries.reduce((sum, item) => sum + Number(item.maxScore || 4), 0);
  const earned = entries.reduce((sum, item) => sum + Number(item.score || 0), 0);
  const confidence = completed.reduce((sum, item) => sum + Number(item.evaluation.confidence || 0), 0) / completed.length;
  const warnings = completed.flatMap((item) => [item.evaluation.warning, item.evaluation.reviewRequired ? "Human review recommended: at least one answer evaluation has low confidence or a review flag." : ""]).filter(Boolean);
  return { score: Math.round((earned / possible) * 100), confidence: Math.round(confidence * 100) / 100, warnings: [...new Set(warnings)] };
}
