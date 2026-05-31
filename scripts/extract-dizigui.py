#!/usr/bin/env python3
"""
從 chinese-poetry 萃取「弟子規」→ 切成 3 字片段 + 加注音。

來源：https://github.com/chinese-poetry/chinese-poetry
      蒙學/dizigui.json  (公共領域；作者李毓秀清初)

輸出：frontend/public/data/dizigui.json
[
  {
    "phrase": "弟子規",
    "zhuyin": ["ㄉㄧˋ", "ㄗˇ", "ㄍㄨㄟ"],
    "next": "聖人訓",
    "nextZhuyin": ["ㄕㄥˋ", "ㄖㄣˊ", "ㄒㄩㄣˋ"],
    "chapter": "總敘",                   # 所屬章節（總敘/入則孝/出則弟/...）
    "pairContext": "弟子規，聖人訓"
  }, ...
]

執行：
  cd scripts/scrape && .venv/bin/python3 ../extract-dizigui.py
"""
import json
import re
import sys
import urllib.request
from pathlib import Path

ROOT = Path(__file__).resolve().parent.parent
TMP = Path('/tmp/dzg.json')
DICT_PATH = ROOT / 'backend' / 'data' / 'dictionary.json'
OUT = ROOT / 'frontend' / 'public' / 'data' / 'dizigui.json'

SOURCE_URL = ('https://raw.githubusercontent.com/chinese-poetry/chinese-poetry/master/'
              '%E8%92%99%E5%AD%A6/dizigui.json')

SANDHI_RE = re.compile(r'[（(]變[）)]')


def first_zhuyin(z: str) -> str:
    return SANDHI_RE.split(z or '')[0].strip()


def char_zhuyin(ch: str, dictionary: dict) -> str:
    entry = dictionary.get(ch)
    if not entry or not isinstance(entry, list):
        return ''
    return first_zhuyin(entry[0].get('zhuyin', ''))


def download_if_missing() -> None:
    if TMP.exists() and TMP.stat().st_size > 1000:
        return
    req = urllib.request.Request(SOURCE_URL, headers={'User-Agent': 'Mozilla/5.0'})
    with urllib.request.urlopen(req, timeout=30) as resp:
        TMP.write_bytes(resp.read())


def main() -> None:
    download_if_missing()
    if not DICT_PATH.exists():
        print(f'[X] {DICT_PATH} not found', file=sys.stderr)
        sys.exit(1)
    print(f'[load] dictionary.json ...', flush=True)
    dictionary = json.loads(DICT_PATH.read_text(encoding='utf-8'))
    print(f'[load] {len(dictionary):,} entries')

    raw = json.loads(TMP.read_text(encoding='utf-8'))

    # 解析：每個 chapter 的 paragraphs 用「空格」切 3 字片段
    pairs: list[tuple[str, str]] = []  # (chapter, phrase) — 保留次序
    for ch in raw['content']:
        chap = ch['chapter']
        for line in ch['paragraphs']:
            for s in line.split():
                s = s.strip()
                if len(s) == 3:
                    pairs.append((chap, s))
    print(f'[parse] 共 {len(pairs)} 個三字片段')

    # 每個片段 → 下一個片段（最後一個略過）
    out: list[dict] = []
    for i in range(len(pairs) - 1):
        chap, cur = pairs[i]
        _, nxt = pairs[i + 1]
        out.append({
            'phrase': cur,
            'zhuyin': [char_zhuyin(c, dictionary) for c in cur],
            'next': nxt,
            'nextZhuyin': [char_zhuyin(c, dictionary) for c in nxt],
            'chapter': chap,
            'pairContext': cur + '，' + nxt,
        })

    OUT.parent.mkdir(parents=True, exist_ok=True)
    OUT.write_text(json.dumps(out, ensure_ascii=False, separators=(',', ':')), encoding='utf-8')
    print(f'[output] {len(out)} 題 → {OUT} ({OUT.stat().st_size/1024:.0f} KB)')

    print()
    print('sample 5:')
    for e in out[:5]:
        print(f'  [{e["chapter"]}] {e["phrase"]} [{" ".join(e["zhuyin"])}]  →  {e["next"]} [{" ".join(e["nextZhuyin"])}]')


if __name__ == '__main__':
    main()
