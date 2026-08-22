from __future__ import annotations

import datetime
import importlib.util
import sys
from pathlib import Path

import pytest


TESTS = Path(__file__).parent
CONTRACT_PATH = TESTS.parent / "grantgate.py"
sys.path.insert(0, str(TESTS / "_stubs"))

import genlayer as gl  # noqa: E402


@pytest.fixture(scope="session")
def contract_module():
    spec = importlib.util.spec_from_file_location("grantgate_contract", CONTRACT_PATH)
    if spec is None or spec.loader is None:
        raise RuntimeError("could not load GrantGate contract")
    module = importlib.util.module_from_spec(spec)
    spec.loader.exec_module(module)
    return module


@pytest.fixture
def contract(contract_module):
    gl.runtime.reset()
    gl.gl.message.sender_address = gl.Address()
    return contract_module.GrantGate()


@pytest.fixture
def sponsor():
    return gl.Address("0x1111111111111111111111111111111111111111")


@pytest.fixture
def builder():
    return gl.Address("0x2222222222222222222222222222222222222222")


@pytest.fixture
def outsider():
    return gl.Address("0x3333333333333333333333333333333333333333")


@pytest.fixture
def set_sender():
    def apply(address: gl.Address) -> None:
        gl.gl.message.sender_address = address

    return apply


@pytest.fixture
def set_time():
    def apply(timestamp: int) -> None:
        stamp = datetime.datetime.fromtimestamp(timestamp, datetime.timezone.utc)
        gl.gl.message_raw["datetime"] = stamp.isoformat().replace("+00:00", "Z")

    return apply
