from __future__ import annotations

import json
from typing import Any, Callable


class u256(int):
    def __new__(cls, value: Any = 0):
        parsed = int(value)
        if parsed < 0 or parsed >= 2**256:
            raise OverflowError("u256 out of range")
        return super().__new__(cls, parsed)


class Address:
    __slots__ = ("_hex",)

    def __init__(self, value: Any = "0x" + "00" * 20):
        raw = value.as_hex if isinstance(value, Address) else str(value)
        raw = raw.lower().removeprefix("0x")
        if len(raw) != 40 or any(char not in "0123456789abcdef" for char in raw):
            raise ValueError("not a 20-byte address")
        self._hex = "0x" + raw

    @property
    def as_hex(self) -> str:
        return self._hex

    def __eq__(self, other: Any) -> bool:
        return isinstance(other, Address) and self._hex == other._hex

    def __hash__(self) -> int:
        return hash(self._hex)

    def __repr__(self) -> str:
        return f"Address({self._hex})"


class _StorageType:
    @classmethod
    def __class_getitem__(cls, _item: Any) -> type:
        return cls


class TreeMap(_StorageType, dict):
    def get_or_insert_default(self, key: Any) -> "DynArray":
        if key not in self:
            self[key] = DynArray()
        return self[key]


class DynArray(_StorageType, list):
    pass


def allow_storage(cls: type) -> type:
    return cls


class UserError(Exception):
    pass


class _Vm:
    UserError = UserError


class Event:
    def __new__(cls, *args: Any, **kwargs: Any):
        obj = super().__new__(cls)
        obj._args = args
        obj._kwargs = kwargs
        return obj

    def emit(self) -> None:
        runtime.events.append((type(self).__name__, self._args, self._kwargs))


class _Message:
    sender_address = Address()


class _Public:
    class _Write:
        def __call__(self, fn: Callable[..., Any]) -> Callable[..., Any]:
            fn.__gl_visibility__ = "write"
            return fn

    write = _Write()

    @staticmethod
    def view(fn: Callable[..., Any]) -> Callable[..., Any]:
        fn.__gl_visibility__ = "view"
        return fn


class _Web:
    @staticmethod
    def render(url: str, mode: str = "text") -> str:
        return runtime.web_render(url, mode)


class _Nondet:
    web = _Web()

    @staticmethod
    def exec_prompt(prompt: str) -> str:
        runtime.prompts.append(prompt)
        return runtime.exec_prompt(prompt)


class _EqPrinciple:
    @staticmethod
    def prompt_comparative(principle: str, fn: Callable[[], str]) -> str:
        runtime.principles.append(principle)
        leader = fn()
        for _ in range(max(0, runtime.validator_runs - 1)):
            validator = fn()
            if not runtime.equivalence(leader, validator):
                raise RuntimeError("validators did not reach equivalence")
        return leader


class _Contract:
    def __new__(cls, *_args: Any, **_kwargs: Any):
        obj = super().__new__(cls)
        for klass in reversed(cls.__mro__):
            for name, annotation in getattr(klass, "__annotations__", {}).items():
                if isinstance(annotation, type) and issubclass(annotation, _StorageType):
                    setattr(obj, name, annotation())
        return obj


class _Gl:
    Contract = _Contract
    Event = Event
    public = _Public()
    vm = _Vm()
    message = _Message()
    message_raw: dict[str, Any] = {"datetime": "2025-01-01T00:00:00Z"}
    nondet = _Nondet()
    eq_principle = _EqPrinciple()


gl = _Gl()


class Runtime:
    def reset(self) -> None:
        self.events: list[tuple[str, tuple[Any, ...], dict[str, Any]]] = []
        self.prompts: list[str] = []
        self.principles: list[str] = []
        self.validator_runs = 1
        self.exec_prompt: Callable[[str], str] = lambda _prompt: json.dumps(
            {"items": ["MET"], "explanation": "The criterion is met."}
        )
        self.web_render: Callable[[str, str], str] = lambda url, _mode: url
        self.equivalence: Callable[[str, str], bool] = lambda a, b: a == b


runtime = Runtime()
runtime.reset()
