#!/usr/bin/env python3
"""
Stage 3: 下載 papers.json 列出的 PDF/DOC 檔到 data/pdfs/<school_id>/。

Idempotent — 已存在的檔案會跳過。檔案名清洗：保留中文與英數，去除特殊字元。
"""
import json
import re
import sys
import time
from pathlib import Path
from urllib.parse import urlparse, parse_qs

import requests

DATA_DIR = Path(__file__).parent / "data"
PAPERS = DATA_DIR / "papers.json"
PDFS_DIR = DATA_DIR / "pdfs"
UA = "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36"

SKIP_KEYWORDS = re.compile(r"行事曆|課表|通知|公告|簡章|報名|計畫書|時間表", re.IGNORECASE)
DOC_EXT_RE = re.compile(r"\.(pdf|docx?|odt)(\?.*)?$", re.IGNORECASE)


def clean_filename(name: str, ext: str) -> str:
    name = name.strip()
    name = re.sub(r"[\\/:*?\"<>|]+", "_", name)
    name = re.sub(r"\s+", "_", name)
    name = name[:80]
    if not name.lower().endswith("." + ext.lower()):
        name = f"{name}.{ext}"
    return name


def resolve_filename_via_head(p: dict, session: requests.Session) -> tuple[str, str]:
    """對 CMS 動態下載連結（如 tad_uploader index.php?cfsn=N），用 HEAD 取
    Content-Disposition 的真實檔名，或從 Content-Type 推副檔名 + URL 參數當 uid。"""
    name = p["file_name"]
    ext = p["ext"]
    if name and name != "index.php" and DOC_EXT_RE.search(name):
        return name, ext  # 已有可用名

    # 用 URL 參數做唯一 id（cfsn / d / dl_id 等）
    qs = parse_qs(urlparse(p["url"]).query)
    uid = qs.get("cfsn", qs.get("d", qs.get("dl_id", [None])))[0] or "x"

    try:
        r = session.head(p["url"], timeout=15, allow_redirects=True)
        cd = r.headers.get("Content-Disposition", "")
        m = re.search(r"filename\*?=(?:UTF-8'')?\"?([^\";]+)\"?", cd)
        if m:
            fn = m.group(1)
            from urllib.parse import unquote
            fn = unquote(fn)
            # Some servers send latin-1-decoded UTF-8 in CD. Try to repair.
            try:
                fn = fn.encode("latin-1").decode("utf-8")
            except (UnicodeEncodeError, UnicodeDecodeError):
                pass
            return fn, (DOC_EXT_RE.search(fn).group(1).lower() if DOC_EXT_RE.search(fn) else "bin")
        # fallback: 用 Content-Type 推副檔名
        ct = r.headers.get("Content-Type", "").lower()
        if "pdf" in ct:
            ext = "pdf"
        elif "msword" in ct or "ms-doc" in ct:
            ext = "doc"
        elif "officedocument.wordprocessingml" in ct:
            ext = "docx"
        else:
            ext = "bin"
    except requests.RequestException:
        ext = "bin"
    name = f"file_{uid}.{ext}"
    return name, ext


def main() -> None:
    if not PAPERS.exists():
        print(f"[X] {PAPERS} not found. Run schools.py first.", file=sys.stderr)
        sys.exit(1)
    papers = json.loads(PAPERS.read_text(encoding="utf-8"))
    PDFS_DIR.mkdir(parents=True, exist_ok=True)

    session = requests.Session()
    session.headers["User-Agent"] = UA

    saved = 0
    skipped = 0
    failed = 0
    excluded = 0

    for p in papers:
        text = p.get("link_text", "") or p.get("file_name", "")
        if SKIP_KEYWORDS.search(text):
            excluded += 1
            continue

        sid = p["school_id"]
        school_dir = PDFS_DIR / f"{sid:02d}_{re.sub(r'[^\\w]', '_', p['school_name'])[:30]}"
        school_dir.mkdir(parents=True, exist_ok=True)

        # 對動態 CMS 連結（index.php?cfsn=...）取真實檔名
        real_name, real_ext = resolve_filename_via_head(p, session)
        fname = clean_filename(real_name, real_ext)
        dest = school_dir / fname
        if dest.exists() and dest.stat().st_size > 0:
            skipped += 1
            continue

        try:
            r = session.get(p["url"], timeout=30, stream=True)
            if r.status_code != 200:
                print(f"  [WARN] HTTP {r.status_code}: {p['url'][:80]}", file=sys.stderr)
                failed += 1
                continue
            with dest.open("wb") as f:
                for chunk in r.iter_content(chunk_size=8192):
                    if chunk:
                        f.write(chunk)
            size = dest.stat().st_size
            if size < 1000:  # too small to be a real exam paper
                dest.unlink()
                failed += 1
                continue
            saved += 1
            print(f"  ✓ [{sid:2}] {fname[:50]:50} {size//1024:>4} KB")
        except requests.RequestException as e:
            print(f"  [WARN] download failed: {e}", file=sys.stderr)
            failed += 1
        time.sleep(0.3)

    print()
    print(f"[download] saved {saved}, skipped {skipped} (already exist), excluded {excluded} (行事曆/公告), failed {failed}")
    total_size = sum(f.stat().st_size for f in PDFS_DIR.rglob("*") if f.is_file())
    print(f"[download] total downloaded: {total_size / 1024 / 1024:.1f} MB across {len(list(PDFS_DIR.rglob('*.*')))} files")


if __name__ == "__main__":
    main()
