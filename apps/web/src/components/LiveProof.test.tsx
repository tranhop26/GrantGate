import { render, screen } from "@testing-library/react";
import { MemoryRouter } from "react-router-dom";
import { describe, expect, it, vi } from "vitest";

const milestoneQuery = vi.hoisted(() => vi.fn());

vi.mock("@/hooks/useGrantGate", () => ({
  useMilestone: milestoneQuery,
}));

import { LiveProof } from "./LiveProof";

const acceptedRecord = {
  id: 7,
  title: "Live proof: immutable GrantGate commit",
  status: "ACCEPTED" as const,
  criteria: ["The evidence bundle maps the frozen source to the public deployment."],
  criteriaResults: ["MET" as const],
  explanation: "Validators found sufficient observable implementation evidence.",
  commitSha: "0d0bd774cad418e7b1430838bdcc2b0471a4bf5d",
  commitUrl: "https://github.com/tranhop26/grantgate/commit/0d0bd774cad418e7b1430838bdcc2b0471a4bf5d",
  evidenceVersion: 1,
  reviewRound: 1,
};

describe("LiveProof", () => {
  it("shows authoritative Studionet proof without requesting a wallet", () => {
    milestoneQuery.mockReturnValue({ isLoading: false, error: null, data: acceptedRecord });

    render(<MemoryRouter><LiveProof /></MemoryRouter>);

    expect(screen.getByText("Preview · Studionet")).toBeInTheDocument();
    expect(screen.getByText("ACCEPTED")).toBeInTheDocument();
    expect(screen.getByText("MET")).toBeInTheDocument();
    expect(screen.getByText(/Validators found sufficient/)).toBeInTheDocument();
    expect(screen.getByRole("link", { name: /open milestone #7/i })).toHaveAttribute("href", "/milestones/7");
    expect(screen.getByRole("link", { name: /successful review transaction/i })).toHaveAttribute("href", expect.stringContaining("0x49cc510f"));
    expect(screen.getByRole("link", { name: /rejected replay transaction/i })).toHaveAttribute("href", expect.stringContaining("0xfc62b8c2"));
  });

  it("shows a loading state while the contract read is pending", () => {
    milestoneQuery.mockReturnValue({ isLoading: true, error: null, data: undefined });

    render(<MemoryRouter><LiveProof /></MemoryRouter>);

    expect(screen.getByRole("status")).toHaveTextContent("Reading live contract proof…");
  });

  it("surfaces a failed contract read without inventing a decision", () => {
    milestoneQuery.mockReturnValue({ isLoading: false, error: new Error("RPC unavailable"), data: undefined });

    render(<MemoryRouter><LiveProof /></MemoryRouter>);

    expect(screen.getByRole("alert")).toHaveTextContent("RPC unavailable");
    expect(screen.queryByText("ACCEPTED")).not.toBeInTheDocument();
  });

  it("reports when the featured contract record is missing", () => {
    milestoneQuery.mockReturnValue({ isLoading: false, error: null, data: null });

    render(<MemoryRouter><LiveProof /></MemoryRouter>);

    expect(screen.getByRole("status")).toHaveTextContent("Live contract proof is unavailable.");
  });
});
