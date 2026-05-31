#!/usr/bin/env python3
"""
從 D:\\GameDevZ\\dyin\\8成語\\13116-成语答题 萃取成語填字題庫。

流程：
  1. 解析 wei_idiom v1+v2 PHP SQL → 4796 個簡體成語題
  2. 用 opencc s2twp 轉繁體
  3. 用教育部國語辭典 (backend/data/dictionary.json) 交集 → 留下 canonical 成語
  4. 用「最低字頻」過濾掉含冷僻字的成語（國小範圍）
  5. 從辭典抓注音附加到每題（成語本身 + 每個選項字）
  6. 寫 frontend/public/data/idioms.json

執行：
  cd scripts/scrape && .venv/bin/python3 ../extract-idioms.py
"""
import json
import re
import sys
from collections import Counter
from pathlib import Path

ROOT = Path(__file__).resolve().parent.parent
SRC_V1 = Path('/mnt/d/GameDevZ/dyin/8成語/13116-成语答题/wei_idiom/inc/web/data/topic_v1.php')
SRC_V2 = Path('/mnt/d/GameDevZ/dyin/8成語/13116-成语答题/wei_idiom/inc/web/data/topic_v2.php')
DICT_PATH = ROOT / 'backend' / 'data' / 'dictionary.json'
OUT = ROOT / 'frontend' / 'public' / 'data' / 'idioms.json'

PAT_V1 = re.compile(r"\(__uniacid,'([^']+)',(\d+),'([^']+)',(\d+),")
PAT_V2 = re.compile(r"\(__uniacid,\s*'([^']+)',\s*(\d+),\s*'([^']+)',\s*(\d+),")

# 字頻門檻：每字在辭典 keys 中至少出現 N 次（過濾冷僻字）
MIN_CHAR_FREQ = 30


def parse_entries(path: Path, pattern: re.Pattern) -> list[dict]:
    if not path.exists():
        print(f'[X] {path} not found', file=sys.stderr)
        return []
    content = path.read_text(encoding='utf-8')
    out = []
    for m in pattern.finditer(content):
        idiom, pos, opts, ridx = m.groups()
        pos_i = int(pos)
        ridx_i = int(ridx)
        opt_list = [o.strip() for o in opts.split(',') if o.strip()]
        if len(idiom) != 4 or len(opt_list) != 4:
            continue
        if not (0 <= pos_i < 4 and 0 <= ridx_i < 4):
            continue
        if idiom[pos_i] != opt_list[ridx_i]:
            continue
        out.append({
            'idiom_simp': idiom,
            'missing_pos': pos_i,
            'options_simp': opt_list,
            'correct_idx': ridx_i,
        })
    return out


SANDHI_RE = re.compile(r'[（(]變[）)]')


def zhuyin_of(word: str, dictionary: dict, prefer_sandhi: bool = True) -> str:
    """從字典取注音；多義字取第一個。
    若 zhuyin 含「（變）」標記（共 824 個 entries），預設取**變調後**的版本（實際發音），
    例如「懷才不遇」原寫 `ㄏㄨㄞˊ ㄘㄞˊ ㄅㄨˋ ㄩˋ （變）ㄏㄨㄞˊ ㄘㄞˊ ㄅㄨˊ ㄩˋ`，
    回傳 `ㄏㄨㄞˊ ㄘㄞˊ ㄅㄨˊ ㄩˋ`。
    這樣國小生看到的注音才會跟唸出來的一致。
    """
    entry = dictionary.get(word)
    if not entry or not isinstance(entry, list) or not entry:
        return ''
    raw = entry[0].get('zhuyin', '')
    if not raw:
        return ''
    if prefer_sandhi:
        m = SANDHI_RE.search(raw)
        if m:
            # 變調後的字串接在「（變）」之後
            return raw[m.end():].strip()
    # 沒有變調標記 → 直接回原文（去掉可能殘留的標記）
    return SANDHI_RE.split(raw)[0].strip()


def split_definition(idiom: str, definition: str) -> tuple[str, str]:
    """把字典的 definition 切成 (解釋, 例句)。
    啟發式：以 「。！？」 切句後，含 idiom 本身的句子 → 例句；其他 → 解釋。
    這樣才能在遊戲裡先顯示「題目」而不暴露答案（例句通常會含整個成語）。
    """
    if not definition:
        return '', ''
    sentences = re.split(r'(?<=[。！？])', definition)
    explanations, examples = [], []
    for s in sentences:
        s = s.strip()
        if not s:
            continue
        if idiom in s:
            examples.append(s)
        else:
            explanations.append(s)
    return ''.join(explanations), ''.join(examples)


def definition_of(word: str, dictionary: dict) -> str:
    entry = dictionary.get(word)
    if not entry or not isinstance(entry, list):
        return ''
    return entry[0].get('definition', '')


def main() -> None:
    try:
        from opencc import OpenCC
    except ImportError:
        print('[X] opencc not installed. Run:\n'
              '   cd scripts/scrape && .venv/bin/pip install opencc-python-reimplemented',
              file=sys.stderr)
        sys.exit(1)
    cc = OpenCC('s2twp')

    if not DICT_PATH.exists():
        print(f'[X] {DICT_PATH} not found', file=sys.stderr)
        sys.exit(1)

    print(f'[load] dictionary.json ...', flush=True)
    dictionary = json.loads(DICT_PATH.read_text(encoding='utf-8'))
    dict_keys = set(dictionary.keys())
    print(f'[load] dictionary entries: {len(dict_keys):,}')

    # 字頻：每個字在辭典 keys 裡出現過幾次
    char_freq = Counter()
    for w in dict_keys:
        for ch in w:
            char_freq[ch] += 1

    v1 = parse_entries(SRC_V1, PAT_V1)
    v2 = parse_entries(SRC_V2, PAT_V2)
    print(f'[parse] v1: {len(v1)}, v2: {len(v2)}')

    # dedupe by simplified
    seen = set()
    merged = []
    for e in v1 + v2:
        key = e['idiom_simp']
        if key in seen:
            continue
        seen.add(key)
        merged.append(e)
    print(f'[dedupe] unique simp idioms: {len(merged)}')

    # convert + filter
    in_dict = 0
    rare_filtered = 0
    final = []
    for e in merged:
        idiom_trad = cc.convert(e['idiom_simp'])
        if len(idiom_trad) != 4:
            continue
        # Must be in 教育部辭典
        if idiom_trad not in dict_keys:
            continue
        in_dict += 1
        # Char-frequency filter: 國小範圍
        min_f = min(char_freq.get(ch, 0) for ch in idiom_trad)
        if min_f < MIN_CHAR_FREQ:
            rare_filtered += 1
            continue
        opts_trad = [cc.convert(o) for o in e['options_simp']]
        if len(opts_trad) != 4 or any(len(o) != 1 for o in opts_trad):
            continue
        # 確認正解仍對得起來
        if idiom_trad[e['missing_pos']] != opts_trad[e['correct_idx']]:
            opts_trad[e['correct_idx']] = idiom_trad[e['missing_pos']]
        # 加注音 — 整句注音優先（context-aware，破音字會給對的讀音）
        idiom_zhuyin = zhuyin_of(idiom_trad, dictionary)
        per_char_zhuyin = idiom_zhuyin.split() if idiom_zhuyin else ['', '', '', '']
        if len(per_char_zhuyin) != 4:
            # 退而求其次：個別查單字
            per_char_zhuyin = [zhuyin_of(ch, dictionary) for ch in idiom_trad]
        # 選項字的注音：
        #   - 正解選項直接用成語對應位置的注音（保證 context-correct）
        #   - 其他選項仍個別查字典（可能是該字最常用讀音，破音字可能不準，但只是干擾選項）
        opt_zhuyin = []
        for j, o in enumerate(opts_trad):
            if j == e['correct_idx']:
                opt_zhuyin.append(per_char_zhuyin[e['missing_pos']])
            else:
                opt_zhuyin.append(zhuyin_of(o, dictionary))
        # 釋義 + 例句（從整句字典 entry 抓 definition 切分）
        full_def = definition_of(idiom_trad, dictionary)
        explanation, example = split_definition(idiom_trad, full_def)

        final.append({
            'idiom': idiom_trad,
            'idiomZhuyin': per_char_zhuyin,   # ["ㄅㄛ", "ㄩㄣˊ", "ㄐㄧㄢˋ", "ㄖˋ"]
            'missingPos': e['missing_pos'],
            'options': opts_trad,
            'optionsZhuyin': opt_zhuyin,
            'correctIdx': e['correct_idx'],
            'explanation': explanation,       # 解釋（不含成語本身，可在答前顯示也不會破題）
            'example': example,               # 例句（含成語，只能答後顯示）
        })

    OUT.parent.mkdir(parents=True, exist_ok=True)
    OUT.write_text(json.dumps(final, ensure_ascii=False, separators=(',', ':')), encoding='utf-8')
    print(f'[filter] 在教育部辭典: {in_dict} (從 {len(merged)})')
    print(f'[filter] 過濾冷僻字 (min freq < {MIN_CHAR_FREQ}): 移除 {rare_filtered}')
    print(f'[output] {len(final)} 道 → {OUT} ({OUT.stat().st_size/1024:.0f} KB)')
    print()
    print('sample 5:')
    for e in final[:5]:
        masked = list(e['idiom'])
        masked[e['missingPos']] = '◯'
        bopo = ' '.join(e['idiomZhuyin'])
        print(f"  {''.join(masked)} [{bopo}]  options={list(zip(e['options'], e['optionsZhuyin']))}")


if __name__ == '__main__':
    main()
