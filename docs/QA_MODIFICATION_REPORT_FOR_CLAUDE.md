# MarketScout AI MVP QA 修改報告

角色定位：本報告由專案 QA 角度撰寫，目標是讓 Claude 依照風險優先級修正目前 MVP 的正確性、資安與可維護性問題。

## 一、目前專案狀態

- 專案：Next.js 14 + React 18 + TypeScript
- 主要功能：輸入商品、目標市場、調研用途，呼叫 Gemini 產出市場調研報告
- 最近提交：initial commit
- Build 結果：`npm run build` 可通過
- 主要問題：提交內容包含機密、生成檔、依賴目錄，且前端直接渲染 AI 產生 HTML

## 二、立即必修問題

### P0 - API key 已被提交到 git

受影響檔案：

- `.env.local`
- `key.txt`

問題說明：

- `.env.local` 內含 `GEMINI_API_KEY`
- `key.txt` 看起來是 Google API key 格式
- 只要這個 repository 曾經被 push 到 GitHub、雲端、交給第三方、或同步到任何遠端，就必須視為 API key 已外洩

要求修正：

1. 立即停用或刪除舊 Gemini API key
2. 重新產生新的 API key
3. 從 git tracking 移除 `.env.local` 與 `key.txt`
4. 新增 `.gitignore`
5. 未來只透過本機 `.env.local` 或部署平台環境變數設定 `GEMINI_API_KEY`

驗收標準：

- `git ls-files .env.local key.txt` 不應有任何輸出
- `.gitignore` 必須包含 `.env*`
- 專案仍可用本機 `.env.local` 執行
- 不得在任何原始碼、文件、log、測試檔中硬編碼 API key

### P1 - 不應提交 `.next/` 與 `node_modules/`

受影響範圍：

- `.next/`
- `node_modules/`

問題說明：

- 目前 git tracked 檔案約 9,840 個，其中約 9,824 個來自 `.next/` 與 `node_modules/`
- 這會造成 repository 體積暴增、review 困難、merge 困難、部署不穩定
- MVP 階段也不應提交這些檔案

要求修正：

1. 在 `.gitignore` 加入：
   - `node_modules/`
   - `.next/`
   - `out/`
   - build/cache/log 類檔案
2. 從 git tracking 移除 `.next/` 與 `node_modules/`
3. 保留 `package.json` 與 `package-lock.json`

驗收標準：

- `git ls-files .next node_modules` 不應有任何輸出
- `npm install` 後可重建 `node_modules/`
- `npm run build` 後 `.next/` 不會出現在 git status 中

### P1 - AI 產生內容直接進入 `dangerouslySetInnerHTML`

受影響檔案：

- `src/components/ReportView.tsx`

目前風險：

- `marked(report)` 直接轉 HTML
- 接著用 `dangerouslySetInnerHTML` 渲染
- `report` 來源是 LLM 產生內容，且可能含有 web grounding 內容與使用者輸入間接影響
- 若 Markdown/HTML 中含惡意 script、event handler、iframe、javascript URL，可能造成 XSS

要求修正：

優先方案：

- 使用安全 Markdown renderer，例如 `react-markdown`
- 禁止 raw HTML
- 若必須支援 HTML，必須加入 sanitizer，例如 DOMPurify/isomorphic-dompurify

驗收標準：

- 不得直接把未消毒的 HTML 傳入 `dangerouslySetInnerHTML`
- 測試以下內容不得執行任何 JS：
  - `<img src=x onerror=alert(1)>`
  - `<script>alert(1)</script>`
  - `[x](javascript:alert(1))`

## 三、MVP 可延後但上線前必修

### P2 - API route input validation 不足

受影響檔案：

- `src/app/api/research/route.ts`

問題說明：

- 直接 `await req.json()`
- 未驗證欄位型別
- 未限制長度
- 未處理 malformed JSON
- 未明確檢查 `GEMINI_API_KEY`

要求修正：

1. 加入 request body schema validation
2. 限制 `product`、`market`、`purpose` 長度
3. malformed JSON 回傳 400
4. 缺少 `GEMINI_API_KEY` 時回傳清楚錯誤，並避免啟動時因非空斷言造成隱性問題

驗收標準：

- 空欄位回 400
- 非字串欄位回 400
- 過長輸入回 400
- malformed JSON 回 400
- API key 未設定時回 500 或部署前檢查失敗，但錯誤訊息不可洩漏敏感資訊

### P2 - Gemini SDK 使用舊套件

受影響檔案：

- `package.json`
- `src/app/api/research/route.ts`

問題說明：

- 目前使用 `@google/generative-ai`
- 官方目前建議 JavaScript/TypeScript 使用 `@google/genai`
- 舊 SDK 對未來模型、工具與 grounding 行為有維護風險

要求修正：

1. 評估改用 `@google/genai`
2. 更新 Gemini client 初始化方式
3. 確認 Google Search grounding 的工具設定仍可正常運作

驗收標準：

- `npm run build` 通過
- API 可產出報告
- Search grounding 設定有效

### P2 - Grounding metadata 未回傳與顯示

受影響檔案：

- `src/app/api/research/route.ts`
- `src/components/ReportView.tsx`

問題說明：

- 市場調研報告應能檢視資料來源
- 目前只回傳 `response.text()`
- 沒有將 grounding metadata / citation / source link 呈現給使用者

要求修正：

1. 從 Gemini response 中取出 grounding metadata
2. API 回傳 `report` 與 `sources`
3. 前端在報告底部顯示來源清單
4. 若沒有來源，顯示「本次模型未提供可驗證來源」

驗收標準：

- 報告頁可看到來源
- 來源 URL 可點擊
- 沒有來源時 UI 不崩潰

## 四、建議新增的 `.gitignore`

請至少包含：

```gitignore
# dependencies
node_modules/

# next.js
.next/
out/

# production
build/
dist/

# env
.env
.env.*
!.env.example

# logs
npm-debug.log*
yarn-debug.log*
yarn-error.log*
pnpm-debug.log*

# os/editor
.DS_Store
Thumbs.db
.vscode/
.idea/
```

請另外新增 `.env.example`：

```env
GEMINI_API_KEY=replace_with_your_gemini_api_key
```

## 五、Claude 修正順序

Claude 必須依照以下順序處理：

1. 新增 `.gitignore` 與 `.env.example`
2. 從 git tracking 移除 `.env.local`、`key.txt`、`.next/`、`node_modules/`
3. 修正 Markdown/XSS 風險
4. 加入 API input validation 與 env 檢查
5. 視時間評估 Gemini SDK 遷移
6. 視時間加入 grounding sources 顯示
7. 執行 build 與基本手動驗證

## 六、最終驗收命令

Claude 完成後必須回報以下命令結果：

```bash
git status --short
git ls-files .env.local key.txt .next node_modules
npm run build
```

期望：

- `git ls-files .env.local key.txt .next node_modules` 沒有輸出
- `npm run build` 成功
- `git status --short` 只顯示合理的原始碼與設定檔變更

## 七、QA 結論

此專案目前可以作為本機 MVP 原型，但不適合直接 push 或公開部署。最優先要處理的是 API key 外洩風險與 repository 汙染問題，其次是 AI Markdown 渲染造成的 XSS 風險。這三項修完後，才適合進入較穩定的 MVP 測試階段。
