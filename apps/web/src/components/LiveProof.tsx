import { Link } from "react-router-dom";
import type { Milestone } from "@grantgate/shared";
import { StatusBadge } from "@/components/StatusBadge";
import { useMilestone } from "@/hooks/useGrantGate";
import {
  CONTRACT_ADDRESS,
  explorerAddressUrl,
  explorerTxUrl,
} from "@/lib/genlayer";
import {
  LIVE_PROOF_SPECS,
  LIVE_REPLAY_TX,
  matchLiveProof,
  type LiveProofSpec,
} from "@/lib/liveProof";

type MilestoneQuery = ReturnType<typeof useMilestone>;

function ProofCard({
  spec,
  query,
  loadingLabel,
}: {
  spec: LiveProofSpec;
  query: MilestoneQuery;
  loadingLabel: string;
}) {
  if (query.isLoading) {
    return (
      <article className="proof-card proof-card-state" aria-busy="true">
        <h3>{spec.label}</h3>
        <p role="status">{loadingLabel}</p>
      </article>
    );
  }

  if (query.error) {
    return (
      <article className="proof-card proof-card-state">
        <h3>{spec.label}</h3>
        <p role="alert">{String(query.error)}</p>
      </article>
    );
  }

  const milestone = query.data;
  if (!milestone) {
    return (
      <article className="proof-card proof-card-state">
        <h3>{spec.label}</h3>
        <p role="status">Milestone #{spec.id} is unavailable.</p>
      </article>
    );
  }

  const match = matchLiveProof(spec, milestone);
  if (!match.ok) {
    return (
      <article className="proof-card proof-card-state proof-card-mismatch">
        <span className="card-index">LIVE READBACK</span>
        <h3>Proof state changed</h3>
        <p>{match.reason}</p>
        <Link to={`/milestones/${spec.id}`}>Inspect current milestone #{spec.id}</Link>
      </article>
    );
  }

  return (
    <article className="proof-card">
      <span className="card-index">MILESTONE #{milestone.id}</span>
      <h3>{spec.label}</h3>
      <div className="proof-card-decision">
        <StatusBadge status={milestone.status} />
        <strong>{milestone.criteriaResults.join(" · ")}</strong>
      </div>
      <p>{milestone.explanation}</p>
      <dl>
        <div><dt>Commit</dt><dd>{milestone.commitSha.slice(0, 12)}…</dd></div>
        <div><dt>Evidence</dt><dd>v{milestone.evidenceVersion} · round {milestone.reviewRound}</dd></div>
      </dl>
      <div className="proof-card-links">
        <Link to={`/milestones/${milestone.id}`}>Open milestone #{milestone.id}</Link>
        {spec.transactionHash ? (
          <a href={explorerTxUrl(spec.transactionHash)} target="_blank" rel="noreferrer">
            Review transaction ↗
          </a>
        ) : null}
      </div>
    </article>
  );
}

function replayIsStillRejected(milestone: Milestone | null | undefined): boolean {
  if (!milestone) return false;
  return (
    matchLiveProof(LIVE_PROOF_SPECS.accepted, milestone).ok &&
    milestone.evidenceVersion === 1 &&
    milestone.reviewRound === 1
  );
}

export function LiveProof() {
  const acceptedQuery = useMilestone(LIVE_PROOF_SPECS.accepted.id);
  const unresolvedQuery = useMilestone(LIVE_PROOF_SPECS.unresolved.id);
  const acceptedReadbackIntact = replayIsStillRejected(acceptedQuery.data);
  const isRefreshing = acceptedQuery.isFetching || unresolvedQuery.isFetching;

  const refresh = async () => {
    await Promise.all([acceptedQuery.refetch(), unresolvedQuery.refetch()]);
  };

  return (
    <section className="live-proof" aria-labelledby="live-proof-title">
      <header>
        <div>
          <span className="eyebrow"><span />LIVE CONTRACT READBACK</span>
          <h2 id="live-proof-title">Verify every promoted outcome.</h2>
          <p>Accepted work, safe uncertainty, and rejected replay—read without a wallet.</p>
        </div>
        <div className="proof-header-actions">
          <span className="preview-chip">Preview · Studionet</span>
          <button
            className="button button-ghost"
            type="button"
            onClick={() => void refresh()}
            disabled={isRefreshing}
          >
            {isRefreshing ? "Refreshing…" : "Refresh live proofs"}
          </button>
        </div>
      </header>

      <div className="proof-gallery">
        <ProofCard
          spec={LIVE_PROOF_SPECS.accepted}
          query={acceptedQuery}
          loadingLabel="Reading accepted proof…"
        />
        <ProofCard
          spec={LIVE_PROOF_SPECS.unresolved}
          query={unresolvedQuery}
          loadingLabel="Reading unresolved proof…"
        />
        <article className="proof-card">
          <span className="card-index">TERMINAL REPLAY</span>
          <h3>Rejected replay</h3>
          {acceptedReadbackIntact ? (
            <>
              <div className="proof-card-decision">
                <strong>ERROR → state unchanged</strong>
              </div>
              <p>
                The linked replay failed while milestone #7 remains ACCEPTED at
                evidence version 1 and review round 1.
              </p>
              <div className="proof-card-links">
                <a href={explorerTxUrl(LIVE_REPLAY_TX)} target="_blank" rel="noreferrer">
                  Rejected replay transaction ↗
                </a>
                <Link to="/milestones/7">Confirm milestone #7</Link>
              </div>
            </>
          ) : (
            <p role="status">
              Replay proof is unavailable until the accepted readback is confirmed.
            </p>
          )}
        </article>
      </div>

      <div className="proof-footer">
        <a href={explorerAddressUrl(CONTRACT_ADDRESS)} target="_blank" rel="noreferrer">
          Open frozen Studionet contract ↗
        </a>
        <span>Explorer links support the proof; contract readback remains authoritative.</span>
      </div>
    </section>
  );
}
