"use strict";

function isHiringDepartmentMember(user) {
  if (user?.isHiringDepartment === true) return true;
  const departmentName = user?.departmentName || user?.department?.name || "";
  return String(departmentName).trim().toLowerCase() === "hr & hiring";
}

function leaveApprovalRoles(requester) {
  const role = String(requester?.role || "").trim().toLowerCase();

  if (role === "manager") return ["hr", "admin"];
  if (role === "executive") return ["admin"];
  if (role === "employee" && isHiringDepartmentMember(requester)) return ["admin"];
  if (role === "employee") return ["manager", "hr", "admin"];
  return ["admin"];
}

function canReviewLeaveRequest(reviewer, requester) {
  const reviewerRole = String(reviewer?.role || "").trim().toLowerCase();
  if (reviewerRole === "admin") return true;

  const approvalRoles = leaveApprovalRoles(requester);
  if (
    reviewerRole === "employee" &&
    isHiringDepartmentMember(reviewer)
  ) {
    return approvalRoles.includes("hr");
  }

  const managerId = reviewer?.userId || reviewer?._id || reviewer?.id;
  const requesterManagerId = requester?.manager?.toString?.() || requester?.manager;
  return ["manager", "executive"].includes(reviewerRole) &&
    approvalRoles.includes("manager") &&
    Boolean(managerId) &&
    String(requesterManagerId || "") === String(managerId);
}

module.exports = {
  isHiringDepartmentMember,
  leaveApprovalRoles,
  canReviewLeaveRequest
};
