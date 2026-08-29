import {
  createContext,
  useCallback,
  useContext,
  useMemo,
  useState,
  type ReactNode,
} from "react";
import {
  requestInjectedAccount,
  resetClients,
  walletErrorMessage,
  type WalletKind,
} from "./genlayer";

export type WalletPhase = "DISCONNECTED" | "CONNECTING" | "CONNECTED" | "ERROR";

export interface WalletState {
  phase: WalletPhase;
  kind: WalletKind | null;
  address: `0x${string}` | null;
  error: string | null;
  connectInjected: () => Promise<void>;
  disconnect: () => void;
}

const WalletContext = createContext<WalletState | null>(null);

export function WalletProvider({ children }: { children: ReactNode }) {
  const [phase, setPhase] = useState<WalletPhase>("DISCONNECTED");
  const [kind, setKind] = useState<WalletKind | null>(null);
  const [address, setAddress] = useState<`0x${string}` | null>(null);
  const [error, setError] = useState<string | null>(null);

  const connectInjected = useCallback(async () => {
    setPhase("CONNECTING");
    setError(null);
    try {
      const nextAddress = await requestInjectedAccount();
      resetClients();
      setKind("injected");
      setAddress(nextAddress);
      setPhase("CONNECTED");
    } catch (cause) {
      setKind(null);
      setAddress(null);
      setError(walletErrorMessage(cause));
      setPhase("ERROR");
    }
  }, []);

  const disconnect = useCallback(() => {
    resetClients();
    setKind(null);
    setAddress(null);
    setError(null);
    setPhase("DISCONNECTED");
  }, []);

  const value = useMemo<WalletState>(
    () => ({
      phase,
      kind,
      address,
      error,
      connectInjected,
      disconnect,
    }),
    [phase, kind, address, error, connectInjected, disconnect],
  );

  return <WalletContext.Provider value={value}>{children}</WalletContext.Provider>;
}

export function useWallet(): WalletState {
  const value = useContext(WalletContext);
  if (!value) throw new Error("useWallet must be used inside WalletProvider");
  return value;
}
