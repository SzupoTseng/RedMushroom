# RedMushroom 題庫擷取管線

從 studyark.org（全國中小學題庫網鏡像）擷取公開段考考卷，OCR + 結構化 + 改寫後寫入 RedMushroom 題庫。

## 法律與倫理

- 來源 studyark.org 是「全國中小學題庫網」(NAER) 的備份站
- 鏡像的學校段考考卷大多由各校自願公開於各校網頁
- **本管線必須執行「改寫」(stage 6)** — 絕不直接照抄。題目、選項、解釋都要改寫成原創。
- 若任何學校試卷標示「禁止轉載」，必須在 `data/schools.json` 標示 `excluded: true` 排除
- RedMushroom 必須維持非商業用途

## 階段

```
hub.py        → data/schools.json     (studyark 19 校清單 + 跳轉終點 URL)
schools.py    → data/papers.json      (每校的試卷 URL 清單)
download.py   → data/pdfs/<school>/   (下載 PDF)
parse.py      → data/texts/<school>/  (PDF → 純文字)
extract.py    → data/extracted/*.jsonl (文字 → 結構化題目)
rewrite.py    → data/rewritten/*.jsonl (改寫 = 原創化，必須步驟)
import.py     → INSERT 到 redmushroom.db (idempotent)
```

## 環境

```bash
cd scripts/scrape
python3 -m venv .venv
.venv/bin/pip install pdfplumber beautifulsoup4 lxml requests
```

Google Sites 站不在 curl 範圍內，需 Playwright（重）。Stage 2 對 Google Sites 來源會跳過並標記 `needs_headless: true`。

## 執行

```bash
.venv/bin/python3 hub.py       # ~30 秒
.venv/bin/python3 schools.py   # ~5 分鐘
.venv/bin/python3 download.py  # 視 PDF 數量
.venv/bin/python3 parse.py
.venv/bin/python3 extract.py
.venv/bin/python3 rewrite.py   # 需 LLM API (Claude/OpenAI) — see rewrite.py
.venv/bin/python3 import.py
```

## 目前狀態

- ✅ Stage 1 hub.py：完成
- ✅ Stage 2 schools.py：HTML 來源完成，Google Sites 標記 needs_headless
- ✅ Stage 3 download.py：完成
- ✅ Stage 4 parse.py：pdfplumber 文字 PDF；掃描 PDF 需 Tesseract（未實作）
- ⏳ Stage 5 extract.py：regex 基礎版（單選題格式辨識）
- ⏳ Stage 6 rewrite.py：未實作（需 LLM key）
- ⏳ Stage 7 import.py：未實作
