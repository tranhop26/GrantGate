export const MILESTONE_STATUSES = [
  "OPEN",
  "ACCEPTED",
  "REJECTED",
  "UNRESOLVED",
  "CANCELLED",
] as const;

export const CRITERION_RESULTS = ["MET", "NOT_MET", "INSUFFICIENT"] as const;

export type MilestoneStatus = (typeof MILESTONE_STATUSES)[number];
export type CriterionResult = (typeof CRITERION_RESULTS)[number];

export interface Milestone {
  id: number;
  sponsor: `0x${string}`;
  builder: `0x${string}`;
  title: string;
  repo: string;
  criteria: string[];
  criteriaResults: CriterionResult[];
  deadline: number;
  createdAt: number;
  status: MilestoneStatus;
  evidenceVersion: number;
  reviewRound: number;
  submittedAt: number;
  lastReviewedAt: number;
  commitUrl: string;
  commitSha: string;
  summary: string;
  explanation: string;
  completedAt: number;
}

export interface ActorStats {
  created: number;
  assigned: number;
  accepted: number;
  rejected: number;
  unresolved: number;
}

export interface ContractConfig {
  classification: "INTENTIONALLY_FROZEN";
  schemaVersion: number;
  milestoneCount: number;
  retryCooldownSeconds: number;
  maxEvidenceVersions: number;
  maxReviewRounds: number;
}

export class ContractShapeError extends Error {
  constructor(message: string) {
    super(message);
    this.name = "ContractShapeError";
  }
}

type Raw = Record<string, unknown>;

function rawObject(value: unknown, label: string): Raw {
  if (typeof value !== "object" || value === null || Array.isArray(value)) {
    throw new ContractShapeError(`${label} must be an object`);
  }
  return value as Raw;
}

function integer(value: unknown, label: string): number {
  let parsed: number;
  if (typeof value === "bigint") {
    if (value > BigInt(Number.MAX_SAFE_INTEGER)) {
      throw new ContractShapeError(`${label} is unsafe`);
    }
    parsed = Number(value);
  } else if (typeof value === "string" && /^\d+$/.test(value)) {
    parsed = Number(value);
  } else if (typeof value === "number") {
    parsed = value;
  } else {
    throw new ContractShapeError(`${label} must be an integer`);
  }
  if (!Number.isSafeInteger(parsed) || parsed < 0) {
    throw new ContractShapeError(`${label} is invalid`);
  }
  return parsed;
}

function positiveId(value: unknown): number {
  const parsed = integer(value, "milestone id");
  if (parsed < 1) throw new ContractShapeError("milestone id must be positive");
  return parsed;
}

function text(value: unknown, label: string): string {
  if (typeof value !== "string") throw new ContractShapeError(`${label} must be text`);
  return value;
}

function address(value: unknown, label: string): `0x${string}` {
  const parsed = text(value, label);
  if (!/^0x[0-9a-fA-F]{40}$/.test(parsed)) {
    throw new ContractShapeError(`${label} must be a 20-byte address`);
  }
  return parsed as `0x${string}`;
}

function status(value: unknown): MilestoneStatus {
  if (
    typeof value !== "string" ||
    !MILESTONE_STATUSES.includes(value as MilestoneStatus)
  ) {
    throw new ContractShapeError("unknown milestone status");
  }
  return value as MilestoneStatus;
}

export function splitCriteria(value: string): string[] {
  const items = value.split("\n");
  if (
    items.length < 1 ||
    items.length > 5 ||
    items.some((item) => item.trim() !== item || item.length < 20 || item.length > 400)
  ) {
    throw new ContractShapeError("criteria do not match the contract schema");
  }
  return items;
}

export function splitResultVector(value: string, expectedCount: number): CriterionResult[] {
  const items = value === "" ? [] : value.split(",");
  if (
    items.length !== expectedCount ||
    items.some((item) => !CRITERION_RESULTS.includes(item as CriterionResult))
  ) {
    throw new ContractShapeError("result vector does not match criteria");
  }
  return items as CriterionResult[];
}

function validRepo(repo: string): boolean {
  const parts = repo.split("/");
  return (
    parts.length === 2 &&
    parts.every(
      (part) =>
        /^[a-z0-9][a-z0-9._-]{0,99}$/.test(part) &&
        !part.endsWith(".") &&
        !part.endsWith("-"),
    )
  );
}

export function isCanonicalCommitUrl(value: string, repo: string): boolean {
  if (!validRepo(repo)) return false;
  const prefix = `https://github.com/${repo}/commit/`;
  if (!value.startsWith(prefix)) return false;
  const sha = value.slice(prefix.length);
  return /^[0-9a-f]{40}$/.test(sha) && value === `${prefix}${sha}`;
}

export function parseMilestone(value: unknown): Milestone | null {
  if (value === null || value === undefined) return null;
  const row = rawObject(value, "milestone");
  const parsedStatus = status(row.status);
  const parsedSponsor = address(row.sponsor, "sponsor");
  const parsedBuilder = address(row.builder, "builder");
  if (parsedSponsor.toLowerCase() === parsedBuilder.toLowerCase()) {
    throw new ContractShapeError("sponsor and builder must differ");
  }
  const repo = text(row.repo, "repo");
  if (!validRepo(repo)) throw new ContractShapeError("invalid repository identity");
  const criteriaText = text(row.criteria, "criteria");
  const criteria = splitCriteria(criteriaText);
  const criteriaCount = integer(row.criteria_count, "criteria count");
  if (criteriaCount !== criteria.length) {
    throw new ContractShapeError("criteria count mismatch");
  }

  const evidenceVersion = integer(row.evidence_version, "evidence version");
  const reviewRound = integer(row.review_round, "review round");
  const commitUrl = text(row.commit_url, "commit URL");
  const commitSha = text(row.commit_sha, "commit SHA");
  const resultVector = text(row.result_vector, "result vector");
  const criteriaResults =
    evidenceVersion === 0
      ? resultVector === ""
        ? []
        : splitResultVector(resultVector, criteriaCount)
      : splitResultVector(resultVector, criteriaCount);

  if (evidenceVersion === 0) {
    if (reviewRound !== 0 || commitUrl !== "" || commitSha !== "") {
      throw new ContractShapeError("untouched milestone contains evidence metadata");
    }
  } else {
    if (!isCanonicalCommitUrl(commitUrl, repo)) {
      throw new ContractShapeError("invalid canonical commit URL");
    }
    if (!/^[0-9a-f]{40}$/.test(commitSha) || !commitUrl.endsWith(commitSha)) {
      throw new ContractShapeError("commit SHA mismatch");
    }
    if (reviewRound < 1 || reviewRound > 3 || evidenceVersion > 3) {
      throw new ContractShapeError("evidence attempt metadata is invalid");
    }
  }

  const completedAt = integer(row.completed_at, "completed timestamp");
  if ((parsedStatus === "ACCEPTED") !== (completedAt > 0)) {
    throw new ContractShapeError("completion timestamp disagrees with status");
  }

  return {
    id: positiveId(row.id),
    sponsor: parsedSponsor,
    builder: parsedBuilder,
    title: text(row.title, "title"),
    repo,
    criteria,
    criteriaResults,
    deadline: integer(row.deadline, "deadline"),
    createdAt: integer(row.created_at, "created timestamp"),
    status: parsedStatus,
    evidenceVersion,
    reviewRound,
    submittedAt: integer(row.submitted_at, "submitted timestamp"),
    lastReviewedAt: integer(row.last_reviewed_at, "review timestamp"),
    commitUrl,
    commitSha,
    summary: text(row.summary, "summary"),
    explanation: text(row.explanation, "explanation"),
    completedAt,
  };
}

export function parseMilestoneList(value: unknown): Milestone[] {
  if (!Array.isArray(value)) throw new ContractShapeError("milestone list must be an array");
  return value.map((item) => {
    const parsed = parseMilestone(item);
    if (parsed === null) throw new ContractShapeError("milestone list contains null");
    return parsed;
  });
}

export function parseActorStats(value: unknown): ActorStats {
  const row = rawObject(value, "actor stats");
  return {
    created: integer(row.created, "created count"),
    assigned: integer(row.assigned, "assigned count"),
    accepted: integer(row.accepted, "accepted count"),
    rejected: integer(row.rejected, "rejected count"),
    unresolved: integer(row.unresolved, "unresolved count"),
  };
}

export function parseContractConfig(value: unknown): ContractConfig {
  const row = rawObject(value, "contract config");
  if (row.classification !== "INTENTIONALLY_FROZEN") {
    throw new ContractShapeError("unexpected contract classification");
  }
  return {
    classification: "INTENTIONALLY_FROZEN",
    schemaVersion: integer(row.schema_version, "schema version"),
    milestoneCount: integer(row.milestone_count, "milestone count"),
    retryCooldownSeconds: integer(row.retry_cooldown_seconds, "retry cooldown"),
    maxEvidenceVersions: integer(row.max_evidence_versions, "evidence version limit"),
    maxReviewRounds: integer(row.max_review_rounds, "review round limit"),
  };
}
