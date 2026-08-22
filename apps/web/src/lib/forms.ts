import { isCanonicalCommitUrl, splitCriteria, type Milestone } from "@grantgate/shared";
import { isAddress } from "./genlayer";

export interface CreateMilestoneInput {
  title: string;
  builder: string;
  repo: string;
  criteriaText: string;
  deadline: string;
}

export interface CreateMilestonePayload {
  title: string;
  builder: `0x${string}`;
  owner: string;
  repo: string;
  criteria: string[];
  deadline: number;
}

export function validateCreateMilestone(
  input: CreateMilestoneInput,
  nowSeconds = Math.floor(Date.now() / 1000),
): CreateMilestonePayload {
  const title = input.title.trim();
  if (title.length < 3 || title.length > 120) throw new Error("Title must be 3–120 characters.");
  if (!isAddress(input.builder)) throw new Error("Builder must be a valid wallet address.");
  const repoParts = input.repo.trim().split("/");
  const segment = /^[a-z0-9][a-z0-9._-]{0,99}$/;
  if (repoParts.length !== 2 || repoParts.some((part) => !segment.test(part) || /[.-]$/.test(part))) {
    throw new Error("Repository must use lowercase owner/repo format.");
  }
  let criteria: string[];
  try {
    criteria = splitCriteria(input.criteriaText);
  } catch {
    throw new Error("Each criterion must be 20–400 characters; use one line per criterion (maximum 5).");
  }
  const deadline = Math.floor(new Date(input.deadline).getTime() / 1000);
  if (!Number.isSafeInteger(deadline) || deadline <= nowSeconds) throw new Error("Deadline must be in the future.");
  return { title, builder: input.builder, owner: repoParts[0], repo: repoParts[1], criteria, deadline };
}

export function validateEvidence(
  input: { commitUrl: string; summary: string },
  repo: string,
): { commitUrl: string; commitSha: string; summary: string } {
  const commitUrl = input.commitUrl.trim();
  if (!isCanonicalCommitUrl(commitUrl, repo)) {
    throw new Error(`Use a canonical commit URL for github.com/${repo} with a lowercase 40-character SHA.`);
  }
  const summary = input.summary.trim();
  if (summary.length < 20 || summary.length > 1000) throw new Error("Summary must be 20–1000 characters.");
  return { commitUrl, commitSha: commitUrl.slice(-40), summary };
}

export function findCreatedMilestone(
  records: Milestone[],
  beforeIds: ReadonlySet<number>,
  sponsor: string,
  payload: CreateMilestonePayload,
): Milestone | null {
  const matches = records.filter((record) =>
    !beforeIds.has(record.id) &&
    record.sponsor.toLowerCase() === sponsor.toLowerCase() &&
    record.builder.toLowerCase() === payload.builder.toLowerCase() &&
    record.title === payload.title &&
    record.repo === `${payload.owner}/${payload.repo}` &&
    record.deadline === payload.deadline &&
    record.status === "OPEN" &&
    record.evidenceVersion === 0 &&
    record.criteria.length === payload.criteria.length &&
    record.criteria.every((criterion, index) => criterion === payload.criteria[index]));
  return matches.length === 1 ? matches[0] : null;
}
