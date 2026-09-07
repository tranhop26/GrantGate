import { describe, expect, it } from "vitest";
import type { Milestone } from "@grantgate/shared";
import { LIVE_PROOF_SPECS, matchLiveProof } from "./liveProof";

const accepted: Milestone = {
  id: 7,
  sponsor: "0x829c5E873Fb7DdE8a9be3BE5Fd5DFA46D48fd603",
  builder: "0xCD0064F7ab615C739B4890C895691b105B7428e0",
  title: "Live proof: immutable GrantGate commit",
  repo: "tranhop26/grantgate",
  criteria: [
    "The evidence bundle maps the frozen GrantGate source hash and Studionet deployment to the production frontend.",
  ],
  criteriaResults: ["MET"],
  deadline: 1787464761,
  createdAt: 1787457563,
  status: "ACCEPTED",
  evidenceVersion: 1,
  reviewRound: 1,
  submittedAt: 1787457603,
  lastReviewedAt: 1787457603,
  commitUrl:
    "https://github.com/tranhop26/grantgate/commit/0d0bd774cad418e7b1430838bdcc2b0471a4bf5d",
  commitSha: "0d0bd774cad418e7b1430838bdcc2b0471a4bf5d",
  summary: "Live integration evidence binds the implementation to this commit.",
  explanation: "Validators found sufficient observable implementation evidence.",
  completedAt: 1787457603,
};

const unresolved: Milestone = {
  ...accepted,
  id: 3,
  status: "UNRESOLVED",
  criteriaResults: ["INSUFFICIENT"],
  commitUrl:
    "https://github.com/tranhop26/grantgate/commit/13d171e0b7919c997c294d58e3ada5420fe7e430",
  commitSha: "13d171e0b7919c997c294d58e3ada5420fe7e430",
  explanation: "The rendered evidence did not match the bound repository and commit.",
  completedAt: 0,
};

describe("live proof projections", () => {
  it("accepts the fixed accepted and unresolved readbacks", () => {
    expect(matchLiveProof(LIVE_PROOF_SPECS.accepted, accepted)).toEqual({ ok: true });
    expect(matchLiveProof(LIVE_PROOF_SPECS.unresolved, unresolved)).toEqual({ ok: true });
  });

  it("rejects a promoted record when its contract status changes", () => {
    expect(
      matchLiveProof(LIVE_PROOF_SPECS.accepted, {
        ...accepted,
        status: "UNRESOLVED",
      }),
    ).toEqual({
      ok: false,
      reason: "Expected ACCEPTED with MET, received UNRESOLVED with MET.",
    });
  });

  it("rejects a promoted record when its semantic result vector changes", () => {
    expect(
      matchLiveProof(LIVE_PROOF_SPECS.unresolved, {
        ...unresolved,
        criteriaResults: ["MET"],
      }),
    ).toEqual({
      ok: false,
      reason: "Expected UNRESOLVED with INSUFFICIENT, received UNRESOLVED with MET.",
    });
  });

  it("rejects a different milestone even when its outcome matches", () => {
    expect(
      matchLiveProof(LIVE_PROOF_SPECS.accepted, { ...accepted, id: 8 }),
    ).toEqual({
      ok: false,
      reason: "Expected milestone #7, received milestone #8.",
    });
  });
});
