import { GoogleGenerativeAI } from "@google/generative-ai";
import { NextRequest, NextResponse } from "next/server";
import { readFile } from "fs/promises";
import path from "path";

const MAX_LEN = 200;
function toNumber(value: unknown, fallback = 0) {
  return typeof value === "number" && Number.isFinite(value) ? value : fallback;
}

function hasEvidenceUrl(competitor: Record<string, unknown>) {
  return Boolean(
    competitor.officialUrl ||
    competitor.marketplaceUrl ||
    (Array.isArray(competitor.evidenceUrls) && competitor.evidenceUrls.length > 0)
  );
}

function normalizeChartData(input: unknown) {
  if (typeof input !== "object" || input === null) return null;
  const data = input as Record<string, unknown>;
  const competitors = Array.isArray(data.competitors)
    ? data.competitors
        .filter((item): item is Record<string, unknown> => typeof item === "object" && item !== null)
        .map((item) => ({
          ...item,
          name: typeof item.name === "string" && item.name.trim() ? item.name : "待確認競品",
          minPrice: toNumber(item.minPrice),
          maxPrice: toNumber(item.maxPrice),
          mentionScore: toNumber(item.mentionScore),
          evidenceUrls: Array.isArray(item.evidenceUrls) ? item.evidenceUrls.filter((url) => typeof url === "string" && url.trim()) : [],
        }))
        .sort((a, b) => Number(hasEvidenceUrl(b)) - Number(hasEvidenceUrl(a)) || b.mentionScore - a.mentionScore)
    : [];

  return {
    ...data,
    competitors,
    trendBasis: {
      standard: "market_demand_heat_v1",
      description: "市場需求熱度固定以搜尋需求、通路能見度、評論討論、競品活動加權估算，不隨調研用途改變。",
      weights: { searchDemand: 35, commerceVisibility: 25, reviewDiscussion: 20, competitorActivity: 20 },
      ...(typeof data.trendBasis === "object" && data.trendBasis !== null ? data.trendBasis : {}),
    },
    saturationScore: toNumber(data.saturationScore),
    purposeFitScore: toNumber(data.purposeFitScore),
    developmentRecommendation:
      typeof data.developmentRecommendation === "object" && data.developmentRecommendation !== null
        ? data.developmentRecommendation
        : {
            level: "validate_first",
            summary: "市場熱度代表需求存在；是否適合開發仍需同時看飽和度、價格壓力、差異化空間與開發成本。",
          },
  };
}

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

  const reviewSourcesByCountry: Record<string, string> = {
    "台灣":   "PTT、Dcard、Mobile01、巴哈姆特、痞客邦、UrCosme、蝦皮評論、momo 評論",
    "日本":   "価格.com、Amazon JP 評論、Yahoo 知恵袋、楽天レビュー",
    "美國":   "Reddit、Amazon 評論、G2、Trustpilot、Yelp",
    "東南亞": "Shopee / Lazada 評論、Facebook 社團、TikTok 留言",
    "韓國":   "Naver 카페、Coupang 評論、네이버 블로그",
    "香港":   "HKTVmall 評論、Carousell、香港討論區（HKDiscuss）、Facebook 社團",
    "中國大陸": "小紅書、淘寶/天貓評論、微博、知乎、抖音留言",
  };
  const reviewSources = reviewSourcesByCountry[country] ?? "公開論壇與電商平台評論";

  const scorecardDimensions: Record<string, string[]> = {
    "採購評估":   ["價格符合預算", "功能符合需求", "易用性", "在地化支援", "資料安全合規", "替換成本（低分=鎖定風險高）"],
    "商品開發":   ["市場需求強度", "痛點明確度", "差異化機會", "競爭激烈度（低分=競爭越激烈）", "開發可行性", "趨勢方向"],
    "競品分析":   ["市場定位清晰度", "功能完整度", "定價競爭力", "品牌知名度", "成長趨勢", "弱點可攻破性"],
    "給主管的報告": ["市場機會大小", "風險程度（低分=風險越高）", "建議可執行性", "數據可信度", "投資報酬潛力", "時機急迫性"],
    "選品決策":   ["需求契合度", "毛利潛力", "競爭激烈度（低分=競爭越激烈）", "供應穩定性", "趨勢分數", "進入門檻（低分=門檻越高）"],
  };
  const dimensions = scorecardDimensions[purpose] ?? ["相關性", "可行性", "競爭優勢", "市場潛力", "風險程度（低分=風險越高）", "整體推薦度"];
  const dimensionList = dimensions.map((d, i) => `${i + 1}. ${d}`).join("\n");

  // 長 Prompt 已抽離至 prompts/市場調研分析師.txt，於執行期動態讀取後回填變數。
  // 使用函式型 replaceAll，避免回填值中的 `$` 被當成特殊取代樣式，行為與原本的 template literal 等價。
  const promptTemplate = await readFile(
    path.join(process.cwd(), "prompts", "市場調研分析師.txt"),
    "utf-8"
  );

  let prompt = promptTemplate
    .replaceAll("{{product}}", () => product)
    .replaceAll("{{country}}", () => country)
    .replaceAll("{{channel}}", () => channel)
    .replaceAll("{{purpose}}", () => purpose)
    .replaceAll("{{today}}", () => today)
    .replaceAll("{{reviewSources}}", () => reviewSources)
    .replaceAll("{{dimensionList}}", () => dimensionList)
    .replaceAll("{{dimensions0}}", () => dimensions[0])
    .replaceAll("{{dimensions1}}", () => dimensions[1])
    .replaceAll("{{dimensions2}}", () => dimensions[2])
    .replaceAll("{{dimensions3}}", () => dimensions[3])
    .replaceAll("{{dimensions4}}", () => dimensions[4])
    .replaceAll("{{dimensions5}}", () => dimensions[5]);

  // 條件區塊：官網/網站通路才輸出「官網轉化策略分析」（與原 `${isWebChannel ? ... : ""}` 邏輯等價）
  if (isWebChannel) {
    prompt = prompt
      .replace("<!--IF_WEB_CHANNEL-->\n", "")
      .replace("<!--END_IF_WEB_CHANNEL-->\n", "");
  } else {
    prompt = prompt.replace(
      /<!--IF_WEB_CHANNEL-->\n[\s\S]*?<!--END_IF_WEB_CHANNEL-->/,
      ""
    );
  }

  try {
    const result = await model.generateContent(prompt);
    const response = await result.response;
    const text = response.text();

    const chartMatch = text.match(/```chart-data\s*([\s\S]*?)```/);
    let chartData = null;
    let report = text;

    if (chartMatch) {
      try {
        chartData = normalizeChartData(JSON.parse(chartMatch[1].trim()));
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
