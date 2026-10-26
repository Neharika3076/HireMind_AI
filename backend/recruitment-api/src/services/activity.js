import { RecruitmentActivity } from "../models/activity.js";

export function logActivity(actor, action, entityType, entityId, metadata = {}) {
  return RecruitmentActivity.create({ organizationId: actor.organizationId, actor: { id: actor.id, name: actor.name }, action, entityType, entityId: String(entityId), metadata });
}
