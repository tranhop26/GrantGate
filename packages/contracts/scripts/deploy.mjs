#!/usr/bin/env node
import { createHash } from "node:crypto";
import { execFileSync } from "node:child_process";
import { existsSync, mkdirSync, readFileSync, writeFileSync } from "node:fs";
import { dirname, join } from "node:path";
import { fileURLToPath } from "node:url";
import { createAccount, createClient } from "genlayer-js";
import { studionet, testnetAsimov } from "genlayer-js/chains";
import { TransactionStatus } from "genlayer-js/types";
import { assertSourceProvenance, contractAddressFromReceipt, createManifest, normalizePrivateKey, transactionExecutionResult, waitForSuccessfulTransaction } from "./deployment.mjs";

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
const headBlob = execFileSync("git", ["rev-parse", "HEAD:packages/contracts/grantgate.py"], { cwd: root, encoding: "utf8" }).trim();
const workingBlob = execFileSync("git", ["hash-object", "packages/contracts/grantgate.py"], { cwd: root, encoding: "utf8" }).trim();
assertSourceProvenance(headBlob, workingBlob);

console.log(`Network: ${network} (chain ${chain.id})`);
console.log(`Deployer: ${account.address}`);
console.log(`Contract source SHA-256: ${sourceSha256}`);
console.log(`Git commit: ${gitCommit}`);
try {
  const response = await fetch(chain.rpcUrls.default.http[0], { method: "POST", headers: { "content-type": "application/json" }, body: JSON.stringify({ jsonrpc: "2.0", id: 1, method: "eth_getBalance", params: [account.address, "latest"] }), signal: AbortSignal.timeout(15_000) });
  const body = await response.json();
  const balance = BigInt(body?.result ?? "0x0");
  console.log(`Deployer balance: ${balance} wei`);
  if (network !== "studionet" && balance === 0n) throw new Error(`Deployer ${account.address} has no network balance.`);
} catch (cause) {
  if (network !== "studionet") throw cause;
  console.warn("Studionet balance probe was unavailable; deployment submission remains authoritative.");
}
if (!execute) {
  console.log("Preflight only. Re-run with --execute only after action-time confirmation.");
  process.exit(0);
}

const client = createClient({ chain, account });
try { await client.initializeConsensusSmartContract(); } catch (cause) {
  if (network !== "studionet") throw cause;
  console.warn("Studionet consensus initialization was not required; continuing to deployment.");
}
const transactionHash = await client.deployContract({ code, args: [] });
console.log(`Deploy transaction: ${transactionHash}`);
const receipt = await waitForSuccessfulTransaction(client, transactionHash, { status: TransactionStatus.FINALIZED, retries: 180, interval: 3000 }, "Deployment");
const executionResult = transactionExecutionResult(await client.getTransaction({ hash: transactionHash }));
const address = contractAddressFromReceipt(receipt);
const readback = await client.readContract({ address, functionName: "get_config", args: [] });
if (readback?.classification !== "INTENTIONALLY_FROZEN" || Number(readback?.schema_version) !== 1) {
  throw new Error("Deployed contract readback did not match the frozen GrantGate schema.");
}
const manifest = createManifest({ network, chainId: chain.id, address, deployer: account.address, transactionHash, consensusStatus: "FINALIZED", executionResult, sourceSha256, gitCommit, deployedAt: new Date().toISOString(), readback });
const deploymentsDir = join(root, "deployments");
mkdirSync(deploymentsDir, { recursive: true });
const manifestPath = join(deploymentsDir, `${network}.json`);
writeFileSync(manifestPath, `${JSON.stringify(manifest, null, 2)}\n`, "utf8");
console.log(`Contract: ${address}`);
console.log(`Readback: classification=${readback.classification}, schema_version=${readback.schema_version}`);
console.log(`Manifest: ${manifestPath}`);
