import { render, screen } from "@testing-library/react";
import { MemoryRouter } from "react-router-dom";
import { describe, expect, it } from "vitest";

import { HowToTry } from "./HowToTry";

describe("HowToTry", () => {
  it("gives reviewers a wallet-free proof check before the optional write trial", () => {
    render(<MemoryRouter><HowToTry /></MemoryRouter>);

    expect(screen.getByRole("heading", { name: /How to try GrantGate/i })).toBeInTheDocument();
    expect(screen.getByText(/No wallet required/i)).toBeInTheDocument();
    expect(screen.getByRole("link", { name: /Open milestone #7/i })).toHaveAttribute("href", "/milestones/7");
    expect(screen.getByText(/MetaMask account funded on Studionet/i)).toBeInTheDocument();
    expect(screen.getByText(/simulated GEN/i)).toBeInTheDocument();
    expect(screen.getByText(/account selector.*transfer simulated GEN from a pre-funded Studionet account to the connected MetaMask address/i)).toBeInTheDocument();
    expect(screen.getByRole("link", { name: /successful review/i })).toBeInTheDocument();
    expect(screen.getByRole("link", { name: /rejected replay/i })).toBeInTheDocument();
    expect(screen.getByText(/without spending GEN/i)).toBeInTheDocument();
  });
});
