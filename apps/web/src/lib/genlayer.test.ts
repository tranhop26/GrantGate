import { beforeEach, describe, expect, it, vi } from "vitest";

const createClient = vi.hoisted(() => vi.fn(() => ({})));

vi.mock("genlayer-js", () => ({ createClient }));

const { isAddress, resetClients, signedClient, walletErrorMessage } = await import(
  "./genlayer"
);

beforeEach(() => {
  vi.clearAllMocks();
  resetClients();
});

describe("wallet boundary helpers", () => {
  it("validates full 20-byte addresses", () => {
    expect(isAddress("0x1111111111111111111111111111111111111111")).toBe(true);
    expect(isAddress("0x1234")).toBe(false);
  });

  it("maps EIP-1193 failures to actionable text", () => {
    expect(walletErrorMessage({ code: 4001 })).toContain("rejected");
    expect(walletErrorMessage({ code: -32002 })).toContain("pending");
    expect(walletErrorMessage(new Error("locked"))).toBe("locked");
  });

  it("creates signed clients for the injected address", () => {
    const injectedAddress = "0x2222222222222222222222222222222222222222";
    signedClient(injectedAddress);
    expect(createClient).toHaveBeenCalledWith(
      expect.objectContaining({ account: injectedAddress }),
    );
  });
});
