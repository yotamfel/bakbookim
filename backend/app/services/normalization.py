from anthropic import Anthropic

from app.config import get_settings
from app.constants import CATEGORIES

settings = get_settings()
_client = Anthropic(api_key=settings.anthropic_api_key)

_TOOL = {
    "name": "extract_product",
    "description": (
        "Extract normalized product identity fields from a free-text alcohol product request. "
        "The request text may be in Hebrew, English, or a mix of both."
    ),
    "input_schema": {
        "type": "object",
        "properties": {
            "category": {"type": "string", "enum": CATEGORIES},
            "canonical_brand": {
                "type": "string",
                "description": (
                    "The brand/product name normalized to one consistent canonical form "
                    "(typically the transliteration/spelling as it actually appears on the bottle "
                    "or on bakbookim.com), regardless of the language or spelling the user used. "
                    "E.g. 'מקאלן', 'Macallan whiskey', and 'מקלאן' should all normalize to the same string."
                ),
            },
            "canonical_variant": {
                "type": "string",
                "description": "Variant/age/flavor/vintage if one was specified in the text, else an empty string.",
            },
            "specificity": {
                "type": "string",
                "enum": ["specific_bottle", "brand_only", "category_only"],
                "description": "How specific the request is.",
            },
        },
        "required": ["category", "canonical_brand", "canonical_variant", "specificity"],
    },
}


def normalize(original_text: str, category_hint: str) -> dict:
    """Calls Claude to extract category/canonical_brand/canonical_variant/specificity from raw request text."""
    message = _client.messages.create(
        model=settings.normalization_model,
        max_tokens=300,
        tools=[_TOOL],
        tool_choice={"type": "tool", "name": "extract_product"},
        messages=[
            {
                "role": "user",
                "content": (
                    f"קטגוריה שנבחרה בטופס: {category_hint}\n"
                    f"טקסט הבקשה הגולמי (עברית/אנגלית/מעורב): {original_text}\n\n"
                    "חלץ את שדות זיהוי המוצר המנורמלים."
                ),
            }
        ],
    )
    for block in message.content:
        if block.type == "tool_use":
            return block.input
    raise RuntimeError("Claude did not return a tool_use block for normalization")
