#!/usr/bin/env python3
"""
Dictionary importer — ToneOZ tzdic → consolidated JSON file.

Reads `D:\\GameDevZ\\dyin\\2讀音選擇工具_Bpmf_VSIME\\tzdic\\tzdata\\*.js` (267 shards
of form `window.tzdic["N"] = { ... };`) and writes ONE merged dictionary at
`backend/data/dictionary.json` keyed by word, with array values for polyphonic
characters.

Shape:
  {
    "一": [{"zhuyin": "ㄧ", "definition": "..."}],
    "不": [
      {"zhuyin": "ㄅㄨˋ", "definition": "..."},
      {"zhuyin": "ㄈㄡˇ", "definition": "..."}
    ],
    ...
  }

The backend loads this once at boot into a Map for O(1) lookup. Front-end
calls GET /api/dict/lookup?q=詞 to fetch entries.
"""
from __future__ import annotations

import json
import os
import re
import sys
from pathlib import Path

ROOT = Path(__file__).resolve().parent.parent
OUT_PATH = ROOT / "backend" / "data" / "dictionary.json"
SRC_DIR = Path(os.environ.get(
    "TZDIC_SRC",
    "/mnt/d/GameDevZ/dyin/2讀音選擇工具_Bpmf_VSIME/tzdic/tzdata",
))

RE_FILE = re.compile(r'^window\.tzdic\["(\d+)"\]\s*=\s*(\{.*\})\s*;?\s*$', re.DOTALL)
RE_SUFFIX = re.compile(r"^(.+?)(\d+)$")
RE_BR = re.compile(r"<br\s*/?>", re.IGNORECASE)
RE_MULTI_NL = re.compile(r"\n{3,}")
RE_WS = re.compile(r"\s+")


def normalize_zhuyin(z: str) -> str:
    return RE_WS.sub(" ", z).strip()


def normalize_definition(d: str) -> str:
    s = RE_BR.sub("\n", d)
    s = s.replace("\t", "")
    s = RE_MULTI_NL.sub("\n\n", s)
    return s.strip()


def main() -> int:
    if not SRC_DIR.exists():
        print(f"[dict] source folder not found: {SRC_DIR}", file=sys.stderr)
        print("[dict] set TZDIC_SRC env var to override.", file=sys.stderr)
        return 1

    files = sorted(
        (p for p in SRC_DIR.iterdir() if re.match(r"^\d+\.js$", p.name)),
        key=lambda p: int(p.stem),
    )
    print(f"[dict] found {len(files)} tzdata files")

    merged: dict[str, list[dict[str, str]]] = {}
    skipped_files = 0
    total_entries = 0

    for fp in files:
        content = fp.read_text(encoding="utf-8")
        m = RE_FILE.match(content)
        if not m:
            print(f"[dict] skip malformed: {fp.name}", file=sys.stderr)
            skipped_files += 1
            continue
        try:
            entries = json.loads(m.group(2))
        except json.JSONDecodeError as e:
            print(f"[dict] JSON parse failed: {fp.name} — {e}", file=sys.stderr)
            skipped_files += 1
            continue

        for raw_key, val in entries.items():
            if not isinstance(val, dict):
                continue
            z = val.get("z")
            d = val.get("d")
            if not isinstance(z, str) or not isinstance(d, str):
                continue
            # Polyphonic suffix convention (from tzdicentry.js):
            #   ""     → primary reading  (idx 0)
            #   "1"    → secondary       (idx 1)
            #   "2"    → tertiary        (idx 2)
            # So idx = int(suffix) directly, NOT int(suffix) - 1.
            sm = RE_SUFFIX.match(raw_key)
            if sm and sm.group(2).isdigit():
                word = sm.group(1)
                idx = int(sm.group(2))
            else:
                word = raw_key
                idx = 0

            entry = {"zhuyin": normalize_zhuyin(z), "definition": normalize_definition(d)}
            arr = merged.setdefault(word, [])
            # Ensure list is long enough for idx slot
            while len(arr) <= idx:
                arr.append({"zhuyin": "", "definition": ""})
            arr[idx] = entry
            total_entries += 1

    # Drop sentinel-empty entries (rare: when only idx=1 exists without idx=0)
    for w in list(merged.keys()):
        merged[w] = [e for e in merged[w] if e["zhuyin"]]
        if not merged[w]:
            del merged[w]

    OUT_PATH.parent.mkdir(parents=True, exist_ok=True)
    with OUT_PATH.open("w", encoding="utf-8") as f:
        json.dump(merged, f, ensure_ascii=False, separators=(",", ":"))

    size_mb = OUT_PATH.stat().st_size / 1024 / 1024
    print(
        f"[dict] wrote {len(merged):,} unique words / {total_entries:,} entries "
        f"({skipped_files} files skipped) → {OUT_PATH} ({size_mb:.1f} MB)"
    )

    for sample in ("一", "不", "行", "和", "長", "重", "為"):
        if sample in merged:
            for e in merged[sample]:
                print(f"  {sample:>4}  {e['zhuyin']:<25}  {e['definition'][:30]}...")

    return 0


if __name__ == "__main__":
    sys.exit(main())
