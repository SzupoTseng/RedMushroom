#!/usr/bin/env python3
"""
為「首尾主詞 + 中段可逆動詞」的排句子題填入替代正解 (correct_answer_alt)。

範例：
  options  = {"1":"同學","2":"小心地","3":"陪","4":"我"}
  correct_answer     = "1,2,3,4"  → 同學 小心地 陪 我
  填入 correct_answer_alt = "4,2,3,1"  → 我 小心地 陪 同學

idempotent — 已填過的不會重複寫入（INSERT-style 比較）。

執行：
  python3 scripts/fix-sorting-alt.py
"""
import sqlite3
import json
import sys
from pathlib import Path

DB = Path(__file__).parent.parent / 'database' / 'redmushroom.db'

# 主詞候選：人稱代名詞 + 親屬稱謂 + 常見人物名詞
SUBJECT_WORDS = {
    '我', '你', '他', '她', '它', '我們', '你們', '他們', '大家',
    '同學', '老師', '朋友', '家人',
    '爸爸', '媽媽', '哥哥', '姐姐', '弟弟', '妹妹',
    '叔叔', '阿姨', '爺爺', '奶奶',
    '小明', '小華', '小美', '小英', '小強', '小弟', '小妹',
    '小狗', '小貓', '小鳥',
    '客人', '學生', '警察', '醫生', '農夫', '老闆', '店員',
}

# 「可逆動詞」：A V B 與 B V A 在語意上皆通順的關係動詞
REVERSIBLE_VERBS = {
    '陪', '跟', '和', '與', '找', '幫', '教', '看', '對', '抱',
    '喜歡', '討厭', '問', '叫', '請', '遇到', '認識', '打電話', '感謝',
    '送', '介紹', '打招呼',
}


def is_reversible(tokens: list[str]) -> bool:
    if len(tokens) < 3:
        return False
    first, last = tokens[0], tokens[-1]
    if first == last:
        return False  # 完全相同，逆序沒意義
    if first not in SUBJECT_WORDS or last not in SUBJECT_WORDS:
        return False
    middle = tokens[1:-1]
    return any(any(rv in m for rv in REVERSIBLE_VERBS) for m in middle)


def main() -> None:
    if not DB.exists():
        print(f'[X] DB not found: {DB}', file=sys.stderr)
        sys.exit(1)

    con = sqlite3.connect(DB)
    con.row_factory = sqlite3.Row
    c = con.cursor()

    # 確保 column 存在（runtime migration 也會自動補，但這裡也做一次防呆）
    cols = [r['name'] for r in c.execute("PRAGMA table_info(questions)")]
    if 'correct_answer_alt' not in cols:
        c.execute("ALTER TABLE questions ADD COLUMN correct_answer_alt TEXT")
        print('[fix-alt] added column correct_answer_alt')

    rows = c.execute(
        "SELECT question_id, options, correct_answer, correct_answer_alt "
        "FROM questions WHERE question_type='sorting'"
    ).fetchall()
    print(f'sorting questions to scan: {len(rows)}')

    updated = 0
    skipped_already = 0
    no_change = 0

    for r in rows:
        try:
            opts = json.loads(r['options'])
        except Exception:
            continue
        order = [k.strip() for k in (r['correct_answer'] or '').split(',') if k.strip()]
        if len(order) < 3:
            continue
        tokens = [opts.get(k, '') for k in order]

        if not is_reversible(tokens):
            no_change += 1
            continue

        # 計算逆序：把第一個和最後一個位置 swap
        reversed_order = [order[-1], *order[1:-1], order[0]]
        alt_str = ','.join(reversed_order)
        if alt_str == r['correct_answer']:
            continue  # 同一個（不太可能但保險）

        # 已經填過且包含此 alt 就跳過
        existing = (r['correct_answer_alt'] or '').split('|')
        existing = [e.strip() for e in existing if e.strip()]
        if alt_str in existing:
            skipped_already += 1
            continue

        existing.append(alt_str)
        new_alt = '|'.join(existing)
        c.execute(
            "UPDATE questions SET correct_answer_alt = ? WHERE question_id = ?",
            (new_alt, r['question_id'])
        )
        updated += 1

    con.commit()
    con.close()
    print(f'[fix-alt] ✅ 更新 {updated} 題，跳過 {skipped_already} 題（已存在）；'
          f'剩 {no_change} 題不需處理（非可逆結構）')


if __name__ == '__main__':
    main()
