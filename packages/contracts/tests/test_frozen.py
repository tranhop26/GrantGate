import json

import pytest

import genlayer as glstub


def test_public_write_surface_has_no_upgrade_or_result_override(contract_module):
    writes = {
        name
        for name in dir(contract_module.GrantGate)
        if getattr(getattr(contract_module.GrantGate, name), "__gl_visibility__", None)
        == "write"
    }
    assert writes == {
        "create_milestone",
        "cancel_milestone",
        "submit_evidence",
        "resubmit_evidence",
        "retry_review",
    }


def test_accepted_record_is_terminal_for_every_actor_transition(
    contract, sponsor, builder, outsider, set_sender, set_time
):
    set_sender(sponsor)
    set_time(1_800_000_000)
    contract.create_milestone(
        "Ship a documented export",
        builder,
        "open-labs",
        "ledger",
        "The commit implements and documents a deterministic CSV export command.",
        1_800_086_400,
    )
    sha = "0123456789abcdef0123456789abcdef01234567"
    url = f"https://github.com/open-labs/ledger/commit/{sha}"
    glstub.runtime.web_render = lambda _url, _mode: f"open-labs/ledger commit {sha}"
    glstub.runtime.exec_prompt = lambda _prompt: json.dumps(
        {"items": ["MET"], "explanation": "The implementation meets the criterion."}
    )
    set_sender(builder)
    contract.submit_evidence(
        1,
        url,
        "The commit implements the deterministic export and its user documentation.",
    )
    before = contract.get_milestone(1).copy()

    attempts = [
        (builder, contract.submit_evidence, (1, url, "A replayed accepted submission is forbidden.")),
        (builder, contract.resubmit_evidence, (1, url, "A resubmission after acceptance is forbidden.")),
        (builder, contract.retry_review, (1,)),
        (sponsor, contract.cancel_milestone, (1,)),
        (outsider, contract.cancel_milestone, (1,)),
    ]
    for actor, method, args in attempts:
        set_sender(actor)
        with pytest.raises(Exception):
            method(*args)
        assert contract.get_milestone(1) == before

    assert not hasattr(contract, "owner")
    assert not hasattr(contract, "upgrade")
    assert not hasattr(contract, "set_result")
