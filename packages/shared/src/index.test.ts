import { describe, expect, it } from "vitest";
import {
  ContractShapeError,
  isCanonicalCommitUrl,
  parseActorStats,
  parseContractConfig,
  parseMilestone,
  parseMilestoneList,
  splitCriteria,
  splitResultVector,
} from "./index";

const SPONSOR = "0x1111111111111111111111111111111111111111";
const BUILDER = "0x2222222222222222222222222222222222222222";
const SHA = "0123456789abcdef0123456789abcdef01234567";

function rawMilestone(overrides: Record<string, unknown> = {}) {
  return {
    id: 1,
    sponsor: SPONSOR,
    builder: BUILDER,
    title: "Ship CSV export",
    repo: "open-labs/ledger",
    criteria:
      "Export includes a stable header row.\nExport preserves UTF-8 project names.",
    criteria_count: 2,
    deadline: 1_800_086_400,
    created_at: 1_800_000_000,
    status: "ACCEPTED",
    evidence_version: 1,
    review_round: 1,
    submitted_at: 1_800_000_100,
    last_reviewed_at: 1_800_000_100,
    commit_url: `https://github.com/open-labs/ledger/commit/${SHA}`,
    commit_sha: SHA,
    summary: "The commit implements the requested behavior and its regression tests.",
    result_vector: "MET,MET",
    explanation: "Both frozen criteria are met.",
    completed_at: 1_800_000_100,
    ...overrides,
  };
}

describe("parseMilestone", () => {
  it.each([1, "1", 1n])("normalizes safe chain identifier %s", (id) => {
    const parsed = parseMilestone(rawMilestone({ id }));
    expect(parsed?.id).toBe(1);
    expect(parsed?.status).toBe("ACCEPTED");
    expect(parsed?.criteriaResults).toEqual(["MET", "MET"]);
  });

  it("returns null only for an absent record", () => {
    expect(parseMilestone(null)).toBeNull();
  });

  it.each([
    { status: "APPROVED" },
    { sponsor: "0x1234" },
    { id: Number.MAX_SAFE_INTEGER + 1 },
    { criteria_count: 3 },
    { result_vector: "MET" },
    { commit_sha: "abc123" },
  ])("rejects malformed present record %#", (override) => {
    expect(() => parseMilestone(rawMilestone(override))).toThrow(ContractShapeError);
  });

  it("fails a list read when any row is malformed", () => {
    expect(() =>
      parseMilestoneList([rawMilestone(), rawMilestone({ status: "BROKEN" })]),
    ).toThrow(ContractShapeError);
  });
});

describe("cross-language helpers", () => {
  it("parses config and actor counters from mixed chain integer shapes", () => {
    expect(
      parseContractConfig({
        classification: "INTENTIONALLY_FROZEN",
        schema_version: "1",
        milestone_count: 2n,
        retry_cooldown_seconds: 300,
        max_evidence_versions: "3",
        max_review_rounds: 3,
      }),
    ).toEqual({
      classification: "INTENTIONALLY_FROZEN",
      schemaVersion: 1,
      milestoneCount: 2,
      retryCooldownSeconds: 300,
      maxEvidenceVersions: 3,
      maxReviewRounds: 3,
    });
    expect(
      parseActorStats({ created: 1n, assigned: "2", accepted: 1, rejected: 0, unresolved: 0 }),
    ).toEqual({ created: 1, assigned: 2, accepted: 1, rejected: 0, unresolved: 0 });
  });

  it("keeps criteria and result positions aligned", () => {
    expect(splitCriteria(rawMilestone().criteria as string)).toHaveLength(2);
    expect(splitResultVector("MET,INSUFFICIENT", 2)).toEqual(["MET", "INSUFFICIENT"]);
    expect(() => splitResultVector("MET", 2)).toThrow(ContractShapeError);
  });

  it.each([
    `https://github.com/open-labs/ledger/commit/${SHA}`,
    `http://github.com/open-labs/ledger/commit/${SHA}`,
    `https://github.com/open-labs/other/commit/${SHA}`,
    `https://github.com/open-labs/ledger/commit/${SHA}?diff=split`,
    `https://github.com/open-labs/ledger/commit/${SHA.toUpperCase()}`,
  ])("mirrors canonical commit URL rules for %s", (url) => {
    expect(isCanonicalCommitUrl(url, "open-labs/ledger")).toBe(
      url === `https://github.com/open-labs/ledger/commit/${SHA}`,
    );
  });
});
