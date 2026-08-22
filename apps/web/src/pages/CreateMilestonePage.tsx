import { useState, type FormEvent } from "react";
import { Link } from "react-router-dom";
import type { ContractConfig } from "@grantgate/shared";
import { ContractNotice } from "@/components/ContractNotice";
import { TxTimeline } from "@/components/TxTimeline";
import { WalletGate } from "@/components/WalletGate";
import { useGrantGateTx } from "@/hooks/useGrantGate";
import { reads, writes } from "@/lib/contract";
import { validateCreateMilestone, type CreateMilestoneInput } from "@/lib/forms";

const EMPTY: CreateMilestoneInput = { title: "", builder: "", repo: "", criteriaText: "", deadline: "" };

export function CreateMilestonePage() {
  const [form, setForm] = useState(EMPTY);
  const [error, setError] = useState<string | null>(null);
  const tx = useGrantGateTx<ContractConfig>();
  const set = (key: keyof CreateMilestoneInput, value: string) => setForm((current) => ({ ...current, [key]: value }));

  async function submit(event: FormEvent) {
    event.preventDefault();
    setError(null);
    try {
      const payload = validateCreateMilestone(form);
      const before = await reads.config();
      await tx.mutateAsync({
        send: (wallet) => writes.createMilestone(wallet, payload.title, payload.builder, payload.owner, payload.repo, payload.criteria, payload.deadline),
        readback: reads.config,
        verifyReadback: (config) => config.milestoneCount === before.milestoneCount + 1,
        invalidate: [["config"], ["sponsorMilestones"]],
      });
    } catch (cause) { setError(cause instanceof Error ? cause.message : String(cause)); }
  }
  const createdId = tx.snapshot?.phase === "READBACK" ? tx.snapshot.readback?.milestoneCount : null;
  return <main className="page-wrap narrow-page">
    <header className="page-header"><div><span className="eyebrow"><span />SPONSOR ACTION</span><h1>Create milestone</h1><p>Freeze one repository, one builder, and up to five measurable criteria before evidence exists.</p></div></header>
    <ContractNotice />
    <WalletGate>
      <form className="form-panel" onSubmit={(event) => void submit(event)} noValidate>
        <label>Milestone title<input value={form.title} onChange={(e) => set("title", e.target.value)} maxLength={120} placeholder="Ship reproducible release provenance" /></label>
        <label>Builder wallet<input className="mono-input" value={form.builder} onChange={(e) => set("builder", e.target.value)} placeholder="0x…" /></label>
        <label>Public GitHub repository<input value={form.repo} onChange={(e) => set("repo", e.target.value)} placeholder="owner/repository" /><small>Lowercase canonical identity; this cannot be changed.</small></label>
        <label>Acceptance criteria<textarea value={form.criteriaText} onChange={(e) => set("criteriaText", e.target.value)} rows={6} placeholder={"Each line is one independently judged criterion.\nDescribe observable behavior, not intent."} /><small>1–5 lines · 20–400 characters each</small></label>
        <label>Evidence deadline<input type="datetime-local" value={form.deadline} onChange={(e) => set("deadline", e.target.value)} /></label>
        <div className="freeze-note"><strong>Permanent by design</strong><span>The contract is INTENTIONALLY_FROZEN. Created criteria have no edit method.</span></div>
        <button className="button button-acid" disabled={tx.isPending}>{tx.isPending ? "Consensus pending…" : "Freeze milestone on-chain"}</button>
      </form>
      {(error || tx.error) && <div className="notice notice-error" role="alert">{error ?? String(tx.error)}</div>}
      <TxTimeline snapshot={tx.snapshot} />
      {createdId && <div className="notice notice-success"><strong>Contract readback confirmed milestone #{createdId}.</strong><Link to={`/milestones/${createdId}`}>Open record →</Link></div>}
    </WalletGate>
  </main>;
}
