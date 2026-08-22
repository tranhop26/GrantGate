import assert from "node:assert/strict";
import test from "node:test";
import { assertSourceProvenance, contractAddressFromReceipt, createManifest, normalizePrivateKey } from "./deployment.mjs";

test("normalizes a private key without ever returning its input in errors", () => {
  assert.equal(normalizePrivateKey("a".repeat(64)), `0x${"a".repeat(64)}`);
  assert.throws(() => normalizePrivateKey("super-secret"), /64 hexadecimal/i);
});

test("requires the finalized deploy receipt to contain a contract address", () => {
  const address = "0x1111111111111111111111111111111111111111";
  assert.equal(contractAddressFromReceipt({ data: { contract_address: address } }), address);
  assert.throws(() => contractAddressFromReceipt({ data: {} }), /contract address/i);
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
    sourceSha256: "b".repeat(64),
    gitCommit: "c".repeat(40),
    deployedAt: "2026-08-22T00:00:00.000Z",
    readback: { classification: "INTENTIONALLY_FROZEN", schema_version: 1n },
  });
  assert.equal(manifest.classification, "INTENTIONALLY_FROZEN");
  assert.match(manifest.explorer.contract, /0x1111/);
  assert.match(manifest.explorer.transaction, /0xaaaa/);
  assert.deepEqual(manifest.readback, { classification: "INTENTIONALLY_FROZEN", schema_version: "1" });
  assert.doesNotThrow(() => JSON.stringify(manifest));
});
