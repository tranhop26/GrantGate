export function ArchitecturePage() {
  return <main className="page-wrap architecture-page">
    <header className="page-header"><div><span className="eyebrow"><span />TRUST MODEL</span><h1>One decision. No private judge.</h1><p>GrantGate answers whether an immutable public commit satisfies the sponsor’s frozen criteria.</p></div></header>
    <section className="architecture-flow" aria-label="Decision flow">
      <article><span>01 · INPUT</span><h2>Sponsor freezes intent</h2><p>Title, builder, repository, deadline, and numbered criteria are written to the Intelligent Contract.</p></article>
      <article><span>02 · EVIDENCE</span><h2>Builder binds a commit</h2><p>Only the assigned builder can submit a canonical GitHub commit URL and summary before the deadline.</p></article>
      <article><span>03 · DECISION</span><h2>Validators inspect the work</h2><p>Each criterion becomes MET, NOT_MET, or INSUFFICIENT. The contract derives the milestone status.</p></article>
      <article><span>04 · CONSEQUENCE</span><h2>Chain records the outcome</h2><p>All MET becomes ACCEPTED. Any NOT_MET becomes REJECTED. Missing or contradictory evidence becomes UNRESOLVED.</p></article>
    </section>
    <section className="unresolved-band"><div><span className="eyebrow"><span />SAFE FAILURE</span><h2>UNRESOLVED is a first-class outcome.</h2></div><p>It never masquerades as success. The sponsor or builder may retry the same immutable evidence after cooldown and within the review-round limit. Consensus failure leaves contract state unchanged.</p></section>
    <section className="frozen-band"><strong>INTENTIONALLY_FROZEN</strong><p>No owner, proxy, upgrade key, or admin override. Recovery is limited to explicit on-chain retry, resubmission, and sponsor cancellation while OPEN.</p></section>
  </main>;
}
