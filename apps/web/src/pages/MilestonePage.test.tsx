import { render, screen } from "@testing-library/react";
import { MemoryRouter, Route, Routes } from "react-router-dom";
import { describe, expect, it, vi } from "vitest";

const hooks = vi.hoisted(() => ({
  useMilestone: vi.fn(),
  useGrantGateTx: vi.fn(),
}));
const wallet = vi.hoisted(() => vi.fn());

vi.mock("@/hooks/useGrantGate", () => ({
  useMilestone: hooks.useMilestone,
  useGrantGateTx: hooks.useGrantGateTx,
}));
vi.mock("@/lib/wallet", () => ({ useWallet: wallet }));

import { MilestonePage } from "./MilestonePage";

const acceptedRecord = {
  id: 7,
  sponsor: "0x1111111111111111111111111111111111111111",
  builder: "0x2222222222222222222222222222222222222222",
  title: "Live proof: immutable GrantGate commit",
  repo: "tranhop26/grantgate",
  criteria: ["The evidence bundle maps the frozen source to the public deployment."],
  criteriaResults: ["MET" as const],
  deadline: 4_000_000_000,
  createdAt: 1,
  status: "ACCEPTED" as const,
  evidenceVersion: 1,
  reviewRound: 1,
  submittedAt: 2,
  lastReviewedAt: 3,
  commitUrl: "https://github.com/tranhop26/grantgate/commit/0d0bd774cad418e7b1430838bdcc2b0471a4bf5d",
  commitSha: "0d0bd774cad418e7b1430838bdcc2b0471a4bf5d",
  summary: "Public proof of the deployed implementation.",
  explanation: "Validators found sufficient observable implementation evidence.",
  completedAt: 4,
};

describe("MilestonePage", () => {
  it("renders an accepted milestone to a disconnected reader without write controls", () => {
    // This fails if a wallet gate hides public contract records.
    wallet.mockReturnValue({ address: null });
    hooks.useMilestone.mockReturnValue({ isLoading: false, error: null, data: acceptedRecord });
    hooks.useGrantGateTx.mockReturnValue({ isPending: false, error: null, snapshot: null, mutateAsync: vi.fn() });

    render(
      <MemoryRouter initialEntries={["/milestones/7"]} future={{ v7_startTransition: true, v7_relativeSplatPath: true }}>
        <Routes><Route path="/milestones/:id" element={<MilestonePage />} /></Routes>
      </MemoryRouter>,
    );

    expect(screen.getByRole("heading", { name: /live proof: immutable/i })).toBeInTheDocument();
    expect(screen.getByText("ACCEPTED")).toBeInTheDocument();
    expect(screen.getByText(/Validators found sufficient/)).toBeInTheDocument();
    expect(screen.getByText(/Connect MetaMask to perform authorized writes/i)).toBeInTheDocument();
    expect(screen.queryByRole("button", { name: /submit for validator review/i })).not.toBeInTheDocument();
  });
});
