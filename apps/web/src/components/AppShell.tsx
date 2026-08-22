import type { ReactNode } from "react";
import { Link, NavLink } from "react-router-dom";
import { useWallet } from "@/lib/wallet";

function shortAddress(value: string): string {
  return `${value.slice(0, 6)}…${value.slice(-4)}`;
}

export function AppShell({ children }: { children: ReactNode }) {
  const wallet = useWallet();
  return (
    <div className="site-shell">
      <header className="topbar">
        <Link className="brand" to="/" aria-label="GrantGate home">
          <span className="brand-mark">GG</span>
          <span>GRANTGATE</span>
        </Link>
        <nav aria-label="Primary navigation">
          <NavLink to="/dashboard">Dashboard</NavLink>
          <NavLink to="/architecture">Trust model</NavLink>
        </nav>
        {wallet.address ? (
          <button className="wallet-chip" onClick={wallet.disconnect}>
            {shortAddress(wallet.address)}
          </button>
        ) : (
          <button className="button button-dark" onClick={() => void wallet.connectInjected()}>
            Connect wallet
          </button>
        )}
      </header>
      {children}
      <footer>
        <span>GrantGate · Intelligent milestones on GenLayer</span>
        <span>INTENTIONALLY_FROZEN</span>
      </footer>
    </div>
  );
}
