import { beforeEach, describe, expect, it, vi } from "vitest";

const readContract = vi.hoisted(() => vi.fn());
const waitForTransactionReceipt = vi.hoisted(() => vi.fn());
const getTransaction = vi.hoisted(() => vi.fn());
const writeContract = vi.hoisted(() =>
  vi.fn(async (call: { functionName: string; [key: string]: unknown }) => {
    void call;
    return "0xhash";
  }),
);
const ensureCorrectChain = vi.hoisted(() => vi.fn(async () => undefined));
const ensureConsensus = vi.hoisted(() => vi.fn(async () => undefined));
const signedClient = vi.hoisted(() => vi.fn(() => ({ writeContract })));
const readClient = vi.hoisted(() => vi.fn(() => ({ readContract, waitForTransactionReceipt, getTransaction })));

vi.mock("./genlayer", () => ({
  CONTRACT_ADDRESS: "0x9999999999999999999999999999999999999999",
  CONTRACT_CONFIGURED: true,
  ensureCorrectChain,
  ensureConsensus,
  signedClient,
  readClient,
}));

const { reads, waitFinalized, writes } = await import("./contract");

const WALLET = {
  kind: "injected" as const,
  address: "0x2222222222222222222222222222222222222222" as const,
};

beforeEach(() => {
  vi.clearAllMocks();
});

describe("contract boundary", () => {
  it("parses a real get_config read shape", async () => {
    readContract.mockResolvedValue({
      classification: "INTENTIONALLY_FROZEN",
      schema_version: 1,
      milestone_count: 0,
      retry_cooldown_seconds: 300,
      max_evidence_versions: 3,
      max_review_rounds: 3,
    });
    await expect(reads.config()).resolves.toMatchObject({ milestoneCount: 0 });
    expect(readContract).toHaveBeenCalledWith(
      expect.objectContaining({ functionName: "get_config", args: [] }),
    );
  });

  it("reads the sponsor tail beyond the first 50 records", async () => {
    readContract
      .mockResolvedValueOnce({ created: 52, assigned: 0, accepted: 0, rejected: 0, unresolved: 0 })
      .mockResolvedValueOnce([]);
    const result = await reads.sponsorMilestoneTail(WALLET.address, 50);
    expect(result.createdCount).toBe(52);
    expect(readContract).toHaveBeenNthCalledWith(2, expect.objectContaining({ functionName: "get_sponsor_milestones", args: expect.arrayContaining([50, 2]) }));
  });

  it("encodes create_milestone with an address calldata value", async () => {
    await writes.createMilestone(
      WALLET,
      "Ship CSV export",
      "0x3333333333333333333333333333333333333333",
      "open-labs",
      "ledger",
      ["The command exports a stable UTF-8 CSV with a documented header."],
      1_900_000_000,
    );
    expect(ensureCorrectChain).toHaveBeenCalledWith();
    expect(signedClient).toHaveBeenCalledWith(WALLET.address);
    expect(ensureConsensus).toHaveBeenCalled();
    expect(writeContract).toHaveBeenCalledWith(
      expect.objectContaining({
        functionName: "create_milestone",
        args: expect.arrayContaining(["Ship CSV export", "open-labs", "ledger"]),
      }),
    );
  });

  it("sends exact evidence and retry method names", async () => {
    await writes.submitEvidence(
      WALLET,
      7,
      "https://github.com/open-labs/ledger/commit/0123456789abcdef0123456789abcdef01234567",
      "The commit implements the requested behavior and regression coverage.",
    );
    await writes.retryReview(WALLET, 7);
    expect(writeContract.mock.calls.map(([call]) => call.functionName)).toEqual([
      "submit_evidence",
      "retry_review",
    ]);
  });

  it("maps the current Studionet leader execution result into the frontend receipt", async () => {
    waitForTransactionReceipt.mockResolvedValue({ status: 7, statusName: "FINALIZED" });
    getTransaction.mockResolvedValue({
      consensus_data: { leader_receipt: [{ mode: "leader", execution_result: "SUCCESS" }] },
    });
    await expect(waitFinalized("0xhash")).resolves.toMatchObject({
      statusName: "FINALIZED",
      txExecutionResultName: "FINISHED_WITH_RETURN",
    });
  });
});
