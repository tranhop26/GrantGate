import { Link } from "react-router-dom";
import { StatusBadge } from "@/components/StatusBadge";
import { useMilestone } from "@/hooks/useGrantGate";
import {
  CONTRACT_ADDRESS,
  explorerAddressUrl,
  explorerTxUrl,
} from "@/lib/genlayer";
import {
  FEATURED_MILESTONE_ID,
  LIVE_REPLAY_TX,
  LIVE_REVIEW_TX,
} from "@/lib/liveProof";

export function LiveProof() {
  const query = useMilestone(FEATURED_MILESTONE_ID);
  const milestone = query.data;

  if (query.isLoading) {
    return <section className="live-proof" aria-label="Live contract proof"><div className="loading-state" role="status">Reading live contract proof…</div></section>;
  }

  if (query.error) {
    return <section className="live-proof" aria-label="Live contract proof"><div className="notice notice-error" role="alert">{String(query.error)}</div></section>;
  }

  if (!milestone) {
    return <section className="live-proof" aria-label="Live contract proof"><div className="empty-state" role="status">Live contract proof is unavailable.</div></section>;
  }

  return (
    <section className="live-proof" aria-labelledby="live-proof-title">
      <header>
        <div><span className="eyebrow"><span />LIVE CONTRACT READBACK</span><h2 id="live-proof-title">Verify before connecting.</h2></div>
        <span className="preview-chip">Preview · Studionet</span>
      </header>
      <div className="live-proof-grid">
        <article><span>Milestone</span><strong>#{milestone.id}</strong><p>{milestone.title}</p></article>
        <article><span>Decision</span><StatusBadge status={milestone.status} /><p>{milestone.criteriaResults.join(" · ")}</p></article>
        <article><span>Validator explanation</span><p>{milestone.explanation}</p></article>
      </div>
      <div className="button-row">
        <Link className="button button-acid" to={`/milestones/${milestone.id}`}>Open milestone #{milestone.id}</Link>
        <a href={explorerTxUrl(LIVE_REVIEW_TX)} target="_blank" rel="noreferrer">Successful review transaction ↗</a>
        <a href={explorerTxUrl(LIVE_REPLAY_TX)} target="_blank" rel="noreferrer">Rejected replay transaction ↗</a>
        <a href={explorerAddressUrl(CONTRACT_ADDRESS)} target="_blank" rel="noreferrer">Contract ↗</a>
      </div>
    </section>
  );
}
