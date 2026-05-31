#!/usr/bin/env python3
"""
從 chinese-poetry/chinese-poetry repo 萃取唐詩三百首 → 過濾常見作者 →
加注音 → 輸出 frontend/public/data/poems.json 供「是誰寫的詩」遊戲使用。

來源：https://github.com/chinese-poetry/chinese-poetry
      蒙學/tangshisanbaishou.json  (公共領域：唐詩本身、整理者 MIT 授權)

執行：
  cd scripts/scrape && .venv/bin/python3 ../extract-poems.py
"""
import json
import re
import sys
import urllib.request
from collections import Counter
from pathlib import Path

ROOT = Path(__file__).resolve().parent.parent
TMP_TANG = Path('/tmp/tang300.json')
DICT_PATH = ROOT / 'backend' / 'data' / 'dictionary.json'
OUT = ROOT / 'frontend' / 'public' / 'data' / 'poems.json'

SOURCE_URL = ('https://raw.githubusercontent.com/chinese-poetry/chinese-poetry/master/'
              '%E8%92%99%E5%AD%A6/tangshisanbaishou.json')

# 國小常見唐詩作者（19 位） — 教材與課堂上最常出現
FAMOUS_AUTHORS = {
    '李白', '杜甫', '王維', '白居易', '孟浩然',
    '王之渙', '王昌齡', '柳宗元', '韓愈', '杜牧',
    '李商隱', '賀知章', '駱賓王', '張繼', '元稹',
    '劉禹錫', '岑參', '高適', '王勃',
}

# 作者簡介（提示用，國小生看得懂）
AUTHOR_BIO = {
    '李白': '盛唐詩仙，浪漫豪放，作品多寫山水與想像。',
    '杜甫': '盛唐詩聖，作品反映社會、憂國憂民。',
    '王維': '盛唐詩佛，山水田園詩高手，亦工書畫。',
    '白居易': '中唐大詩人，主張詩文應通俗易懂。',
    '孟浩然': '盛唐山水田園詩人，與王維齊名。',
    '王之渙': '盛唐邊塞詩人，作品流傳少但首首經典。',
    '王昌齡': '盛唐七絕聖手，邊塞詩著名。',
    '柳宗元': '中唐古文運動代表，散文與詩皆精。',
    '韓愈': '中唐古文運動領袖，散文大家。',
    '杜牧': '晚唐詩人，七絕風格清新感慨。',
    '李商隱': '晚唐詩人，作品含蓄朦朧、辭藻華美。',
    '賀知章': '盛唐長壽詩人，作品平實自然。',
    '駱賓王': '初唐四傑之一，幼年詠鵝廣為流傳。',
    '張繼': '盛唐詩人，以〈楓橋夜泊〉名世。',
    '元稹': '中唐詩人，與白居易並稱「元白」。',
    '劉禹錫': '中唐詩人，作品豪邁有見識。',
    '岑參': '盛唐邊塞詩派代表，描寫塞外風光。',
    '高適': '盛唐邊塞詩派，風格沈雄悲壯。',
    '王勃': '初唐四傑之首，〈滕王閣序〉名傳千古。',
}

SANDHI_RE = re.compile(r'[（(]變[）)]')


def download_if_missing() -> None:
    if TMP_TANG.exists() and TMP_TANG.stat().st_size > 1000:
        return
    print(f'[download] {SOURCE_URL}', flush=True)
    req = urllib.request.Request(SOURCE_URL, headers={'User-Agent': 'Mozilla/5.0'})
    with urllib.request.urlopen(req, timeout=30) as resp:
        TMP_TANG.write_bytes(resp.read())


def first_zhuyin(zhuyin_field: str) -> str:
    """字典 zhuyin field — 取本調（過濾 (變) 後綴）。"""
    if not zhuyin_field:
        return ''
    return SANDHI_RE.split(zhuyin_field)[0].strip()


def char_zhuyin(ch: str, dictionary: dict) -> str:
    """單字注音；找不到回空字串（非中文字、罕用字會如此）。"""
    entry = dictionary.get(ch)
    if not entry or not isinstance(entry, list):
        return ''
    return first_zhuyin(entry[0].get('zhuyin', ''))


def zhuyinize_line(line: str, dictionary: dict) -> list[dict]:
    """把詩行轉成 [{char, pinyin}, ...]；非漢字 (標點) pinyin 留空。"""
    out = []
    for ch in line:
        if '一' <= ch <= '鿿':
            out.append({'char': ch, 'pinyin': char_zhuyin(ch, dictionary)})
        else:
            out.append({'char': ch, 'pinyin': ''})
    return out


def main() -> None:
    download_if_missing()
    if not DICT_PATH.exists():
        print(f'[X] {DICT_PATH} not found', file=sys.stderr)
        sys.exit(1)
    print(f'[load] dictionary.json ...', flush=True)
    dictionary = json.loads(DICT_PATH.read_text(encoding='utf-8'))
    print(f'[load] dictionary entries: {len(dictionary):,}')

    raw = json.loads(TMP_TANG.read_text(encoding='utf-8'))
    poems_raw: list[dict] = []
    for cat in raw['content']:
        for p in cat['content']:
            poems_raw.append({
                'type': cat['type'],
                'title': p['chapter'],
                'author': p['author'],
                'paragraphs': p['paragraphs'],
            })
    print(f'[parse] total poems: {len(poems_raw)}')

    famous = [p for p in poems_raw if p['author'] in FAMOUS_AUTHORS]
    print(f'[filter] 過濾常見作者 ({len(FAMOUS_AUTHORS)} 位): {len(famous)}/{len(poems_raw)}')

    out: list[dict] = []
    for p in famous:
        # 注音化每一句
        lines = [zhuyinize_line(line, dictionary) for line in p['paragraphs']]
        out.append({
            'title': p['title'],
            'author': p['author'],
            'authorBio': AUTHOR_BIO.get(p['author'], ''),
            'type': p['type'],
            'lines': lines,  # [[{char,pinyin}, ...], ...]
        })

    # 列出每個作者的詩數，方便後續調整
    author_count = Counter(p['author'] for p in out)
    print()
    print('author distribution:')
    for a, n in author_count.most_common():
        print(f'  {n:>3} × {a}')

    OUT.parent.mkdir(parents=True, exist_ok=True)
    OUT.write_text(json.dumps(out, ensure_ascii=False, separators=(',', ':')), encoding='utf-8')
    print()
    print(f'[output] {len(out)} 首 → {OUT} ({OUT.stat().st_size/1024:.0f} KB)')

    # 連同作者清單一起匯出供 game 用
    AUTHORS_OUT = ROOT / 'frontend' / 'public' / 'data' / 'poem-authors.json'
    AUTHORS_OUT.write_text(
        json.dumps(
            [{'name': a, 'bio': AUTHOR_BIO.get(a, '')} for a in sorted(FAMOUS_AUTHORS)],
            ensure_ascii=False, indent=2,
        ),
        encoding='utf-8',
    )
    print(f'[output] {len(FAMOUS_AUTHORS)} 作者 → {AUTHORS_OUT}')


if __name__ == '__main__':
    main()
