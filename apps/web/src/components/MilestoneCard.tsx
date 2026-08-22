import type { Milestone } from "@grantgate/shared";
import { Link } from "react-router-dom";
import { StatusBadge } from "./StatusBadge";

const short = (value: string) => `${value.slice(0, 6)}…${value.slice(-4)}`;
export const dateLabel = (seconds: number) => new Intl.DateTimeFormat("en", { dateStyle: "medium" }).format(new Date(seconds * 1000));

export function MilestoneCard({ milestone, actor }: { milestone: Milestone; actor: string }) {
  const role = milestone.sponsor.toLowerCase() === actor.toLowerCase() ? "Sponsor" : "Builder";
  return <Link className="milestone-card" to={`/milestones/${milestone.id}`}>
    <div className="card-top"><span className="mono">#{String(milestone.id).padStart(3, "0")} · {role}</span><StatusBadge status={milestone.status} /></div>
    <h3>{milestone.title}</h3>
    <p>{milestone.repo} · due {dateLabel(milestone.deadline)}</p>
    <div className="card-meta"><span>{milestone.criteria.length} criteria</span><span>{short(milestone.builder)}</span></div>
  </Link>;
}
