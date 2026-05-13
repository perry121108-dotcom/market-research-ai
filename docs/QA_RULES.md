# QA 規則規範書

本文件規範 QA 在本專案中如何進行檢測、判斷、分級、記錄與交接。QA 不得只依照聊天上下文、主觀印象或猜測做結論；所有 QA 結論都必須基於實際檔案、命令輸出、可重現檢查或明確標示為假設。

## 一、QA 角色定位

QA 的責任是嚴格檢測專案是否符合：

- 正確性
- 安全性
- 可維護性
- MVP 階段可接受標準
- 可部署性
- 可驗證性

QA 不負責替開發者找藉口。即使是 MVP，也必須守住安全與基礎工程衛生底線。

## 二、QA 基本原則

### 1. 證據優先

每一個 QA finding 必須至少符合以下其中一項：

- 有明確檔案路徑
- 有明確行號
- 有命令輸出佐證
- 有 build/test/lint 結果
- 有官方文件或已知安全規範佐證

若只是推測，必須標示為：

```text
Assumption / 需確認
```

不得把未確認假設寫成既定事實。

### 2. 不依賴上下文猜測

QA 不得只因為使用者說「這是 MVP」就降低安全底線。

MVP 可接受延後：

- 完整測試覆蓋
- 完整 observability
- 完整後台管理
- 完整報表功能

MVP 不可接受延後：

- API key 外洩
- secret 被 git tracking
- `node_modules/` 被提交
- `.next/` 被提交
- 明顯 XSS
- build 失敗
- 主要流程不可用

### 3. 可重現

QA 必須記錄執行過的命令，使下一位 QA 或 Claude 能重現檢查。

例如：

```bash
git status --short
git ls-files .env.local key.txt .next node_modules
npm run build
```

### 4. 結論要可執行

每個問題都必須附上：

- 問題描述
- 影響範圍
- 優先級
- 要求修改
- 驗收標準

不得只寫「這裡有問題」但沒有可執行修正方向。

## 三、QA 開始前必讀

QA 在檢測前必須閱讀：

1. `docs/QA_RULES.md`
2. `docs/CLAUDE_PROJECT_RULES.md`
3. 最新一份 `docs/qa-logs/*.md`，若存在
4. 本次要審查的相關原始碼

若缺少上述文件，QA 必須在日誌中標示。

## 四、QA 固定檢測流程

每次 QA 至少要依序檢查：

### 1. Git 狀態

```bash
git status --short
git log -1 --stat --oneline
```

目的：

- 確認工作區是否乾淨
- 確認最近提交範圍
- 避免誤審未提交變更或混入使用者改動

### 2. Secret 與敏感檔案

```bash
git ls-files .env .env.local .env.* key.txt
```

必要時搜尋：

```bash
rg -n "API_KEY|SECRET|TOKEN|PASSWORD|AIza|sk-" .
```

要求：

- 發現 secret tracked 一律 P0
- 不得在 QA 報告中完整印出 secret

### 3. 生成檔與依賴目錄

```bash
git ls-files .next node_modules out dist build
```

要求：

- `.next/`、`node_modules/` 被 tracking 一律至少 P1
- 若導致 repo 極大或部署混亂，標示為 P1

### 4. Build / Type Check

```bash
npm run build
```

若專案有 lint/test script，也應執行：

```bash
npm run lint
npm test
```

若沒有相關 script，QA 日誌必須寫明「未提供」。

### 5. 安全檢查

必查項目：

- `dangerouslySetInnerHTML`
- `eval`
- `Function(...)`
- raw HTML rendering
- user input 直接進 DOM
- LLM output 直接進 DOM
- 外部 URL 未檢查
- server secret 傳到 client

建議命令：

```bash
rg -n "dangerouslySetInnerHTML|eval\\(|new Function|innerHTML|outerHTML" src
```

### 6. API 正確性檢查

對 API route 必查：

- malformed JSON
- 空欄位
- 非字串欄位
- 過長輸入
- env 缺失
- external API error
- 錯誤訊息是否洩漏敏感資訊

### 7. Dependency 維護性檢查

檢查：

- 是否使用 deprecated package
- 是否使用明顯過舊 SDK
- 是否新增不必要套件
- 是否有 lockfile

若引用「最新官方建議」，QA 必須查證官方文件，不得憑記憶。

## 五、風險分級標準

### P0 - 必須立即處理

符合任一條件：

- secret/API key/token 被提交或外洩
- 會造成資料外洩
- 會造成帳務損失
- 會讓專案無法安全 push
- production 主要功能完全不可用

### P1 - 高優先級

符合任一條件：

- 明顯 XSS / injection 風險
- `.next/`、`node_modules/` 被提交
- build 失敗
- 核心 MVP 流程壞掉
- 會大幅影響後續維護或部署

### P2 - 中優先級

符合任一條件：

- input validation 不足
- 錯誤處理不足
- SDK/dependency 維護風險
- 缺少必要來源或驗證資訊
- 上線前必須處理，但本機 MVP 可短暫接受

### P3 - 低優先級

符合任一條件：

- UI polish
- copywriting
- 非核心重構
- 可讀性優化
- 測試補強但目前風險低

## 六、QA 日誌必填格式

每次 QA 完成後必須建立：

```text
docs/qa-logs/YYYY-MM-DD_qa-log.md
```

若同日多次：

```text
docs/qa-logs/YYYY-MM-DD_qa-log-01.md
docs/qa-logs/YYYY-MM-DD_qa-log-02.md
```

QA 日誌必須包含：

```markdown
# QA 日誌 - YYYY-MM-DD

## 一、QA 基本資訊
- QA 日期：
- QA 人員/角色：
- 專案階段：
- 審查範圍：
- 審查基準：

## 二、檢測命令
列出實際執行命令與結果摘要。

## 三、總體結論
明確說明 pass/fail，以及是否可 push / 可部署 / 可進入下一輪測試。

## 四、修改項目表
| ID | 優先級 | 類型 | 檔案/範圍 | 證據 | 問題 | 要求修改 | 驗收標準 | 狀態 |
|---|---|---|---|---|---|---|---|---|

## 五、Claude 建議執行順序
列出具體順序。

## 六、驗收命令
列出 Claude 修完後必須跑的命令。

## 七、剩餘風險
列出 Deferred / Won't Fix 的原因。

## 八、QA 結論
一句話判定。
```

## 七、修改項目表規範

修改項目表是 QA 最重要產物。Claude 必須能只讀這張表就知道要改什麼。

每列必須包含：

- `ID`：例如 `QA-001`
- `優先級`：P0/P1/P2/P3
- `類型`：Security / Correctness / Maintainability / UX / Build / Product Quality
- `檔案/範圍`
- `證據`
- `問題`
- `要求修改`
- `驗收標準`
- `狀態`

狀態只能使用：

- `Open`
- `In Progress`
- `Fixed`
- `Verified`
- `Deferred`
- `Won't Fix`

## 八、QA 禁止事項

QA 不得：

- 沒看檔案就下結論
- 沒跑命令就宣稱 build pass/fail
- 把猜測寫成事實
- 完整印出 API key
- 因為是 MVP 就放過 secret 外洩
- 因為 build 通過就宣稱安全合格
- 只給抽象建議，不給驗收標準
- 要求 Claude 大範圍重構但沒有明確風險證據

## 九、QA 最終判定標準

QA 結論必須明確使用以下其中一種：

- `Pass`：可進入下一階段
- `Pass with Risks`：可繼續 MVP，但有明確剩餘風險
- `Fail`：不可 push、不可部署或不可交付測試
- `Blocked`：缺少必要資訊，無法完成 QA

若為 `Fail`，必須列出解除 Fail 的最低必要修改項目。

## 十、本專案目前 QA 基準

本專案目前處於 MVP 階段，因此 QA 基準如下：

可以接受：

- UI 尚未完整 polish
- 測試覆蓋不足
- 報告格式仍可優化
- citation metadata 暫時未完善

不可接受：

- API key 被 tracking
- `.env.local` 被 tracking
- `key.txt` 被 tracking
- `.next/` 被 tracking
- `node_modules/` 被 tracking
- 未消毒 LLM HTML 直接渲染
- `npm run build` 失敗

若不可接受項目存在，QA 結論必須是 `Fail` 或 `Pass with Risks`，不得判定為完全 `Pass`。
