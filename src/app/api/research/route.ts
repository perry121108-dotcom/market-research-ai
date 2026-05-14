import { GoogleGenerativeAI } from "@google/generative-ai";
import { NextRequest, NextResponse } from "next/server";

const MAX_LEN = 200;

function isNonEmptyString(v: unknown): v is string {
  return typeof v === "string" && v.trim().length > 0;
}

export async function POST(req: NextRequest) {
  // QA-005: explicit env check before using the key
  const apiKey = process.env.GEMINI_API_KEY;
  if (!apiKey) {
    return NextResponse.json({ error: "伺服器設定錯誤，請聯絡管理員" }, { status: 500 });
  }

  // QA-004: handle malformed JSON
  let body: unknown;
  try {
    body = await req.json();
  } catch {
    return NextResponse.json({ error: "請求格式錯誤" }, { status: 400 });
  }

  if (typeof body !== "object" || body === null) {
    return NextResponse.json({ error: "請求格式錯誤" }, { status: 400 });
  }

  const { product, country, channel, purpose } = body as Record<string, unknown>;

  // QA-004: validate each field is a non-empty string with length limit
  if (!isNonEmptyString(product) || !isNonEmptyString(country) ||
      !isNonEmptyString(channel) || !isNonEmptyString(purpose)) {
    return NextResponse.json({ error: "缺少必要欄位或欄位格式錯誤" }, { status: 400 });
  }

  if (product.length > MAX_LEN || country.length > MAX_LEN ||
      channel.length > MAX_LEN || purpose.length > MAX_LEN) {
    return NextResponse.json({ error: "欄位內容過長" }, { status: 400 });
  }

  const genAI = new GoogleGenerativeAI(apiKey);
  const model = genAI.getGenerativeModel({
    model: "gemini-2.5-flash",
    // @ts-expect-error - googleSearch is valid but type definitions may lag
    tools: [{ googleSearch: {} }],
  });

  const today = new Date().toLocaleDateString("zh-TW");

  const isWebChannel = channel.includes("官網") || channel.includes("網站");

  const scorecardDimensions: Record<string, string[]> = {
    "採購評估":   ["價格符合預算", "功能符合需求", "易用性", "在地化支援", "資料安全合規", "替換成本（低分=鎖定風險高）"],
    "商品開發":   ["市場需求強度", "痛點明確度", "差異化機會", "競爭激烈度（低分=競爭越激烈）", "開發可行性", "趨勢方向"],
    "競品分析":   ["市場定位清晰度", "功能完整度", "定價競爭力", "品牌知名度", "成長趨勢", "弱點可攻破性"],
    "給主管的報告": ["市場機會大小", "風險程度（低分=風險越高）", "建議可執行性", "數據可信度", "投資報酬潛力", "時機急迫性"],
    "選品決策":   ["需求契合度", "毛利潛力", "競爭激烈度（低分=競爭越激烈）", "供應穩定性", "趨勢分數", "進入門檻（低分=門檻越高）"],
  };
  const dimensions = scorecardDimensions[purpose] ?? ["相關性", "可行性", "競爭優勢", "市場潛力", "風險程度（低分=風險越高）", "整體推薦度"];
  const dimensionList = dimensions.map((d, i) => `${i + 1}. ${d}`).join("\n");

  const prompt = `你是一位專業的市場調研分析師。

商品/品類：${product}
目標國家/地區：${country}
主要銷售通路：${channel}
調研用途：${purpose}

⚠️ 品類判斷規則（必須先判斷，影響後續章節格式）：
請根據「商品/品類」判斷屬於以下哪一類，並在報告中一致套用對應模板：
- 「實體商品」：服飾、3C、食品、美妝、家居、寵物用品等有形商品
- 「SaaS/軟體」：訂閱制工具、App、線上平台、雲端服務
- 「服務業」：顧問、設計、培訓、外包、代工服務
- 「內容/媒體」：課程、電子書、訂閱內容、創作者產品

⚠️ 資料誠信原則：
- 電商平台銷量容易被刷單，請勿引用絕對銷量數字
- 改用相對描述：「X品牌出現頻率最高」、「多個論壇提及」
- 價格可引用具體數字但標明「平台標示售價」
- 情感比例以「約 X% 正面 / Y% 負面」估算，並在括號內標明主要估算來源，例如：「（來源：PTT、Dcard、G2 等公開評論估算）」

【第一步】請先輸出以下 JSON，用三個反引號包住，標籤為 chart-data：

⚠️ JSON 一致性規則：
- competitors 陣列的品牌名稱，必須與下方【第二步】競品分析表格中列出的競品完全一致（相同品牌、相同數量，最多 5 個）。
- priceRange 的 low/mid/high 各自代表該價帶的實際售價區間，請填入該價帶的最低與最高價格數字。

\`\`\`chart-data
{
  "priceRange": {
    "low":  { "min": 數字, "max": 數字 },
    "mid":  { "min": 數字, "max": 數字 },
    "high": { "min": 數字, "max": 數字 },
    "currency": "TWD"
  },
  "competitors": [
    {"name": "品牌名", "minPrice": 數字, "maxPrice": 數字, "mentionScore": 1到10的數字}
  ],
  "sentiment": { "positive": 數字, "negative": 數字, "neutral": 數字 },
  "trendScore": [
    {"year": "2023", "score": 數字},
    {"year": "2024", "score": 數字},
    {"year": "2025", "score": 數字}
  ]
}
\`\`\`

【第二步】輸出 Markdown 報告：

# ${product} 市場調研報告
**國家/地區：** ${country} ｜ **銷售通路：** ${channel} ｜ **用途：** ${purpose} ｜ **資料時間：** ${today}

> ⚠️ **資料透明聲明**：競品資料來自 Google Search 公開資訊。電商銷量因刷單問題不納入評估，以「提及頻率」與「評論情感估算」作為判斷依據。

## 📊 市場概況

## 👥 目標客群

## 🏆 競品分析

競品表格需包含以下欄位。情感比例欄請標明估算來源（如 PTT、Dcard、G2、Trustpilot 等），並註明為公開評論估算，非平台官方評分：

| 競品/品牌 | ${channel} 售價區間 | 提及熱度 | 評論情感（來源：公開論壇估算） | 適合客群 | 主要優勢 | 弱點 |
|---------|--------------|--------|--------|--------|--------|------|

## 👥 客群對應推薦

依客群類型列出最適合的工具或方案，格式如下：

| 客群類型 | 最推薦選擇 | 次選 | 原因摘要 |
|--------|---------|------|--------|
${isWebChannel ? `
## 🌐 官網轉化策略分析

針對「${channel}」通路，分析各主要競品的官網銷售策略，包含：
- 免費試用方案（有無 / 天數 / 限制）
- 定價頁設計（方案數量、年繳折扣、隱藏費用）
- 主要 CTA（立即購買 / 免費試用 / 聯絡業務）
- 轉化亮點或特殊策略
` : ""}
## 🔄 替換成本評估

依據本品類屬於「實體商品」或「SaaS/軟體/服務」，使用對應的欄位格式：

**若為實體商品**，請使用以下欄位：
| 競品/品牌 | 品牌忠誠度 | 替代品豐富度 | 回購頻率 | 轉換難度 | 備註 |
|---------|---------|-----------|--------|--------|------|

**若為 SaaS/軟體/服務業**，請使用以下欄位：
| 競品/品牌 | 資料匯出格式 | API 開放程度 | 遷移難度 | 合約綁定 | 備註 |
|---------|----------|----------|--------|--------|------|

請選擇其中一種格式輸出，不要同時輸出兩種。

## 💰 市場價格帶

價格帶說明規則：
- 若某競品價格區間過寬（例如橫跨 10 倍以上），請額外補充一行說明「台灣中小企業（5–50人）實際採用方案約落在 NT$X–Y/月」，避免區間失去參考價值。
- 每個價格區間（低/中/高）請說明對應的典型採購者是誰。

## ⭐ 熱賣賣點

## ❌ 負評與痛點

## 🚀 開發機會

## ⚠️ 採購風險

## 📐 建議規格

## 🔍 需求自我診斷

依品類類型，輸出最符合情境的診斷引導表（4–6 行即可）：
- 實體商品：聚焦預算、用途情境、功能需求、品質要求
- SaaS/軟體：聚焦團隊規模、功能需求、預算、整合需求
- 服務業：聚焦需求規模、預算、服務深度、在地化需求

| 我的情況 | 建議方向 |
|--------|--------|

## ✅ 選品決策清單

列出 6–8 個 Yes/No 問題，協助讀者快速判斷是否適合採購或進入此市場。格式：

- [ ] 問題一？
- [ ] 問題二？

## 📊 評估計分卡

本次調研用途為「${purpose}」，請依以下 6 個維度，對報告中出現的主要競品（最多 5 個）逐一評分（1–5 分），並在表格最右欄加總。分數最高者標記「⭐ 推薦」。

評分維度：
${dimensionList}

評分規則：
- 5 = 非常符合 / 非常強
- 3 = 普通 / 中等
- 1 = 非常不符合 / 非常弱
- 若資料不足以判斷，填「-」

輸出格式：

| 競品/項目 | ${dimensions[0]} | ${dimensions[1]} | ${dimensions[2]} | ${dimensions[3]} | ${dimensions[4]} | ${dimensions[5]} | 總分 | 推薦 |
|---------|--------|--------|--------|--------|--------|--------|------|------|

表格下方請補充 1–2 句說明「為何推薦分數最高的選項」。

---

## 📋 給主管的一頁摘要

**結論：**

**三大機會：**
1.
2.
3.

**三大風險：**
1.
2.
3.

**建議行動：**

## 🔬 資料可信度說明

本報告各項指標的資料來源與可信程度如下，供讀者評估參考時使用：

| 指標 | 可信程度 | 說明 |
|-----|--------|------|
| 競品名稱與品牌 | ⭐⭐⭐⭐⭐ 高 | 來自 Google Search 公開資訊，可直接查證 |
| 售價區間 | ⭐⭐⭐⭐ 高 | 來自平台標示售價，可能因促銷或時間有所變動 |
| 競品優勢與弱點 | ⭐⭐⭐ 中 | 綜合公開評測、論壇討論整理，具代表性但非全面 |
| 評論情感比例 | ⭐⭐ 中低 | 依 PTT、Dcard、G2 等論壇公開評論估算，非平台官方統計，樣本數不一 |
| 市場熱度趨勢 | ⭐⭐ 中低 | 依搜尋提及量、論壇討論量、競品數量綜合推估，僅供趨勢方向參考 |
| 開發機會與風險 | ⭐⭐⭐ 中 | 基於公開資訊的 AI 分析推論，建議搭配實際市場驗證 |

> ℹ️ 本報告適合作為**市場初步判斷、選品方向、競品整理、會議討論**之用。如需精準決策，建議以本報告為起點，進一步進行一手訪談或實際測試。

---
*本報告由 MarketScout AI 結合 Google Search 即時資料生成。*`;

  try {
    const result = await model.generateContent(prompt);
    const response = await result.response;
    const text = response.text();

    const chartMatch = text.match(/```chart-data\s*([\s\S]*?)```/);
    let chartData = null;
    let report = text;

    if (chartMatch) {
      try {
        chartData = JSON.parse(chartMatch[1].trim());
        report = text.replace(/```chart-data[\s\S]*?```\s*/, "").trim();
      } catch {
        // keep full text as report if JSON parse fails
      }
    }

    return NextResponse.json({ report, chartData });
  } catch (err) {
    console.error(err);
    return NextResponse.json({ error: "AI 分析失敗，請稍後再試" }, { status: 500 });
  }
}
