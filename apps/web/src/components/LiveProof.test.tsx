import { fireEvent, render, screen } from "@testing-library/react";
import { MemoryRouter } from "react-router-dom";
import { beforeEach, describe, expect, it, vi } from "vitest";
import type { Milestone } from "@grantgate/shared";

const milestoneQuery = vi.hoisted(() => vi.fn());

vi.mock("@/hooks/useGrantGate", () => ({
  useMilestone: milestoneQuery,
}));

import { LiveProof } from "./LiveProof";

const acceptedRecord: Milestone = {
  id: 7,
  sponsor: "0x829c5E873Fb7DdE8a9be3BE5Fd5DFA46D48fd603",
  builder: "0xCD0064F7ab615C739B4890C895691b105B7428e0",
  title: "Live proof: immutable GrantGate commit",
  repo: "tranhop26/grantgate",
  criteria: ["The evidence bundle maps the frozen source to the public deployment."],
  criteriaResults: ["MET"],
  deadline: 1787464761,
  createdAt: 1787457563,
  status: "ACCEPTED",
  evidenceVersion: 1,
  reviewRound: 1,
  submittedAt: 1787457603,
  lastReviewedAt: 1787457603,
  commitUrl: "https://github.com/tranhop26/grantgate/commit/0d0bd774cad418e7b1430838bdcc2b0471a4bf5d",
  commitSha: "0d0bd774cad418e7b1430838bdcc2b0471a4bf5d",
  summary: "Live integration evidence binds the implementation to this commit.",
  explanation: "Validators found sufficient observable implementation evidence.",
  completedAt: 1787457603,
};

const unresolvedRecord: Milestone = {
  ...acceptedRecord,
  id: 3,
  status: "UNRESOLVED",
  criteriaResults: ["INSUFFICIENT"],
  commitUrl: "https://github.com/tranhop26/grantgate/commit/13d171e0b7919c997c294d58e3ada5420fe7e430",
  commitSha: "13d171e0b7919c997c294d58e3ada5420fe7e430",
  explanation: "The rendered evidence did not match the bound repository and commit.",
  completedAt: 0,
};

function ready(data: Milestone, refetch = vi.fn()) {
  return { isLoading: false, isFetching: false, error: null, data, refetch };
}

function renderProof() {
  return render(<MemoryRouter><LiveProof /></MemoryRouter>);
}

describe("LiveProof", () => {
  beforeEach(() => {
    milestoneQuery.mockImplementation((id: number) =>
      id === 7 ? ready(acceptedRecord) : ready(unresolvedRecord),
    );
  });

  it("shows accepted, unresolved, and replay evidence without a wallet", () => {
    renderProof();

    expect(screen.getByText("Preview · Studionet")).toBeInTheDocument();
    expect(screen.getByRole("heading", { name: /accepted evidence/i })).toBeInTheDocument();
    expect(screen.getByRole("heading", { name: /fail-safe uncertainty/i })).toBeInTheDocument();
    expect(screen.getByText("ACCEPTED")).toBeInTheDocument();
    expect(screen.getByText("UNRESOLVED")).toBeInTheDocument();
    expect(screen.getByText("MET")).toBeInTheDocument();
    expect(screen.getByText("INSUFFICIENT")).toBeInTheDocument();
    expect(screen.getByText(/Validators found sufficient/)).toBeInTheDocument();
    expect(screen.getByText(/did not match the bound repository/)).toBeInTheDocument();
    expect(screen.getByRole("link", { name: /open milestone #7/i })).toHaveAttribute("href", "/milestones/7");
    expect(screen.getByRole("link", { name: /open milestone #3/i })).toHaveAttribute("href", "/milestones/3");
    expect(screen.getByRole("link", { name: /rejected replay/i })).toHaveAttribute(
      "href",
      expect.stringContaining("0xfc62b8c2"),
    );
    expect(screen.queryByRole("button", { name: /connect wallet/i })).not.toBeInTheDocument();
  });

  it("keeps accepted proof visible when the unresolved read fails", () => {
    milestoneQuery.mockImplementation((id: number) =>
      id === 7
        ? ready(acceptedRecord)
        : { isLoading: false, isFetching: false, error: new Error("RPC unavailable"), data: undefined, refetch: vi.fn() },
    );

    renderProof();

    expect(screen.getByText("ACCEPTED")).toBeInTheDocument();
    expect(screen.getByRole("alert")).toHaveTextContent("RPC unavailable");
    expect(screen.queryByText("UNRESOLVED")).not.toBeInTheDocument();
  });

  it("fails closed when a promoted live projection changes", () => {
    milestoneQuery.mockImplementation((id: number) =>
      id === 7
        ? ready(acceptedRecord)
        : ready({ ...unresolvedRecord, status: "REJECTED" }),
    );

    renderProof();

    expect(screen.getByText("Proof state changed")).toBeInTheDocument();
    expect(screen.getByText(/Expected UNRESOLVED with INSUFFICIENT/)).toBeInTheDocument();
    expect(screen.queryByText("REJECTED")).not.toBeInTheDocument();
    expect(screen.queryByText("UNRESOLVED")).not.toBeInTheDocument();
  });

  it("shows independent loading and missing states", () => {
    milestoneQuery.mockImplementation((id: number) =>
      id === 7
        ? { isLoading: true, isFetching: true, error: null, data: undefined, refetch: vi.fn() }
        : { isLoading: false, isFetching: false, error: null, data: null, refetch: vi.fn() },
    );

    renderProof();

    expect(screen.getByText("Reading accepted proof…")).toBeInTheDocument();
    expect(screen.getByText("Milestone #3 is unavailable.")).toBeInTheDocument();
  });

  it("retries both live contract reads", () => {
    const acceptedRefetch = vi.fn().mockResolvedValue(undefined);
    const unresolvedRefetch = vi.fn().mockResolvedValue(undefined);
    milestoneQuery.mockImplementation((id: number) =>
      id === 7
        ? ready(acceptedRecord, acceptedRefetch)
        : ready(unresolvedRecord, unresolvedRefetch),
    );

    renderProof();
    fireEvent.click(screen.getByRole("button", { name: /refresh live proofs/i }));

    expect(acceptedRefetch).toHaveBeenCalledTimes(1);
    expect(unresolvedRefetch).toHaveBeenCalledTimes(1);
  });
});
