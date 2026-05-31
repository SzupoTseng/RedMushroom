#!/usr/bin/env python3
"""
產生「一起找錯字」題庫：把成語其中一個字換成「同音字」(homophone) 當錯字。

來源：
  - frontend/public/data/idioms.json   (580 道過濾後成語)
  - backend/data/dictionary.json       (43,986 字典 entry)
  - 翰林「形音義」常見錯字 (人工 curate 列表)

輸出：
  frontend/public/data/misuse.json
  [{
    "idiom": "走投無路",        # 正解
    "idiomZhuyin": ["ㄗㄡˇ", "ㄊㄡˊ", "ㄨˊ", "ㄌㄨˋ"],
    "wrongPos": 1,             # 錯字位置
    "wrongChar": "頭",          # 顯示的錯字
    "correctChar": "投",        # 正確字
    "displayed": "走頭無路",    # 玩家看到的（有錯字版）
    "explanation": "...",
    "example": "..."
  }]
"""
import json
import random
import re
import sys
from collections import defaultdict
from pathlib import Path

ROOT = Path(__file__).resolve().parent.parent
IDIOMS = ROOT / 'frontend' / 'public' / 'data' / 'idioms.json'
DICT = ROOT / 'backend' / 'data' / 'dictionary.json'
OUT = ROOT / 'frontend' / 'public' / 'data' / 'misuse.json'

# 翰林等教學資源常見的「成語錯字」對照（人工 curated）
# 來源：教育部國語辭典 / 公開常用錯別字表（可自由補充）
KNOWN_WRONG = {
    # idiom: (position, wrong char) — position 0..3
    '走投無路': (1, '頭'),
    '中流砥柱': (2, '柢'),
    '一鳴驚人': (1, '名'),
    '黔驢技窮': (2, '計'),
    '老馬識途': (3, '塗'),
    '對牛彈琴': (1, '生'),
    '畫蛇添足': (2, '天'),
    '亡羊補牢': (3, '撈'),
    '愛屋及烏': (3, '鳥'),
    '一視同仁': (3, '人'),
    '化險為夷': (3, '宜'),
    '名副其實': (1, '符'),
}

SANDHI_RE = re.compile(r'[（(]變[）)]')


def first_zhuyin_clean(zhuyin_field: str) -> str:
    """從字典 zhuyin field 取乾淨的本調讀音（過濾掉 (變) ...)。"""
    if not zhuyin_field:
        return ''
    # 取（變）之前
    return SANDHI_RE.split(zhuyin_field)[0].strip()


def char_pinyin(ch: str, dictionary: dict) -> str:
    """單字的注音 (本調，多義字取第一個)。"""
    entry = dictionary.get(ch)
    if not entry or not isinstance(entry, list):
        return ''
    return first_zhuyin_clean(entry[0].get('zhuyin', ''))


def build_homophone_index(dictionary: dict) -> dict:
    """建立 注音→[字...] 索引（只收單字、字頻 >= 50）。"""
    # 字頻：每個字在辭典 keys 中出現幾次
    char_freq = defaultdict(int)
    for w in dictionary.keys():
        for ch in w:
            char_freq[ch] += 1

    idx: dict[str, list[str]] = defaultdict(list)
    for k, v in dictionary.items():
        if len(k) != 1:
            continue
        if char_freq[k] < 50:  # 冷僻字不當干擾選項
            continue
        if not isinstance(v, list) or not v:
            continue
        z = first_zhuyin_clean(v[0].get('zhuyin', ''))
        if z:
            idx[z].append(k)
    return idx


def main() -> None:
    if not IDIOMS.exists() or not DICT.exists():
        print('[X] need idioms.json + dictionary.json', file=sys.stderr)
        sys.exit(1)

    idioms = json.loads(IDIOMS.read_text(encoding='utf-8'))
    print(f'[load] idioms: {len(idioms)}')

    dictionary = json.loads(DICT.read_text(encoding='utf-8'))
    print(f'[load] dictionary: {len(dictionary):,}')

    hp_idx = build_homophone_index(dictionary)
    print(f'[index] homophone pinyin groups: {len(hp_idx)}')

    rng = random.Random(42)
    out: list[dict] = []

    for e in idioms:
        idiom = e['idiom']
        if len(idiom) != 4:
            continue

        # 1. 如果是人工 curated 已知錯字 → 直接用
        if idiom in KNOWN_WRONG:
            pos, wrong = KNOWN_WRONG[idiom]
            correct = idiom[pos]
            if wrong == correct:
                continue
        else:
            # 2. 嘗試找一個位置，其字有 ≥1 個同音不同字可當錯字
            #    優先選不在「易混淆字典」內的位置
            candidates = []
            for i, ch in enumerate(idiom):
                z = char_pinyin(ch, dictionary)
                if not z:
                    continue
                same_z = [x for x in hp_idx.get(z, []) if x != ch]
                if same_z:
                    candidates.append((i, ch, same_z))
            if not candidates:
                continue
            pos, correct, choices = rng.choice(candidates)
            wrong = rng.choice(choices)

        # 確認 wrong 是常見字
        if wrong not in dictionary:
            continue
        wrong_z = char_pinyin(wrong, dictionary)
        correct_z = char_pinyin(correct, dictionary)
        # 構造顯示成語（替換掉錯字）
        displayed = idiom[:pos] + wrong + idiom[pos+1:]

        out.append({
            'idiom': idiom,
            'idiomZhuyin': e.get('idiomZhuyin', []),
            'wrongPos': pos,
            'wrongChar': wrong,
            'wrongCharZhuyin': wrong_z,
            'correctChar': correct,
            'correctCharZhuyin': correct_z,
            'displayed': displayed,
            'explanation': e.get('explanation', ''),
            'example': e.get('example', ''),
        })

    OUT.parent.mkdir(parents=True, exist_ok=True)
    OUT.write_text(json.dumps(out, ensure_ascii=False, separators=(',', ':')), encoding='utf-8')
    print(f'[output] {len(out)} 道找錯字題 → {OUT} ({OUT.stat().st_size/1024:.0f} KB)')

    # 樣本
    print()
    print('sample 8:')
    for e in out[:8]:
        print(f'  {e["displayed"]} (錯字: 第 {e["wrongPos"]+1} 字「{e["wrongChar"]}」，應為「{e["correctChar"]}」)')


if __name__ == '__main__':
    main()
