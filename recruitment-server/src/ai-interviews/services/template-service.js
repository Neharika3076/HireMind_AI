import { AIInterviewTemplate } from "../models/template.js";

const DEFAULT_TEMPLATE = {
  key: "structured-role-interview-v1",
  name: "Structured role interview",
  description: "A job-specific mix of role knowledge, practical reasoning, and evidence-based behavioral questions.",
  questionCount: 5,
  maxFollowUps: 2,
  rubricVersion: "structured-rubric-v1",
  criteria: [
    { key: "role_knowledge", label: "Role knowledge", guidance: "Accuracy and relevance of job-related knowledge or examples." },
    { key: "reasoning", label: "Reasoning", guidance: "Clear reasoning, assumptions, and problem-solving steps." },
    { key: "practical_application", label: "Practical application", guidance: "Ability to apply concepts to realistic work." },
    { key: "evidence_and_reflection", label: "Evidence and reflection", guidance: "Specific actions, outcomes, limitations, or lessons where relevant." }
  ]
};

export async function ensureDefaultTemplate(organizationId) {
  return AIInterviewTemplate.findOneAndUpdate(
    { organizationId, key: DEFAULT_TEMPLATE.key },
    { $setOnInsert: { ...DEFAULT_TEMPLATE, organizationId, active: true } },
    { upsert: true, new: true, setDefaultsOnInsert: true }
  ).lean();
}

export async function listTemplates(organizationId) {
  await ensureDefaultTemplate(organizationId);
  return AIInterviewTemplate.find({ organizationId, active: true }).select("key name description questionCount maxFollowUps rubricVersion").sort({ name: 1 }).lean();
}
