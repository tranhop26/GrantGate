import pytest


CRITERIA = (
    "Export includes a stable header row.\n"
    "Export preserves UTF-8 project names."
)


def test_sponsor_creates_frozen_open_milestone(
    contract, sponsor, builder, set_sender, set_time
):
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

    row = contract.get_milestone(1)
    assert row["status"] == "OPEN"
    assert row["sponsor"] == sponsor.as_hex
    assert row["builder"] == builder.as_hex
    assert row["repo"] == "open-labs/ledger"
    assert row["criteria"] == CRITERIA
    assert row["criteria_count"] == 2
    assert row["evidence_version"] == 0


@pytest.mark.parametrize(
    ("builder_value", "criteria", "message"),
    [
        ("sponsor", CRITERIA, "builder must differ"),
        ("builder", "too short", "criterion length"),
        ("builder", "Valid criterion with enough detail.\n", "criteria cannot contain blank lines"),
    ],
)
def test_create_rejects_invalid_builder_and_criteria(
    contract,
    sponsor,
    builder,
    set_sender,
    set_time,
    builder_value,
    criteria,
    message,
):
    set_sender(sponsor)
    set_time(1_800_000_000)
    chosen_builder = sponsor if builder_value == "sponsor" else builder

    with pytest.raises(Exception, match=message):
        contract.create_milestone(
            "Ship CSV export",
            chosen_builder,
            "open-labs",
            "ledger",
            criteria,
            1_800_086_400,
        )


def _create(contract, sponsor, builder, set_sender, set_time):
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


def test_sponsor_cancels_untouched_milestone(
    contract, sponsor, builder, set_sender, set_time
):
    _create(contract, sponsor, builder, set_sender, set_time)

    contract.cancel_milestone(1)

    assert contract.get_milestone(1)["status"] == "CANCELLED"


def test_outsider_cannot_cancel_and_cancel_cannot_replay(
    contract, sponsor, builder, outsider, set_sender, set_time
):
    _create(contract, sponsor, builder, set_sender, set_time)
    set_sender(outsider)
    with pytest.raises(Exception, match="only sponsor"):
        contract.cancel_milestone(1)
    assert contract.get_milestone(1)["status"] == "OPEN"

    set_sender(sponsor)
    contract.cancel_milestone(1)
    with pytest.raises(Exception, match="must be open"):
        contract.cancel_milestone(1)
