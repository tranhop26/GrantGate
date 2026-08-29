import {
  parseActorStats,
  parseContractConfig,
  parseMilestone,
  parseMilestoneList,
  type ActorStats,
  type ContractConfig,
  type Milestone,
} from "@grantgate/shared";
import { CalldataAddress, ExecutionResult, TransactionStatus } from "genlayer-js/types";
import {
  CONTRACT_ADDRESS,
  CONTRACT_CONFIGURED,
  ensureConsensus,
  ensureCorrectChain,
  readClient,
  signedClient,
  type WalletKind,
} from "./genlayer";

export interface WalletSession {
  kind: WalletKind;
  address: `0x${string}`;
}

function requireConfigured(): void {
  if (!CONTRACT_CONFIGURED) throw new Error("VITE_GRANTGATE_ADDRESS is not configured");
}

function address(value: string): CalldataAddress {
  if (!/^0x[0-9a-fA-F]{40}$/.test(value)) throw new Error("Invalid wallet address");
  const bytes = new Uint8Array(20);
  const clean = value.slice(2);
  for (let index = 0; index < 20; index += 1) {
    bytes[index] = Number.parseInt(clean.slice(index * 2, index * 2 + 2), 16);
  }
  return new CalldataAddress(bytes);
}

function id(value: number): number {
  if (!Number.isSafeInteger(value) || value < 1) throw new Error("Invalid milestone id");
  return value;
}

async function read(functionName: string, args: unknown[]): Promise<unknown> {
  requireConfigured();
  return readClient().readContract({
    address: CONTRACT_ADDRESS,
    functionName,
    args: args as never[],
  });
}

async function sponsorMilestoneTail(actor: string, offset: number): Promise<{ createdCount: number; records: Milestone[] }> {
  if (!Number.isSafeInteger(offset) || offset < 0) throw new Error("Invalid sponsor milestone offset");
  const actorAddress = address(actor);
  const stats = parseActorStats(await read("get_actor_stats", [actorAddress]));
  const records: Milestone[] = [];
  for (let cursor = offset; cursor < stats.created; cursor += 50) {
    const limit = Math.min(50, stats.created - cursor);
    records.push(...parseMilestoneList(await read("get_sponsor_milestones", [actorAddress, cursor, limit])));
  }
  return { createdCount: stats.created, records };
}

export const reads = {
  config: async (): Promise<ContractConfig> => parseContractConfig(await read("get_config", [])),
  milestone: async (milestoneId: number): Promise<Milestone | null> =>
    parseMilestone(await read("get_milestone", [id(milestoneId)])),
  actorStats: async (actor: string): Promise<ActorStats> =>
    parseActorStats(await read("get_actor_stats", [address(actor)])),
  sponsorMilestones: async (actor: string, offset = 0, limit = 50): Promise<Milestone[]> =>
    parseMilestoneList(
      await read("get_sponsor_milestones", [address(actor), offset, limit]),
    ),
  sponsorMilestoneTail,
  builderMilestones: async (actor: string, offset = 0, limit = 50): Promise<Milestone[]> =>
    parseMilestoneList(
      await read("get_builder_milestones", [address(actor), offset, limit]),
    ),
};

async function send(
  wallet: WalletSession,
  functionName: string,
  args: unknown[],
): Promise<string> {
  requireConfigured();
  await ensureCorrectChain();
  const client = signedClient(wallet.address);
  await ensureConsensus(client);
  return (await client.writeContract({
    address: CONTRACT_ADDRESS,
    functionName,
    args: args as never[],
    value: 0n,
  })) as string;
}

export const writes = {
  createMilestone: (
    wallet: WalletSession,
    title: string,
    builder: string,
    owner: string,
    repo: string,
    criteria: string[],
    deadline: number,
  ) =>
    send(wallet, "create_milestone", [
      title,
      address(builder),
      owner,
      repo,
      criteria.join("\n"),
      deadline,
    ]),
  cancelMilestone: (wallet: WalletSession, milestoneId: number) =>
    send(wallet, "cancel_milestone", [id(milestoneId)]),
  submitEvidence: (
    wallet: WalletSession,
    milestoneId: number,
    commitUrl: string,
    summary: string,
  ) => send(wallet, "submit_evidence", [id(milestoneId), commitUrl, summary]),
  resubmitEvidence: (
    wallet: WalletSession,
    milestoneId: number,
    commitUrl: string,
    summary: string,
  ) => send(wallet, "resubmit_evidence", [id(milestoneId), commitUrl, summary]),
  retryReview: (wallet: WalletSession, milestoneId: number) =>
    send(wallet, "retry_review", [id(milestoneId)]),
};

export async function waitFinalized(hash: string) {
  requireConfigured();
  const client = readClient();
  const finalized = await client.waitForTransactionReceipt({
    hash: hash as never,
    status: TransactionStatus.FINALIZED,
    retries: 120,
    interval: 3000,
  });
  if (finalized.txExecutionResultName) return finalized;
  const transaction = await client.getTransaction({ hash: hash as never }) as unknown as {
    consensus_data?: { leader_receipt?: Array<{ mode?: string; execution_result?: string }> };
  };
  const execution = transaction.consensus_data?.leader_receipt?.find(
    (receipt) => receipt.mode === "leader",
  )?.execution_result;
  return {
    ...finalized,
    ...(execution === "SUCCESS"
      ? { txExecutionResultName: ExecutionResult.FINISHED_WITH_RETURN }
      : execution === "ERROR"
        ? { txExecutionResultName: ExecutionResult.FINISHED_WITH_ERROR }
        : {}),
  };
}
