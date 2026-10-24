"use strict";

const test = require("node:test");
const assert = require("node:assert/strict");
const {
  canReviewLeaveRequest,
  isHiringDepartmentMember,
  leaveApprovalRoles
} = require("../services/leave-approval-access");

const employee = { _id: "employee-1", role: "employee", manager: "manager-1", department: { name: "Engineering" } };
const hrEmployee = { _id: "hr-1", role: "employee", department: { name: "HR & Hiring" } };
const manager = { _id: "manager-1", role: "manager" };

test("leave approval routes follow the requester's role", () => {
  assert.deepEqual(leaveApprovalRoles(employee), ["manager", "hr", "admin"]);
  assert.deepEqual(leaveApprovalRoles(manager), ["hr", "admin"]);
  assert.deepEqual(leaveApprovalRoles({ role: "executive" }), ["admin"]);
  assert.deepEqual(leaveApprovalRoles(hrEmployee), ["admin"]);
});

test("an employee request is reviewable by their direct manager, HR, and admin", () => {
  assert.equal(canReviewLeaveRequest({ userId: "manager-1", role: "manager" }, employee), true);
  assert.equal(canReviewLeaveRequest({ userId: "manager-2", role: "manager" }, employee), false);
  assert.equal(canReviewLeaveRequest({ userId: "manager-1", role: "executive" }, employee), true);
  assert.equal(canReviewLeaveRequest({ userId: "executive-2", role: "executive" }, employee), false);
  assert.equal(canReviewLeaveRequest({ role: "employee", isHiringDepartment: true }, employee), true);
  assert.equal(canReviewLeaveRequest({ role: "admin" }, employee), true);
});

test("manager, executive, and HR requests cannot be approved by the wrong role", () => {
  assert.equal(canReviewLeaveRequest({ role: "manager", userId: "manager-1" }, manager), false);
  assert.equal(canReviewLeaveRequest({ role: "employee", isHiringDepartment: true }, manager), true);
  assert.equal(canReviewLeaveRequest({ role: "employee", isHiringDepartment: true }, { role: "executive" }), false);
  assert.equal(canReviewLeaveRequest({ role: "employee", isHiringDepartment: true }, hrEmployee), false);
  assert.equal(canReviewLeaveRequest({ role: "admin" }, { role: "executive" }), true);
});

test("HR department membership is detected consistently for populated and direct fields", () => {
  assert.equal(isHiringDepartmentMember({ department: { name: " hr & hiring " } }), true);
  assert.equal(isHiringDepartmentMember({ departmentName: "Engineering" }), false);
});
