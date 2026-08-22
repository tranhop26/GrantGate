#!/usr/bin/env node
import { createHash } from "node:crypto";
import { execFileSync } from "node:child_process";
import { existsSync, mkdirSync, readFileSync, writeFileSync } from "node:fs";
import { dirname, join } from "node:path";
import { fileURLToPath } from "node:url";
import { createAccount, createClient } from "genlayer-js";
import { studionet, testnetAsimov } from "genlayer-js/chains";
import { ExecutionResult, TransactionStatus } from "genlayer-js/types";
import { contractAddressFromReceipt, createManifest, normalizePrivateKey } from "./deployment.mjs";

const here = dirname(fileURLToPath(import.meta.url));
const root = join(here, "..", "..", "..");
const contractPath = join(here, "..", "grantgate.py");

const envPath = join(root, ".env");
if (existsSync(envPath)) {
  for (const line of readFileSync(envPath, "utf8").split(/\r?\n/)) {
    const match = line.match(/^\s*([A-Z_][A-Z0-9_]*)\s*=\s*(.*?)\s*$/);
    if (match && !(match[1] in process.env)) process.env[match[1]] = match[2].replace(/^(['"])(.*)\1$/, "$2");
  }
}

const network = process.argv.includes("testnet-asimov") ? "testnet-asimov" : "studionet";
const execute = process.argv.includes("--execute");
const chain = network === "testnet-asimov" ? testnetAsimov : studionet;
const key = normalizePrivateKey(process.env.DEPLOYER_PRIVATE_KEY);
const account = createAccount(key);
const code = readFileSync(contractPath, "utf8");
const sourceSha256 = createHash("sha256").update(code).digest("hex");
const gitCommit = execFileSync("git", ["rev-parse", "HEAD"], { cwd: root, encoding: "utf8" }).trim();

console.log(`Network: ${network} (chain ${chain.id})`);
console.log(`Deployer: ${account.address}`);
console.log(`Contract source SHA-256: ${sourceSha256}`);
console.log(`Git commit: ${gitCommit}`);
if (!execute) {
  console.log("Preflight only. Re-run with --execute only after action-time confirmation.");
  process.exit(0);
}

const client = createClient({ chain, account });
await client.initializeConsensusSmartContract();
const transactionHash = await client.deployContract({ code, args: [] });
console.log(`Deploy transaction: ${transactionHash}`);
const receipt = await client.waitForTransactionReceipt({ hash: transactionHash, status: TransactionStatus.FINALIZED, retries: 180, interval: 3000 });
if (receipt.txExecutionResultName !== ExecutionResult.FINISHED_WITH_RETURN) {
  throw new Error(`Deployment finalized without successful execution (${receipt.txExecutionResultName ?? "UNKNOWN"}).`);
}
const address = contractAddressFromReceipt(receipt);
const readback = await client.readContract({ address, functionName: "get_config", args: [] });
if (readback?.classification !== "INTENTIONALLY_FROZEN" || Number(readback?.schema_version) !== 1) {
  throw new Error("Deployed contract readback did not match the frozen GrantGate schema.");
}
const manifest = createManifest({ network, chainId: chain.id, address, deployer: account.address, transactionHash, sourceSha256, gitCommit, deployedAt: new Date().toISOString(), readback });
const deploymentsDir = join(root, "deployments");
mkdirSync(deploymentsDir, { recursive: true });
const manifestPath = join(deploymentsDir, `${network}.json`);
writeFileSync(manifestPath, `${JSON.stringify(manifest, null, 2)}\n`, "utf8");
console.log(`Contract: ${address}`);
console.log(`Readback: classification=${readback.classification}, schema_version=${readback.schema_version}`);
console.log(`Manifest: ${manifestPath}`);
