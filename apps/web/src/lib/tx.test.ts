import { ExecutionResult, TransactionStatus } from "genlayer-js/types";
import { describe, expect, it, vi } from "vitest";
import { executeTransaction, transactionErrorMessage, type TxSnapshot } from "./tx";

const HASH = "0xaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaa";

describe("executeTransaction", () => {
  it("maps insufficient funds to actionable Studionet funding guidance", () => {
    expect(transactionErrorMessage(new Error("insufficient funds for gas"))).toMatch(
      /fund.*Studionet/i,
    );
    expect(transactionErrorMessage(new Error("execution reverted"))).toBe(
      "execution reverted",
    );
  });

  it("publishes finality, execution success, then authoritative readback", async () => {
    const states: TxSnapshot<number>[] = [];
    const result = await executeTransaction({
      send: async () => HASH,
      waitFinalized: async () => ({
        statusName: TransactionStatus.FINALIZED,
        txExecutionResultName: ExecutionResult.FINISHED_WITH_RETURN,
      }),
      readback: async () => 7,
      verifyReadback: (value) => value === 7,
      onState: (state) => states.push(state),
    });

    expect(states.map((state) => state.phase)).toEqual([
      "SIGNING",
      "PENDING",
      "FINALIZED",
      "SUCCESS",
      "READBACK",
    ]);
    expect(result).toEqual({ hash: HASH, readback: 7 });
  });

  it("stops at finalized when contract execution failed", async () => {
    const phases: string[] = [];
    await expect(
      executeTransaction<number>({
        send: async () => HASH,
        waitFinalized: async () => ({
          statusName: TransactionStatus.FINALIZED,
          txExecutionResultName: ExecutionResult.FINISHED_WITH_ERROR,
        }),
        readback: vi.fn(async () => 7),
        verifyReadback: () => true,
        onState: (state) => phases.push(state.phase),
      }),
    ).rejects.toThrow("execution failed");
    expect(phases).toEqual(["SIGNING", "PENDING", "FINALIZED", "ERROR"]);
  });

  it("reports wallet rejection before a hash exists", async () => {
    const states: TxSnapshot<number>[] = [];
    await expect(
      executeTransaction<number>({
        send: async () => {
          throw Object.assign(new Error("rejected"), { code: 4001 });
        },
        waitFinalized: vi.fn(),
        readback: vi.fn(),
        verifyReadback: () => true,
        onState: (state) => states.push(state),
      }),
    ).rejects.toThrow("rejected");
    expect(states.map((state) => state.phase)).toEqual(["SIGNING", "ERROR"]);
    expect(states.at(-1)?.hash).toBeUndefined();
  });

  it("publishes actionable funding guidance when signing has insufficient funds", async () => {
    const states: TxSnapshot<number>[] = [];
    await expect(
      executeTransaction<number>({
        send: async () => {
          throw new Error("insufficient funds for gas");
        },
        waitFinalized: vi.fn(),
        readback: vi.fn(),
        verifyReadback: () => true,
        onState: (state) => states.push(state),
      }),
    ).rejects.toThrow("insufficient funds for gas");
    expect(states.at(-1)).toMatchObject({
      phase: "ERROR",
      error: expect.stringMatching(/fund.*Studionet/i),
    });
  });

  it("rejects a readback that does not prove the write", async () => {
    const phases: string[] = [];
    await expect(
      executeTransaction({
        send: async () => HASH,
        waitFinalized: async () => ({
          statusName: TransactionStatus.FINALIZED,
          txExecutionResultName: ExecutionResult.FINISHED_WITH_RETURN,
        }),
        readback: async () => 6,
        verifyReadback: (value) => value === 7,
        onState: (state) => phases.push(state.phase),
      }),
    ).rejects.toThrow("readback did not confirm");
    expect(phases).toEqual([
      "SIGNING",
      "PENDING",
      "FINALIZED",
      "SUCCESS",
      "ERROR",
    ]);
  });
});
