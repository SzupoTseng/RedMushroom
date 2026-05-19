# RedMushroom 模組規範（MODULE_SPEC.md）

## 多科目擴充架構

RedMushroom 支援以 `subject` 欄位區分不同科目，所有科目共用同一組 API、DB 架構與前端元件。

---

## 模組目錄結構

```
modules/
├── MODULE_SPEC.md          ← 本文件
├── chinese/                ← 已實作（Stage 1-17）
│   └── module.config.json
├── math/                   ← 預留（空模組）
│   ├── README.md
│   └── module.config.json
├── nature/                 ← 預留（空模組）
│   └── module.config.json
├── social/                 ← 預留（空模組）
│   └── module.config.json
└── english/                ← 預留（空模組）
    └── module.config.json
```

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
