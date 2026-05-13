# Claude 專案開發規則規範書

本文件是 Claude 在本專案進行任何程式碼編寫、修改、重構、刪除、提交前必須先閱讀並遵守的規範。若使用者指令與本文件衝突，必須先向使用者確認，不得自行跳過。

## 一、角色定位

Claude 在本專案中的角色不是只要「把功能做出來」，而是必須同時負責：

- 正確性
- 安全性
- 可維護性
- MVP 範圍控制
- 可部署性
- QA 可驗證性

任何改動都必須能被清楚說明「為什麼改」、「改了什麼」、「如何驗證」。

## 二、開工前必做檢查

Claude 在修改任何檔案前，必須先執行或閱讀：

1. `docs/QA_RULES.md`
2. `docs/CLAUDE_PROJECT_RULES.md`
3. 最新一份 `docs/qa-logs/*.md`
4. `docs/QA_MODIFICATION_REPORT_FOR_CLAUDE.md`
5. `git status --short`
6. `git ls-files .env.local key.txt .next node_modules`
7. `package.json`
8. 相關目標檔案

若工作區已有未提交變更：

- 不得覆蓋使用者變更
- 不得使用 `git reset --hard`
- 不得使用 `git checkout -- <file>` 還原檔案
- 必須先說明目前看到的變更，再繼續

## 三、嚴禁事項

### 1. 嚴禁提交機密

不得提交：

- `.env`
- `.env.local`
- `.env.*`
- `key.txt`
- API keys
- tokens
- passwords
- private certificates
- service account JSON

若發現已提交機密：

1. 立刻標記為 P0
2. 通知使用者需要 rotate key
3. 從 tracking 移除
4. 加入 `.gitignore`
5. 不得在回覆中完整印出 key

### 2. 嚴禁提交生成檔與依賴目錄

不得提交：

- `node_modules/`
- `.next/`
- `out/`
- `dist/`
- build cache
- log files

允許提交：

- `package.json`
- `package-lock.json`
- 原始碼
- config
- docs
- `.env.example`

### 3. 嚴禁不安全 HTML 渲染

不得將以下內容直接送入 `dangerouslySetInnerHTML`：

- 使用者輸入
- LLM 產出
- 外部 API 回傳
- 網頁擷取內容
- Markdown 轉出的未消毒 HTML

若必須渲染 Markdown：

- 優先使用安全 Markdown renderer
- 禁止 raw HTML
- 或使用 sanitizer

### 4. 嚴禁無驗證 API input

API route 不得直接信任 request body。

必須檢查：

- JSON 是否有效
- 欄位是否存在
- 欄位型別是否正確
- 字串長度是否合理
- 錯誤訊息不得洩漏敏感資訊

## 四、MVP 開發原則

本專案目前是 MVP，允許暫時不做完整企業級架構，但不允許犧牲以下底線：

- 不外洩 API key
- 不提交 `node_modules/`
- 不提交 `.next/`
- 不引入明顯 XSS
- 不讓 build 失敗
- 不讓主要流程無法使用

可以延後：

- 完整測試覆蓋
- 完整 observability
- 完整錯誤追蹤
- 完整後台管理
- 完整權限系統

但延後項目必須在回覆中標明。

## 五、程式碼風格規範

### TypeScript

- 優先使用明確型別
- 避免 `any`
- 若不得不用 `any`，必須註明原因
- 不使用非必要的 non-null assertion，例如 `process.env.KEY!`
- API 回傳資料應有清楚型別

### React

- component 保持小而清楚
- 狀態命名需具語意
- loading/error/success 狀態都要處理
- 不得讓 UI 因缺資料而 crash

### Next.js

- API route 必須處理錯誤
- server-only secrets 不得傳到 client
- client component 不得讀取 private env
- build 必須通過

## 六、安全規範

Claude 修改時必須檢查：

- 是否有 secret 被硬編碼
- 是否有 XSS
- 是否有不受控 HTML
- 是否有過長 input 導致成本或效能問題
- 是否有錯誤訊息洩漏 stack trace、key、token
- 是否有外部 URL 直接插入 DOM

AI/LLM 相關功能特別要求：

- LLM output 一律視為不可信資料
- Web grounding output 一律視為不可信資料
- 使用者輸入一律視為不可信資料
- 顯示來源時，URL 必須安全處理

## 七、Git 與提交規範

Claude 不得自行做以下動作，除非使用者明確要求：

- commit
- push
- reset
- force push
- rebase
- 刪除 branch

若要準備提交，必須先回報：

- 修改檔案清單
- 每個檔案修改目的
- 驗證結果
- 剩餘風險

## 八、每次修改後必跑驗證

依照修改範圍，至少執行：

```bash
npm run build
```

若修改 dependency：

```bash
npm install
npm run build
```

若修改安全相關邏輯，必須手動描述測試案例。

## 九、QA 回覆格式

Claude 完成任何修正後，必須用以下格式回覆：

```markdown
## 修改摘要
- ...

## 修改檔案
- `path`: 修改原因

## 驗證結果
- `npm run build`: pass/fail
- 其他驗證：...

## 安全檢查
- secret tracking: pass/fail
- XSS risk: pass/fail
- generated files tracking: pass/fail

## 剩餘風險
- ...
```

## 十、QA 日誌規範

每次 QA 完成後，必須新增或更新一份 QA 日誌。QA 日誌的目的不是寫心得，而是讓 Claude 或下一位工程執行者可以直接照表修正。

QA 日誌必須放在：

```text
docs/qa-logs/
```

命名格式：

```text
YYYY-MM-DD_qa-log.md
```

若同一天有多次 QA，可使用：

```text
YYYY-MM-DD_qa-log-01.md
YYYY-MM-DD_qa-log-02.md
```

每份 QA 日誌必須包含：

- QA 日期
- QA 範圍
- 檢測命令
- 總體結論
- 風險分級
- 修改項目表
- 驗收標準
- Claude 執行順序
- 剩餘風險

其中「修改項目表」是最重要的交接表，Claude 必須優先讀取並逐項處理。

修改項目表格式：

```markdown
| ID | 優先級 | 類型 | 檔案/範圍 | 問題 | 要求修改 | 驗收標準 | 狀態 |
|---|---|---|---|---|---|---|---|
| QA-001 | P0 | Security | `.env.local` | API key 被 tracked | 從 git tracking 移除並 rotate key | `git ls-files .env.local` 無輸出 | Open |
```

狀態只能使用：

- `Open`
- `In Progress`
- `Fixed`
- `Verified`
- `Deferred`
- `Won't Fix`

若狀態為 `Deferred` 或 `Won't Fix`，必須在「剩餘風險」中說明原因。

## 十一、QA 後 Claude 必讀順序

Claude 在接手修正前，必須依序讀取：

1. `docs/QA_RULES.md`
2. `docs/CLAUDE_PROJECT_RULES.md`
3. 最新一份 `docs/qa-logs/*.md`
4. `docs/QA_MODIFICATION_REPORT_FOR_CLAUDE.md`
5. 相關原始碼

Claude 不得只看使用者口頭描述就直接改程式碼。

## 十二、專案目前最高優先級

Claude 下一步應優先完成：

1. 移除已 tracked 的 `.env.local` 與 `key.txt`
2. 移除已 tracked 的 `.next/` 與 `node_modules/`
3. 新增 `.gitignore`
4. 新增 `.env.example`
5. 修正 `ReportView.tsx` 的 Markdown XSS 風險
6. 補強 `src/app/api/research/route.ts` 的 input validation 與 env 檢查

若 Claude 未完成前四項，不得宣稱此專案已可安全 push。
