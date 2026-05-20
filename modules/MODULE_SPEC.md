# RedMushroom 模組規範（MODULE_SPEC.md）

## 多科目擴充架構

RedMushroom 支援以 `subject` 欄位區分不同科目，所有科目共用同一組 API、DB 架構與前端元件。

---

## 模組目錄結構（2026-05-20 現況）

```
modules/
├── MODULE_SPEC.md          ← 本文件
├── chinese/                ← 已實作（~1500 道題庫已產生）
│   └── module.config.json  ← 已存在
├── math/                   ← 結構已預留
│   ├── README.md           ← 已存在
│   └── module.config.json  ← 已存在（isActive: false）
├── nature/                 ← 空資料夾，待人接手
├── social/                 ← 空資料夾，待人接手
└── english/                ← 空資料夾，待人接手
```

> **誠實聲明**：`nature` / `social` / `english` 目前是空資料夾，沒有 `module.config.json`。需要時依下方步驟新增。

---

## 新增科目步驟

### 1. 建立 `modules/<subject>/module.config.json`

必填欄位：
- `subject`：科目識別碼（英文小寫，對應 `questions.subject`）
- `displayName`：顯示名稱（zh-TW）
- `icon`：emoji 圖示
- `theoryTypes`：支援的理論分類陣列
- `questionTypes`：支援的題型陣列
- `gradeLevels`：適用年級

### 2. 新增題庫種子腳本

建立 `scripts/seed-<subject>.ts`，寫入 `questions` 表，`subject` 欄位填入正確值。

### 3. 前端 SubjectSelector 自動讀取

`frontend/src/pages/SubjectSelector.tsx` 會透過 `/api/subjects` API 列出已有題目的科目。

---

## module.config.json 格式

```json
{
  "subject": "chinese",
  "displayName": "國語文",
  "displayNameI18n": {
    "zh-TW": "國語文",
    "en": "Chinese Language",
    "ja": "国語",
    "ko": "국어"
  },
  "icon": "🍄",
  "color": "#ef4444",
  "theoryTypes": ["cognitive", "input", "usage", "sociocultural"],
  "questionTypes": ["single_choice", "sorting"],
  "gradeLevels": ["3", "4"],
  "isActive": true,
  "description": "國小 3-4 年級國語文學習模組，涵蓋認知、輸入、運用、社文四大主題。"
}
```

---

## 安全規範

所有科目相關 API 都必須：
1. 通過 `authMiddleware` 驗證
2. SQL 查詢帶 `WHERE user_id = ?` 防 IDOR
3. `/api/quiz/start` 絕不回傳 `correct_answer`

---

## chinese 模組現況（參考實作）

中文模組的題庫由兩個 seed 共同產生，加總約 1,500 題：

- `scripts/generate-questions.ts` — 從 `scripts/questions/templates.ts` 的 32 個模板（4 理論 × 8 類別）排列組合產生約 1,500 題。模板使用 `data[]` 陣列耦合「詞語 → 正確語意」，並用 `vars[]` cartesian 展開干擾選項，避免語意漂移。
- `scripts/seed-questions-taiwan.ts` — 約 60 道手寫的臺灣在地化題目（夜市/捷運/珍奶/節慶等），補上模板無法生成的文化情境。

新科目可選擇相同模式（模板 + 在地化補丁）或全部手寫，視題目複雜度決定。
