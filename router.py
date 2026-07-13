import json
import logging

from prompts import SYSTEM_PROMPT, CATEGORIES, PRIORITIES, TEAMS, TONES
from ai_client import get_ai_response, AIServiceError

logger = logging.getLogger(__name__)

REQUIRED_KEYS = {"category", "priority", "assigned_team", "reasoning", "tone"}

MAX_ATTEMPTS = 2

FALLBACK_RESULT = {
    "category": "Unknown",
    "priority": "Low",
    "assigned_team": "Customer Support",
    "reasoning": "AI returned invalid JSON.",
    "tone": "Neutral"
}


def build_prompt(ticket):

    return f"""
{SYSTEM_PROMPT}

Support Ticket:

{ticket}
"""


def _strip_code_fences(text):

    text = text.strip()

    if text.startswith("```"):
        text = text.split("\n", 1)[1] if "\n" in text else ""
        if text.endswith("```"):
            text = text.rsplit("```", 1)[0]

    return text.strip()


def _parse_and_validate(response):

    try:
        result = json.loads(_strip_code_fences(response))
    except json.JSONDecodeError:
        return None

    if not isinstance(result, dict) or not REQUIRED_KEYS.issubset(result):
        logger.warning("AI response missing expected keys: %s", result)
        return None

    if (
        result["category"] not in CATEGORIES
        or result["priority"] not in PRIORITIES
        or result["assigned_team"] not in TEAMS
        or result["tone"] not in TONES
    ):
        logger.warning("AI response contained invalid field values: %s", result)
        return None

    return result


def route_ticket(ticket):

    prompt = build_prompt(ticket)

    for attempt in range(1, MAX_ATTEMPTS + 1):
        try:
            response = get_ai_response(prompt)
        except AIServiceError as e:
            logger.error("Ticket routing failed: %s", e)
            return {
                **FALLBACK_RESULT,
                "reasoning": "AI service unavailable; ticket needs manual routing."
            }

        result = _parse_and_validate(response)
        if result is not None:
            return result

        logger.warning("Invalid AI response on attempt %d/%d", attempt, MAX_ATTEMPTS)

    return dict(FALLBACK_RESULT)