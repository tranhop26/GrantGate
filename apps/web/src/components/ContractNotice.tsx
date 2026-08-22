import { CONTRACT_CONFIGURED } from "@/lib/genlayer";

export function ContractNotice() {
  if (CONTRACT_CONFIGURED) return null;
  return <div className="notice notice-error" role="alert"><strong>Contract not configured</strong><span>Set VITE_GRANTGATE_ADDRESS to enable live reads and writes.</span></div>;
}
