import type { ReactNode } from "react";
import { useWallet } from "@/lib/wallet";

export function WalletGate({ children }: { children: ReactNode }) {
  const wallet = useWallet();
  if (wallet.address) return <>{children}</>;
  return (
    <section className="empty-state">
      <span className="eyebrow"><span />WALLET REQUIRED</span>
      <h2>Connect to use the on-chain workspace.</h2>
      <p>Reads and writes come from GrantGate’s deployed Intelligent Contract. Nothing is populated with sample milestones.</p>
      <p>Use a MetaMask account that already holds GEN on Studionet. For writes, open GenLayer Studio’s account selector and transfer simulated GEN from a pre-funded Studionet account before connecting.</p>
      <div className="button-row">
        <button className="button button-dark" disabled={wallet.phase === "CONNECTING"} onClick={() => void wallet.connectInjected()}>
          {wallet.phase === "CONNECTING" ? "Connecting…" : "Connect browser wallet"}
        </button>
        <a href="https://studio.genlayer.com/contracts" target="_blank" rel="noreferrer">Open GenLayer Studio ↗</a>
      </div>
      {wallet.error && <div className="notice notice-error" role="alert">{wallet.error}</div>}
    </section>
  );
}
