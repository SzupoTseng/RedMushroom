#!/usr/bin/env python3
"""
Stage 4: 把 data/pdfs/ 內的 PDF 轉成純文字，輸出到 data/texts/。

用 pdfplumber 抽取文字 PDF。掃描 PDF（無內嵌文字）會回報並標記 needs_ocr。
DOC/DOCX 需要 LibreOffice 或 antiword/docx2txt — 暫不處理。
"""
import json
import re
import sys
from pathlib import Path

import fitz  # pymupdf

DATA_DIR = Path(__file__).parent / "data"
PDFS_DIR = DATA_DIR / "pdfs"
TEXTS_DIR = DATA_DIR / "texts"
SKIP_PATTERNS = ["審題表", "細目", "評量原則", "Map", "TelNums", "Campus", "_calendar"]


def parse_pdf(pdf_path: Path) -> tuple[str, int]:
    """用 pymupdf 抽取文字。直書/多欄 PDF 比 pdfplumber 處理得更好。
    回傳 (full_text, n_pages)。若全空可能是掃描 PDF。"""
    pages_text: list[str] = []
    try:
        doc = fitz.open(pdf_path)
    except Exception as e:
        print(f"  [WARN] pymupdf open failed: {pdf_path.name}: {e}", file=sys.stderr)
        return "", 0
    try:
        for page in doc:
            text = page.get_text("text") or ""
            # pymupdf 經常一字一行。合併：去掉純空白行、把單個中文字合併成連續字串
            lines = text.split("\n")
            merged: list[str] = []
            buf = ""
            for ln in lines:
                stripped = ln.strip()
                if not stripped:
                    if buf:
                        merged.append(buf)
                        buf = ""
                    continue
                # 單字行（多為 CJK 字元，或全形標點）→ append 到 buffer
                if len(stripped) <= 2:
                    buf += stripped
                else:
                    if buf:
                        merged.append(buf)
                        buf = ""
                    merged.append(stripped)
            if buf:
                merged.append(buf)
            pages_text.append("\n".join(merged))
    finally:
        doc.close()
    full = "\n--- PAGE BREAK ---\n".join(pages_text)
    return full, len(pages_text)


def main() -> None:
    if not PDFS_DIR.exists():
        print(f"[X] {PDFS_DIR} not found. Run download.py first.", file=sys.stderr)
        sys.exit(1)
    TEXTS_DIR.mkdir(parents=True, exist_ok=True)

    summary: list[dict] = []
    parsed = 0
    skipped = 0
    empty = 0

    for pdf_path in sorted(PDFS_DIR.rglob("*.pdf")):
        rel = pdf_path.relative_to(PDFS_DIR)
        # 過濾非考卷
        if any(s in pdf_path.name for s in SKIP_PATTERNS):
            skipped += 1
            print(f"  ⊘ {rel} (filename suggests non-exam)")
            continue

        out_dir = TEXTS_DIR / rel.parent
        out_dir.mkdir(parents=True, exist_ok=True)
        out_file = out_dir / (pdf_path.stem + ".txt")

        text, npages = parse_pdf(pdf_path)
        if not text.strip():
            empty += 1
            print(f"  ✗ {rel} ({npages} pages, no text — likely scanned, needs OCR)")
            summary.append({"file": str(rel), "pages": npages, "chars": 0, "needs_ocr": True})
            continue

        out_file.write_text(text, encoding="utf-8")
        nchars = len(text)
        parsed += 1
        print(f"  ✓ {rel}  ({npages}p, {nchars:,} chars)")
        summary.append({"file": str(rel), "pages": npages, "chars": nchars, "needs_ocr": False, "txt_path": str(out_file.relative_to(DATA_DIR))})

    (DATA_DIR / "parse_summary.json").write_text(
        json.dumps(summary, ensure_ascii=False, indent=2), encoding="utf-8")
    print()
    print(f"[parse] parsed {parsed}, skipped {skipped} (non-exam), empty {empty} (needs OCR)")
    print(f"[parse] outputs in {TEXTS_DIR}/")


if __name__ == "__main__":
    main()
