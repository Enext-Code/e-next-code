import logging
import re
from typing import List

from ..models import PlanLineTemplate
from ..schemas import PlanLineTemplateFilterParams, PlanLineTemplateResponse

logger = logging.getLogger(__name__)

ALLOWED_FIELD_TYPES = {"current_treatment", "current_issue", "prescription"}
MIN_LINE_LENGTH = 4
DATE_OR_ROUND_HEADER = re.compile(
    r"^\d{1,2}[./-]\d{1,2}[./-]\d{2,4}"
    r"(?:\s+(?:night|morning|evening|day)?\s*(?:medical\s+)?round\s+sheet)?\s*$",
    re.IGNORECASE,
)


def _normalize_line(text: str) -> str:
    return " ".join(text.strip().split()).lower()


def extract_template_lines(text: str) -> List[str]:
    """Split a textarea into unique, savable lines."""
    seen = set()
    lines = []
    for raw_line in (text or "").splitlines():
        line = " ".join(raw_line.strip().split())
        if len(line) < MIN_LINE_LENGTH:
            continue
        if DATE_OR_ROUND_HEADER.match(line):
            continue
        normalized = _normalize_line(line)
        if normalized in seen:
            continue
        seen.add(normalized)
        lines.append(line)
    return lines


class PlanLineTemplateService:
    """Shared plan-line template service"""

    @staticmethod
    async def search_templates(params: PlanLineTemplateFilterParams) -> dict:
        """Search shared templates for the current line."""
        field_type = (params.field_type or "").strip()
        query = (params.search or "").strip()

        if field_type not in ALLOWED_FIELD_TYPES or len(query) < 2:
            return {
                "items": [],
                "total": 0,
                "page": 1,
                "limit": params.limit,
                "pages": 0,
                "has_next": False,
                "has_prev": False,
            }

        escaped = re.escape(query)
        escaped = re.sub(r"\\ ", r"\\s+", escaped)

        filter_query = {
            "field_type": field_type,
            "is_active": True,
            "is_deleted": False,
            "text": {"$regex": escaped, "$options": "i"},
        }

        collection = PlanLineTemplate.get_collection()
        pipeline = [
            {"$match": filter_query},
            {"$sort": {"usage_count": -1, "text": 1}},
            {"$limit": params.limit},
        ]
        docs = await collection.aggregate(pipeline).to_list(length=params.limit)

        items = [
            PlanLineTemplateResponse(
                id=str(doc["_id"]),
                field_type=doc.get("field_type", field_type),
                text=doc.get("text", ""),
                usage_count=doc.get("usage_count", 1),
                created_at=doc.get("created_at"),
                updated_at=doc.get("updated_at"),
            ).model_dump()
            for doc in docs
        ]

        return {
            "items": items,
            "total": len(items),
            "page": 1,
            "limit": params.limit,
            "pages": 1 if items else 0,
            "has_next": False,
            "has_prev": False,
        }

    @staticmethod
    async def upsert_lines(
        field_type: str, text: str, current_user: dict
    ) -> None:
        """Save unique lines from a field into the shared template bank."""
        if field_type not in ALLOWED_FIELD_TYPES:
            return

        lines = extract_template_lines(text)
        if not lines:
            return

        created_by = str(current_user.get("sub") or "")
        created_by_profile = str(current_user.get("pid") or "")

        for line in lines:
            normalized = _normalize_line(line)
            existing = await PlanLineTemplate.find_one(
                {
                    "field_type": field_type,
                    "text_normalized": normalized,
                    "is_active": True,
                    "is_deleted": False,
                }
            )
            if existing:
                await existing.update(
                    {
                        "usage_count": (existing.usage_count or 1) + 1,
                        "updated_by": created_by,
                        "updated_by_profile": created_by_profile,
                    }
                )
                continue

            await PlanLineTemplate.create(
                field_type=field_type,
                text=line,
                text_normalized=normalized,
                usage_count=1,
                created_by=created_by,
                created_by_profile=created_by_profile,
                updated_by=created_by,
                updated_by_profile=created_by_profile,
            )


plan_line_template_service = PlanLineTemplateService()
