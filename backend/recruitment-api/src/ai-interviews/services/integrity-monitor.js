import { AIInterviewIntegrityEvent } from "../models/integrity-event.js";

export async function getIntegritySummary(session) {
  const events = await AIInterviewIntegrityEvent.find({ organizationId: session.organizationId, sessionId: session._id }).select("type occurredAt reviewStatus").lean();
  const counts = { tabFocusLost: 0, connectionInterrupted: 0, alternativeRequested: 0, unreviewed: 0 };
  for (const event of events) {
    if (event.type === "tab_focus_lost") counts.tabFocusLost += 1;
    if (event.type === "connection_interrupted") counts.connectionInterrupted += 1;
    if (event.type === "alternative_requested") counts.alternativeRequested += 1;
    if (event.reviewStatus === "unreviewed") counts.unreviewed += 1;
  }
  return { ...counts, note: "Technical browser/session signals only; they are not proof of misconduct and do not affect the interview score." };
}
