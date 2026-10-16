import test from "node:test";
import assert from "node:assert/strict";
import { validateQuestionPlan, buildCandidateContext, generateQuestionPlan } from "../src/ai-interviews/services/question-generator.js";
import { validateEvaluation, evaluateAnswer } from "../src/ai-interviews/services/answer-evaluator.js";
import { validateFollowUp } from "../src/ai-interviews/services/followup-generator.js";
import { scoreEvaluations } from "../src/ai-interviews/services/scoring-service.js";
import { __testables as sessionTestables } from "../src/ai-interviews/services/session-service.js";
import { createRateLimiter } from "../src/ai-interviews/middleware/rate-limit.js";
import { randomSecret, sha256 } from "../src/ai-interviews/config.js";

const template = { name: "Test", rubricVersion: "r1", questionCount: 3, maxFollowUps: 9, criteria: [] };
const questionOutput = (count = 3) => ({ questions: Array.from({ length: count }, (_, index) => ({
  prompt: `Describe how you would solve role-specific problem ${index + 1}?`, competency: `Competency ${index + 1}`, type: "scenario",
  criteria: [{ key: "reasoning", label: "Reasoning", guidance: "Explain clear steps." }, { key: "application", label: "Application", guidance: "Use a practical example." }]
})) });
const rubric = { id: "q1", prompt: "Describe how you would design a robust data pipeline?", competency: "Data engineering", criteria: [{ key: "reasoning", label: "Reasoning", guidance: "Clear steps", maxScore: 4 }, { key: "application", label: "Application", guidance: "Practicality", maxScore: 4 }] };

test("candidate interview context excludes personal contact fields", () => {
  const context = buildCandidateContext({ candidate: { name: "Private Name", email: "private@example.com", phone: "123" }, skills: ["Python"], professional_summary: "Builds APIs" });
  assert.equal(JSON.stringify(context).includes("private@example.com"), false);
  assert.equal(JSON.stringify(context).includes("123"), false);
  assert.deepEqual(context.skills, ["Python"]);
});

test("question generator returns a fixed validated plan and caps follow-ups", async () => {
  const plan = await generateQuestionPlan({ job: { title: "Engineer", description: "Build services" }, candidateProfile: {}, template, requestJson: async () => questionOutput() });
  assert.equal(plan.questions.length, 3);
  assert.equal(plan.maxFollowUps, 2);
  assert.equal(new Set(plan.questions.map((question) => question.id)).size, 3);
});

test("question plan rejects missing questions and underspecified rubrics", () => {
  assert.throws(() => validateQuestionPlan(questionOutput(2), { questionCount: 3, maxFollowUps: 1 }));
  const output = questionOutput();
  output.questions[0].criteria = [{ key: "one", label: "One", guidance: "Only one" }];
  assert.throws(() => validateQuestionPlan(output, { questionCount: 3, maxFollowUps: 1 }));
});

test("answer evaluation validates exact rubric keys and bounded scores", async () => {
  const evaluation = await evaluateAnswer({ question: rubric, answer: "I would validate inputs and retry transient failures.", requestJson: async () => ({
    criteria: [{ key: "reasoning", score: 3, evidence: "validate inputs", rationale: "Relevant" }, { key: "application", score: 2, evidence: "retry failures", rationale: "Partial example" }],
    missingConcepts: [], factualErrors: [], explanation: "Clear concise answer.", confidence: 0.9, recommendFollowUp: false, followUpReason: "", reviewRequired: false, warning: ""
  }) });
  assert.equal(evaluation.criteria.length, 2);
  assert.throws(() => validateEvaluation({ criteria: [{ key: "reasoning", score: 7 }, { key: "application", score: 1 }], missingConcepts: [], factualErrors: [], confidence: 0.5, recommendFollowUp: false }, rubric));
});

test("follow-ups stay bounded and invalid output is rejected", () => {
  assert.equal(validateFollowUp({ prompt: "Could you clarify the trade-off you chose?" }).prompt.length > 12, true);
  assert.throws(() => validateFollowUp({ prompt: "Why?" }));
});

test("scoring aggregates only validated evaluations and carries human-review warnings", () => {
  const result = scoreEvaluations([
    { evaluationStatus: "completed", evaluation: { criteria: [{ score: 3, maxScore: 4 }], confidence: 0.8, reviewRequired: false } },
    { evaluationStatus: "failed", evaluation: { criteria: [{ score: 0, maxScore: 4 }], confidence: 0, reviewRequired: true } },
    { evaluationStatus: "completed", evaluation: { criteria: [{ score: 2, maxScore: 4 }], confidence: 0.4, reviewRequired: true } }
  ]);
  assert.equal(result.score, 63);
  assert.equal(result.confidence, 0.6);
  assert.equal(result.warnings.length, 1);
});

test("candidate progress exposes the prompt but not the rubric or evaluation", () => {
  const progress = sessionTestables.sessionStatus({
    status: "in_progress", currentQuestionIndex: 0, followUpsUsed: 0, pendingFollowUp: null,
    questions: [{ id: "public-qid", prompt: "Explain a design trade-off you made?", criteria: [{ key: "secret", label: "Hidden rubric", maxScore: 4 }] }],
    answers: [{ evaluation: { score: 100, evidence: "confidential-marker" } }]
  });
  assert.equal(progress.question.prompt, "Explain a design trade-off you made?");
  assert.equal(JSON.stringify(progress).includes("Hidden rubric"), false);
  assert.equal(JSON.stringify(progress).includes("confidential-marker"), false);
});

test("invitation secrets are random and persisted form is a fixed-size one-way hash", () => {
  const first = randomSecret();
  const second = randomSecret();
  assert.notEqual(first, second);
  assert.equal(sha256(first).length, 64);
  assert.notEqual(sha256(first), first);
});

test("public interview rate limiter blocks excess requests in its window", () => {
  const middleware = createRateLimiter({ limit: 1, windowMs: 60_000 });
  let nextCalls = 0;
  const response = { headers: {}, setHeader(key, value) { this.headers[key] = value; }, status(code) { this.statusCode = code; return this; }, json(body) { this.body = body; return this; } };
  const request = { ip: "test-client" };
  middleware(request, response, () => { nextCalls += 1; });
  middleware(request, response, () => { nextCalls += 1; });
  assert.equal(nextCalls, 1);
  assert.equal(response.statusCode, 429);
});
