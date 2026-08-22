# { "Depends": "py-genlayer:1jb45aa8ynh2a9c9xn3b7qqh8sm5q93hwfp7jqmwsfhh8jpz09h6" }
"""GrantGate: validator-enforced software grant milestones."""

from genlayer import *

from dataclasses import dataclass
import datetime
import typing


OPEN = "OPEN"
ACCEPTED = "ACCEPTED"
REJECTED = "REJECTED"
UNRESOLVED = "UNRESOLVED"
CANCELLED = "CANCELLED"

ZERO_ADDRESS = "0x0000000000000000000000000000000000000000"


@allow_storage
@dataclass
class Milestone:
    id: u256
    sponsor: Address
    builder: Address
    title: str
    repo_owner: str
    repo_name: str
    criteria: str
    criteria_count: u256
    deadline: u256
    created_at: u256
    status: str
    evidence_version: u256


class MilestoneCreated(gl.Event):
    def __init__(self, milestone_id: u256, /): ...


class MilestoneCancelled(gl.Event):
    def __init__(self, milestone_id: u256, /): ...


class GrantGate(gl.Contract):
    milestones: TreeMap[u256, Milestone]
    next_milestone_id: u256

    def __init__(self):
        self.next_milestone_id = u256(1)

    def _now(self) -> int:
        raw = gl.message_raw.get("datetime")
        if not raw:
            raise gl.vm.UserError("no timestamp available")
        try:
            return int(datetime.datetime.fromisoformat(raw.replace("Z", "+00:00")).timestamp())
        except (TypeError, ValueError):
            raise gl.vm.UserError("malformed timestamp")

    def _milestone_or_revert(self, milestone_id: u256) -> Milestone:
        milestone = self.milestones.get(u256(milestone_id))
        if milestone is None:
            raise gl.vm.UserError("milestone not found")
        return milestone

    def _repo_token(self, value: str, label: str) -> str:
        token = value.strip().lower()
        if len(token) < 1 or len(token) > 100:
            raise gl.vm.UserError(f"invalid {label}")
        allowed = "abcdefghijklmnopqrstuvwxyz0123456789._-"
        if any(char not in allowed for char in token):
            raise gl.vm.UserError(f"invalid {label}")
        if token[0] in ".-" or token[-1] in ".-":
            raise gl.vm.UserError(f"invalid {label}")
        return token

    @gl.public.write
    def create_milestone(
        self,
        title: str,
        builder: Address,
        repo_owner: str,
        repo_name: str,
        criteria: str,
        deadline: u256,
    ) -> None:
        sponsor = gl.message.sender_address
        if builder.as_hex == ZERO_ADDRESS:
            raise gl.vm.UserError("builder cannot be zero")
        if builder == sponsor:
            raise gl.vm.UserError("builder must differ from sponsor")

        clean_title = title.strip()
        if len(clean_title) < 3 or len(clean_title) > 120:
            raise gl.vm.UserError("title length must be 3-120")

        owner = self._repo_token(repo_owner, "repository owner")
        name = self._repo_token(repo_name, "repository name")

        if len(criteria) > 2000:
            raise gl.vm.UserError("criteria too long")
        raw_items = criteria.split("\n")
        if any(not item.strip() for item in raw_items):
            raise gl.vm.UserError("criteria cannot contain blank lines")
        items = [item.strip() for item in raw_items]
        if len(items) < 1 or len(items) > 5:
            raise gl.vm.UserError("criteria count must be 1-5")
        if any(len(item) < 20 or len(item) > 400 for item in items):
            raise gl.vm.UserError("criterion length must be 20-400")

        now = self._now()
        if int(deadline) <= now:
            raise gl.vm.UserError("deadline must be in the future")

        milestone_id = self.next_milestone_id
        self.next_milestone_id = u256(int(milestone_id) + 1)
        self.milestones[milestone_id] = Milestone(
            id=milestone_id,
            sponsor=sponsor,
            builder=builder,
            title=clean_title,
            repo_owner=owner,
            repo_name=name,
            criteria="\n".join(items),
            criteria_count=u256(len(items)),
            deadline=u256(deadline),
            created_at=u256(now),
            status=OPEN,
            evidence_version=u256(0),
        )
        MilestoneCreated(milestone_id).emit()

    @gl.public.write
    def cancel_milestone(self, milestone_id: u256) -> None:
        milestone = self._milestone_or_revert(milestone_id)
        if gl.message.sender_address != milestone.sponsor:
            raise gl.vm.UserError("only sponsor can cancel")
        if milestone.status != OPEN:
            raise gl.vm.UserError("milestone must be open")
        if int(milestone.evidence_version) != 0:
            raise gl.vm.UserError("submitted milestone cannot be cancelled")
        milestone.status = CANCELLED
        MilestoneCancelled(u256(milestone_id)).emit()

    @gl.public.view
    def get_milestone(self, milestone_id: u256) -> typing.Any:
        milestone = self.milestones.get(u256(milestone_id))
        if milestone is None:
            return None
        return {
            "id": int(milestone.id),
            "sponsor": milestone.sponsor.as_hex,
            "builder": milestone.builder.as_hex,
            "title": milestone.title,
            "repo": f"{milestone.repo_owner}/{milestone.repo_name}",
            "criteria": milestone.criteria,
            "criteria_count": int(milestone.criteria_count),
            "deadline": int(milestone.deadline),
            "created_at": int(milestone.created_at),
            "status": milestone.status,
            "evidence_version": int(milestone.evidence_version),
        }
