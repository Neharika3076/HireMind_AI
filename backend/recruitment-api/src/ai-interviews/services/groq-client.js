import { interviewConfig } from "../config.js";

export class InterviewProviderError extends Error {
  constructor(message = "The interview AI service is temporarily unavailable.") {
    super(message);
    this.name = "InterviewProviderError";
    this.statusCode = 503;
    this.expose = true;
  }
}

function parseJson(content) {
  const cleaned = String(content || "").trim().replace(/^```(?:json)?\s*/i, "").replace(/\s*```$/, "");
  try { return JSON.parse(cleaned); } catch {
    const start = cleaned.indexOf("{");
    const end = cleaned.lastIndexOf("}");
    if (start >= 0 && end > start) return JSON.parse(cleaned.slice(start, end + 1));
    throw new Error("The AI returned malformed structured output.");
  }
}

export async function groqJsonCompletion({ system, input, maxTokens = 1800 }) {
  if (!interviewConfig.groqApiKey) throw new InterviewProviderError("AI interview is not configured. Set GROQ_INTERVIEW_API_KEY in the recruitment server environment.");
  let response;
  try {
    response = await fetch(`${interviewConfig.groqBaseUrl}/chat/completions`, {
      method: "POST",
      headers: { Authorization: `Bearer ${interviewConfig.groqApiKey}`, "Content-Type": "application/json" },
      signal: AbortSignal.timeout(45000),
      body: JSON.stringify({
        model: interviewConfig.groqModel,
        temperature: 0.15,
        max_completion_tokens: maxTokens,
        response_format: { type: "json_object" },
        messages: [{ role: "system", content: system }, { role: "user", content: JSON.stringify(input) }]
      })
    });
  } catch {
    throw new InterviewProviderError();
  }
  if (!response.ok) {
    // Do not return provider bodies to the browser: they may contain account-specific diagnostics.
    console.error("Interview AI provider returned HTTP", response.status);
    throw new InterviewProviderError();
  }
  let payload;
  try { payload = await response.json(); } catch { throw new InterviewProviderError(); }
  const content = payload?.choices?.[0]?.message?.content;
  if (!content) throw new InterviewProviderError("The interview AI returned an empty response. Please retry.");
  try { return parseJson(content); } catch { throw new InterviewProviderError("The interview AI returned a response that could not be validated. Please retry."); }
}
