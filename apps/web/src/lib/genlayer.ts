import { createAccount, createClient, generatePrivateKey } from "genlayer-js";
import { studionet, testnetAsimov } from "genlayer-js/chains";
import type { GenLayerChain, GenLayerClient } from "genlayer-js/types";

export const CONTRACT_ADDRESS = (import.meta.env.VITE_GRANTGATE_ADDRESS ??
  "") as `0x${string}`;
export const CONTRACT_CONFIGURED = /^0x[0-9a-fA-F]{40}$/.test(CONTRACT_ADDRESS);

export type NetworkName = "studionet" | "testnet-asimov";
export type WalletKind = "injected" | "guest";

export const NETWORK: NetworkName =
  import.meta.env.VITE_GENLAYER_NETWORK === "testnet-asimov"
    ? "testnet-asimov"
    : "studionet";
export const CHAIN: GenLayerChain =
  NETWORK === "testnet-asimov" ? testnetAsimov : studionet;

const GUEST_KEY = "grantgate.guestKey";
const clients = new Map<string, GenLayerClient<GenLayerChain>>();
let consensusReady: Promise<void> | null = null;

export function isAddress(value: string | null | undefined): value is `0x${string}` {
  return typeof value === "string" && /^0x[0-9a-fA-F]{40}$/.test(value);
}

function guestPrivateKey(): `0x${string}` {
  const existing = localStorage.getItem(GUEST_KEY);
  if (existing && /^0x[0-9a-fA-F]{64}$/.test(existing)) {
    return existing as `0x${string}`;
  }
  const generated = generatePrivateKey();
  localStorage.setItem(GUEST_KEY, generated);
  return generated;
}

export function clearGuestKey(): void {
  localStorage.removeItem(GUEST_KEY);
}

export function guestAddress(): `0x${string}` {
  return createAccount(guestPrivateKey()).address;
}

export function signedClient(
  kind: WalletKind,
  address: `0x${string}`,
): GenLayerClient<GenLayerChain> {
  const key = `${NETWORK}:${kind}:${address.toLowerCase()}`;
  const cached = clients.get(key);
  if (cached) return cached;
  const client = createClient({
    chain: CHAIN,
    ...(kind === "injected"
      ? { account: address }
      : { account: createAccount(guestPrivateKey()) }),
  });
  clients.set(key, client);
  return client;
}

export function readClient(): GenLayerClient<GenLayerChain> {
  const key = `${NETWORK}:read-only`;
  const cached = clients.get(key);
  if (cached) return cached;
  const client = createClient({ chain: CHAIN });
  clients.set(key, client);
  return client;
}

export function resetClients(): void {
  clients.clear();
  consensusReady = null;
}

export async function ensureConsensus(client: GenLayerClient<GenLayerChain>): Promise<void> {
  if (!consensusReady) {
    const attempt = client.initializeConsensusSmartContract().catch(() => {
      if (consensusReady === attempt) consensusReady = null;
    });
    consensusReady = attempt;
  }
  await consensusReady;
}

export interface EthereumProvider {
  request(args: { method: string; params?: unknown[] }): Promise<unknown>;
  on?(event: string, callback: (...args: unknown[]) => void): void;
  removeListener?(event: string, callback: (...args: unknown[]) => void): void;
}

export function ethereumProvider(): EthereumProvider | null {
  return (window as unknown as { ethereum?: EthereumProvider }).ethereum ?? null;
}

export function walletErrorMessage(error: unknown): string {
  const code = (error as { code?: unknown } | null)?.code;
  if (code === 4001) return "Connection request rejected in your wallet.";
  if (code === -32002) return "Your wallet already has a pending request.";
  if (code === 4900 || code === 4901) return "Your wallet is not connected to a network.";
  const message = (error as { message?: unknown } | null)?.message;
  return typeof message === "string" && message.trim()
    ? message
    : "Could not connect to your wallet.";
}

export async function addGenLayerNetwork(): Promise<void> {
  const provider = ethereumProvider();
  if (!provider) throw new Error("No browser wallet found");
  const chainId = `0x${CHAIN.id.toString(16)}`;
  try {
    await provider.request({ method: "wallet_switchEthereumChain", params: [{ chainId }] });
  } catch {
    await provider.request({
      method: "wallet_addEthereumChain",
      params: [
        {
          chainId,
          chainName: CHAIN.name,
          nativeCurrency: CHAIN.nativeCurrency,
          rpcUrls: CHAIN.rpcUrls.default.http,
          blockExplorerUrls: CHAIN.blockExplorers
            ? [CHAIN.blockExplorers.default.url]
            : [],
        },
      ],
    });
    await provider.request({ method: "wallet_switchEthereumChain", params: [{ chainId }] });
  }
}

export async function ensureCorrectChain(kind: WalletKind): Promise<void> {
  if (kind !== "injected") return;
  const provider = ethereumProvider();
  if (!provider) throw new Error("No browser wallet found");
  const raw = (await provider.request({ method: "eth_chainId" })) as string;
  if (Number.parseInt(raw, 16) !== CHAIN.id) await addGenLayerNetwork();
}

export async function requestInjectedAccount(): Promise<`0x${string}`> {
  const provider = ethereumProvider();
  if (!provider) throw new Error("No browser wallet found");
  const accounts = (await provider.request({ method: "eth_requestAccounts" })) as string[];
  if (!isAddress(accounts?.[0])) throw new Error("Wallet returned no valid account");
  await addGenLayerNetwork();
  return accounts[0];
}

export const EXPLORER_URL = (
  NETWORK === "studionet"
    ? "https://explorer-studio.genlayer.com"
    : CHAIN.blockExplorers?.default.url ?? "https://explorer-asimov.genlayer.com"
).replace(/\/$/, "");

export const explorerTxUrl = (hash: string): string => `${EXPLORER_URL}/tx/${hash}`;
export const explorerAddressUrl = (address: string): string =>
  `${EXPLORER_URL}/address/${address}`;
