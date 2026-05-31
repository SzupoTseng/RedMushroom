#!/usr/bin/env python3
"""
Stage 5: 從 data/texts/*.txt 抽取結構化的選擇題。

選擇題格式（學校段考典型）：
  （     ）⒈題目文字？（①選項1
  ②選項2
  ③選項3
  ④選項4）

輸出 data/extracted/<file>.jsonl，每行一題：
{
  "source_file": "...",
  "subject_hint": "國語",        # 從檔名推斷
  "grade_hint": "G4",            # 從檔名推斷
  "section": "三、選擇題",
  "q_num": 1,
  "prompt": "...",
  "options": {"1": "...", "2": "...", "3": "...", "4": "..."},
  "correct_answer": null         # 來源 PDF 沒有答案，需後續 LLM 推斷或人工
}
"""
import json
import re
import sys
from pathlib import Path

DATA_DIR = Path(__file__).parent / "data"
TEXTS_DIR = DATA_DIR / "texts"
OUT_DIR = DATA_DIR / "extracted"

# 選擇題：（  ）⒈題目（①…②…③…④…）
# 用 lookahead 找下一個（  ） 或檔尾以決定每題範圍。
# 圓括號（）和 全形數字 ⒈⒉⒊... 都是中文 PDF 常見符號。
SECTION_HEAD_RE = re.compile(r"(一|二|三|四|五|六|七|八)、[^\n]*?(選擇|填空|問答|閱讀|寫作|聽寫|計算)[^\n]*")
QNUM_RE = re.compile(r"[⒈⒉⒊⒋⒌⒍⒎⒏⒐⒑⒒⒓⒔⒕⒖⒗⒘⒙⒚⒛]")
QNUM_MAP = {ch: i + 1 for i, ch in enumerate("⒈⒉⒊⒋⒌⒍⒎⒏⒐⒑⒒⒓⒔⒕⒖⒗⒘⒙⒚⒛")}
OPT_RE = re.compile(r"[①②③④⑤]")
OPT_MAP = {"①": "1", "②": "2", "③": "3", "④": "4", "⑤": "5"}


def detect_meta(filename: str) -> tuple[str, str]:
    """從檔名推斷科目和年級。"""
    subject = "unknown"
    if "國語" in filename:
        subject = "chinese"
    elif "數學" in filename:
        subject = "math"
    elif "自然" in filename:
        subject = "nature"
    elif "社會" in filename:
        subject = "social"
    elif "英語" in filename or "英文" in filename:
        subject = "english"

    grade = "unknown"
    m = re.search(r"([一二三四五六])年級", filename)
    if m:
        grade = "G" + str("一二三四五六".index(m.group(1)) + 1)
    else:
        m = re.search(r"([一二三四五六])下", filename)
        if m:
            grade = "G" + str("一二三四五六".index(m.group(1)) + 1)
    return subject, grade


def parse_text(text: str) -> list[dict]:
    """從合併後的文字中抽出選擇題。"""
    results: list[dict] = []
    # 找「選擇題」section 開始
    # 簡化：直接搜題目 pattern。每題格式：(...) ⒈ 題目 ?（① ② ③ ④ ）
    # 多行：可能 (...\n) ⒈xxx（①aaa\n②bbb\n③ccc\n④ddd）
    # 我們先用 regex 找含 ⒈-⒛ 的「題號開始」，到下一個題號或 '（一二三四五）、' 之前

    # 先把文字「題號→下一個題號之前」切段
    blocks = []
    # 找所有題號位置
    matches = list(re.finditer(QNUM_RE, text))
    for i, m in enumerate(matches):
        start = m.start()
        end = matches[i + 1].start() if i + 1 < len(matches) else len(text)
        # 往前找最近的（    ）標示開頭
        chunk = text[start:end].strip()
        blocks.append((m.group(), chunk))

    for qchar, chunk in blocks:
        q_num = QNUM_MAP[qchar]
        # 去掉開頭題號
        body = chunk[1:].strip()
        # 找最外層的「選項括號」：第一個 ① 之後的內容
        first_opt = re.search(r"[①②③④]", body)
        if not first_opt:
            continue
        prompt_part = body[:first_opt.start()].rstrip("（()")
        options_part = body[first_opt.start():]

        # 切割選項
        opts: dict[str, str] = {}
        opt_matches = list(re.finditer(r"([①②③④⑤])([^①②③④⑤]*?)(?=[①②③④⑤]|$)", options_part))
        for om in opt_matches:
            sym = om.group(1)
            content = om.group(2).strip()
            content = re.sub(r"\s+", "", content)
            # 反覆 strip 尾端的標點/括號（句點、全形/半形括號）
            while content and content[-1] in "。．.,，)）()（":
                content = content[:-1]
            if content:
                opts[OPT_MAP[sym]] = content

        if len(opts) < 3:
            continue  # 不像是 4 選 1
        # 整理 prompt
        prompt = prompt_part.strip()
        prompt = re.sub(r"\s+", "", prompt)
        prompt = prompt.strip("（()）").rstrip("?？") + "？"
        if len(prompt) < 5:
            continue

        results.append({
            "q_num": q_num,
            "prompt": prompt,
            "options": opts,
            "correct_answer": None,  # 從 PDF 無法得知，後續處理
        })
    return results


def main() -> None:
    if not TEXTS_DIR.exists():
        print(f"[X] {TEXTS_DIR} not found. Run parse.py first.", file=sys.stderr)
        sys.exit(1)
    OUT_DIR.mkdir(parents=True, exist_ok=True)

    total_questions = 0
    by_subject: dict[str, int] = {}

    for txt_path in sorted(TEXTS_DIR.rglob("*.txt")):
        rel = txt_path.relative_to(TEXTS_DIR)
        subject, grade = detect_meta(txt_path.name)
        text = txt_path.read_text(encoding="utf-8")
        questions = parse_text(text)
        for q in questions:
            q["source_file"] = str(rel)
            q["subject_hint"] = subject
            q["grade_hint"] = grade

        out_path = OUT_DIR / (txt_path.stem + ".jsonl")
        with out_path.open("w", encoding="utf-8") as f:
            for q in questions:
                f.write(json.dumps(q, ensure_ascii=False) + "\n")

        total_questions += len(questions)
        by_subject[subject] = by_subject.get(subject, 0) + len(questions)
        print(f"  ✓ {rel}  → {len(questions)} questions  ({subject}/{grade})")

    print()
    print(f"[extract] total questions: {total_questions}")
    print(f"[extract] by subject: {by_subject}")
    print(f"[extract] output dir: {OUT_DIR}")


if __name__ == "__main__":
    main()
