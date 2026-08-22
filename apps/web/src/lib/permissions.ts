import type { Milestone } from "@grantgate/shared";

const same = (left: string | null | undefined, right: string) => left?.toLowerCase() === right.toLowerCase();
const beforeDeadline = (milestone: Milestone, nowSeconds: number) => nowSeconds < milestone.deadline;

export function canSubmit(milestone: Milestone, actor: string | null, nowSeconds = Math.floor(Date.now() / 1000)) {
  return same(actor, milestone.builder) && milestone.status === "OPEN" && milestone.evidenceVersion === 0 && beforeDeadline(milestone, nowSeconds);
}

export function canResubmit(milestone: Milestone, actor: string | null, nowSeconds = Math.floor(Date.now() / 1000)) {
  return same(actor, milestone.builder) && milestone.status === "REJECTED" && milestone.evidenceVersion < 3 && beforeDeadline(milestone, nowSeconds);
}

export function canRetry(milestone: Milestone, actor: string | null, nowSeconds = Math.floor(Date.now() / 1000)) {
  return (same(actor, milestone.sponsor) || same(actor, milestone.builder)) && milestone.status === "UNRESOLVED" && milestone.reviewRound < 3 && beforeDeadline(milestone, nowSeconds);
}

export function canCancel(milestone: Milestone, actor: string | null) {
  return same(actor, milestone.sponsor) && milestone.status === "OPEN" && milestone.evidenceVersion === 0;
}
