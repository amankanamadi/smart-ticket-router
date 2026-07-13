import os
import logging

from dotenv import load_dotenv
from openai import OpenAI, OpenAIError

from prompts import TICKET_JSON_SCHEMA

load_dotenv()

logger = logging.getLogger(__name__)

client = OpenAI(api_key=os.getenv("OPENAI_API_KEY"))


class AIServiceError(Exception):
    """Raised when the OpenAI API call fails."""


def get_ai_response(prompt):

    try:
        response = client.chat.completions.create(
            model="gpt-4.1-mini",
            temperature=0,
            response_format={"type": "json_schema", "json_schema": TICKET_JSON_SCHEMA},
            messages=[
                {
                    "role": "user",
                    "content": prompt
                }
            ]
        )
    except OpenAIError as e:
        logger.error("OpenAI API call failed: %s", e)
        raise AIServiceError(str(e)) from e

    return response.choices[0].message.content