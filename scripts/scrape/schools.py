#!/usr/bin/env python3
"""
Stage 2: 對 host_type=school_html 的學校網頁，列出可抓的 PDF/doc 檔。

策略：
1. 讀 data/schools.json
2. 對 host_type=school_html 的學校，GET 它的 final_url
3. 從頁面抓 <a href="*.pdf">、<a href="*.doc[x]">
4. 對某些已知 CMS（XOOPS tad_uploader、ischool）特別處理：可能要分頁/解析下載連結
5. 輸出 data/papers.json：{school_id, paper_url, file_name, ext, source_page}

google_sites / google_drive / blog / facebook 標記 skipped 並原因 — 留給後續手動處理或 playwright 版。
"""
import json
import re
import sys
import time
from pathlib import Path
from urllib.parse import urljoin, urlparse, parse_qs

import requests
from bs4 import BeautifulSoup

DATA_DIR = Path(__file__).parent / "data"
SCHOOLS = DATA_DIR / "schools.json"
OUT = DATA_DIR / "papers.json"
UA = "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36"

DOC_EXT_RE = re.compile(r"\.(pdf|docx?|odt)(\?.*)?$", re.IGNORECASE)


def fetch(url: str, session: requests.Session, timeout: int = 20) -> str | None:
    try:
        r = session.get(url, timeout=timeout, allow_redirects=True)
        if r.status_code == 200 and r.text:
            return r.text
    except requests.RequestException as e:
        print(f"  [WARN] fetch failed: {url}: {e}", file=sys.stderr)
    return None


def find_doc_links(html: str, base_url: str) -> list[dict]:
    """從一個頁面找出所有指向 PDF/DOC 的連結。"""
    soup = BeautifulSoup(html, "lxml")
    out: list[dict] = []
    seen: set[str] = set()
    for a in soup.find_all("a", href=True):
        href = a["href"]
        # 處理 tad_uploader 的下載連結（XOOPS）：往往是 d=ID 或 dl_id=ID
        is_tad = "tad_uploader" in href and ("d=" in href or "/download/" in href)
        is_doc = bool(DOC_EXT_RE.search(href))
        is_ischool_download = "ischool" in base_url and "download" in href
        if not (is_doc or is_tad or is_ischool_download):
            continue
        full = urljoin(base_url, href)
        if full in seen:
            continue
        seen.add(full)
        text = a.get_text(strip=True)[:60]
        m = DOC_EXT_RE.search(href)
        ext = (m.group(1) if m else "html").lower()
        # 從 URL path 或 link text 取一個 file_name
        path = urlparse(full).path
        file_name = path.rsplit("/", 1)[-1] if "/" in path else path
        if not DOC_EXT_RE.search(file_name) and text:
            file_name = text[:50]
        out.append({
            "url": full,
            "file_name": file_name,
            "link_text": text,
            "ext": ext,
        })
    return out


def find_subpages(html: str, base_url: str, limit: int = 30) -> list[str]:
    """在學校網站中找看起來像「考卷列表」的子頁面。
    保守策略：只走同 host、URL 含 keyword 的內部連結，最多 limit 個。"""
    soup = BeautifulSoup(html, "lxml")
    host = urlparse(base_url).netloc
    keywords = re.compile(r"(段考|月考|試卷|考卷|題庫|考古題|試題|exam|test|paper|quiz|midterm)", re.IGNORECASE)
    subs: list[str] = []
    seen: set[str] = set()
    for a in soup.find_all("a", href=True):
        href = a["href"]
        text = a.get_text(strip=True)
        full = urljoin(base_url, href)
        if urlparse(full).netloc != host:
            continue
        if full == base_url:
            continue
        if keywords.search(href) or keywords.search(text):
            if full in seen:
                continue
            seen.add(full)
            subs.append(full)
            if len(subs) >= limit:
                break
    return subs


def crawl_school(school: dict, session: requests.Session) -> list[dict]:
    """抓單一學校的 PDF 清單。"""
    final = school["final_url"]
    if not final:
        return []
    print(f"  ↓ [{school['id']:2}] {school['name']}")
    print(f"     {final[:80]}")

    papers: list[dict] = []
    seen_urls: set[str] = set()

    html = fetch(final, session)
    if not html:
        print("     (fetch failed)")
        return []

    # main page docs
    for doc in find_doc_links(html, final):
        if doc["url"] not in seen_urls:
            seen_urls.add(doc["url"])
            doc["source_page"] = final
            papers.append(doc)

    # one level of subpages
    subs = find_subpages(html, final, limit=20)
    print(f"     main: {len(papers)} docs; following {len(subs)} subpages")
    for sub in subs:
        sub_html = fetch(sub, session)
        if not sub_html:
            continue
        for doc in find_doc_links(sub_html, sub):
            if doc["url"] not in seen_urls:
                seen_urls.add(doc["url"])
                doc["source_page"] = sub
                papers.append(doc)
        time.sleep(0.5)

    print(f"     total: {len(papers)} unique docs")
    return papers


def main() -> None:
    if not SCHOOLS.exists():
        print(f"[X] {SCHOOLS} not found. Run hub.py first.", file=sys.stderr)
        sys.exit(1)
    schools = json.loads(SCHOOLS.read_text(encoding="utf-8"))
    elem = [s for s in schools if s.get("section") == "國小"]
    print(f"[schools] total 國小: {len(elem)}")

    session = requests.Session()
    session.headers["User-Agent"] = UA

    all_papers: list[dict] = []
    summary: dict[str, int] = {"school_html": 0, "skipped": 0}

    for s in elem:
        if s.get("excluded"):
            continue
        if s["host_type"] != "school_html":
            print(f"  ⊘ [{s['id']:2}] {s['name']:25} skipped (host={s['host_type']})")
            summary["skipped"] += 1
            continue
        summary["school_html"] += 1
        papers = crawl_school(s, session)
        for p in papers:
            p["school_id"] = s["id"]
            p["school_name"] = s["name"]
            all_papers.append(p)
        time.sleep(0.5)

    OUT.write_text(json.dumps(all_papers, ensure_ascii=False, indent=2), encoding="utf-8")
    print()
    print(f"[schools] crawled {summary['school_html']} schools, skipped {summary['skipped']}")
    print(f"[schools] total papers: {len(all_papers)}")
    print(f"[schools] wrote {OUT}")


if __name__ == "__main__":
    main()
