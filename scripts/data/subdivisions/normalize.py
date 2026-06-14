"""Subdivision name normalization utilities.

Normalization steps:
1. Strip whitespace, convert to uppercase.
2. Expand common Cook County abbreviations.
3. Remove punctuation, collapse spaces.
4. Remove noise phrases ("SUBDIVISION OF", "RE-SUBDIVISION OF", etc.).
5. Return a consistent key for deduplication and fuzzy matching.

Does NOT invent subdivision names. If the input is empty, returns None.
"""

from __future__ import annotations

import re

ABBREVIATION_MAP: dict[str, str] = {
    r"\bSUBD\.?\b": "SUBDIVISION",
    r"\bSUBDIV\.?\b": "SUBDIVISION",
    r"\bRESUBD\.?\b": "RESUBDIVISION",
    r"\bRE-SUBDN?\b": "RESUBDIVISION",
    r"\bRE SUBDN?\b": "RESUBDIVISION",
    r"\bADD\.?\b": "ADDITION",
    r"\bADDN\.?\b": "ADDITION",
    r"\bEXT\.?\b": "EXTENSION",
    r"\bNO\.?\s*(\d+)": r"NO \1",
    r"\bNO\s+(\d+)": r"NO \1",
    r"\b(\d+)(ST|ND|RD|TH)\b": r"\1",
    r"\bBLK\.?\b": "BLOCK",
    r"\bLOT\.?\b": "LOT",
    r"\bSEC\.?\b": "SECTION",
    r"\bTWP\.?\b": "TOWNSHIP",
    r"\bN\.?\b": "NORTH",
    r"\bS\.?\b": "SOUTH",
    r"\bE\.?\b": "EAST",
    r"\bW\.?\b": "WEST",
}

NOISE_PHRASES = (
    r"^SUBDIVISION OF\s+",
    r"^RE-?SUBDIVISION OF\s+",
    r"^RESUBDIVISION OF\s+",
    r"^PART OF\s+",
    r"^PORTIONS? OF\s+",
)

COOK_COUNTY_NOISE = (
    r"\s+COOK COUNTY\s*$",
    r"\s+ILLINOIS\s*$",
    r"\s+IL\s*$",
    r"\s+PARK RIDGE\s*$",
)


def normalize_subdivision_name(name: object) -> str | None:
    """Return a normalized subdivision key for deduplication and matching.

    Returns None if the input is empty or not usable.
    Does not invent or alter the meaning of the name.
    """
    if name is None:
        return None
    text = str(name).strip().upper()
    if not text or text in ("NAN", "NONE", "NULL", "N/A", "UNKNOWN", ""):
        return None

    for pattern, replacement in ABBREVIATION_MAP.items():
        text = re.sub(pattern, replacement, text)

    for noise in NOISE_PHRASES:
        text = re.sub(noise, "", text)

    for noise in COOK_COUNTY_NOISE:
        text = re.sub(noise, "", text.strip())

    text = re.sub(r"[^A-Z0-9 ]+", " ", text)
    text = re.sub(r"\s{2,}", " ", text).strip()
    return text if text else None


def display_name(name: str) -> str:
    """Convert a raw subdivision name to title-case display name."""
    words = name.strip().upper().split()
    title_words = []
    keep_upper = {"OF", "AND", "THE", "A", "AN", "IN", "AT", "TO", "FOR", "NO"}
    first = True
    for word in words:
        if first or word not in keep_upper:
            title_words.append(word.capitalize())
            first = False
        else:
            title_words.append(word.lower())
    return " ".join(title_words)


def names_are_equivalent(a: str | None, b: str | None) -> bool:
    """Return True if two subdivision names normalize to the same key."""
    norm_a = normalize_subdivision_name(a)
    norm_b = normalize_subdivision_name(b)
    if norm_a is None or norm_b is None:
        return False
    return norm_a == norm_b


def rough_similarity(a: str | None, b: str | None) -> float:
    """Return a 0–1 similarity score based on word overlap (not Levenshtein).

    Used for fuzzy matching when exact normalization doesn't match.
    A score >= 0.75 is considered a candidate match.
    """
    norm_a = normalize_subdivision_name(a)
    norm_b = normalize_subdivision_name(b)
    if not norm_a or not norm_b:
        return 0.0
    words_a = set(norm_a.split())
    words_b = set(norm_b.split())
    intersection = words_a & words_b
    union = words_a | words_b
    return len(intersection) / len(union) if union else 0.0
