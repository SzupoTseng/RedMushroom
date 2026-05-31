#!/usr/bin/env python3
"""
Stage 1: 從 studyark.org 首頁抓取所有國小段考來源網站清單。

輸出：data/schools.json
[
  {
    "id": 1,
    "name": "臺中市大墩國小",
    "note": "歷年段考題庫",
    "studyark_redirect": "https://www.studyark.org/e/extend/go/index.php?class=38&id=1",
    "final_url": "https://sites.google.com/ddes.tc.edu.tw/testpaper",
    "host_type": "google_sites" | "html" | "unknown",
    "excluded": false
  },
  ...
]
"""
import json
import re
import sys
import time
from pathlib import Path
from urllib.parse import urljoin

import requests
from bs4 import BeautifulSoup

HUB_URL = "https://www.studyark.org/"
DATA_DIR = Path(__file__).parent / "data"
OUT = DATA_DIR / "schools.json"
UA = "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36"


def classify(url: str) -> str:
    """分類來源網站。Google* 系列需 headless browser。"""
    if url is None:
        return "unknown"
    if "sites.google.com" in url:
        return "google_sites"
    if "drive.google.com" in url:
        return "google_drive"
    if "facebook.com" in url or "fb.com" in url:
        return "facebook"
    if "melances.com" in url or "meow" in url:
        return "blog"
    if url.endswith(".pdf"):
        return "pdf_direct"
    return "school_html"


def follow_redirect(redirect_url: str, session: requests.Session) -> str | None:
    """studyark 的跳轉頁是 JS 重定向，要解析 window.location。"""
    try:
        r = session.get(redirect_url, timeout=15)
        if r.status_code != 200:
            return None
        m = re.search(r'window\.location\.href\s*=\s*["\']([^"\']+)["\']', r.text)
        if m:
            return m.group(1)
        # fallback: meta refresh
        m = re.search(r'<meta[^>]+url=([^"\'>\s]+)', r.text, re.IGNORECASE)
        if m:
            return m.group(1)
    except requests.RequestException as e:
        print(f"  [WARN] redirect failed: {e}", file=sys.stderr)
    return None


def main() -> None:
    DATA_DIR.mkdir(parents=True, exist_ok=True)
    session = requests.Session()
    session.headers["User-Agent"] = UA

    print(f"[hub] fetching {HUB_URL} ...")
    r = session.get(HUB_URL, timeout=20)
    r.raise_for_status()
    soup = BeautifulSoup(r.text, "lxml")

    schools: list[dict] = []
    # 結構：每個區段 <h3> 下面有許多卡片，每張卡片有自己的 h4 + p + a。
    # 用線性掃描：iterate 所有 h4，配對下一個 /e/extend/go/ 連結。
    h4_list = soup.find_all("h4")
    for h4 in h4_list:
        # 在此 h4 之後找最近的 class=38 連結
        next_a = h4.find_next("a", href=re.compile(r"/e/extend/go/index\.php\?class=38"))
        if not next_a:
            continue
        href = next_a.get("href", "")
        m = re.search(r"class=(\d+)&(?:amp;)?id=(\d+)", href)
        if not m:
            continue
        sid = int(m.group(2))
        # 確認此連結確實屬於此 h4 的卡片 — 找它們的最近共同 div/li
        # 用簡單的方法：next_a 的前一個 h4 必須是這個 h4
        prev_h4 = next_a.find_previous("h4")
        if prev_h4 is not h4:
            continue
        full = urljoin(HUB_URL, href.replace("&amp;", "&"))
        name = h4.get_text(strip=True)
        p_after = h4.find_next("p")
        note = ""
        if p_after and p_after.find_previous("h4") is h4:
            note = p_after.get_text(strip=True)
        # 區段
        section_title = ""
        prev_h3 = h4.find_previous("h3")
        if prev_h3:
            section_title = prev_h3.get_text(strip=True)

        schools.append({
            "id": sid,
            "name": name,
            "section": section_title,
            "note": note,
            "studyark_redirect": full,
            "final_url": None,
            "host_type": "unknown",
            "excluded": False,
        })

    # dedupe by id
    by_id: dict[int, dict] = {}
    for s in schools:
        by_id.setdefault(s["id"], s)
    schools = sorted(by_id.values(), key=lambda x: x["id"])
    print(f"[hub] {len(schools)} schools listed on studyark")

    # follow redirects
    for s in schools:
        print(f"  → [{s['id']:2}] {s['name']}", end="")
        final = follow_redirect(s["studyark_redirect"], session)
        if final:
            s["final_url"] = final
            s["host_type"] = classify(final)
            print(f"  …  {s['host_type']}  {final[:80]}")
        else:
            print("  …  (redirect fail)")
        time.sleep(0.3)

    OUT.write_text(json.dumps(schools, ensure_ascii=False, indent=2), encoding="utf-8")
    print(f"[hub] wrote {OUT} ({len(schools)} schools)")
    # summary
    from collections import Counter
    types = Counter(s["host_type"] for s in schools)
    print(f"[hub] host_type distribution: {dict(types)}")


if __name__ == "__main__":
    main()
