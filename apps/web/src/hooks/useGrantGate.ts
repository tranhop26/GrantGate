import {
  useMutation,
  useQuery,
  useQueryClient,
  type QueryKey,
} from "@tanstack/react-query";
import { useState } from "react";
import type { Milestone } from "@grantgate/shared";
import {
  reads,
  waitFinalized,
  type WalletSession,
} from "@/lib/contract";
import {
  executeTransaction,
  type FinalReceipt,
  type TxSnapshot,
} from "@/lib/tx";
import { useWallet } from "@/lib/wallet";
import { CONTRACT_CONFIGURED } from "@/lib/genlayer";

export function useContractConfig() {
  return useQuery({
    queryKey: ["config"],
    queryFn: reads.config,
    enabled: CONTRACT_CONFIGURED,
    staleTime: 60_000,
  });
}

export function useMilestone(id: number | null) {
  return useQuery({
    queryKey: ["milestone", id],
    queryFn: () => reads.milestone(id!),
    enabled: CONTRACT_CONFIGURED && id !== null && id > 0,
  });
}

export function useActorStats(address: string | null) {
  return useQuery({
    queryKey: ["actorStats", address?.toLowerCase()],
    queryFn: () => reads.actorStats(address!),
    enabled: CONTRACT_CONFIGURED && !!address,
  });
}

export function useDashboard(address: string | null) {
  const sponsor = useQuery({
    queryKey: ["sponsorMilestones", address?.toLowerCase()],
    queryFn: () => reads.sponsorMilestones(address!),
    enabled: CONTRACT_CONFIGURED && !!address,
  });
  const builder = useQuery({
    queryKey: ["builderMilestones", address?.toLowerCase()],
    queryFn: () => reads.builderMilestones(address!),
    enabled: CONTRACT_CONFIGURED && !!address,
  });
  const merged = new Map<number, Milestone>();
  for (const item of [...(sponsor.data ?? []), ...(builder.data ?? [])]) {
    merged.set(item.id, item);
  }
  return {
    milestones: [...merged.values()].sort((a, b) => b.id - a.id),
    isLoading: sponsor.isLoading || builder.isLoading,
    error: sponsor.error ?? builder.error,
  };
}

export interface TransactionSpec<T> {
  send: (wallet: WalletSession) => Promise<string>;
  readback: () => Promise<T>;
  verifyReadback: (value: T) => boolean;
  invalidate?: QueryKey[];
}

export function useGrantGateTx<T>() {
  const wallet = useWallet();
  const queryClient = useQueryClient();
  const [snapshot, setSnapshot] = useState<TxSnapshot<T> | null>(null);

  const mutation = useMutation({
    mutationFn: async (spec: TransactionSpec<T>) => {
      if (!wallet.address || !wallet.kind) throw new Error("Connect a wallet first");
      const session: WalletSession = { address: wallet.address, kind: wallet.kind };
      return executeTransaction({
        send: () => spec.send(session),
        waitFinalized: async (hash) =>
          (await waitFinalized(hash)) as unknown as FinalReceipt,
        readback: spec.readback,
        verifyReadback: spec.verifyReadback,
        onState: setSnapshot,
      });
    },
    onSuccess: async (_result, spec) => {
      for (const queryKey of spec.invalidate ?? []) {
        await queryClient.invalidateQueries({ queryKey });
      }
    },
  });

  return { ...mutation, snapshot, resetTx: () => setSnapshot(null) };
}
