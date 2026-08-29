import { Link } from "react-router-dom";
import { LiveProof } from "@/components/LiveProof";

export function HomePage() {
  return (
    <main>
      <section className="hero">
        <div className="eyebrow"><span /> COMMIT-BOUND GRANT REVIEW</div>
        <h1>Software milestones deserve proof, not discretion.</h1>
        <p className="hero-copy">
          Sponsors freeze the criteria. Builders submit an immutable GitHub commit.
          GenLayer validators inspect the immutable commit and record what the work proves.
        </p>
        <div className="hero-actions">
          <Link className="button button-acid" to="/milestones/new">Create milestone</Link>
          <Link className="text-link" to="/architecture">See the trust model →</Link>
        </div>
        <div className="proof-strip" aria-label="GrantGate workflow">
          <span><b>01</b> Freeze criteria</span>
          <span><b>02</b> Bind commit</span>
          <span><b>03</b> Validator review</span>
          <span><b>04</b> On-chain record</span>
        </div>
      </section>
      <LiveProof />
      <section className="trust-grid" aria-labelledby="trust-title">
        <div>
          <div className="eyebrow">WHY GENLAYER</div>
          <h2 id="trust-title">Neither side selects the answer.</h2>
        </div>
        <article>
          <span className="card-index">SPONSOR</span>
          <h3>Criteria cannot move</h3>
          <p>Repository, builder, deadline, and numbered requirements are frozen before evidence exists.</p>
        </article>
        <article>
          <span className="card-index">BUILDER</span>
          <h3>A commit cannot drift</h3>
          <p>Evidence is bound to one canonical public GitHub URL and a full 40-character SHA.</p>
        </article>
        <article>
          <span className="card-index">VALIDATORS</span>
          <h3>Insufficient stays safe</h3>
          <p>Missing, contradictory, or malformed evidence becomes UNRESOLVED—never a favorable default.</p>
        </article>
      </section>
    </main>
  );
}
