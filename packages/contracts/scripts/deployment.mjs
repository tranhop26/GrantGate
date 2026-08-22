const ADDRESS = /^0x[0-9a-fA-F]{40}$/;

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
    source: { path: "packages/contracts/grantgate.py", sha256: input.sourceSha256, gitCommit: input.gitCommit },
    deployedAt: input.deployedAt,
    explorer: { contract: `${explorer}/address/${input.address}`, transaction: `${explorer}/tx/${input.transactionHash}` },
    readback: jsonSafe(input.readback),
  };
}
