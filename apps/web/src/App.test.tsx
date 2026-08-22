import { render, screen } from "@testing-library/react";
import { MemoryRouter } from "react-router-dom";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { describe, expect, it, vi } from "vitest";

vi.mock("@/lib/wallet", () => ({
  useWallet: () => ({
    phase: "DISCONNECTED",
    kind: null,
    address: null,
    error: null,
    connectInjected: vi.fn(),
    connectGuest: vi.fn(),
    disconnect: vi.fn(),
  }),
}));

const { App } = await import("./App");

function renderRoute(path: string) {
  const client = new QueryClient({ defaultOptions: { queries: { retry: false } } });
  return render(<QueryClientProvider client={client}><MemoryRouter initialEntries={[path]}><App /></MemoryRouter></QueryClientProvider>);
}

describe("GrantGate first viewport", () => {
  it("explains the trust decision and offers a wallet connection", () => {
    renderRoute("/");

    expect(
      screen.getByRole("heading", { name: /software milestones deserve proof/i }),
    ).toBeInTheDocument();
    expect(screen.getByText(/validators inspect the immutable commit/i)).toBeInTheDocument();
    expect(screen.getByRole("button", { name: /connect wallet/i })).toBeInTheDocument();
    expect(screen.getByRole("link", { name: /create milestone/i })).toHaveAttribute(
      "href",
      "/milestones/new",
    );
  });

  it("does not invent dashboard records before a wallet is connected", () => {
    renderRoute("/dashboard");
    expect(screen.getByRole("heading", { name: /connect to use the on-chain workspace/i })).toBeInTheDocument();
    expect(screen.getByText(/nothing is populated with sample milestones/i)).toBeInTheDocument();
    expect(screen.queryByLabelText("Milestones")).not.toBeInTheDocument();
  });

  it("documents UNRESOLVED and frozen recovery boundaries", () => {
    renderRoute("/architecture");
    expect(screen.getByRole("heading", { name: /unresolved is a first-class outcome/i })).toBeInTheDocument();
    expect(screen.getByText(/no owner, proxy, upgrade key, or admin override/i)).toBeInTheDocument();
  });
});
