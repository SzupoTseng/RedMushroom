#!/usr/bin/env python3
"""
Remove disputed/ambiguous sorting questions from the DB.

Patterns flagged:
  - 「S + 睡 + 在 + Room」  (housing) — both "媽媽睡在客廳" and "媽媽在客廳睡" are valid
  - 「時間 + S + V + What」(health) — "每天我運動" / "我每天運動" both valid
  - 「S + 時間 + V + What」(food_shopping) — same issue

After cleanup, run `npm run seed:questions` (from Windows) to repopulate with
the new unambiguous templates.

Usage:
  python3 scripts/cleanup_disputed.py [--dry-run]
"""
from __future__ import annotations

import json
import re
import sqlite3
import sys
from pathlib import Path

DB_PATH = Path(__file__).resolve().parent.parent / "database" / "redmushroom.db"

# Ambiguous patterns to delete (matches option values)
DISPUTED_OPTION_VALUES = [
    "睡",        # housing: S+睡+在+Room
    "每天",      # health: 時間+S+V+...
    "每週",
    "每個月",
    "昨天",      # food_shopping: S+時間+V+...
    "剛才",
    "今天早上",
]


def main() -> int:
    dry_run = "--dry-run" in sys.argv

    if not DB_PATH.exists():
        print(f"DB not found: {DB_PATH}", file=sys.stderr)
        return 1

    con = sqlite3.connect(str(DB_PATH), timeout=30.0)
    try:
        # Find sorting questions whose options contain any of the disputed values
        rows = con.execute(
            "SELECT question_id, content, options, theory_type, category_type "
            "FROM questions WHERE question_type = 'sorting'"
        ).fetchall()
        print(f"[cleanup] scanned {len(rows)} sorting questions")

        to_delete: list[tuple[int, str, str]] = []
        for qid, content, options, theory, category in rows:
            try:
                opts = json.loads(options)
            except json.JSONDecodeError:
                continue
            if any(opts.get(k) in DISPUTED_OPTION_VALUES for k in ("1", "2", "3", "4")):
                # Get question text for logging
                try:
                    chars = json.loads(content)
                    qtext = "".join(c.get("char", "") for c in chars)
                except (json.JSONDecodeError, AttributeError):
                    qtext = ""
                to_delete.append((qid, f"{theory}/{category}", qtext[:30]))

        print(f"[cleanup] found {len(to_delete)} disputed questions:")
        for qid, label, qtext in to_delete[:10]:
            print(f"  [{qid}] {label}  {qtext}…")
        if len(to_delete) > 10:
            print(f"  ... and {len(to_delete) - 10} more")

        if dry_run:
            print(f"[cleanup] dry-run mode; no rows deleted")
            return 0

        # Delete in single transaction
        ids = [q[0] for q in to_delete]
        if ids:
            placeholders = ",".join("?" * len(ids))
            cur = con.cursor()
            # Also remove related quiz_details rows (those just reference the questions)
            cur.execute(
                f"DELETE FROM quiz_details WHERE question_id IN ({placeholders})",
                ids,
            )
            cur.execute(
                f"DELETE FROM user_error_monsters WHERE question_id IN ({placeholders})",
                ids,
            )
            cur.execute(
                f"DELETE FROM questions WHERE question_id IN ({placeholders})",
                ids,
            )
            con.commit()
            print(f"[cleanup] deleted {len(ids)} disputed questions + related rows")
        else:
            print(f"[cleanup] nothing to delete")

    finally:
        con.close()
    return 0


if __name__ == "__main__":
    sys.exit(main())
