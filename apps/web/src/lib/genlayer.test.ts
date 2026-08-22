import { describe, expect, it } from "vitest";
import { isAddress, walletErrorMessage } from "./genlayer";

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
});
