import logging
import re
from datetime import timedelta
from typing import List

from pymongo import UpdateOne

from app.base.models import get_current_datetime
from app.core import cache

from ..models import PlanLineTemplate
from ..schemas import PlanLineTemplateFilterParams, PlanLineTemplateResponse

logger = logging.getLogger(__name__)

ALLOWED_FIELD_TYPES = {"current_treatment", "current_issue", "prescription"}
MIN_LINE_LENGTH = 4
MAX_SEARCH_LENGTH = 24
MAX_CACHED_LINES = 10000
CACHE_KEY_PREFIX = "plan_line_templates"
CACHE_TIMEOUT = timedelta(minutes=1440)
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


def _empty_search_response(limit: int) -> dict:
    return {
        "items": [],
        "total": 0,
        "page": 1,
        "limit": limit,
        "pages": 0,
        "has_next": False,
        "has_prev": False,
    }


class PlanLineTemplateService:
    """Shared plan-line template service"""

    @staticmethod
    def _cache_key(field_type: str) -> str:
        return f"{CACHE_KEY_PREFIX}:{field_type}"

    @staticmethod
    async def _load_field_lines(field_type: str) -> List[dict]:
        """Load one field's lines from Redis, falling back to MongoDB."""
        cache_key = PlanLineTemplateService._cache_key(field_type)
        cached_lines = await cache.get(cache_key)
        if isinstance(cached_lines, list):
            return cached_lines

        collection = PlanLineTemplate.get_collection()
        docs = (
            await collection.find(
                {
                    "field_type": field_type,
                    "is_active": True,
                    "is_deleted": False,
                }
            )
            .sort([("usage_count", -1), ("text", 1)])
            .limit(MAX_CACHED_LINES)
            .to_list(length=MAX_CACHED_LINES)
        )

        lines = [
            {
                "id": str(doc["_id"]),
                "field_type": doc.get("field_type", field_type),
                "text": doc.get("text", ""),
                "text_normalized": doc.get("text_normalized")
                or _normalize_line(doc.get("text", "")),
                "usage_count": doc.get("usage_count", 1),
                "created_at": doc.get("created_at"),
                "updated_at": doc.get("updated_at"),
            }
            for doc in docs
        ]
        await cache.set(cache_key, lines, CACHE_TIMEOUT)
        return lines

    @staticmethod
    async def _invalidate_field_cache(field_type: str) -> None:
        await cache.delete(PlanLineTemplateService._cache_key(field_type))

    @staticmethod
    def _filter_matching_lines(
        lines: List[dict], normalized_query: str, limit: int
    ) -> List[dict]:
        """Prefer lines that start with the query, then lines that contain it as a word."""
        prefix_matches: List[dict] = []
        word_matches: List[dict] = []
        word_needle = f" {normalized_query}"

        for line in lines:
            text = line.get("text_normalized") or ""
            if text.startswith(normalized_query):
                prefix_matches.append(line)
                if len(prefix_matches) >= limit:
                    return prefix_matches[:limit]
            elif word_needle in text:
                word_matches.append(line)

        return (prefix_matches + word_matches)[:limit]

    @staticmethod
    async def search_templates(params: PlanLineTemplateFilterParams) -> dict:
        """Search shared templates from Redis, with Mongo fallback."""
        field_type = (params.field_type or "").strip()
        query = (params.search or "").strip()

        if field_type not in ALLOWED_FIELD_TYPES or len(query) < 2 or len(query) > MAX_SEARCH_LENGTH:
            return _empty_search_response(params.limit)

        normalized_query = _normalize_line(query)
        lines = await PlanLineTemplateService._load_field_lines(field_type)
        matches = PlanLineTemplateService._filter_matching_lines(
            lines, normalized_query, params.limit
        )

        now = get_current_datetime()
        items = [
            PlanLineTemplateResponse(
                id=str(line.get("id") or ""),
                field_type=line.get("field_type", field_type),
                text=line.get("text", ""),
                usage_count=line.get("usage_count", 1),
                created_at=line.get("created_at") or now,
                updated_at=line.get("updated_at") or now,
            ).model_dump()
            for line in matches
            if line.get("id")
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
        now = get_current_datetime()
        operations = []

        for line in lines:
            normalized = _normalize_line(line)
            operations.append(
                UpdateOne(
                    {
                        "field_type": field_type,
                        "text_normalized": normalized,
                        "is_active": True,
                        "is_deleted": False,
                    },
                    {
                        "$inc": {"usage_count": 1},
                        "$set": {
                            "updated_at": now,
                            "updated_by": created_by,
                            "updated_by_profile": created_by_profile,
                        },
                        "$setOnInsert": {
                            "text": line,
                            "field_type": field_type,
                            "text_normalized": normalized,
                            "is_active": True,
                            "is_deleted": False,
                            "created_at": now,
                            "created_by": created_by,
                            "created_by_profile": created_by_profile,
                        },
                    },
                    upsert=True,
                )
            )

        collection = PlanLineTemplate.get_collection()
        await collection.bulk_write(operations, ordered=False)
        await PlanLineTemplateService._invalidate_field_cache(field_type)


plan_line_template_service = PlanLineTemplateService()
