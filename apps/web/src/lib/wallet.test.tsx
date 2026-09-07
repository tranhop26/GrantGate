import { render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { beforeEach, describe, expect, it, vi } from "vitest";

const requestInjectedAccount = vi.hoisted(() => vi.fn());
const resetClients = vi.hoisted(() => vi.fn());
const walletErrorMessage = vi.hoisted(() =>
  vi.fn((error: unknown) => (error as Error).message),
);

vi.mock("./genlayer", () => ({
  requestInjectedAccount,
  resetClients,
  walletErrorMessage,
  ethereumProvider: () => null,
}));

const { WalletProvider, useWallet } = await import("./wallet");

function Probe() {
  const wallet = useWallet();
  return (
    <div>
      <output aria-label="wallet phase">{wallet.phase}</output>
      <output aria-label="wallet kind">{wallet.kind ?? "none"}</output>
      <output aria-label="wallet address">{wallet.address ?? "none"}</output>
      <output aria-label="wallet error">{wallet.error ?? "none"}</output>
      <button onClick={() => void wallet.connectInjected()}>Injected</button>
      <button onClick={() => wallet.disconnect()}>Disconnect</button>
    </div>
  );
}

function setup() {
  return render(
    <WalletProvider>
      <Probe />
    </WalletProvider>,
  );
}

beforeEach(() => {
  vi.clearAllMocks();
  localStorage.clear();
});

describe("WalletProvider", () => {
  it("connects and disconnects an injected wallet", async () => {
    const user = userEvent.setup();
    requestInjectedAccount.mockResolvedValueOnce(
      "0x7777777777777777777777777777777777777777",
    );
    setup();
    expect(screen.getByLabelText("wallet phase")).toHaveTextContent("DISCONNECTED");
    await user.click(screen.getByRole("button", { name: "Injected" }));
    expect(screen.getByLabelText("wallet phase")).toHaveTextContent("CONNECTED");
    expect(screen.getByLabelText("wallet kind")).toHaveTextContent("injected");
    expect(screen.getByLabelText("wallet address")).toHaveTextContent("0x7777");
    await user.click(screen.getByRole("button", { name: "Disconnect" }));
    expect(screen.getByLabelText("wallet phase")).toHaveTextContent("DISCONNECTED");
    expect(screen.getByLabelText("wallet kind")).toHaveTextContent("none");
    expect(screen.getByLabelText("wallet address")).toHaveTextContent("none");
    expect(resetClients).toHaveBeenCalledTimes(2);
  });

  it("surfaces injected-wallet rejection as an error state", async () => {
    const user = userEvent.setup();
    requestInjectedAccount.mockRejectedValueOnce(new Error("Connection rejected"));
    setup();
    await user.click(screen.getByRole("button", { name: "Injected" }));
    expect(screen.getByLabelText("wallet phase")).toHaveTextContent("ERROR");
    expect(screen.getByLabelText("wallet error")).toHaveTextContent("Connection rejected");
    expect(screen.getByLabelText("wallet address")).toHaveTextContent("none");
  });

  it("disconnects locally even when the deferred client reset fails", async () => {
    const user = userEvent.setup();
    requestInjectedAccount.mockResolvedValueOnce(
      "0x7777777777777777777777777777777777777777",
    );
    resetClients
      .mockImplementationOnce(() => undefined)
      .mockImplementationOnce(() => {
        throw new Error("reset failed");
      });

    setup();
    await user.click(screen.getByRole("button", { name: "Injected" }));
    expect(screen.getByLabelText("wallet phase")).toHaveTextContent("CONNECTED");

    await user.click(screen.getByRole("button", { name: "Disconnect" }));

    expect(screen.getByLabelText("wallet phase")).toHaveTextContent("DISCONNECTED");
    expect(screen.getByLabelText("wallet kind")).toHaveTextContent("none");
    expect(screen.getByLabelText("wallet address")).toHaveTextContent("none");
  });
});
