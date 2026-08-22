import { render, screen } from "@testing-library/react";
import { describe, expect, it } from "vitest";
import { StatusBadge } from "./StatusBadge";

describe("StatusBadge", () => {
  it.each(["OPEN", "ACCEPTED", "REJECTED", "UNRESOLVED", "CANCELLED"] as const)(
    "renders %s as an explicit status",
    (status) => {
      render(<StatusBadge status={status} />);
      expect(screen.getByText(status)).toHaveAttribute("data-status", status);
    },
  );
});
