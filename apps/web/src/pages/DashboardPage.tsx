import { Link } from "react-router-dom";
import { ContractNotice } from "@/components/ContractNotice";
import { MilestoneCard } from "@/components/MilestoneCard";
import { WalletGate } from "@/components/WalletGate";
import { useActorStats, useDashboard } from "@/hooks/useGrantGate";
import { useWallet } from "@/lib/wallet";

export function DashboardPage() {
  const wallet = useWallet();
  const dashboard = useDashboard(wallet.address);
  const stats = useActorStats(wallet.address);
  return <main className="page-wrap">
    <header className="page-header"><div><span className="eyebrow"><span />ON-CHAIN WORKSPACE</span><h1>Milestones</h1></div><Link className="button button-acid" to="/milestones/new">New milestone</Link></header>
    <ContractNotice />
    <WalletGate>
      {dashboard.isLoading || stats.isLoading ? <div className="loading-state" role="status">Reading contract state…</div> : dashboard.error || stats.error ? <div className="notice notice-error" role="alert">{String(dashboard.error ?? stats.error)}</div> : <>
        <section className="stats-row" aria-label="Actor statistics">
          <div><strong>{stats.data?.created ?? 0}</strong><span>Created</span></div><div><strong>{stats.data?.assigned ?? 0}</strong><span>Assigned</span></div><div><strong>{stats.data?.accepted ?? 0}</strong><span>Accepted</span></div><div><strong>{stats.data?.unresolved ?? 0}</strong><span>Unresolved</span></div>
        </section>
        {dashboard.milestones.length === 0 ? <section className="empty-state"><h2>No contract records for this wallet.</h2><p>Create a milestone as sponsor, or ask a sponsor to assign this address as builder.</p></section> : <section className="card-list" aria-label="Milestones">{dashboard.milestones.map((item) => <MilestoneCard key={item.id} milestone={item} actor={wallet.address!} />)}</section>}
      </>}
    </WalletGate>
  </main>;
}
