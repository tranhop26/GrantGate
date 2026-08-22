import { describe, expect, it } from "vitest";
import type { Milestone } from "@grantgate/shared";
import { findCreatedMilestone, validateCreateMilestone, validateEvidence } from "./forms";

const validCreate = {
  title: "Ship signed release provenance",
  builder: "0x2222222222222222222222222222222222222222",
  repo: "grantgate/example",
  criteriaText: "Release artifacts document reproducible build steps.\nThe verification command is covered by automated tests.",
  deadline: "2030-01-01T12:00",
};

describe("milestone form validation", () => {
  it("normalizes a valid contract payload", () => {
    const result = validateCreateMilestone(validCreate, 1_700_000_000);
    expect(result).toMatchObject({ owner: "grantgate", repo: "example" });
    expect(result.criteria).toHaveLength(2);
  });

  it("rejects malformed addresses, repositories, criteria, and past deadlines", () => {
    expect(() => validateCreateMilestone({ ...validCreate, builder: "0x123" }, 1_700_000_000)).toThrow(/builder/i);
    expect(() => validateCreateMilestone({ ...validCreate, repo: "not-a-repo" }, 1_700_000_000)).toThrow(/repository/i);
    expect(() => validateCreateMilestone({ ...validCreate, criteriaText: "too short" }, 1_700_000_000)).toThrow(/criterion/i);
    expect(() => validateCreateMilestone({ ...validCreate, deadline: "2020-01-01T00:00" }, 1_700_000_000)).toThrow(/future/i);
  });
});

describe("evidence form validation", () => {
  it("requires a canonical immutable commit and meaningful summary", () => {
    expect(validateEvidence({
      commitUrl: "https://github.com/grantgate/example/commit/aaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaa",
      summary: "Implements the agreed release provenance checks and their tests.",
    }, "grantgate/example").commitSha).toBe("a".repeat(40));
    expect(() => validateEvidence({ commitUrl: "https://github.com/grantgate/example", summary: "short" }, "grantgate/example")).toThrow(/canonical/i);
  });
});

describe("creation readback reconciliation", () => {
  const payload = validateCreateMilestone(validCreate, 1_700_000_000);
  const sponsor = "0x1111111111111111111111111111111111111111";
  const record: Milestone = {
    id: 8, sponsor, builder: payload.builder, title: payload.title,
    repo: `${payload.owner}/${payload.repo}`, criteria: payload.criteria,
    criteriaResults: [], deadline: payload.deadline, createdAt: 1_700_000_001,
    status: "OPEN", evidenceVersion: 0, reviewRound: 0, submittedAt: 0,
    lastReviewedAt: 0, commitUrl: "", commitSha: "", summary: "",
    explanation: "", completedAt: 0,
  };

  it("ignores unrelated concurrent creations and returns the complete sponsor match", () => {
    const unrelated: Milestone = { ...record, id: 7, sponsor: "0x3333333333333333333333333333333333333333" };
    expect(findCreatedMilestone([unrelated, record], new Set([1, 2]), sponsor, payload)?.id).toBe(8);
  });

  it("fails closed when the readback is ambiguous or only contains an old record", () => {
    expect(findCreatedMilestone([record, { ...record, id: 9 }], new Set(), sponsor, payload)).toBeNull();
    expect(findCreatedMilestone([record], new Set([8]), sponsor, payload)).toBeNull();
  });
});
