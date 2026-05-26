#!/usr/bin/env python3
"""
Verify stored question bopomofo after re-seeding (Python stdlib sqlite3 —
works on Windows or WSL, no native binding needed).

  python3 scripts/verify_db_zhuyin.py

Scans the `questions` table for sentences containing polyphonic characters and
prints the reading each one was assigned, so you can eyeball that context
(word) drove the correct reading.
"""
import json
import sqlite3
import sys
from pathlib import Path

DB = Path(__file__).resolve().parent.parent / "database" / "redmushroom.db"

# char -> list of (substring that should force a reading, expected bopomofo)
EXPECT = {
    "長": [("長大", "ㄓㄤˇ"), ("長輩", "ㄓㄤˇ"), ("校長", "ㄓㄤˇ"), ("班長", "ㄓㄤˇ")],
    "重": [("重要", "ㄓㄨㄥˋ"), ("重複", "ㄔㄨㄥˊ"), ("重新", "ㄔㄨㄥˊ")],
    "樂": [("快樂", "ㄌㄜˋ"), ("音樂", "ㄩㄝˋ")],
    "和": [("和平", "ㄏㄜˊ"), ("和諧", "ㄏㄜˊ")],
    "行": [("銀行", "ㄏㄤˊ"), ("行為", "ㄒㄧㄥˊ")],
    "得": [("心得", "ㄉㄜˊ"), ("覺得", "ㄉㄜˊ")],
}

def main() -> int:
    if not DB.exists():
        print(f"DB not found: {DB}", file=sys.stderr)
        return 1
    con = sqlite3.connect(f"file:{DB}?mode=ro", uri=True, timeout=5)
    rows = con.execute(
        "SELECT content FROM questions WHERE subject='chinese'"
    ).fetchall()
    con.close()
    print(f"scanned {len(rows)} chinese questions\n")

    checks, hits, misses = 0, 0, 0
    for (content,) in rows:
        try:
            arr = json.loads(content)
        except json.JSONDecodeError:
            continue
        sentence = "".join(x["char"] for x in arr)
        for char, expectations in EXPECT.items():
            for word, expected in expectations:
                if word in sentence:
                    # find the char's reading within that word occurrence
                    idx = sentence.index(word)
                    char_pos = idx + word.index(char)
                    reading = arr[char_pos]["pinyin"]
                    checks += 1
                    ok = reading == expected
                    hits += ok
                    misses += (not ok)
                    mark = "OK " if ok else "XX "
                    print(f"  {mark}{sentence[:24]:<26}「{char}」({word})→ {reading}  expect {expected}")

    print(f"\n{hits}/{checks} context readings correct ({misses} wrong)")
    return 0 if misses == 0 else 1

if __name__ == "__main__":
    sys.exit(main())
