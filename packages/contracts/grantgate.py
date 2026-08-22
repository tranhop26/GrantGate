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
    review_round: u256
    submitted_at: u256
    last_reviewed_at: u256
    commit_url: str
    commit_sha: str
    summary: str
    result_vector: str
    explanation: str
    completed_at: u256


class MilestoneCreated(gl.Event):
    def __init__(self, milestone_id: u256, /): ...


class MilestoneCancelled(gl.Event):
    def __init__(self, milestone_id: u256, /): ...


class EvidenceSubmitted(gl.Event):
    def __init__(self, milestone_id: u256, /, **blob): ...


class GrantGate(gl.Contract):
    milestones: TreeMap[u256, Milestone]
    used_commit_shas: TreeMap[u256, DynArray[str]]
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

    def _parse_commit_url(self, milestone: Milestone, value: str) -> typing.Any:
        prefix = (
            f"https://github.com/{milestone.repo_owner}/"
            f"{milestone.repo_name}/commit/"
        )
        if not value.startswith(prefix):
            raise gl.vm.UserError("invalid canonical commit URL")
        sha = value[len(prefix) :]
        if len(sha) != 40:
            raise gl.vm.UserError("invalid canonical commit URL")
        if any(char not in "0123456789abcdef" for char in sha):
            raise gl.vm.UserError("invalid canonical commit URL")
        if value != prefix + sha:
            raise gl.vm.UserError("invalid canonical commit URL")
        return value, sha

    def _record_evidence(
        self, milestone: Milestone, commit_url: str, summary: str
    ) -> None:
        if gl.message.sender_address != milestone.builder:
            raise gl.vm.UserError("only assigned builder may submit evidence")
        now = self._now()
        if now >= int(milestone.deadline):
            raise gl.vm.UserError("milestone deadline passed")
        clean_summary = summary.strip()
        if len(clean_summary) < 20 or len(clean_summary) > 1000:
            raise gl.vm.UserError("summary length must be 20-1000")
        canonical_url, sha = self._parse_commit_url(milestone, commit_url.strip())
        used = self.used_commit_shas.get_or_insert_default(milestone.id)
        if sha in used:
            raise gl.vm.UserError("commit already used for milestone")

        used.append(sha)
        milestone.evidence_version = u256(int(milestone.evidence_version) + 1)
        milestone.review_round = u256(1)
        milestone.submitted_at = u256(now)
        milestone.last_reviewed_at = u256(now)
        milestone.commit_url = canonical_url
        milestone.commit_sha = sha
        milestone.summary = clean_summary
        milestone.result_vector = ""
        milestone.explanation = ""
        milestone.completed_at = u256(0)
        milestone.status = UNRESOLVED
        EvidenceSubmitted(
            milestone.id,
            evidence_version=int(milestone.evidence_version),
            commit_sha=sha,
        ).emit()

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
            review_round=u256(0),
            submitted_at=u256(0),
            last_reviewed_at=u256(0),
            commit_url="",
            commit_sha="",
            summary="",
            result_vector="",
            explanation="",
            completed_at=u256(0),
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

    @gl.public.write
    def submit_evidence(
        self, milestone_id: u256, commit_url: str, summary: str
    ) -> None:
        milestone = self._milestone_or_revert(milestone_id)
        if milestone.status != OPEN or int(milestone.evidence_version) != 0:
            raise gl.vm.UserError("first submission requires untouched open milestone")
        self._record_evidence(milestone, commit_url, summary)

    @gl.public.write
    def resubmit_evidence(
        self, milestone_id: u256, commit_url: str, summary: str
    ) -> None:
        milestone = self._milestone_or_revert(milestone_id)
        if milestone.status != REJECTED:
            raise gl.vm.UserError("resubmission requires rejected milestone")
        if int(milestone.evidence_version) >= 3:
            raise gl.vm.UserError("evidence version limit reached")
        self._record_evidence(milestone, commit_url, summary)

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
            "review_round": int(milestone.review_round),
            "submitted_at": int(milestone.submitted_at),
            "last_reviewed_at": int(milestone.last_reviewed_at),
            "commit_url": milestone.commit_url,
            "commit_sha": milestone.commit_sha,
            "summary": milestone.summary,
            "result_vector": milestone.result_vector,
            "explanation": milestone.explanation,
            "completed_at": int(milestone.completed_at),
        }
