import { render, screen } from "@testing-library/react";
import { describe, expect, it } from "vitest";
import { TxTimeline } from "./TxTimeline";

describe("TxTimeline", () => {
  it("separates finalized, success, and authoritative readback", () => {
    render(<TxTimeline snapshot={{ phase: "READBACK", hash: "0xabc", readback: { id: 1 } }} />);
    expect(screen.getByText("Finalized")).toBeInTheDocument();
    expect(screen.getByText("Execution succeeded")).toBeInTheDocument();
    expect(screen.getByText("Readback confirmed")).toBeInTheDocument();
  });

  it("shows contract errors without claiming success", () => {
    render(<TxTimeline snapshot={{ phase: "ERROR", error: "Only the builder may submit" }} />);
    expect(screen.getByRole("alert")).toHaveTextContent("Only the builder may submit");
    expect(screen.queryByText("Readback confirmed")).not.toBeInTheDocument();
  });
});
