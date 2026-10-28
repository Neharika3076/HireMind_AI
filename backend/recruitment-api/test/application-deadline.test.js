import test from "node:test";
import assert from "node:assert/strict";
import { getApplicationDeadlineStart } from "../src/utils/application-deadline.js";

test("a date-only application deadline remains valid for the entire selected day", () => {
  const now = new Date("2026-10-23T14:30:00.000Z");
  const start = getApplicationDeadlineStart(now);
  const selectedDeadline = new Date("2026-10-23T00:00:00.000Z");

  assert.equal(start.toISOString(), "2026-10-23T00:00:00.000Z");
  assert.ok(selectedDeadline >= start);
});

test("expired date-only deadlines fall before the current-day start", () => {
  const start = getApplicationDeadlineStart(new Date("2026-10-23T14:30:00.000Z"));
  const expiredDeadline = new Date("2026-10-22T00:00:00.000Z");

  assert.ok(expiredDeadline < start);
});
