# 🔍 MarketScout AI

> 給中小企業、電商品牌、商品開發者使用的 AI 市場調研工具。
> 輸入商品品類，5 分鐘產出競品分析、價格帶、消費者痛點、開發機會與主管摘要報告。

🌐 **線上使用**：[market-research-ai-eight.vercel.app](https://market-research-ai-eight.vercel.app/)

---

## 功能特色

- **市場概況 & 競品分析**：自動分析競品售價區間、提及熱度、評論情感、適合客群
- **視覺化儀表板**（專業版）：KPI 小卡、價格帶圖表、情感圓餅圖、競品售價區間、市場熱度趨勢
- **全局篩選器**：時間範圍切換、客群篩選、排除企業級極端值
- **評估計分卡**：依調研用途（採購/選品/競品分析）自動切換評分維度
- **資料可信度說明**：每項指標標明可信程度，供評估參考
- **PNG 圖表匯出**：一鍵匯出高畫質視覺化看板
- **Markdown 報告下載**：完整調研報告可供後續編輯與會議討論
- **依國家切換通路與評論來源**：支援台灣、日本、美國、東南亞、韓國、香港、中國大陸

---

## 技術架構

| 項目 | 技術 |
|-----|------|
| 前端框架 | Next.js 14.2.5 (App Router) |
| UI 樣式 | Tailwind CSS + @tailwindcss/typography |
| 圖表 | Recharts |
| AI 模型 | Google Gemini 2.5 Flash + Google Search Grounding |
| 圖表匯出 | html2canvas |
| XSS 防護 | isomorphic-dompurify |
| 部署 | Vercel |

---

## 🧩 提示詞外部化治理架構（Prompt Externalization）

本專案已將**所有核心 LLM 提示詞**從程式碼解耦，集中存放於 `prompts/` 目錄下的獨立 `.txt` 檔，與正式業務程式碼（Node.js / TypeScript）完全分離。

| 提示詞檔 | 角色 | 由何處動態載入 |
|---------|------|---------------|
| `prompts/市場調研分析師.txt` | 市場調研分析師 System Prompt | `src/app/api/research/route.ts` 於執行期以 `readFileSync` 讀入後回填變數 |

**核心價值 —— AI 大腦與程式碼解耦：**

- 開發者或 AI 代理可**直接修改 `.txt` 文本**來迭代「AI 大腦」（調整分析框架、章節結構、語氣、資料誠信規則），**無須更動任何 `.ts` 業務程式碼**。
- 提示詞以 `{{變數}}` 佔位符與 `<!--IF_*-->` 條件區塊保留動態能力；程式端只負責回填，不再內嵌冗長字串。
- 「Prompt 即產品」因此成為可獨立版本控制、可審查、可回歸測試的一級資產，而非散落在 route handler 裡的硬編碼字串。

---

## 本地開發

### 1. 安裝依賴

```bash
npm install
```

### 2. 設定環境變數

複製 `.env.example` 為 `.env.local`，填入必要的 API Key：

```bash
cp .env.example .env.local
```

`.env.local` 內容：

```
GEMINI_API_KEY=你的_Gemini_API_Key
VALID_ACCESS_CODES=DEV-2026
```

> Gemini API Key 申請：[Google AI Studio](https://aistudio.google.com/)

### 3. 啟動開發伺服器

```bash
npm run dev
```

開啟 [http://localhost:3000](http://localhost:3000)

---

## 方案說明

| 方案 | 功能 |
|-----|------|
| 免費版 | 完整 Markdown 文字調研報告 + 報告下載 |
| 專業版（授權碼解鎖）| 文字報告 + 視覺化圖表儀表板 + PNG 匯出 |

---

## 報告涵蓋章節

- 📊 市場概況
- 👥 目標客群
- 🏆 競品分析（含評論情感、適合客群、優勢弱點）
- 👥 客群對應推薦
- 🔄 替換成本評估（依品類自動切換欄位）
- 💰 市場價格帶
- ⭐ 熱賣賣點
- ❌ 負評與痛點
- 🚀 開發機會
- ⚠️ 採購風險
- 📐 建議規格
- 🔍 需求自我診斷
- ✅ 選品決策清單
- 📊 評估計分卡
- 🔬 資料可信度說明
- 📋 給主管的一頁摘要

---

## 注意事項

- 報告資料來自 Google Search 公開資訊，適合作為市場初步判斷、選品方向、競品整理、會議討論之用
- 電商銷量因刷單問題不納入評估，以「提及頻率」與「評論情感估算」作為判斷依據
- 詳細可信度說明請參考每份報告結尾的「🔬 資料可信度說明」章節

---

*Built with Next.js + Google Gemini AI*
