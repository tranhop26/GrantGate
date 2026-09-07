import type {
  CriterionResult,
  Milestone,
  MilestoneStatus,
} from "@grantgate/shared";

export const LIVE_REVIEW_TX = "0x49cc510fec57224390a8f42a1480f1f8e4a7ddc2745fdc7756a37cda7a9afdd9";
export const LIVE_REPLAY_TX = "0xfc62b8c277b83e83c9c856c22614032ffd46be3f4c3ae77ae1cde38954514c8e";

export interface LiveProofSpec {
  id: number;
  label: string;
  expectedStatus: MilestoneStatus;
  expectedResults: CriterionResult[];
  transactionHash?: `0x${string}`;
}

export const LIVE_PROOF_SPECS = {
  accepted: {
    id: 7,
    label: "Accepted evidence",
    expectedStatus: "ACCEPTED",
    expectedResults: ["MET"],
    transactionHash: LIVE_REVIEW_TX,
  },
  unresolved: {
    id: 3,
    label: "Fail-safe uncertainty",
    expectedStatus: "UNRESOLVED",
    expectedResults: ["INSUFFICIENT"],
  },
} as const satisfies Record<string, LiveProofSpec>;

export type LiveProofMatch =
  | { ok: true }
  | { ok: false; reason: string };

export function matchLiveProof(
  spec: LiveProofSpec,
  milestone: Milestone,
): LiveProofMatch {
  if (milestone.id !== spec.id) {
    return {
      ok: false,
      reason: `Expected milestone #${spec.id}, received milestone #${milestone.id}.`,
    };
  }

  const expectedResults = spec.expectedResults.join(",");
  const receivedResults = milestone.criteriaResults.join(",") || "no result";
  if (
    milestone.status !== spec.expectedStatus ||
    receivedResults !== expectedResults
  ) {
    return {
      ok: false,
      reason: `Expected ${spec.expectedStatus} with ${expectedResults}, received ${milestone.status} with ${receivedResults}.`,
    };
  }

  return { ok: true };
}
