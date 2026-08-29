import { ExecutionResult, TransactionStatus } from "genlayer-js/types";

export type TxPhase =
  | "DISCONNECTED"
  | "SIGNING"
  | "PENDING"
  | "FINALIZED"
  | "SUCCESS"
  | "ERROR"
  | "READBACK";

export interface FinalReceipt {
  statusName?: TransactionStatus | string;
  txExecutionResultName?: ExecutionResult | string;
}

export interface TxSnapshot<T> {
  phase: TxPhase;
  hash?: string;
  readback?: T;
  error?: string;
}

export interface ExecuteTransactionOptions<T> {
  send: () => Promise<string>;
  waitFinalized: (hash: string) => Promise<FinalReceipt>;
  readback: () => Promise<T>;
  verifyReadback: (value: T) => boolean;
  onState: (snapshot: TxSnapshot<T>) => void;
}

export function transactionErrorMessage(error: unknown): string {
  const message = error instanceof Error ? error.message : String(error);
  if (/insufficient funds/i.test(message)) {
    return "Fund this wallet with usable GEN on Studionet from the Accounts panel in GenLayer Studio, then retry.";
  }
  return message;
}

export async function executeTransaction<T>({
  send,
  waitFinalized,
  readback,
  verifyReadback,
  onState,
}: ExecuteTransactionOptions<T>): Promise<{ hash: string; readback: T }> {
  let hash: string | undefined;
  onState({ phase: "SIGNING" });
  try {
    hash = await send();
    onState({ phase: "PENDING", hash });
    const receipt = await waitFinalized(hash);
    if (receipt.statusName && receipt.statusName !== TransactionStatus.FINALIZED) {
      throw new Error(`Transaction did not finalize (${receipt.statusName})`);
    }
    onState({ phase: "FINALIZED", hash });
    if (receipt.txExecutionResultName !== ExecutionResult.FINISHED_WITH_RETURN) {
      throw new Error(
        `Contract execution failed (${receipt.txExecutionResultName ?? "NOT_VOTED"})`,
      );
    }
    onState({ phase: "SUCCESS", hash });
    const value = await readback();
    if (!verifyReadback(value)) {
      throw new Error("Authoritative contract readback did not confirm the write");
    }
    onState({ phase: "READBACK", hash, readback: value });
    return { hash, readback: value };
  } catch (error) {
    const message = transactionErrorMessage(error);
    onState({ phase: "ERROR", hash, error: message });
    throw error;
  }
}
