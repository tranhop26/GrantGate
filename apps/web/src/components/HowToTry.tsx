import { Link } from "react-router-dom";
import { explorerTxUrl } from "@/lib/genlayer";
import { LIVE_REPLAY_TX, LIVE_REVIEW_TX } from "@/lib/liveProof";

export function HowToTry() {
  return (
    <section className="how-to-try" aria-labelledby="how-to-try-title">
      <header className="how-to-try-header">
        <div>
          <span className="eyebrow"><span />REVIEWER WALKTHROUGH</span>
          <h2 id="how-to-try-title">How to try GrantGate.</h2>
        </div>
        <p>Start with the public proof. The optional write trial uses Preview Studionet infrastructure.</p>
      </header>

      <ol className="walkthrough-list">
        <li>
          <article className="walkthrough-card">
            <span className="walkthrough-number" aria-hidden="true">01</span>
            <div>
              <h3>Verify live proof <span>No wallet required</span></h3>
              <p>Reviewers can complete this verification flow without spending GEN.</p>
              <ol>
                <li><Link to="/milestones/7">Open milestone #7</Link>.</li>
                <li>Confirm the <strong>ACCEPTED</strong> decision, <strong>MET</strong> result, validator explanation, and bound commit SHA.</li>
                <li><a href={explorerTxUrl(LIVE_REVIEW_TX)} target="_blank" rel="noreferrer">Open the successful review ↗</a> and <a href={explorerTxUrl(LIVE_REPLAY_TX)} target="_blank" rel="noreferrer">rejected replay ↗</a> in the explorer.</li>
              </ol>
            </div>
          </article>
        </li>
        <li>
          <article className="walkthrough-card">
            <span className="walkthrough-number" aria-hidden="true">02</span>
            <div>
              <h3>Try a write <span>MetaMask required</span></h3>
              <p><strong>Prerequisite:</strong> use a MetaMask account funded on Studionet with simulated GEN. In <a href="https://studio.genlayer.com/contracts" target="_blank" rel="noreferrer">GenLayer Studio Contracts ↗</a>, use the account selector to transfer simulated GEN from a pre-funded Studionet account to the connected MetaMask address before starting the write trial.</p>
              <ol>
                <li>Create a milestone as the sponsor and assign a builder address.</li>
                <li>Switch MetaMask to the assigned builder account.</li>
                <li>Submit a canonical GitHub commit URL with a lowercase 40-character SHA.</li>
                <li>Wait for consensus, then confirm the authoritative contract readback.</li>
              </ol>
            </div>
          </article>
        </li>
      </ol>

      <aside className="walkthrough-warning" aria-label="Studionet warning">
        <strong>Preview infrastructure</strong>
        <span>Studionet is Preview infrastructure. Verify the public proof first; only the optional write trial needs a funded wallet.</span>
      </aside>
    </section>
  );
}
