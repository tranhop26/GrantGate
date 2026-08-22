import type { MilestoneStatus } from "@grantgate/shared";

export function StatusBadge({ status }: { status: MilestoneStatus }) {
  return <span className="status-badge" data-status={status}>{status}</span>;
}
