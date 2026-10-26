"use strict";

const test = require("node:test");
const assert = require("node:assert/strict");
const mongoose = require("mongoose");
const { referenceId, visibleDirectoryMembers } = require("../services/directory-access");

const directory = [
  { _id: "admin", role: "admin", manager: null },
  { _id: "exec-1", role: "executive", manager: "admin" },
  { _id: "exec-2", role: "executive", manager: "admin" },
  { _id: "manager-1", role: "manager", manager: "exec-1" },
  { _id: "manager-2", role: "manager", manager: "exec-2" },
  { _id: "employee-1", role: "employee", manager: "manager-1" },
  { _id: "employee-2", role: "employee", manager: "manager-2" },
  { _id: "employee-direct", role: "employee", manager: "exec-1" },
];

const ids = (members) => members.map((member) => member._id).sort();

test("admin directory retains all users already scoped to its organization", () => {
  assert.deepEqual(ids(visibleDirectoryMembers(directory, { userId: "admin", role: "admin" })), ids(directory));
});

test("executive sees only direct managers and employees under those managers or the executive", () => {
  assert.deepEqual(
    ids(visibleDirectoryMembers(directory, { userId: "exec-1", role: "executive" })),
    ["employee-1", "employee-direct", "manager-1"]
  );
});

test("manager sees only employees assigned directly to that manager", () => {
  assert.deepEqual(
    ids(visibleDirectoryMembers(directory, { userId: "manager-1", role: "manager" })),
    ["employee-1"]
  );
});

test("other roles cannot list the organization directory", () => {
  assert.equal(visibleDirectoryMembers(directory, { userId: "employee-1", role: "employee" }), null);
});

test("referenceId handles BSON ObjectIds and populated references", () => {
  const id = new mongoose.Types.ObjectId("64b000000000000000000001");
  assert.equal(referenceId(id), "64b000000000000000000001");
  assert.equal(referenceId({ _id: id }), "64b000000000000000000001");
  assert.equal(referenceId({ id: "member-1" }), "member-1");
});

test("ObjectId-like references are normalized to their stable hex string", () => {
  const objectId = { toHexString: () => "department-hex-id" };
  const populated = { _id: objectId, name: "Engineering" };
  assert.equal(referenceId(objectId), "department-hex-id");
  assert.equal(referenceId(populated), "department-hex-id");
});
