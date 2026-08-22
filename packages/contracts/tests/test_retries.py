import json

import pytest

import genlayer as glstub


CRITERIA = (
    "Export includes a stable header row.\n"
    "Export preserves UTF-8 project names."
)
SHA = "0123456789abcdef0123456789abcdef01234567"
URL = f"https://github.com/open-labs/ledger/commit/{SHA}"
SUMMARY = "This commit adds the requested export behavior and regression coverage."


def create_unresolved(contract, sponsor, builder, set_sender, set_time):
    set_sender(sponsor)
    set_time(1_800_000_000)
    contract.create_milestone(
        "Ship CSV export",
        builder,
        "open-labs",
        "ledger",
        CRITERIA,
        1_800_086_400,
    )
    glstub.runtime.web_render = lambda _url, _mode: (
        f"open-labs/ledger commit {SHA} with an incomplete diff"
    )
    glstub.runtime.exec_prompt = lambda _prompt: json.dumps(
        {
            "items": ["MET", "INSUFFICIENT"],
            "explanation": "The second criterion cannot be established.",
        }
    )
    set_sender(builder)
    set_time(1_800_000_100)
    contract.submit_evidence(1, URL, SUMMARY)
    assert contract.get_milestone(1)["status"] == "UNRESOLVED"


def test_sponsor_retries_after_cooldown_and_accepts_once(
    contract, sponsor, builder, set_sender, set_time
):
    create_unresolved(contract, sponsor, builder, set_sender, set_time)
    set_sender(sponsor)
    with pytest.raises(Exception, match="cooldown"):
        contract.retry_review(1)

    glstub.runtime.exec_prompt = lambda _prompt: json.dumps(
        {"items": ["MET", "MET"], "explanation": "Both criteria are now observable."}
    )
    set_time(1_800_000_400)
    contract.retry_review(1)

    row = contract.get_milestone(1)
    assert row["status"] == "ACCEPTED"
    assert row["review_round"] == 2
    assert row["evidence_version"] == 1
    assert row["completed_at"] == 1_800_000_400
    with pytest.raises(Exception, match="unresolved"):
        contract.retry_review(1)


def test_retry_rejects_outsider_deadline_and_fourth_round(
    contract, sponsor, builder, outsider, set_sender, set_time
):
    create_unresolved(contract, sponsor, builder, set_sender, set_time)
    set_sender(outsider)
    set_time(1_800_000_400)
    with pytest.raises(Exception, match="sponsor or builder"):
        contract.retry_review(1)

    set_sender(builder)
    contract.retry_review(1)
    set_time(1_800_000_700)
    contract.retry_review(1)
    assert contract.get_milestone(1)["review_round"] == 3
    set_time(1_800_001_000)
    with pytest.raises(Exception, match="review round limit"):
        contract.retry_review(1)

    contract.milestones[1].review_round = glstub.u256(2)
    set_time(1_800_086_400)
    with pytest.raises(Exception, match="deadline passed"):
        contract.retry_review(1)


def test_consensus_failure_during_retry_preserves_unresolved_readback(
    contract, sponsor, builder, set_sender, set_time
):
    create_unresolved(contract, sponsor, builder, set_sender, set_time)
    before = contract.get_milestone(1).copy()
    glstub.runtime.validator_runs = 2
    glstub.runtime.equivalence = lambda _leader, _validator: False
    set_sender(builder)
    set_time(1_800_000_400)

    with pytest.raises(RuntimeError, match="equivalence"):
        contract.retry_review(1)

    assert contract.get_milestone(1) == before
