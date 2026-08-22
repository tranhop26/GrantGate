import {
  createContext,
  useCallback,
  useContext,
  useMemo,
  useState,
  type ReactNode,
} from "react";
import {
  NETWORK,
  clearGuestKey,
  guestAddress,
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
  connectGuest: () => void;
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

  const connectGuest = useCallback(() => {
    if (NETWORK !== "studionet") {
      setError("Guest wallet is available only on Studionet.");
      setPhase("ERROR");
      return;
    }
    resetClients();
    setKind("guest");
    setAddress(guestAddress());
    setError(null);
    setPhase("CONNECTED");
  }, []);

  const disconnect = useCallback(() => {
    if (kind === "guest") clearGuestKey();
    resetClients();
    setKind(null);
    setAddress(null);
    setError(null);
    setPhase("DISCONNECTED");
  }, [kind]);

  const value = useMemo<WalletState>(
    () => ({
      phase,
      kind,
      address,
      error,
      connectInjected,
      connectGuest,
      disconnect,
    }),
    [phase, kind, address, error, connectInjected, connectGuest, disconnect],
  );

  return <WalletContext.Provider value={value}>{children}</WalletContext.Provider>;
}

export function useWallet(): WalletState {
  const value = useContext(WalletContext);
  if (!value) throw new Error("useWallet must be used inside WalletProvider");
  return value;
}
