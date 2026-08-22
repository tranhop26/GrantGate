import { describe, expect, it } from "vitest";
import { validateCreateMilestone, validateEvidence } from "./forms";

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
