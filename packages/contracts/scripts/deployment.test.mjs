import assert from "node:assert/strict";
import test from "node:test";
import { assertRejectedReplay, assertSourceProvenance, assertSuccessfulReceipt, contractAddressFromReceipt, createManifest, normalizeExecutionResult, normalizePrivateKey, waitForSuccessfulTransaction } from "./deployment.mjs";

test("normalizes a private key without ever returning its input in errors", () => {
  assert.equal(normalizePrivateKey("a".repeat(64)), `0x${"a".repeat(64)}`);
  assert.throws(() => normalizePrivateKey("super-secret"), /64 hexadecimal/i);
});

test("requires the finalized deploy receipt to contain a contract address", () => {
  const address = "0x1111111111111111111111111111111111111111";
  assert.equal(contractAddressFromReceipt({ data: { contract_address: address } }), address);
  assert.throws(() => contractAddressFromReceipt({ data: {} }), /contract address/i);
});

test("accepts the current Studionet success receipt without the legacy execution-result field", () => {
  assert.doesNotThrow(() => assertSuccessfulReceipt({ status: "success" }, "Milestone creation"));
  assert.doesNotThrow(() => assertSuccessfulReceipt({ txExecutionResultName: "FINISHED_WITH_RETURN" }, "Milestone creation"));
  assert.throws(
    () => assertSuccessfulReceipt({ status: "success", txExecutionResultName: "FINISHED_WITH_ERROR" }, "Milestone creation"),
    /did not execute successfully/i,
  );
  assert.throws(() => assertSuccessfulReceipt({ status: "reverted" }, "Milestone creation"), /did not execute successfully/i);
});

test("verifies execution after waiting for GenLayer finalization", async () => {
  const finalized = { status: 7, data: { contract_address: "0x1111111111111111111111111111111111111111" } };
  const client = {
    waitForTransactionReceipt: async () => finalized,
    getTransaction: async () => ({
      consensus_data: { leader_receipt: [{ mode: "leader", execution_result: "SUCCESS" }] },
    }),
  };
  assert.deepEqual(await waitForSuccessfulTransaction(client, "0xabc", { status: 7 }, "Deployment"), finalized);
});

test("normalizes current and legacy execution-result shapes", () => {
  assert.equal(normalizeExecutionResult({ consensus_data: { leader_receipt: [{ mode: "leader", execution_result: "SUCCESS" }] } }), "SUCCESS");
  assert.equal(normalizeExecutionResult({ txExecutionResultName: "FINISHED_WITH_RETURN" }), "SUCCESS");
  assert.equal(normalizeExecutionResult({ txExecutionResultName: "FINISHED_WITH_ERROR" }), "ERROR");
  assert.equal(normalizeExecutionResult({}), undefined);
});

test("accepts a legacy failed replay after normalization", () => {
  const state = { status: "UNRESOLVED", evidence_version: 1 };
  assert.doesNotThrow(() => assertRejectedReplay(normalizeExecutionResult({ txExecutionResultName: "FINISHED_WITH_ERROR" }), state, { ...state }));
});

test("requires an explicit execution error and byte-for-byte-equivalent replay readback", () => {
  const before = { status: "UNRESOLVED", evidence_version: 1, explanation: "safe" };
  assert.doesNotThrow(() => assertRejectedReplay("ERROR", before, { ...before }));
  assert.throws(() => assertRejectedReplay(undefined, before, { ...before }), /explicit GenVM error/i);
  assert.throws(() => assertRejectedReplay("ERROR", before, { ...before, explanation: "changed" }), /changed contract state/i);
});

test("refuses to associate dirty contract source with the HEAD commit", () => {
  assert.doesNotThrow(() => assertSourceProvenance("same-blob", "same-blob"));
  assert.throws(() => assertSourceProvenance("head-blob", "working-blob"), /does not match HEAD/i);
});

test("creates an auditable frozen deployment manifest", () => {
  const manifest = createManifest({
    network: "studionet",
    chainId: 61999,
    address: "0x1111111111111111111111111111111111111111",
    deployer: "0x2222222222222222222222222222222222222222",
    transactionHash: `0x${"a".repeat(64)}`,
    consensusStatus: "FINALIZED",
    executionResult: "SUCCESS",
    sourceSha256: "b".repeat(64),
    gitCommit: "c".repeat(40),
    deployedAt: "2026-08-22T00:00:00.000Z",
    readback: { classification: "INTENTIONALLY_FROZEN", schema_version: 1n },
  });
  assert.equal(manifest.classification, "INTENTIONALLY_FROZEN");
  assert.equal(manifest.consensusStatus, "FINALIZED");
  assert.equal(manifest.executionResult, "SUCCESS");
  assert.match(manifest.explorer.contract, /0x1111/);
  assert.match(manifest.explorer.transaction, /0xaaaa/);
  assert.deepEqual(manifest.readback, { classification: "INTENTIONALLY_FROZEN", schema_version: "1" });
  assert.doesNotThrow(() => JSON.stringify(manifest));
});
