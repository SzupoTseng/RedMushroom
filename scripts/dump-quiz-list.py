#!/usr/bin/env python3
"""
產生 docs/quiz/QuizList.MD：把 SQLite 題庫倒成可讀的 Markdown。
從 repo 根目錄執行：python3 scripts/dump-quiz-list.py
"""
import sqlite3
import json
from pathlib import Path

DB = Path('database/redmushroom.db')
OUT = Path('docs/quiz/QuizList.MD')

THEORY_LABEL = {
    'cognitive': '語詞認知', 'input': '語言輸入',
    'usage': '語言運用', 'sociocultural': '社文語境',
}
CAT_LABEL = {
    'food_shopping': '飲食購物', 'social': '社交', 'travel': '旅遊', 'business': '商務',
    'health': '醫療健康', 'leisure': '休閒', 'housing': '居家', 'digital': '數位',
}
SUBJ_LABEL = {'chinese': '國語', 'math': '數學', 'english': '英語', 'nature': '自然', 'social': '社會'}


def plain_text(content_json: str) -> str:
    try:
        arr = json.loads(content_json)
        return ''.join(item.get('char', '') for item in arr)
    except Exception:
        return content_json or ''


def options_dict(opts_json: str) -> dict:
    try:
        return json.loads(opts_json)
    except Exception:
        return {}


def main() -> None:
    if not DB.exists():
        raise SystemExit(f'資料庫不存在：{DB}（請先 npm run setup）')

    OUT.parent.mkdir(parents=True, exist_ok=True)

    con = sqlite3.connect(DB)
    con.row_factory = sqlite3.Row
    c = con.cursor()

    rows = c.execute("""
        SELECT subject, theory_type, category_type, COUNT(*) c
        FROM questions
        GROUP BY subject, theory_type, category_type
        ORDER BY subject, theory_type, category_type
    """).fetchall()
    total = c.execute('SELECT COUNT(*) FROM questions').fetchone()[0]

    with OUT.open('w', encoding='utf-8') as f:
        f.write('# 題庫總覽 (QuizList)\n\n')
        f.write(f'資料庫：`{DB}`  總題數：**{total}**\n\n')
        f.write('> 此檔由 `scripts/dump-quiz-list.py` 從本機 SQLite 倒出。題庫變動後請重跑：`python3 scripts/dump-quiz-list.py`\n\n')

        f.write('## 摘要\n\n')
        f.write('| 科目 | 理論 (theory_type) | 情境 (category_type) | 題數 |\n')
        f.write('|------|----|----|---:|\n')
        for r in rows:
            f.write(
                f'| {SUBJ_LABEL.get(r["subject"], r["subject"])} '
                f'| {THEORY_LABEL.get(r["theory_type"], r["theory_type"])} ({r["theory_type"]}) '
                f'| {CAT_LABEL.get(r["category_type"], r["category_type"])} ({r["category_type"]}) '
                f'| {r["c"]} |\n'
            )
        f.write('\n## 題目明細\n\n')

        last_key = (None, None, None)
        qrows = c.execute("""
            SELECT question_id, subject, theory_type, category_type, question_type,
                   content, options, correct_answer, explanation, score
            FROM questions
            ORDER BY subject, theory_type, category_type, question_id
        """).fetchall()

        for r in qrows:
            key = (r['subject'], r['theory_type'], r['category_type'])
            if key != last_key:
                f.write(
                    f'\n### {SUBJ_LABEL.get(r["subject"], r["subject"])} / '
                    f'{THEORY_LABEL.get(r["theory_type"], r["theory_type"])} / '
                    f'{CAT_LABEL.get(r["category_type"], r["category_type"])}\n'
                )
                f.write(
                    f'`subject={r["subject"]}` `theory_type={r["theory_type"]}` '
                    f'`category_type={r["category_type"]}`\n\n'
                )
                last_key = key

            text = plain_text(r['content'])
            opts = options_dict(r['options'])
            ans = (r['correct_answer'] or '').strip()
            qtype = r['question_type']

            f.write(f'**#{r["question_id"]}** `{qtype}` — {text}\n')
            if qtype == 'sorting':
                order = [k.strip() for k in ans.split(',') if k.strip()]
                ordered_text = ' → '.join(opts.get(k, f'?{k}') for k in order)
                f.write('  - 詞塊：' + ' / '.join(f'{k}.{v}' for k, v in opts.items()) + '\n')
                f.write(f'  - 正確順序：{ordered_text}\n')
            else:
                for k in sorted(opts.keys()):
                    mark = ' ✅' if k == ans else ''
                    f.write(f'  - {k}. {opts[k]}{mark}\n')
            if r['explanation']:
                f.write(f'  - 說明：{r["explanation"]}\n')
            f.write('\n')

        f.write('\n---\n\n## 重新產生\n\n```bash\npython3 scripts/dump-quiz-list.py\n```\n')

    size = OUT.stat().st_size
    print(f'wrote {OUT} ({size:,} bytes, {total} questions)')


if __name__ == '__main__':
    main()
