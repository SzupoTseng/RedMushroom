#!/usr/bin/env python3
"""
Schema-drift guard (Python stdlib only — runs anywhere, no native bindings).

Prevents the "no such column" class of bug that shipped once:
a new column was added to init.sql + queried by the backend, but existing
PERSISTENT databases never got it because runMigrations() didn't cover it.

Rules enforced (fail → exit 1, blocks the CI build):
  R1  Every column added by `ALTER TABLE t ADD COLUMN c` in
      database/upgrade_schema.sql MUST also appear in t's CREATE TABLE in
      database/init.sql        → fresh databases get the column.
  R2  Every such ALTER-added column MUST have a matching ensureColumn('t','c')
      in backend/src/db/database.ts runMigrations()
                               → persistent databases get the column on boot.

Run:  python3 scripts/check-schema.py
"""
from __future__ import annotations

import re
import sys
from pathlib import Path

ROOT = Path(__file__).resolve().parent.parent
INIT_SQL = ROOT / "database" / "init.sql"
UPGRADE_SQL = ROOT / "database" / "upgrade_schema.sql"
DB_TS = ROOT / "backend" / "src" / "db" / "database.ts"

SQL_KEYWORDS = {
    "check", "unique", "primary", "foreign", "constraint", "create", "index",
}


def columns_in_create_table(sql: str, table: str) -> set[str]:
    """Extract column names from `CREATE TABLE [IF NOT EXISTS] <table> ( ... );`."""
    m = re.search(
        rf"CREATE\s+TABLE\s+(?:IF\s+NOT\s+EXISTS\s+)?{re.escape(table)}\s*\((.*?)\n\s*\)\s*;",
        sql, re.IGNORECASE | re.DOTALL,
    )
    if not m:
        return set()
    body = m.group(1)
    cols: set[str] = set()
    for raw in body.splitlines():
        line = raw.split("--", 1)[0].strip()          # strip line comments
        if not line:
            continue
        tok = re.match(r"([A-Za-z_][A-Za-z0-9_]*)", line)
        if not tok:
            continue
        name = tok.group(1)
        if name.lower() in SQL_KEYWORDS:
            continue
        cols.add(name)
    return cols


def strip_sql_comments(sql: str) -> str:
    """Drop -- line comments (so commented-out template ALTERs aren't matched)."""
    return "\n".join(line.split("--", 1)[0] for line in sql.splitlines())


def alter_added_columns(sql: str) -> list[tuple[str, str]]:
    return [
        (t, c)
        for t, c in re.findall(
            r"ALTER\s+TABLE\s+(\w+)\s+ADD\s+COLUMN\s+(\w+)",
            strip_sql_comments(sql), re.IGNORECASE
        )
    ]


def ensure_column_calls(ts: str) -> set[tuple[str, str]]:
    return {
        (t, c)
        for t, c in re.findall(r"ensureColumn\(\s*['\"](\w+)['\"]\s*,\s*['\"](\w+)['\"]", ts)
    }


def main() -> int:
    for f in (INIT_SQL, UPGRADE_SQL, DB_TS):
        if not f.exists():
            print(f"[check-schema] missing file: {f}", file=sys.stderr)
            return 1

    init_sql = INIT_SQL.read_text(encoding="utf-8")
    upgrade_sql = UPGRADE_SQL.read_text(encoding="utf-8")
    db_ts = DB_TS.read_text(encoding="utf-8")

    altered = alter_added_columns(upgrade_sql)
    ensured = ensure_column_calls(db_ts)

    errors: list[str] = []
    init_cols_cache: dict[str, set[str]] = {}

    for table, column in altered:
        if table not in init_cols_cache:
            init_cols_cache[table] = columns_in_create_table(init_sql, table)
        init_cols = init_cols_cache[table]

        # R1: fresh-DB parity
        if column not in init_cols:
            errors.append(
                f"R1  '{column}' is ALTER-added to '{table}' in upgrade_schema.sql "
                f"but MISSING from {table}'s CREATE TABLE in init.sql "
                f"(fresh databases won't have it)."
            )
        # R2: persistent-DB parity
        if (table, column) not in ensured:
            errors.append(
                f"R2  '{column}' is ALTER-added to '{table}' but has NO "
                f"ensureColumn('{table}','{column}',…) in database.ts runMigrations() "
                f"(persistent databases won't get it on boot → 'no such column')."
            )

    print(f"[check-schema] {len(altered)} migration column(s) checked: "
          + ", ".join(f"{t}.{c}" for t, c in altered))

    if errors:
        print("\n❌ schema drift detected:\n")
        for e in errors:
            print("  - " + e)
        print("\nFix: ensure the column is in BOTH init.sql AND database.ts "
              "runMigrations(), matching upgrade_schema.sql.")
        return 1

    print("✅ schema consistent (init.sql ↔ upgrade_schema.sql ↔ runMigrations).")
    return 0


if __name__ == "__main__":
    sys.exit(main())
