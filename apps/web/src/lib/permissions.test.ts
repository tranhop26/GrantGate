import type { Milestone } from "@grantgate/shared";
import { describe, expect, it } from "vitest";
import { canCancel, canResubmit, canRetry, canSubmit } from "./permissions";

const sponsor = "0x1111111111111111111111111111111111111111";
const builder = "0x2222222222222222222222222222222222222222";
const outsider = "0x3333333333333333333333333333333333333333";
const base: Milestone = {
  id: 1, sponsor, builder, title: "Test milestone", repo: "grantgate/example",
  criteria: ["A criterion long enough for contract validation."], criteriaResults: [],
  deadline: 4_000_000_000, createdAt: 1, status: "OPEN", evidenceVersion: 0,
  reviewRound: 0, submittedAt: 0, lastReviewedAt: 0, commitUrl: "",
  commitSha: "", summary: "", explanation: "", completedAt: 0,
};

describe("UI action permissions mirror contract transitions", () => {
  it("allows only the assigned builder to submit untouched OPEN evidence", () => {
    expect(canSubmit(base, builder)).toBe(true);
    expect(canSubmit(base, sponsor)).toBe(false);
    expect(canSubmit(base, outsider)).toBe(false);
  });

  it("offers different-commit resubmission only from REJECTED", () => {
    expect(canResubmit({ ...base, status: "REJECTED", evidenceVersion: 1 }, builder)).toBe(true);
    expect(canResubmit({ ...base, status: "UNRESOLVED", evidenceVersion: 1 }, builder)).toBe(false);
  });

  it("offers UNRESOLVED retry to sponsor or builder and cancellation only to an OPEN sponsor", () => {
    const unresolved = { ...base, status: "UNRESOLVED", evidenceVersion: 1, reviewRound: 1 } as Milestone;
    expect(canRetry(unresolved, sponsor)).toBe(true);
    expect(canRetry(unresolved, builder)).toBe(true);
    expect(canRetry(unresolved, outsider)).toBe(false);
    expect(canCancel(base, sponsor)).toBe(true);
    expect(canCancel(base, builder)).toBe(false);
  });
});
