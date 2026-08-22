import json

import pytest

import genlayer as glstub


def test_rejected_commit_can_be_replaced_then_finalized_once(
    contract, sponsor, builder, set_sender, set_time
):
    criteria = (
        "CSV output has a stable documented header row.\n"
        "UTF-8 project names survive an export/import round trip."
    )
    set_sender(sponsor)
    set_time(1_800_000_000)
    contract.create_milestone(
        "Complete portable CSV export",
        builder,
        "open-labs",
        "ledger",
        criteria,
        1_800_086_400,
    )
    first_sha = "0123456789abcdef0123456789abcdef01234567"
    second_sha = "1123456789abcdef0123456789abcdef01234567"
    glstub.runtime.web_render = lambda url, _mode: (
        f"open-labs/ledger commit {url.rsplit('/', 1)[-1]} changed files and tests"
    )
    glstub.runtime.exec_prompt = lambda _prompt: json.dumps(
        {"items": ["MET", "NOT_MET"], "explanation": "UTF-8 round trip fails."}
    )
    set_sender(builder)
    contract.submit_evidence(
        1,
        f"https://github.com/open-labs/ledger/commit/{first_sha}",
        "The first commit implements CSV export and documents the stable header.",
    )
    assert contract.get_milestone(1)["status"] == "REJECTED"

    glstub.runtime.exec_prompt = lambda _prompt: json.dumps(
        {"items": ["MET", "MET"], "explanation": "Both criteria are demonstrably met."}
    )
    contract.resubmit_evidence(
        1,
        f"https://github.com/open-labs/ledger/commit/{second_sha}",
        "The follow-up commit adds UTF-8 round-trip coverage and the missing fix.",
    )

    row = contract.get_milestone(1)
    assert row["status"] == "ACCEPTED"
    assert row["evidence_version"] == 2
    assert row["commit_sha"] == second_sha
    assert contract.get_actor_stats(sponsor)["accepted"] == 1
    assert contract.get_actor_stats(builder)["accepted"] == 1
    assert contract.get_actor_stats(sponsor)["rejected"] == 0


def test_unauthorized_submission_preserves_open_milestone(
    contract, sponsor, builder, outsider, set_sender, set_time
):
    set_sender(sponsor)
    set_time(1_800_000_000)
    contract.create_milestone(
        "Document release procedure",
        builder,
        "open-labs",
        "ledger",
        "The repository documents a reproducible tagged release procedure.",
        1_800_086_400,
    )
    before = contract.get_milestone(1).copy()
    set_sender(outsider)
    with pytest.raises(Exception, match="assigned builder"):
        contract.submit_evidence(
            1,
            "https://github.com/open-labs/ledger/commit/0123456789abcdef0123456789abcdef01234567",
            "An unrelated wallet attempts to submit evidence for the assigned builder.",
        )
    assert contract.get_milestone(1) == before
