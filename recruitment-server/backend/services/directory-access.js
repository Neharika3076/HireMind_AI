"use strict";

function referenceId(value) {
  if (!value) return "";

  // BSON ObjectIds expose `_id` as a getter that returns the same ObjectId.
  // Resolve them before checking populated-document fields to avoid recursing
  // forever on that self-reference.
  if (typeof value.toHexString === "function") return value.toHexString();

  if (typeof value === "string") return value;
  if (typeof value._id === "string") return value._id;
  if (value._id && value._id !== value) return referenceId(value._id);
  if (typeof value.id === "string") return value.id;
  return String(value);
}

/**
 * Return only the people the authenticated actor is allowed to see in the
 * organization directory. Managers see their employee reports; executives
 * see their direct managers and employees who report either to them or to
 * those managers. Admins retain the entire organization directory.
 */
function visibleDirectoryMembers(members, actor) {
  if (!actor) return null;
  if (actor.role === "admin") return members;

  const actorId = referenceId(actor.userId || actor._id || actor.id);
  if (!actorId) return null;

  if (actor.role === "manager") {
    return members.filter(
      (member) => member.role === "employee" && referenceId(member.manager) === actorId
    );
  }

  if (actor.role === "executive" || actor.role === "recruiter") {
    const directManagerIds = new Set(
      members
        .filter((member) => member.role === "manager" && referenceId(member.manager) === actorId)
        .map((member) => referenceId(member._id || member.id))
    );

    return members.filter((member) => {
      const managerId = referenceId(member.manager);
      return (
        (member.role === "manager" && managerId === actorId) ||
        (member.role === "employee" && (managerId === actorId || directManagerIds.has(managerId)))
      );
    });
  }

  return null;
}

module.exports = { referenceId, visibleDirectoryMembers };
