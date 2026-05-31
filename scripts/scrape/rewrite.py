#!/usr/bin/env python3
"""
Stage 6: 改寫 (rewrite) + 判定正解。

INPUT:  data/extracted/*.jsonl  (correct_answer 為 null)
OUTPUT: data/rewritten/*.jsonl  (含改寫後 prompt/options + correct_answer)

兩個必要工作：
1. **判定正解** — 原始 PDF 沒附答案，需要 LLM 推斷
2. **改寫題目** — 避免直接複製校方原文：題目意思保留，但文字用自己的話寫

實作：需要 LLM API key (ANTHROPIC_API_KEY 或 OPENAI_API_KEY)。
無 key 時，本腳本只會 print 範例 prompt 並退出。

如何使用：
    export ANTHROPIC_API_KEY=...
    .venv/bin/python3 rewrite.py
"""
import json
import os
import sys
import time
from pathlib import Path

DATA_DIR = Path(__file__).parent / "data"
IN_DIR = DATA_DIR / "extracted"
OUT_DIR = DATA_DIR / "rewritten"

REWRITE_PROMPT = """你是國小教材的審題編輯。下面是一道從學校段考題萃取出的選擇題（題目來自公開試卷，但
作為 RedMushroom 題庫使用前必須改寫成原創）。請完成兩件事：

1. 推斷正解：根據題目和選項常識，挑出最合理的答案編號 (1/2/3/4)。
2. 改寫：保留題目「考的概念與難度」，但文字、情境、選項用詞都要用你自己的話重寫。
   不要逐字照抄原題。確保改寫後的題目對國小學生語意清楚、難度相當。

回傳純 JSON（不要 markdown code fence，不要其他說明），格式：
{{
  "correct_answer": "1|2|3|4",
  "rewritten_prompt": "改寫後的題目（30 字以內）",
  "rewritten_options": {{"1": "...", "2": "...", "3": "...", "4": "..."}},
  "explanation": "為何此選項正確，30 字以內"
}}

原題：
科目：{subject}
年級：{grade}
題目：{prompt}
選項：
1) {opt1}
2) {opt2}
3) {opt3}
4) {opt4}
"""


def rewrite_with_claude(q: dict, api_key: str) -> dict | None:
    """呼叫 Anthropic Claude API 改寫題目。"""
    try:
        import urllib.request
        import urllib.error
    except ImportError:
        return None

    prompt = REWRITE_PROMPT.format(
        subject=q.get("subject_hint", "?"),
        grade=q.get("grade_hint", "?"),
        prompt=q["prompt"],
        opt1=q["options"].get("1", ""),
        opt2=q["options"].get("2", ""),
        opt3=q["options"].get("3", ""),
        opt4=q["options"].get("4", ""),
    )

    body = json.dumps({
        "model": "claude-haiku-4-5-20251001",
        "max_tokens": 600,
        "messages": [{"role": "user", "content": prompt}],
    }).encode("utf-8")

    req = urllib.request.Request(
        "https://api.anthropic.com/v1/messages",
        data=body,
        headers={
            "x-api-key": api_key,
            "anthropic-version": "2023-06-01",
            "content-type": "application/json",
        },
        method="POST",
    )
    try:
        with urllib.request.urlopen(req, timeout=30) as resp:
            data = json.loads(resp.read().decode("utf-8"))
        text = data["content"][0]["text"]
        # strip code fence if present
        text = text.strip()
        if text.startswith("```"):
            text = text.split("\n", 1)[1].rsplit("```", 1)[0]
        return json.loads(text)
    except urllib.error.HTTPError as e:
        print(f"  [API ERROR] {e.code}: {e.read().decode()[:200]}", file=sys.stderr)
    except Exception as e:
        print(f"  [API ERROR] {e}", file=sys.stderr)
    return None


def main() -> None:
    api_key = os.environ.get("ANTHROPIC_API_KEY", "").strip()
    if not api_key:
        print("[X] ANTHROPIC_API_KEY 未設定。請：")
        print("      export ANTHROPIC_API_KEY=sk-ant-...")
        print("    然後再執行此腳本。")
        print()
        print("    或可改用 OpenAI / Google AI / 本地 LLM — 改寫 rewrite_with_claude()")
        print("    為對應 API 呼叫即可。")
        print()
        # 顯示一個範例 prompt 給使用者看
        from pathlib import Path
        for jf in IN_DIR.glob("*.jsonl"):
            with jf.open(encoding="utf-8") as f:
                line = f.readline().strip()
            if not line:
                continue
            q = json.loads(line)
            example = REWRITE_PROMPT.format(
                subject=q.get("subject_hint", "?"),
                grade=q.get("grade_hint", "?"),
                prompt=q["prompt"],
                opt1=q["options"].get("1", ""),
                opt2=q["options"].get("2", ""),
                opt3=q["options"].get("3", ""),
                opt4=q["options"].get("4", ""),
            )
            print("─── 範例 LLM prompt ───")
            print(example)
            break
        sys.exit(2)

    OUT_DIR.mkdir(parents=True, exist_ok=True)
    total = 0
    rewritten = 0
    failed = 0

    for jf in sorted(IN_DIR.glob("*.jsonl")):
        out_file = OUT_DIR / jf.name
        # 若已部分改寫，續跑
        existing_qnums: set[int] = set()
        if out_file.exists():
            with out_file.open(encoding="utf-8") as f:
                for line in f:
                    try:
                        existing_qnums.add(json.loads(line)["q_num"])
                    except Exception:
                        pass

        with jf.open(encoding="utf-8") as f, out_file.open("a", encoding="utf-8") as fout:
            for line in f:
                line = line.strip()
                if not line:
                    continue
                q = json.loads(line)
                total += 1
                if q["q_num"] in existing_qnums:
                    continue
                print(f"  → [{jf.stem[:30]}] Q{q['q_num']}: {q['prompt'][:30]}...")
                result = rewrite_with_claude(q, api_key)
                if not result:
                    failed += 1
                    continue
                q["rewritten_prompt"] = result.get("rewritten_prompt", q["prompt"])
                q["rewritten_options"] = result.get("rewritten_options", q["options"])
                q["correct_answer"] = result.get("correct_answer", "1")
                q["llm_explanation"] = result.get("explanation", "")
                q["rewritten"] = True
                fout.write(json.dumps(q, ensure_ascii=False) + "\n")
                fout.flush()
                rewritten += 1
                time.sleep(0.5)  # gentle rate limit

    print()
    print(f"[rewrite] total: {total}, newly rewritten: {rewritten}, failed: {failed}")
    print(f"[rewrite] output dir: {OUT_DIR}")


if __name__ == "__main__":
    main()
