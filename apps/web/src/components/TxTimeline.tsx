import type { TxSnapshot } from "@/lib/tx";
import { explorerTxUrl } from "@/lib/genlayer";

const STEPS = [
  ["SIGNING", "Awaiting signature"],
  ["PENDING", "Consensus pending"],
  ["FINALIZED", "Finalized"],
  ["SUCCESS", "Execution succeeded"],
  ["READBACK", "Readback confirmed"],
] as const;

export function TxTimeline({ snapshot }: { snapshot: TxSnapshot<unknown> | null }) {
  if (!snapshot) return null;
  if (snapshot.phase === "ERROR") {
    return <div className="notice notice-error" role="alert"><strong>Transaction failed</strong><span>{snapshot.error}</span>{snapshot.hash && <a href={explorerTxUrl(snapshot.hash)} target="_blank" rel="noreferrer">Inspect transaction ↗</a>}</div>;
  }
  const index = STEPS.findIndex(([phase]) => phase === snapshot.phase);
  return (
    <section className="tx-panel" aria-label="Transaction state">
      <div className="tx-steps">{STEPS.map(([phase, label], step) => <span key={phase} className={step <= index ? "is-complete" : ""}>{label}</span>)}</div>
      {snapshot.hash && <a className="mono-link" href={explorerTxUrl(snapshot.hash)} target="_blank" rel="noreferrer">{snapshot.hash} ↗</a>}
    </section>
  );
}
