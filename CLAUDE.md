# CLAUDE.md — RedMushroom（紅蘑菇）最高規範

## 1. 專案願景與架構原則

- **專案名稱**：RedMushroom（紅蘑菇）
- **服務對象**：國小 3-4 年級；UI 高互動、字體大、語意清晰
- **技術架構**：React 18 (Vite) + Node.js (Express + TS) + SQLite (better-sqlite3)
- **資料庫**：SQLite，檔案位置 `database/redmushroom.db`，無需 Docker 或 MySQL
- **安全核心 (User-Scoped)**：所有涉及學生資料的 SQL 強制帶 `WHERE user_id = ?`，防止 IDOR

## 2. 前端開發規範

- 禁止使用 `any`；所有 Props/Context/API 回傳需定義 `interface` 或 `type`
- Function Components + React Hooks；測驗狀態用 `Context + useReducer`
- 全面 Tailwind CSS；答題按鈕點擊範圍 ≥ 44×44px；動畫使用 Transition
- 句子排序題使用 `@hello-pangea/dnd`
- 注音符號使用 `<ruby>` + `<rt>` HTML 標籤，受 `ConfigContext.showZhuyin` 控制
- SEN 模式前端包裝為「輕鬆學習模式」，**不得出現「遲緩」「特教」等字眼**

## 3. 後端開發規範

- 所有 `/api/quiz/*` 與 `/api/admin/*` 路由必須通過 `authMiddleware`
- JWT 解出的 `req.user.user_id` 為唯一信任來源
- **禁止** `ORDER BY RAND()` 全表掃描；使用記憶體快取 + Fisher-Yates Shuffle
- 統一 `try-catch` + Global Error Handler，不洩漏 stack trace 或實體路徑
- `/api/quiz/start` 回傳題目時，**絕對不可包含** `correct_answer` 欄位
- 所有 DB 操作使用 `better-sqlite3` 同步 API（`db.prepare().run/get/all`）
- DB Transaction：`db.transaction(fn)(...args)`

## 4. 資料格式規範

- 密碼使用 `bcrypt` hash（rounds=12），禁止明文存儲
- `options` 格式：`{"1": "...", "2": "...", "3": "...", "4": "..."}`（JSON 字串）
- 每次測驗固定 10 題（SEN Mode 為 5 題），每題 10 分；總分 ≥ 60 則 `is_passed = 1`
- `theory_type` 限值：`cognitive | input | usage | sociocultural`
- `category_type` 限值：`food_shopping | social | travel | business | health | leisure | housing | digital`
- `question_type` 限值：`single_choice | sorting`
- `subject` 限值：`chinese | math | nature | social | english`（多科目擴充用）

## 5. SQLite 語法規範（取代 MySQL）

| MySQL | SQLite（本專案使用）|
|-------|-------------------|
| `ENUM('a','b')` | `TEXT CHECK(col IN ('a','b'))` |
| `TINYINT DEFAULT 0` | `INTEGER DEFAULT 0` |
| `NOW()` | `datetime('now')` |
| `DATE_SUB(x, INTERVAL n DAY)` | `datetime('now', '-n days')` |
| `AUTO_INCREMENT` | `INTEGER PRIMARY KEY` |
| `INSERT ... ON DUPLICATE KEY UPDATE` | `INSERT OR REPLACE` |
| JSON 欄位型別 | `TEXT`（用 `JSON.stringify`/`JSON.parse`）|

## 6. 常用核心指令

```bash
npm run setup        # 首次：安裝所有依賴 + 建立 SQLite DB + Seed
npm start            # 同時啟動前後端（concurrently）
npm run build        # 生產環境編譯
npm run test:e2e     # Playwright E2E 測試
npm run test:child   # AI 兒童測試員
cd backend && npm run dev
cd frontend && npm run dev
```

## 7. 多科目模組規範

新增科目模組需提供：
1. `modules/<subject>/module.config.json`
2. 相容 `questions` 表 Schema 的題庫（`subject` 欄位填寫科目名稱）
3. `scripts/seed-<subject>.ts` 種子腳本

詳見 `modules/MODULE_SPEC.md`。

## 8. 端到端驗證清單（上線前必查）

1. **多租戶隔離**：學生 A 的 Dashboard 不顯示學生 B 的資料
2. **安全驗證**：`/api/quiz/start` 回傳不含 `correct_answer`
3. **跨 session IDOR**：用 user_A token 存取 user_B session → 403
4. **SEN 模式**：`is_sen_mode=1` 時抽 5 題、`time_limit=null`、前端大字單欄
5. **一鍵啟動**：雙擊 `start.bat` 全程自動完成

## 9. Windows `.bat` 檔案規範（必查，不可省略）

**寫入或修改任何 `.bat` 檔後，必須**用以下指令稽核每一個 `.bat`：

```bash
for f in *.bat; do
  enc=$(file - < "$f")
  nascii=$(python3 -c "print(sum(1 for b in open('$f','rb').read() if b>=128))")
  chcp=$(head -3 "$f" | grep -c "chcp 65001")
  echo "$f | $enc | nonAscii=$nascii | chcp=$chcp"
done
```

每個 `.bat` 都必須通過：

1. **行尾必須是 CRLF**（`file` 輸出含 `with CRLF line terminators`）
   - `Write` 工具會存成 LF → 寫完一定要轉：
     `python3 -c "import sys;[open(f,'wb').write(open(f,'rb').read().replace(b'\r\n',b'\n').replace(b'\n',b'\r\n')) for f in sys.argv[1:]]" *.bat`
   - 若是 LF，cmd 會把 `setlocal` / `for /f` / 多行區塊整片亂剖，可能完全無輸出。
2. **若含非 ASCII（中文）字元，前三行必須有 `chcp 65001 > nul`**
   - 否則繁體中文 Windows（預設 cp950/Big5）會把 UTF-8 中文位元組誤讀為命令分隔符，產生 `'nstall' 不是內部或外部命令` 之類錯誤。
   - 若要更穩，整個檔案用純 ASCII 英文（zero non-ASCII bytes）。
3. **不要在使用 `setlocal enabledelayedexpansion` 的同一段 `if (...)` 區塊裡，又設又讀同一個變數**
   - 改用 `:label` 子程序（`call :foo` / `exit /b N`）就不需要 delayed expansion，避免 `!VAR!` 陷阱。
4. **任何會跑 Node 的 `.bat`（reseed-db、Run、reinstall、start...）**：
   開頭都要加 `if exist ".tools\node22\node.exe" set "PATH=%CD%\.tools\node22;%PATH%"`，
   讓可攜版 Node 22 接管 PATH，避免系統 Node 24+ 觸發 `better-sqlite3` ABI 不符。

**寫完即驗，驗完才回報「修好了」。** 過去多次因為跳過這一步，使用者拿到完全跑不動的 `.bat`。
