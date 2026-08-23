import { isDeepStrictEqual } from "node:util";

const ADDRESS = /^0x[0-9a-fA-F]{40}$/;

export function assertSuccessfulReceipt(receipt, label) {
  const explicitExecution = receipt?.txExecutionResultName;
  const successful = explicitExecution
    ? explicitExecution === "FINISHED_WITH_RETURN"
    : String(receipt?.status ?? "").toLowerCase() === "success";
  if (!successful) {
    throw new Error(`${label} did not execute successfully (${receipt?.txExecutionResultName ?? receipt?.status ?? "UNKNOWN"}).`);
  }
}

export function normalizeExecutionResult(transaction) {
  if (transaction?.txExecutionResultName === "FINISHED_WITH_RETURN") return "SUCCESS";
  if (transaction?.txExecutionResultName === "FINISHED_WITH_ERROR") return "ERROR";
  const receipts = transaction?.consensus_data?.leader_receipt;
  if (!Array.isArray(receipts)) return undefined;
  return receipts.find((receipt) => receipt?.mode === "leader")?.execution_result;
}

export const transactionExecutionResult = normalizeExecutionResult;

export function assertRejectedReplay(executionResult, before, after) {
  if (executionResult !== "ERROR") {
    throw new Error(`Replay did not produce an explicit GenVM error (${executionResult ?? "UNKNOWN"}).`);
  }
  if (!isDeepStrictEqual(after, before)) {
    throw new Error("Rejected replay changed contract state.");
  }
}

export async function waitForSuccessfulTransaction(client, hash, waitOptions, label) {
  const finalized = await client.waitForTransactionReceipt({ hash, ...waitOptions });
  if (finalized?.txExecutionResultName) {
    assertSuccessfulReceipt(finalized, label);
    return finalized;
  }
  const transaction = await client.getTransaction({ hash });
  const execution = transactionExecutionResult(transaction);
  if (execution !== "SUCCESS") {
    throw new Error(`${label} did not execute successfully (${execution ?? "UNKNOWN"}).`);
  }
  return finalized;
}

export function normalizePrivateKey(value) {
  const clean = String(value ?? "").trim().replace(/^0x/i, "");
  if (!/^[0-9a-fA-F]{64}$/.test(clean)) {
    throw new Error("DEPLOYER_PRIVATE_KEY must contain exactly 64 hexadecimal characters.");
  }
  return `0x${clean}`;
}

export function contractAddressFromReceipt(receipt) {
  const candidate = receipt?.data?.contract_address ?? receipt?.data?.contractAddress ?? receipt?.contract_address;
  if (!ADDRESS.test(String(candidate ?? ""))) throw new Error("Finalized receipt did not contain a valid contract address.");
  return candidate;
}

export function assertSourceProvenance(headBlob, workingBlob) {
  if (!headBlob || headBlob !== workingBlob) {
    throw new Error("packages/contracts/grantgate.py does not match HEAD; commit the exact source before deployment.");
  }
}

export function explorerBase(network) {
  return network === "testnet-asimov" ? "https://explorer-asimov.genlayer.com" : "https://explorer-studio.genlayer.com";
}

function jsonSafe(value) {
  if (typeof value === "bigint") return value.toString();
  if (Array.isArray(value)) return value.map(jsonSafe);
  if (value && typeof value === "object") return Object.fromEntries(Object.entries(value).map(([key, item]) => [key, jsonSafe(item)]));
  return value;
}

export function createManifest(input) {
  if (!ADDRESS.test(input.address) || !ADDRESS.test(input.deployer)) throw new Error("Manifest contains an invalid address.");
  const explorer = explorerBase(input.network);
  return {
    project: "GrantGate",
    classification: "INTENTIONALLY_FROZEN",
    network: input.network,
    chainId: input.chainId,
    address: input.address,
    deployer: input.deployer,
    transactionHash: input.transactionHash,
    consensusStatus: input.consensusStatus,
    executionResult: input.executionResult,
    source: { path: "packages/contracts/grantgate.py", sha256: input.sourceSha256, gitCommit: input.gitCommit },
    deployedAt: input.deployedAt,
    explorer: { contract: `${explorer}/address/${input.address}`, transaction: `${explorer}/tx/${input.transactionHash}` },
    readback: jsonSafe(input.readback),
  };
}
