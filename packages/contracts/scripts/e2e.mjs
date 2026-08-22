#!/usr/bin/env node
import { existsSync, mkdirSync, readFileSync, writeFileSync } from "node:fs";
import { dirname, join } from "node:path";
import { fileURLToPath } from "node:url";
import { createAccount, createClient, generatePrivateKey } from "genlayer-js";
import { studionet, testnetAsimov } from "genlayer-js/chains";
import { CalldataAddress, ExecutionResult, TransactionStatus } from "genlayer-js/types";
import { explorerBase, normalizePrivateKey } from "./deployment.mjs";

const here = dirname(fileURLToPath(import.meta.url));
const root = join(here, "..", "..", "..");
const envPath = join(root, ".env");
if (existsSync(envPath)) for (const line of readFileSync(envPath, "utf8").split(/\r?\n/)) {
  const match = line.match(/^\s*([A-Z_][A-Z0-9_]*)\s*=\s*(.*?)\s*$/);
  if (match && !(match[1] in process.env)) process.env[match[1]] = match[2].replace(/^(['"])(.*)\1$/, "$2");
}

const network = process.argv.includes("testnet-asimov") ? "testnet-asimov" : "studionet";
const execute = process.argv.includes("--execute");
const chain = network === "testnet-asimov" ? testnetAsimov : studionet;
const contractAddress = process.env.VITE_GRANTGATE_ADDRESS ?? "";
if (!/^0x[0-9a-fA-F]{40}$/.test(contractAddress)) throw new Error("VITE_GRANTGATE_ADDRESS must be a deployed contract address.");
const sponsor = createAccount(normalizePrivateKey(process.env.DEPLOYER_PRIVATE_KEY));
const rawBuilder = process.env.E2E_BUILDER_PRIVATE_KEY?.trim();
if (!rawBuilder && network !== "studionet") throw new Error("E2E_BUILDER_PRIVATE_KEY is required outside Studionet.");
const builder = createAccount(rawBuilder ? normalizePrivateKey(rawBuilder) : generatePrivateKey());
const commitUrl = process.env.E2E_COMMIT_URL?.trim() ?? "";
const match = commitUrl.match(/^https:\/\/github\.com\/([a-z0-9][a-z0-9._-]{0,99})\/([a-z0-9][a-z0-9._-]{0,99})\/commit\/([0-9a-f]{40})$/);
if (!match) throw new Error("E2E_COMMIT_URL must be a canonical public GitHub commit URL.");
const criterion = process.env.E2E_CRITERION?.trim() ?? "";
if (criterion.length < 20 || criterion.length > 400 || criterion.includes("\n")) throw new Error("E2E_CRITERION must be one 20–400 character observable criterion.");

console.log(`Network: ${network} (chain ${chain.id})`);
console.log(`Contract: ${contractAddress}`);
console.log(`Sponsor: ${sponsor.address}`);
console.log(`Builder: ${builder.address}`);
console.log(`Evidence: ${commitUrl}`);
if (!execute) { console.log("Preflight only. Re-run with --execute only after action-time confirmation."); process.exit(0); }

const sponsorClient = createClient({ chain, account: sponsor });
const builderClient = createClient({ chain, account: builder });
await sponsorClient.initializeConsensusSmartContract();
await builderClient.initializeConsensusSmartContract();
const asCalldataAddress = (hex) => new CalldataAddress(Uint8Array.from(hex.slice(2).match(/../g).map((byte) => Number.parseInt(byte, 16))));
const wait = (client, hash) => client.waitForTransactionReceipt({ hash, status: TransactionStatus.FINALIZED, retries: 180, interval: 3000 });
const successful = (receipt, label) => {
  if (receipt.txExecutionResultName !== ExecutionResult.FINISHED_WITH_RETURN) throw new Error(`${label} did not execute successfully (${receipt.txExecutionResultName ?? "UNKNOWN"}).`);
};

const configBefore = await sponsorClient.readContract({ address: contractAddress, functionName: "get_config", args: [] });
const expectedId = Number(configBefore.milestone_count) + 1;
const createHash = await sponsorClient.writeContract({ address: contractAddress, functionName: "create_milestone", args: ["Live proof: immutable GrantGate commit", asCalldataAddress(builder.address), match[1], match[2], criterion, Math.floor(Date.now() / 1000) + 7200], value: 0n });
successful(await wait(sponsorClient, createHash), "Milestone creation");
const created = await sponsorClient.readContract({ address: contractAddress, functionName: "get_milestone", args: [expectedId] });
if (Number(created?.id) !== expectedId || created?.status !== "OPEN") throw new Error("Create readback did not confirm the OPEN milestone.");

const submitHash = await builderClient.writeContract({ address: contractAddress, functionName: "submit_evidence", args: [expectedId, commitUrl, "Live integration evidence binds the advertised implementation to this immutable public commit."], value: 0n });
successful(await wait(builderClient, submitHash), "Evidence submission");
const reviewed = await sponsorClient.readContract({ address: contractAddress, functionName: "get_milestone", args: [expectedId] });
if (Number(reviewed?.evidence_version) !== 1 || reviewed?.commit_url !== commitUrl || !["ACCEPTED", "REJECTED", "UNRESOLVED"].includes(reviewed?.status)) throw new Error("Review readback did not confirm a terminal validator decision.");

const replayHash = await builderClient.writeContract({ address: contractAddress, functionName: "submit_evidence", args: [expectedId, commitUrl, "This replay must be rejected without changing the authoritative contract record."], value: 0n });
const replayReceipt = await wait(builderClient, replayHash);
if (replayReceipt.txExecutionResultName === ExecutionResult.FINISHED_WITH_RETURN) throw new Error("Replay unexpectedly succeeded.");
const afterReplay = await sponsorClient.readContract({ address: contractAddress, functionName: "get_milestone", args: [expectedId] });
if (Number(afterReplay?.evidence_version) !== 1 || afterReplay?.status !== reviewed.status) throw new Error("Rejected replay changed contract state.");

const explorer = explorerBase(network);
const evidence = {
  network, contractAddress, milestoneId: expectedId,
  create: { actor: sponsor.address, method: "create_milestone", transactionHash: createHash, state: "OPEN", readback: { id: Number(created.id), status: created.status } },
  submit: { actor: builder.address, method: "submit_evidence", transactionHash: submitHash, state: reviewed.status, readback: { evidenceVersion: Number(reviewed.evidence_version), commitSha: reviewed.commit_sha, resultVector: reviewed.result_vector } },
  replay: { actor: builder.address, method: "submit_evidence", transactionHash: replayHash, state: "ERROR", readback: { status: afterReplay.status, evidenceVersion: Number(afterReplay.evidence_version) } },
  explorer: { create: `${explorer}/tx/${createHash}`, submit: `${explorer}/tx/${submitHash}`, replay: `${explorer}/tx/${replayHash}` },
  verifiedAt: new Date().toISOString(),
};
const evidencePath = join(root, "deployments", `${network}-e2e.json`);
mkdirSync(dirname(evidencePath), { recursive: true });
writeFileSync(evidencePath, `${JSON.stringify(evidence, null, 2)}\n`, "utf8");
console.log(`Final decision: ${reviewed.status}`);
console.log(`Replay: rejected; readback unchanged at evidence version 1`);
console.log(`Evidence: ${evidencePath}`);
