#!/usr/bin/env python3
"""
Extract the official 國中 2000 英文單字 list (user-supplied PDF) into a TSV the
English-typing-game build can ingest:  en<TAB>pos<TAB>zh  (one per line).

The PDF is the authority's own compilation supplied by the user; we extract the
factual word→(part-of-speech, Chinese gloss) pairs, we do not redistribute the
PDF itself. Output: scripts/data/english-vocab-source.tsv

Run:  python3 scripts/extract-moe-2000.py "<path-to.pdf>"
"""
import os
import re
import sys

try:
    import pypdf
except ImportError:
    sys.exit("pypdf not installed: pip install --break-system-packages pypdf")

HERE = os.path.dirname(os.path.abspath(__file__))
DEFAULT_PDF = "/mnt/d/GameDevZ/dyin/7英文快打/國中2000字-依字母序1(列印版).pdf"
OUT = os.path.join(HERE, "data", "english-vocab-source.tsv")

POS = r"(?:n|v|adj|adv|prep|conj|pron|art|aux|int|num|det|abbr)"
# English head allows ( ) ' ’ (e.g. backward(s), o'clock); POS period optional
# so "cross v 穿過" is recovered alongside "able  adj. 有能力的".
LINE = re.compile(
    r"^([A-Za-z][A-Za-z ().'’\-]*?)\s+((?:" + POS + r")\.?(?:\s*&?\s*(?:" + POS + r")\.?)*)\s+(.+?)\s*$"
)


def main():
    pdf_path = sys.argv[1] if len(sys.argv) > 1 else DEFAULT_PDF
    reader = pypdf.PdfReader(pdf_path)
    seen = {}
    for page in reader.pages:
        for raw in page.extract_text().splitlines():
            line = raw.strip()
            m = LINE.match(line)
            if not m:
                continue
            en = m.group(1).strip()
            pos = m.group(2).replace(" ", "")
            if pos and not pos.endswith("."):
                pos += "."
            zh = m.group(3).strip()
            # drop obvious non-entries (headers, page furniture)
            if not zh or len(en) > 30 or "單字" in en:
                continue
            seen[en.lower()] = (en, pos, zh)

    os.makedirs(os.path.dirname(OUT), exist_ok=True)
    with open(OUT, "w", encoding="utf-8") as f:
        f.write("# en\tpos\tzh — extracted from official 國中2000 PDF (user-supplied)\n")
        for en, pos, zh in sorted(seen.values(), key=lambda x: x[0].lower()):
            f.write(f"{en}\t{pos}\t{zh}\n")
    print(f"[extract] wrote {len(seen)} entries -> {OUT}")
    for v in list(sorted(seen.values()))[:8]:
        print("  ", v)


if __name__ == "__main__":
    main()
