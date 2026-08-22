import { useState, type FormEvent } from "react";
import { Link, useParams } from "react-router-dom";
import type { Milestone } from "@grantgate/shared";
import { ContractNotice } from "@/components/ContractNotice";
import { dateLabel } from "@/components/MilestoneCard";
import { StatusBadge } from "@/components/StatusBadge";
import { TxTimeline } from "@/components/TxTimeline";
import { WalletGate } from "@/components/WalletGate";
import { useGrantGateTx, useMilestone } from "@/hooks/useGrantGate";
import { reads, writes } from "@/lib/contract";
import { validateEvidence } from "@/lib/forms";
import { canCancel, canResubmit, canRetry, canSubmit } from "@/lib/permissions";
import { useWallet } from "@/lib/wallet";

const short = (value: string) => `${value.slice(0, 8)}…${value.slice(-6)}`;

export function MilestonePage() {
  const rawId = useParams().id ?? "";
  const id = /^\d+$/.test(rawId) ? Number(rawId) : null;
  const wallet = useWallet();
  const query = useMilestone(id);
  const tx = useGrantGateTx<Milestone | null>();
  const [commitUrl, setCommitUrl] = useState("");
  const [summary, setSummary] = useState("");
  const [actionError, setActionError] = useState<string | null>(null);
  const milestone = query.data;

  async function evidence(event: FormEvent) {
    event.preventDefault();
    if (!milestone || !id) return;
    setActionError(null);
    try {
      const payload = validateEvidence({ commitUrl, summary }, milestone.repo);
      const expectedVersion = milestone.evidenceVersion + 1;
      const write = milestone.evidenceVersion === 0 ? writes.submitEvidence : writes.resubmitEvidence;
      await tx.mutateAsync({
        send: (session) => write(session, id, payload.commitUrl, payload.summary),
        readback: () => reads.milestone(id),
        verifyReadback: (record) => record?.evidenceVersion === expectedVersion && record.commitSha === payload.commitSha,
        invalidate: [["milestone", id], ["builderMilestones"], ["sponsorMilestones"]],
      });
    } catch (cause) { setActionError(cause instanceof Error ? cause.message : String(cause)); }
  }

  async function retry() {
    if (!milestone || !id) return;
    setActionError(null);
    try {
      const expectedRound = milestone.reviewRound + 1;
      await tx.mutateAsync({ send: (session) => writes.retryReview(session, id), readback: () => reads.milestone(id), verifyReadback: (record) => record?.reviewRound === expectedRound, invalidate: [["milestone", id]] });
    } catch (cause) { setActionError(cause instanceof Error ? cause.message : String(cause)); }
  }

  async function cancel() {
    if (!id) return;
    setActionError(null);
    try {
      await tx.mutateAsync({ send: (session) => writes.cancelMilestone(session, id), readback: () => reads.milestone(id), verifyReadback: (record) => record?.status === "CANCELLED", invalidate: [["milestone", id], ["sponsorMilestones"]] });
    } catch (cause) { setActionError(cause instanceof Error ? cause.message : String(cause)); }
  }

  if (id === null) return <main className="page-wrap"><div className="notice notice-error" role="alert">Invalid milestone id.</div></main>;
  return <main className="page-wrap detail-page">
    <ContractNotice />
    <WalletGate>
      {query.isLoading ? <div className="loading-state" role="status">Reading milestone #{id}…</div> : query.error ? <div className="notice notice-error" role="alert">{String(query.error)}</div> : !milestone ? <section className="empty-state"><h2>Milestone #{id} does not exist.</h2><Link to="/dashboard">Return to dashboard →</Link></section> : <>
        <header className="record-header"><div><span className="eyebrow"><span />MILESTONE #{String(id).padStart(3, "0")}</span><h1>{milestone.title}</h1></div><StatusBadge status={milestone.status} /></header>
        <section className="record-grid">
          <aside className="record-facts">
            <div><span>Repository</span><strong>{milestone.repo}</strong></div><div><span>Sponsor</span><strong title={milestone.sponsor}>{short(milestone.sponsor)}</strong></div><div><span>Builder</span><strong title={milestone.builder}>{short(milestone.builder)}</strong></div><div><span>Deadline</span><strong>{dateLabel(milestone.deadline)}</strong></div><div><span>Evidence version</span><strong>{milestone.evidenceVersion} / 3</strong></div><div><span>Review round</span><strong>{milestone.reviewRound} / 3</strong></div>
          </aside>
          <div className="record-main">
            <section><div className="section-heading"><span>Frozen criteria</span><span>{milestone.criteria.length} total</span></div><ol className="criteria-list">{milestone.criteria.map((criterion, index) => <li key={criterion}><p>{criterion}</p><span data-result={milestone.criteriaResults[index] ?? "AWAITING"}>{milestone.criteriaResults[index] ?? "AWAITING"}</span></li>)}</ol></section>
            {milestone.evidenceVersion > 0 && <section className="evidence-readback"><div className="section-heading"><span>Contract evidence readback</span><span>v{milestone.evidenceVersion}</span></div><a className="mono-link" href={milestone.commitUrl} target="_blank" rel="noreferrer">{milestone.commitSha} ↗</a><p>{milestone.summary}</p>{milestone.explanation && <blockquote>{milestone.explanation}</blockquote>}</section>}
            {milestone.status === "UNRESOLVED" && <div className="notice notice-unresolved"><strong>Validators could not establish a safe answer.</strong><span>Review the explanation. The sponsor or builder may retry this same immutable evidence after the on-chain cooldown.</span></div>}
            {milestone.status === "ACCEPTED" && <div className="notice notice-success"><strong>All criteria were MET.</strong><span>This completion is finalized in the contract record.</span></div>}
            {(actionError || tx.error) && <div className="notice notice-error" role="alert">{actionError ?? String(tx.error)}</div>}
            <TxTimeline snapshot={tx.snapshot} />
            {tx.snapshot?.phase === "READBACK" && tx.snapshot.readback && <div className="notice notice-success"><strong>Authoritative readback: {tx.snapshot.readback.status}</strong><span>Evidence v{tx.snapshot.readback.evidenceVersion} · review {tx.snapshot.readback.reviewRound}</span></div>}
            {(canSubmit(milestone, wallet.address) || canResubmit(milestone, wallet.address)) && <form className="form-panel compact-form" onSubmit={(event) => void evidence(event)}><h2>{milestone.evidenceVersion === 0 ? "Submit immutable evidence" : "Bind a different commit"}</h2><label>Canonical commit URL<input value={commitUrl} onChange={(e) => setCommitUrl(e.target.value)} placeholder={`https://github.com/${milestone.repo}/commit/…`} /></label><label>Implementation summary<textarea rows={4} value={summary} onChange={(e) => setSummary(e.target.value)} /></label><button className="button button-acid" disabled={tx.isPending}>{tx.isPending ? "Consensus pending…" : milestone.evidenceVersion === 0 ? "Submit for validator review" : "Resubmit evidence"}</button></form>}
            {canRetry(milestone, wallet.address) && <button className="button" disabled={tx.isPending} onClick={() => void retry()}>Retry same evidence after cooldown</button>}
            {canCancel(milestone, wallet.address) && <button className="danger-link" disabled={tx.isPending} onClick={() => void cancel()}>Cancel open milestone</button>}
          </div>
        </section>
      </>}
    </WalletGate>
  </main>;
}
