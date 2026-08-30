# GrantGate Explorer submission

## Form fields

- **Project name:** GrantGate
- **Primary category:** Dispute Resolution
- **Category tag 1:** Evidence Assessment
- **Category tag 2:** Leave empty. `Escrow Claims` is inaccurate because GrantGate has no custody or payouts; `Appeal Review` is inaccurate because the frozen contract has no appeal path; and `Jury Selection` is inaccurate because GenLayer validators assess evidence without a project-defined jury-selection mechanism.
- **Status:** Preview

## One-liner — 117 characters

```text
GrantGate lets GenLayer validators judge whether an immutable GitHub commit satisfies frozen software-grant criteria.
```

## Description — 852 characters

```text
GrantGate turns software-grant milestones into verifiable on-chain decisions. A sponsor freezes a builder, public GitHub repository, deadline, and up to five measurable criteria before evidence exists. The assigned builder submits one canonical commit URL. GenLayer validators render that immutable commit and classify every criterion as MET, NOT_MET, or INSUFFICIENT; the contract derives ACCEPTED, REJECTED, or UNRESOLVED and stores the explanation. GrantGate is for grant sponsors and builders who should not control their own outcome. Solidity cannot independently read an unstructured commit page and reach semantic consensus about whether the work satisfies written criteria. GrantGate uses GenLayer for that decision and fails safely when evidence is unavailable or contradictory. Studionet uses simulated GEN and this Explorer entry is Preview.
```

## How to try

1. **Verify live proof — No wallet required.** Open [milestone #7](https://grantgate.vercel.app/milestones/7), then confirm `ACCEPTED`, criterion result `MET`, the validator explanation, and the immutable commit SHA.
2. Open the [successful review transaction](https://explorer-studio.genlayer.com/tx/0x49cc510fec57224390a8f42a1480f1f8e4a7ddc2745fdc7756a37cda7a9afdd9) and the [rejected replay transaction](https://explorer-studio.genlayer.com/tx/0xfc62b8c277b83e83c9c856c22614032ffd46be3f4c3ae77ae1cde38954514c8e). Reviewers can finish this verification without spending GEN.
3. **Try a write — MetaMask required.** In [GenLayer Studio Accounts](https://studio.genlayer.com/contracts), use the account selector to transfer simulated GEN from a pre-funded Studionet account to the connected MetaMask address.
4. Create a milestone as the sponsor and assign a builder address, then switch MetaMask to the assigned builder account.
5. Submit a canonical GitHub commit URL with a lowercase 40-character SHA. Wait for consensus, then confirm the authoritative contract readback.

Studionet is Preview infrastructure. The wallet-free proof is the stable review path; the write trial is optional and requires a funded injected wallet.

## Expected verification outcome — 377 characters

```text
Without connecting a wallet, the Live proof panel loads milestone #7 from the Studionet contract. It shows ACCEPTED, criterion result MET, the validator explanation, immutable commit SHA, and links to the successful review transaction. The replay link shows a finalized GenVM ERROR while the milestone readback remains ACCEPTED at evidence version 1, proving replay protection.
```

## Links

- **Contract:** [0xA6eE55C2214274474546d8259C893d4540742342](https://explorer-studio.genlayer.com/address/0xA6eE55C2214274474546d8259C893d4540742342)
- **Website:** [https://grantgate.vercel.app](https://grantgate.vercel.app)
- **GitHub:** [https://github.com/tranhop26/GrantGate](https://github.com/tranhop26/GrantGate)

## Known limitations

- Public GitHub repositories only; private repository authentication is out of scope.
- One repository and up to five criteria per milestone; three evidence versions and three review rounds.
- No payments, escrow, appeals, jury selection, or upgrade path.
- Validator web access can produce `UNRESOLVED`; it is a safe terminal decision with bounded recovery.
- The public showcase is fixed to verified milestone #7.
- The production JavaScript bundle retains a pre-existing Vite large-chunk warning; code splitting remains future work.
