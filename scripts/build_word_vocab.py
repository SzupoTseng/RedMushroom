#!/usr/bin/env python3
"""
Build common-words.json — 1000 grade-3-4 appropriate 2-char Chinese words
for the WordTypingGame.

Sources:
  1. backend/data/dictionary.json — MIT (from ToneOZ tzdic, we already use it)
  2. database/redmushroom.db `questions` table — our own content; defines the
     "common chars for grades 3-4" set so we don't surface rare/classical words

Pipeline:
  1. Pull chars that appear in our own questions → COMMON_CHARS set
  2. Iterate dictionary.json, keep 2-char words where:
     - len(word) == 2 (in CJK chars)
     - both chars are in COMMON_CHARS
     - has at least one valid zhuyin reading
     - skip obvious bad categories (variant readings, classical phrases)
  3. Sort by char rarity (prefer words where chars are most-used)
  4. Take top 1000 → write to frontend/public/data/common-words.json

Output format:
  [
    { "word": "學校", "zhuyin": "ㄒㄩㄝˊ ㄒㄧㄠˋ" },
    ...
  ]
"""
from __future__ import annotations

import json
import re
import sqlite3
import sys
from collections import Counter
from pathlib import Path

ROOT = Path(__file__).resolve().parent.parent
DICT_PATH = ROOT / "backend" / "data" / "dictionary.json"
DB_PATH = ROOT / "database" / "redmushroom.db"
OUT_PATH = ROOT / "frontend" / "public" / "data" / "common-words.json"

RE_CJK_ONLY = re.compile(r"^[一-鿿]{2}$")  # exactly 2 CJK chars


def build_common_chars(dictionary: dict) -> Counter[str]:
    """
    Count char occurrences across all multi-char dictionary entries. The most-
    referenced chars are "common" by definition (they appear in lots of
    compound words). Uses ONLY dictionary.json — no DB access needed (avoids
    WSL/Windows file-lock races with the running backend).
    """
    counts: Counter[str] = Counter()
    for word in dictionary.keys():
        if len(word) < 2:
            continue
        for ch in word:
            if "一" <= ch <= "鿿":
                counts[ch] += 1
    return counts


def main() -> int:
    if not DICT_PATH.exists():
        print(f"[vocab] dictionary not found: {DICT_PATH}", file=sys.stderr)
        return 1

    print(f"[vocab] loading dictionary...")
    dictionary = json.loads(DICT_PATH.read_text(encoding="utf-8"))
    print(f"[vocab]   {len(dictionary):,} total entries")

    print(f"[vocab] building char-frequency set from dictionary multi-char entries...")
    char_freq = build_common_chars(dictionary)
    print(f"[vocab]   {len(char_freq):,} distinct chars across {sum(char_freq.values()):,} occurrences")

    # Threshold: keep chars that appear in at least N multi-char compounds.
    # Higher = stricter (more common chars only). Tune to land near ~1500-3000
    # candidate words so top-1000 is high-quality.
    THRESHOLD = 8
    common_set = {c for c, n in char_freq.items() if n >= THRESHOLD}
    print(f"[vocab]   {len(common_set):,} chars meet threshold ≥ {THRESHOLD}")

    print(f"[vocab] filtering dictionary to 2-char words with both chars common...")
    candidates: list[tuple[str, str, int]] = []  # (word, zhuyin, freq_score)

    # Strip "（變）..." tone-sandhi annotations: keep only the primary reading
    RE_VARIANT = re.compile(r"（變）.*$")

    for word, entries in dictionary.items():
        if not RE_CJK_ONLY.match(word):
            continue
        if not all(c in common_set for c in word):
            continue
        # Primary reading (idx 0). Skip if empty.
        z = entries[0]["zhuyin"] if entries else ""
        z = RE_VARIANT.sub("", z).strip()
        if not z:
            continue
        # Skip exotic readings (no spaces means it's not a 2-syllable reading)
        if " " not in z:
            continue
        # Each syllable should look like reasonable bopomofo (max 5 chars per syllable)
        if any(len(syl) > 5 for syl in z.split()):
            continue
        # Frequency score = sum of char frequencies
        score = sum(char_freq[c] for c in word)
        candidates.append((word, z, score))

    print(f"[vocab]   {len(candidates):,} candidates after filtering")

    # Sort by score (most common chars first); take top 1000
    candidates.sort(key=lambda t: -t[2])
    selected = candidates[:1000]

    out = [{"word": w, "zhuyin": z} for w, z, _ in selected]

    OUT_PATH.parent.mkdir(parents=True, exist_ok=True)
    OUT_PATH.write_text(
        json.dumps(out, ensure_ascii=False, indent=0).replace("\n", ""),
        encoding="utf-8",
    )

    # Write a pretty version too (for inspection)
    pretty_path = OUT_PATH.with_suffix(".pretty.json")
    pretty_path.write_text(
        json.dumps(out, ensure_ascii=False, indent=2),
        encoding="utf-8",
    )

    print(f"[vocab] wrote {len(out)} words → {OUT_PATH}")
    print(f"[vocab] first 20 entries:")
    for entry in out[:20]:
        print(f"  {entry['word']}  {entry['zhuyin']}")
    return 0


if __name__ == "__main__":
    sys.exit(main())
