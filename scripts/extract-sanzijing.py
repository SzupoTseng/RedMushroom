#!/usr/bin/env python3
"""
從 chinese-poetry 萃取「三字經」傳統版 → 切成 3 字片段 + 加注音。

來源：https://github.com/chinese-poetry/chinese-poetry
      蒙學/sanzijing-traditional.json  (公共領域)

輸出：frontend/public/data/sanzijing.json
[
  {
    "phrase": "人之初",
    "zhuyin": ["ㄖㄣˊ", "ㄓ", "ㄔㄨ"],
    "next": "性本善",
    "nextZhuyin": ["ㄒㄧㄥˋ", "ㄅㄣˇ", "ㄕㄢˋ"],
    "pairContext": "人之初，性本善"   # 答對後顯示完整對句
  },
  ...
]

執行：
  cd scripts/scrape && .venv/bin/python3 ../extract-sanzijing.py
"""
import json
import re
import sys
import urllib.request
from pathlib import Path

ROOT = Path(__file__).resolve().parent.parent
TMP = Path('/tmp/szj.json')
DICT_PATH = ROOT / 'backend' / 'data' / 'dictionary.json'
OUT = ROOT / 'frontend' / 'public' / 'data' / 'sanzijing.json'

SOURCE_URL = ('https://raw.githubusercontent.com/chinese-poetry/chinese-poetry/master/'
              '%E8%92%99%E5%AD%A6/sanzijing-traditional.json')

SANDHI_RE = re.compile(r'[（(]變[）)]')


def first_zhuyin(z: str) -> str:
    if not z:
        return ''
    return SANDHI_RE.split(z)[0].strip()


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
    paragraphs = raw['paragraphs']

    # 解析所有 3 字片段
    phrases: list[str] = []
    for p in paragraphs:
        for s in re.split(r'[，。？]', p):
            s = s.strip()
            if len(s) == 3:
                phrases.append(s)
    print(f'[parse] {len(phrases)} 個三字片段')

    # 每個片段配上下一句 + 注音；最後一句沒有「下一句」故略過
    out: list[dict] = []
    for i in range(len(phrases) - 1):
        cur = phrases[i]
        nxt = phrases[i + 1]
        out.append({
            'phrase': cur,
            'zhuyin': [char_zhuyin(c, dictionary) for c in cur],
            'next': nxt,
            'nextZhuyin': [char_zhuyin(c, dictionary) for c in nxt],
            # 邏輯對句 = 偶數位置(0,2,4...) 與其後一句相連；
            # 為避免推測太複雜，這裡只把 phrase + next 拼起來給答後顯示用
            'pairContext': cur + '，' + nxt,
        })

    OUT.parent.mkdir(parents=True, exist_ok=True)
    OUT.write_text(json.dumps(out, ensure_ascii=False, separators=(',', ':')), encoding='utf-8')
    print(f'[output] {len(out)} 題 → {OUT} ({OUT.stat().st_size/1024:.0f} KB)')

    print()
    print('sample 5:')
    for e in out[:5]:
        z_cur = ' '.join(e['zhuyin'])
        z_nxt = ' '.join(e['nextZhuyin'])
        print(f'  {e["phrase"]} [{z_cur}]  →  {e["next"]} [{z_nxt}]')


if __name__ == '__main__':
    main()
