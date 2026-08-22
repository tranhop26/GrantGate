import pytest


CRITERIA = (
    "Export includes a stable header row.\n"
    "Export preserves UTF-8 project names."
)
SHA_1 = "0123456789abcdef0123456789abcdef01234567"
SHA_2 = "1123456789abcdef0123456789abcdef01234567"
VALID_URL = f"https://github.com/open-labs/ledger/commit/{SHA_1}"
VALID_SUMMARY = "This commit adds the requested export behavior and regression coverage."


def create_open(contract, sponsor, builder, set_sender, set_time):
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


def test_builder_submission_binds_immutable_commit_metadata(
    contract, sponsor, builder, set_sender, set_time
):
    create_open(contract, sponsor, builder, set_sender, set_time)
    set_sender(builder)
    set_time(1_800_000_100)

    contract.submit_evidence(1, VALID_URL, VALID_SUMMARY)

    row = contract.get_milestone(1)
    assert row["status"] == "UNRESOLVED"
    assert row["evidence_version"] == 1
    assert row["review_round"] == 1
    assert row["commit_url"] == VALID_URL
    assert row["commit_sha"] == SHA_1
    assert row["summary"] == VALID_SUMMARY
    assert row["submitted_at"] == 1_800_000_100


@pytest.mark.parametrize(
    "url",
    [
        f"http://github.com/open-labs/ledger/commit/{SHA_1}",
        f"https://gitlab.com/open-labs/ledger/commit/{SHA_1}",
        f"https://github.com/other/ledger/commit/{SHA_1}",
        f"https://github.com/open-labs/other/commit/{SHA_1}",
        f"https://user@github.com/open-labs/ledger/commit/{SHA_1}",
        f"https://github.com:443/open-labs/ledger/commit/{SHA_1}",
        f"https://github.com/open-labs/ledger/commit/{SHA_1}?diff=split",
        f"https://github.com/open-labs/ledger/commit/{SHA_1}#files",
        f"https://github.com/open-labs/ledger/commit/{SHA_1}/extra",
        "https://github.com/open-labs/ledger/commit/abc123",
        f"https://github.com/open-labs/ledger/commit/{SHA_1.upper()}",
        f"https://github.com/open-labs%2Fledger/commit/{SHA_1}",
        f"https://github.com\\open-labs/ledger/commit/{SHA_1}",
    ],
)
def test_submission_rejects_noncanonical_or_unbound_commit_urls(
    contract, sponsor, builder, set_sender, set_time, url
):
    create_open(contract, sponsor, builder, set_sender, set_time)
    set_sender(builder)
    with pytest.raises(Exception, match="canonical commit URL"):
        contract.submit_evidence(1, url, VALID_SUMMARY)
    assert contract.get_milestone(1)["evidence_version"] == 0


def test_submission_rejects_wrong_actor_stale_and_invalid_summary(
    contract, sponsor, builder, outsider, set_sender, set_time
):
    create_open(contract, sponsor, builder, set_sender, set_time)
    set_sender(outsider)
    with pytest.raises(Exception, match="only assigned builder"):
        contract.submit_evidence(1, VALID_URL, VALID_SUMMARY)

    set_sender(builder)
    with pytest.raises(Exception, match="summary length"):
        contract.submit_evidence(1, VALID_URL, "short")
    with pytest.raises(Exception, match="summary length"):
        contract.submit_evidence(1, VALID_URL, "x" * 1001)

    set_time(1_800_086_400)
    with pytest.raises(Exception, match="deadline passed"):
        contract.submit_evidence(1, VALID_URL, VALID_SUMMARY)


def test_submission_and_commit_sha_cannot_replay(
    contract, sponsor, builder, set_sender, set_time
):
    create_open(contract, sponsor, builder, set_sender, set_time)
    set_sender(builder)
    contract.submit_evidence(1, VALID_URL, VALID_SUMMARY)

    with pytest.raises(Exception, match="first submission"):
        contract.submit_evidence(1, VALID_URL, VALID_SUMMARY)

    contract.milestones[1].status = "REJECTED"
    with pytest.raises(Exception, match="commit already used"):
        contract.resubmit_evidence(1, VALID_URL, VALID_SUMMARY)
    assert contract.get_milestone(1)["evidence_version"] == 1


def test_rejected_milestone_accepts_at_most_three_distinct_evidence_versions(
    contract, sponsor, builder, set_sender, set_time
):
    create_open(contract, sponsor, builder, set_sender, set_time)
    set_sender(builder)
    contract.submit_evidence(1, VALID_URL, VALID_SUMMARY)

    for version, sha in [(2, SHA_2), (3, "2123456789abcdef0123456789abcdef01234567")]:
        contract.milestones[1].status = "REJECTED"
        contract.resubmit_evidence(
            1,
            f"https://github.com/open-labs/ledger/commit/{sha}",
            f"Evidence version {version} adds the remaining required implementation.",
        )
        assert contract.get_milestone(1)["evidence_version"] == version

    contract.milestones[1].status = "REJECTED"
    with pytest.raises(Exception, match="evidence version limit"):
        contract.resubmit_evidence(
            1,
            "https://github.com/open-labs/ledger/commit/3123456789abcdef0123456789abcdef01234567",
            "A fourth evidence version must never be accepted by the contract.",
        )
