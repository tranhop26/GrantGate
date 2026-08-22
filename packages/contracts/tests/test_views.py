import json

import pytest

import genlayer as glstub


CRITERIA = "The delivered command exports a stable UTF-8 CSV with a documented header."


def create(contract, sponsor, builder, set_sender, index=1):
    set_sender(sponsor)
    contract.create_milestone(
        f"Milestone {index}",
        builder,
        "open-labs",
        "ledger",
        CRITERIA,
        1_900_000_000,
    )


def test_config_and_missing_views_are_stable(contract):
    assert contract.get_config() == {
        "classification": "INTENTIONALLY_FROZEN",
        "schema_version": 1,
        "milestone_count": 0,
        "retry_cooldown_seconds": 300,
        "max_evidence_versions": 3,
        "max_review_rounds": 3,
    }
    assert contract.get_milestone(1) is None


def test_actor_indexes_page_without_overlap(
    contract, sponsor, builder, set_sender, set_time
):
    set_time(1_800_000_000)
    for index in range(1, 53):
        create(contract, sponsor, builder, set_sender, index)

    assert contract.get_sponsor_milestone_count(sponsor) == 52
    assert contract.get_builder_milestone_count(builder) == 52
    first = contract.get_sponsor_milestones(sponsor, 0, 50)
    second = contract.get_sponsor_milestones(sponsor, 50, 50)
    assert [row["id"] for row in first] == list(range(1, 51))
    assert [row["id"] for row in second] == [51, 52]
    assert contract.get_builder_milestones(builder, 52, 10) == []
    with pytest.raises(Exception, match="page limit"):
        contract.get_sponsor_milestones(sponsor, 0, 51)


def test_actor_stats_reconcile_rejected_to_accepted_resubmission(
    contract, sponsor, builder, set_sender, set_time
):
    set_time(1_800_000_000)
    create(contract, sponsor, builder, set_sender)
    first_sha = "0123456789abcdef0123456789abcdef01234567"
    second_sha = "1123456789abcdef0123456789abcdef01234567"
    glstub.runtime.web_render = lambda url, _mode: (
        f"open-labs/ledger commit {url.rsplit('/', 1)[-1]} implementation diff"
    )
    glstub.runtime.exec_prompt = lambda _prompt: json.dumps(
        {"items": ["NOT_MET"], "explanation": "The header is missing."}
    )
    set_sender(builder)
    contract.submit_evidence(
        1,
        f"https://github.com/open-labs/ledger/commit/{first_sha}",
        "The first implementation attempts the requested CSV export behavior.",
    )
    assert contract.get_actor_stats(sponsor) == {
        "created": 1,
        "assigned": 0,
        "accepted": 0,
        "rejected": 1,
        "unresolved": 0,
    }
    assert contract.get_actor_stats(builder) == {
        "created": 0,
        "assigned": 1,
        "accepted": 0,
        "rejected": 1,
        "unresolved": 0,
    }

    glstub.runtime.exec_prompt = lambda _prompt: json.dumps(
        {"items": ["MET"], "explanation": "The documented header is now present."}
    )
    contract.resubmit_evidence(
        1,
        f"https://github.com/open-labs/ledger/commit/{second_sha}",
        "The second implementation adds the missing stable header and documentation.",
    )
    assert contract.get_actor_stats(sponsor)["rejected"] == 0
    assert contract.get_actor_stats(builder)["rejected"] == 0
    assert contract.get_actor_stats(sponsor)["accepted"] == 1
    assert contract.get_actor_stats(builder)["accepted"] == 1


def test_milestone_view_exposes_complete_frontend_shape(
    contract, sponsor, builder, set_sender, set_time
):
    set_time(1_800_000_000)
    create(contract, sponsor, builder, set_sender)
    row = contract.get_milestone(1)
    assert set(row) == {
        "id",
        "sponsor",
        "builder",
        "title",
        "repo",
        "criteria",
        "criteria_count",
        "deadline",
        "created_at",
        "status",
        "evidence_version",
        "review_round",
        "submitted_at",
        "last_reviewed_at",
        "commit_url",
        "commit_sha",
        "summary",
        "result_vector",
        "explanation",
        "completed_at",
    }
