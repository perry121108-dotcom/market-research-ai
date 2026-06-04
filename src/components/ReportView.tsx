"use client";

import { useMemo, useRef, useState } from "react";
import { marked } from "marked";
import DOMPurify from "isomorphic-dompurify";
import html2canvas from "html2canvas";
import {
  Bar,
  BarChart,
  CartesianGrid,
  Cell,
  LabelList,
  Legend,
  Line,
  LineChart,
  Pie,
  PieChart,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis,
} from "recharts";

export type RecommendationLevel = "go" | "differentiate" | "validate_first" | "avoid";

export interface CompetitorData {
  name: string;
  productName?: string | null;
  modelName?: string | null;
  officialUrl?: string | null;
  marketplaceUrl?: string | null;
  evidenceUrls?: string[];
  evidenceSummary?: string | null;
  whyRecommended?: string | null;
  confidence?: "high" | "medium" | "low" | string;
  minPrice: number;
  maxPrice: number;
  mentionScore: number;
}

export interface ChartData {
  priceRange: {
    low: { min: number; max: number };
    mid: { min: number; max: number };
    high: { min: number; max: number };
    currency: string;
  };
  competitors: CompetitorData[];
  sentiment: { positive: number; negative: number; neutral: number };
  trendScore: Array<{ year: string; score: number }>;
  trendBasis?: {
    standard?: string;
    description?: string;
    weights?: Record<string, number>;
  };
  saturationScore?: number;
  purposeFitScore?: number;
  developmentRecommendation?: {
    level: RecommendationLevel | string;
    summary: string;
  };
}

interface Props {
  report: string;
  product: string;
  market: string;
  chartData: ChartData | null;
  isPaid: boolean;
}

type TimeRange = "1y" | "3y" | "forecast";
type AudienceFilter = "all" | "sme" | "enterprise";

const PIE_COLORS = ["#16a34a", "#dc2626", "#94a3b8"];
const BAR_COLORS = ["#2563eb", "#0891b2", "#7c3aed"];

function scoreLabel(score?: number) {
  if (typeof score !== "number" || Number.isNaN(score)) return "-";
  return `${Math.round(score)}/100`;
}

function competitorHref(competitor?: CompetitorData) {
  return competitor?.officialUrl || competitor?.marketplaceUrl || competitor?.evidenceUrls?.[0] || null;
}

function competitorTitle(competitor?: CompetitorData) {
  if (!competitor) return "-";
  return [competitor.name, competitor.productName, competitor.modelName].filter(Boolean).join(" ");
}

function topCompetitor(list: CompetitorData[]) {
  const withEvidence = list.filter((c) => competitorHref(c));
  const pool = withEvidence.length > 0 ? withEvidence : list;
  return [...pool].sort((a, b) => b.mentionScore - a.mentionScore)[0];
}

function audienceLabel(audience: AudienceFilter) {
  switch (audience) {
    case "sme":
      return "????";
    case "enterprise":
      return "????";
    default:
      return "????";
  }
}

function recommendationText(level?: string) {
  switch (level) {
    case "go":
      return { label: "可開發", color: "text-emerald-700 bg-emerald-50 border-emerald-200" };
    case "differentiate":
      return { label: "差異化開發", color: "text-blue-700 bg-blue-50 border-blue-200" };
    case "validate_first":
      return { label: "先小量驗證", color: "text-amber-700 bg-amber-50 border-amber-200" };
    case "avoid":
      return { label: "不建議開發", color: "text-red-700 bg-red-50 border-red-200" };
    default:
      return { label: "需人工判讀", color: "text-slate-700 bg-slate-50 border-slate-200" };
  }
}

function KpiCards({ data, competitors, audience }: { data: ChartData; competitors: CompetitorData[]; audience: AudienceFilter }) {
  const list = competitors.length > 0 ? competitors : data.competitors;
  const top = topCompetitor(list);
  const href = competitorHref(top);
  const avgPrice = list.length > 0
    ? Math.round(list.reduce((sum, c) => sum + (c.minPrice + c.maxPrice) / 2, 0) / list.length)
    : Math.round((data.priceRange.mid.min + data.priceRange.mid.max) / 2);
  const total = data.sentiment.positive + data.sentiment.negative + data.sentiment.neutral || 100;
  const positivePct = Math.round((data.sentiment.positive / total) * 100);
  const latestTrend = [...(data.trendScore ?? [])].sort((a, b) => a.year.localeCompare(b.year)).at(-1)?.score;
  const sourceText = top?.evidenceSummary || top?.whyRecommended || (href ? "????????????" : "????????????????");

  return (
    <div className="grid gap-3 md:grid-cols-4 mb-4">
      <div className="bg-white rounded-lg border border-blue-200 px-4 py-3 md:col-span-2">
        <div className="flex items-center justify-between gap-2 mb-1">
          <p className="text-xs text-gray-500">????</p>
          <span className="text-[11px] rounded-full bg-blue-50 px-2 py-0.5 font-medium text-blue-700">
            ? {audienceLabel(audience)} ??
          </span>
        </div>
        {href ? (
          <a href={href} target="_blank" rel="noreferrer" className="text-lg font-bold text-blue-700 leading-tight break-words hover:underline">
            {competitorTitle(top)}
          </a>
        ) : (
          <p className="text-lg font-bold text-gray-900 leading-tight break-words">{competitorTitle(top)}</p>
        )}
        <p className="text-xs text-gray-500 mt-1">?? {top?.mentionScore ?? 0}/10 ? {sourceText}</p>
        {href && (
          <a href={href} target="_blank" rel="noreferrer" className="mt-2 inline-flex text-xs font-semibold text-blue-600 hover:underline">
            ??????
          </a>
        )}
      </div>
      <div className="bg-white rounded-lg border border-gray-200 px-4 py-3">
        <p className="text-xs text-gray-500 mb-1">??????</p>
        <p className="text-lg font-bold text-gray-900">{scoreLabel(latestTrend)}</p>
        <p className="text-xs text-gray-400 mt-1">???????????</p>
      </div>
      <div className="bg-white rounded-lg border border-gray-200 px-4 py-3">
        <p className="text-xs text-gray-500 mb-1">?????</p>
        <p className="text-lg font-bold text-gray-900">NT$ {avgPrice.toLocaleString()}</p>
        <p className="text-xs text-gray-400 mt-1">?????????</p>
      </div>
      <div className="bg-white rounded-lg border border-gray-200 px-4 py-3 md:col-span-4 lg:col-span-1">
        <p className="text-xs text-gray-500 mb-1">????</p>
        <p className="text-lg font-bold text-gray-900">{positivePct}%</p>
        <p className="text-xs text-gray-400 mt-1">??????????</p>
      </div>
    </div>
  );
}

function DecisionSummary({ data }: { data: ChartData }) {
  const latestTrend = [...(data.trendScore ?? [])].sort((a, b) => a.year.localeCompare(b.year)).at(-1)?.score;
  const recommendation = recommendationText(data.developmentRecommendation?.level);

  return (
    <div className="mb-4 rounded-lg border border-slate-200 bg-white px-4 py-3">
      <div className="flex flex-wrap items-start justify-between gap-3">
        <div>
          <p className="text-sm font-semibold text-gray-800">市場熱度與用途判讀</p>
          <p className="text-xs text-gray-500 mt-1 max-w-3xl">
            市場需求熱度採固定標準：搜尋需求、通路能見度、評論討論與競品活動。調研用途只影響用途適配與開發建議，不會改寫同一商品的市場熱度。
          </p>
        </div>
        <span className={`text-xs font-semibold px-2.5 py-1 rounded-full border ${recommendation.color}`}>
          {recommendation.label}
        </span>
      </div>
      <div className="grid gap-3 md:grid-cols-3 mt-3">
        <div className="rounded-md bg-slate-50 px-3 py-2">
          <p className="text-xs text-gray-500">市場需求熱度</p>
          <p className="text-base font-bold text-gray-900">{scoreLabel(latestTrend)}</p>
        </div>
        <div className="rounded-md bg-slate-50 px-3 py-2">
          <p className="text-xs text-gray-500">用途適配分數</p>
          <p className="text-base font-bold text-gray-900">{scoreLabel(data.purposeFitScore)}</p>
        </div>
        <div className="rounded-md bg-slate-50 px-3 py-2">
          <p className="text-xs text-gray-500">市場飽和度</p>
          <p className="text-base font-bold text-gray-900">{scoreLabel(data.saturationScore)}</p>
        </div>
      </div>
      <p className="text-xs text-gray-600 mt-3">
        {data.developmentRecommendation?.summary ?? "若選品熱度高但開發建議偏低，通常代表需求存在，但競爭密度、價格壓力、差異化難度或開發成本讓直接投入風險偏高。"}
      </p>
    </div>
  );
}

function GlobalFilters({
  timeRange, setTimeRange,
  audience, setAudience,
  excludeOutliers, setExcludeOutliers,
}: {
  timeRange: TimeRange; setTimeRange: (v: TimeRange) => void;
  audience: AudienceFilter; setAudience: (v: AudienceFilter) => void;
  excludeOutliers: boolean; setExcludeOutliers: (v: boolean) => void;
}) {
  const btnClass = (active: boolean) =>
    `text-xs px-2.5 py-1 rounded-full border transition-colors ${
      active ? "bg-blue-600 text-white border-blue-600" : "bg-white text-gray-600 border-gray-300 hover:border-blue-400"
    }`;

  return (
    <div className="flex items-center gap-4 mb-4 flex-wrap">
      <div className="flex items-center gap-1.5">
        <span className="text-xs text-gray-500 mr-0.5">時間</span>
        {([ ["1y", "近 1 年"], ["3y", "近 3 年"], ["forecast", "含預估"] ] as [TimeRange, string][]).map(([v, label]) => (
          <button key={v} onClick={() => setTimeRange(v)} className={btnClass(timeRange === v)}>{label}</button>
        ))}
      </div>
      <div className="flex items-center gap-1.5">
        <span className="text-xs text-gray-500 mr-0.5">客群</span>
        {([ ["all", "全部"], ["sme", "中低價"], ["enterprise", "高價"] ] as [AudienceFilter, string][]).map(([v, label]) => (
          <button key={v} onClick={() => setAudience(v)} className={btnClass(audience === v)}>{label}</button>
        ))}
      </div>
      <button
        onClick={() => setExcludeOutliers(!excludeOutliers)}
        className={`text-xs px-2.5 py-1 rounded-full border transition-colors ${
          excludeOutliers ? "bg-amber-500 text-white border-amber-500" : "bg-white text-gray-600 border-gray-300 hover:border-amber-400"
        }`}
      >
        {excludeOutliers ? "已排除極端價" : "排除極端價"}
      </button>
    </div>
  );
}

function PriceChart({ data, activeCompetitor, competitors, isExporting }: {
  data: ChartData["priceRange"];
  activeCompetitor: string | null;
  competitors: CompetitorData[];
  isExporting: boolean;
}) {
  const activeBand = useMemo(() => {
    if (!activeCompetitor) return null;
    const c = competitors.find((item) => item.name === activeCompetitor);
    if (!c) return null;
    const mid = (c.minPrice + c.maxPrice) / 2;
    if (mid <= data.low.max) return "低價帶";
    if (mid <= data.mid.max) return "中價帶";
    return "高價帶";
  }, [activeCompetitor, competitors, data]);

  const bars = [
    { name: "低價帶", floor: data.low.min, range: data.low.max - data.low.min, min: data.low.min, max: data.low.max },
    { name: "中價帶", floor: data.mid.min, range: data.mid.max - data.mid.min, min: data.mid.min, max: data.mid.max },
    { name: "高價帶", floor: data.high.min, range: data.high.max - data.high.min, min: data.high.min, max: data.high.max },
  ];

  return (
    <div>
      <div className="flex items-center gap-2 mb-2">
        <p className="text-sm font-semibold text-gray-700">價格區間 ({data.currency})</p>
        {activeCompetitor && activeBand && !isExporting && (
          <span className="text-xs bg-blue-100 text-blue-600 px-2 py-0.5 rounded-full">
            {activeCompetitor} · {activeBand}
          </span>
        )}
      </div>
      <ResponsiveContainer width="100%" height={170}>
        <BarChart data={bars} margin={{ top: 20, right: 10, left: 10, bottom: 0 }}>
          <CartesianGrid strokeDasharray="3 3" vertical={false} />
          <XAxis dataKey="name" tick={{ fontSize: 12 }} />
          <YAxis tick={{ fontSize: 11 }} />
          {!isExporting && <Tooltip content={({ active, payload }) => {
            if (!active || !payload?.length) return null;
            const d = payload[0].payload as { name: string; min: number; max: number };
            return (
              <div className="bg-white border border-gray-200 rounded px-2 py-1 text-xs shadow">
                <p>{d.name}: {d.min.toLocaleString()} - {d.max.toLocaleString()} {data.currency}</p>
              </div>
            );
          }} />}
          <Bar dataKey="floor" stackId="a" fill="transparent" isAnimationActive={!isExporting} />
          <Bar dataKey="range" stackId="a" radius={[4, 4, 0, 0]} isAnimationActive={!isExporting}>
            {bars.map((bar, index) => (
              <Cell key={bar.name} fill={BAR_COLORS[index]} opacity={activeBand && bar.name !== activeBand ? 0.25 : 1} />
            ))}
            <LabelList content={(props) => {
              const { x, y, width, index } = props as { x: number; y: number; width: number; index: number };
              const bar = bars[index];
              if (!bar || bar.range <= 0) return null;
              return (
                <text x={Number(x) + Number(width) / 2} y={Number(y) - 4} textAnchor="middle" fontSize={9} fill="#4b5563">
                  {bar.min.toLocaleString()}-{bar.max.toLocaleString()}
                </text>
              );
            }} />
          </Bar>
        </BarChart>
      </ResponsiveContainer>
    </div>
  );
}

function SentimentChart({ data, activeCompetitor, isExporting }: {
  data: ChartData["sentiment"];
  activeCompetitor: string | null;
  isExporting: boolean;
}) {
  const total = data.positive + data.negative + data.neutral || 100;
  const pie = [
    { name: "正向", value: Math.round((data.positive / total) * 100) },
    { name: "負向", value: Math.round((data.negative / total) * 100) },
    { name: "中立", value: Math.round((data.neutral / total) * 100) },
  ];

  return (
    <div>
      <div className="flex items-center gap-2 mb-2">
        <p className="text-sm font-semibold text-gray-700">評論情緒比例</p>
        {activeCompetitor && !isExporting && (
          <span className="text-xs bg-gray-100 text-gray-500 px-2 py-0.5 rounded-full">目前聚焦競品</span>
        )}
      </div>
      <ResponsiveContainer width="100%" height={170}>
        <PieChart>
          <Pie data={pie} dataKey="value" cx="50%" cy="50%" outerRadius={60} isAnimationActive={!isExporting}>
            {pie.map((item, index) => <Cell key={item.name} fill={PIE_COLORS[index]} />)}
          </Pie>
          <Legend iconSize={10} wrapperStyle={{ fontSize: 11 }} formatter={(value, entry) =>
            `${value} ${(entry as { payload?: { value: number } }).payload?.value ?? 0}%`
          } />
          {!isExporting && <Tooltip formatter={(value) => `${value}%`} />}
        </PieChart>
      </ResponsiveContainer>
      <p className="text-xs text-gray-400 text-center">* 依評論、社群討論與報告摘要估算</p>
    </div>
  );
}

function CompetitorChart({ data, activeCompetitor, onHover, isExporting }: {
  data: CompetitorData[];
  activeCompetitor: string | null;
  onHover: (name: string | null) => void;
  isExporting: boolean;
}) {
  const cdata = data.map((competitor) => ({
    name: competitor.name,
    label: competitorTitle(competitor),
    floor: competitor.minPrice,
    range: competitor.maxPrice - competitor.minPrice,
    min: competitor.minPrice,
    max: competitor.maxPrice,
    href: competitorHref(competitor),
    evidenceSummary: competitor.evidenceSummary,
  }));

  return (
    <div>
      <p className="text-sm font-semibold text-gray-700 mb-2">競品價格比較</p>
      <ResponsiveContainer width="100%" height={170}>
        <BarChart data={cdata} margin={{ top: 20, right: 10, left: 10, bottom: 0 }} onMouseLeave={() => !isExporting && onHover(null)}>
          <CartesianGrid strokeDasharray="3 3" vertical={false} />
          <XAxis dataKey="name" tick={{ fontSize: 11 }} />
          <YAxis tick={{ fontSize: 11 }} />
          {!isExporting && <Tooltip content={({ active, payload }) => {
            if (!active || !payload?.length) return null;
            const d = payload[0].payload as { label: string; min: number; max: number; href?: string | null; evidenceSummary?: string | null };
            return (
              <div className="bg-white border border-gray-200 rounded px-2 py-1 text-xs shadow max-w-xs">
                <p className="font-semibold text-gray-800">{d.label}</p>
                <p>{d.min.toLocaleString()} - {d.max.toLocaleString()}</p>
                {d.href && <p className="text-blue-600 truncate">{d.href}</p>}
                {d.evidenceSummary && <p className="text-gray-500 mt-1">{d.evidenceSummary}</p>}
              </div>
            );
          }} />}
          <Bar dataKey="floor" stackId="a" fill="transparent" isAnimationActive={!isExporting} />
          <Bar dataKey="range" stackId="a" radius={[2, 2, 0, 0]} isAnimationActive={!isExporting} onMouseEnter={(entry: unknown) => !isExporting && onHover((entry as { name: string }).name)}>
            {cdata.map((competitor) => (
              <Cell key={competitor.name} fill="#2563eb" opacity={activeCompetitor && competitor.name !== activeCompetitor ? 0.25 : 1} />
            ))}
            <LabelList content={(props) => {
              const { x, y, width, index } = props as { x: number; y: number; width: number; index: number };
              const competitor = cdata[index];
              if (!competitor || competitor.range <= 0) return null;
              return (
                <text x={Number(x) + Number(width) / 2} y={Number(y) - 4} textAnchor="middle" fontSize={9} fill="#4b5563">
                  {competitor.min.toLocaleString()}-{competitor.max.toLocaleString()}
                </text>
              );
            }} />
          </Bar>
        </BarChart>
      </ResponsiveContainer>
    </div>
  );
}

function TrendChart({ data, product, timeRange, activeCompetitor, isExporting }: {
  data: ChartData["trendScore"];
  product: string;
  timeRange: TimeRange;
  activeCompetitor: string | null;
  isExporting: boolean;
}) {
  const filtered = useMemo(() => {
    if (timeRange === "1y") return data.filter((item) => item.year >= "2024");
    return data;
  }, [data, timeRange]);

  return (
    <div>
      <div className="flex items-center gap-2 mb-2">
        <p className="text-sm font-semibold text-gray-700">{product} 市場需求熱度趨勢</p>
        {activeCompetitor && !isExporting && (
          <span className="text-xs bg-gray-100 text-gray-500 px-2 py-0.5 rounded-full">目前聚焦競品</span>
        )}
      </div>
      <ResponsiveContainer width="100%" height={170}>
        <LineChart data={filtered} margin={{ top: 20, right: 10, left: 10, bottom: 0 }}>
          <CartesianGrid strokeDasharray="3 3" vertical={false} />
          <XAxis dataKey="year" tick={{ fontSize: 12 }} />
          <YAxis domain={[0, 100]} tick={{ fontSize: 11 }} />
          {!isExporting && <Tooltip formatter={(value) => `熱度 ${value}/100`} />}
          <Line type="monotone" dataKey="score" stroke="#2563eb" strokeWidth={2} isAnimationActive={!isExporting} dot={(props: { cx: number; cy: number; payload: { year: string } }) => (
            <circle key={props.payload.year} cx={props.cx} cy={props.cy} r={4} fill={props.payload.year === "2025" && timeRange === "forecast" ? "#f59e0b" : "#2563eb"} stroke="white" strokeWidth={1} />
          )}>
            <LabelList dataKey="score" position="top" fontSize={10} fill="#4b5563" formatter={(value: number) => value} />
          </Line>
        </LineChart>
      </ResponsiveContainer>
      <p className="text-xs text-gray-400 text-center">
        固定標準：搜尋需求 35%、通路能見度 25%、評論討論 20%、競品活動 20%；用途只影響適配與開發建議。
      </p>
    </div>
  );
}

export default function ReportView({ report, product, market, chartData, isPaid }: Props) {
  const [copied, setCopied] = useState(false);
  const [isExporting, setIsExporting] = useState(false);
  const [activeCompetitor, setActiveCompetitor] = useState<string | null>(null);
  const [timeRange, setTimeRange] = useState<TimeRange>("3y");
  const [audience, setAudience] = useState<AudienceFilter>("all");
  const [excludeOutliers, setExcludeOutliers] = useState(false);
  const dashboardRef = useRef<HTMLDivElement>(null);

  const filteredCompetitors = useMemo(() => {
    if (!chartData) return [];
    let list = [...chartData.competitors];
    if (excludeOutliers && list.length > 1) {
      const sortedMax = [...list].sort((a, b) => a.maxPrice - b.maxPrice);
      const medianMax = sortedMax[Math.floor((sortedMax.length - 1) / 2)].maxPrice;
      list = list.filter((competitor) => competitor.maxPrice <= medianMax * 3);
    }
    const sorted = list.sort((a, b) => (a.minPrice + a.maxPrice) - (b.minPrice + b.maxPrice));
    if (audience === "all") return sorted;
    if (sorted.length === 0) return sorted;
    const mid = sorted[Math.floor(sorted.length / 2)];
    const medianMid = (mid.minPrice + mid.maxPrice) / 2;
    if (audience === "sme") return sorted.filter((competitor) => (competitor.minPrice + competitor.maxPrice) / 2 <= medianMid);
    return sorted.filter((competitor) => (competitor.minPrice + competitor.maxPrice) / 2 >= medianMid);
  }, [chartData, audience, excludeOutliers]);

  const handleCopy = async () => {
    await navigator.clipboard.writeText(report);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  const handleDownload = () => {
    const blob = new Blob([report], { type: "text/markdown;charset=utf-8" });
    const url = URL.createObjectURL(blob);
    const anchor = document.createElement("a");
    anchor.href = url;
    anchor.download = `market-research-${product}-${new Date().toISOString().slice(0, 10)}.md`;
    anchor.click();
    URL.revokeObjectURL(url);
  };

  const handleExportCharts = async () => {
    if (!dashboardRef.current) return;
    try {
      setIsExporting(true);
      await new Promise((resolve) => setTimeout(resolve, 150));
      const canvas = await html2canvas(dashboardRef.current, {
        scale: 2,
        backgroundColor: "#ffffff",
        useCORS: true,
      });
      const url = canvas.toDataURL("image/png");
      const anchor = document.createElement("a");
      anchor.href = url;
      anchor.download = `market-dashboard-${product}-${new Date().toISOString().slice(0, 10)}.png`;
      document.body.appendChild(anchor);
      anchor.click();
      document.body.removeChild(anchor);
    } catch (err) {
      console.error("圖表匯出失敗", err);
    } finally {
      setIsExporting(false);
    }
  };

  const html = DOMPurify.sanitize(marked(report) as string);

  return (
    <div className="bg-white rounded-2xl shadow-sm border border-gray-200 overflow-hidden">
      <div className="flex items-center justify-between px-6 py-4 border-b border-gray-100 bg-gray-50">
        <div>
          <span className="text-sm font-semibold text-gray-800">市場調研報告</span>
          <span className="ml-2 text-xs text-gray-500">{product} · {market}</span>
        </div>
        <div className="flex gap-2">
          <button onClick={handleCopy} className="text-sm px-4 py-1.5 rounded-lg border border-gray-300 hover:bg-gray-100 transition-colors text-gray-700">
            {copied ? "已複製" : "複製 Markdown"}
          </button>
          <button onClick={handleDownload} className="text-sm px-4 py-1.5 rounded-lg bg-blue-600 text-white hover:bg-blue-700 transition-colors">
            下載 .md
          </button>
        </div>
      </div>

      {isPaid && chartData ? (
        <div className="border-b border-gray-100 bg-slate-50 px-6 py-5">
          <div className="flex items-center justify-between mb-4">
            <div className="flex items-center gap-2 flex-wrap">
              <span className="text-sm font-semibold text-gray-800">視覺化決策儀表板</span>
              <span className="text-xs bg-blue-100 text-blue-700 px-2 py-0.5 rounded-full">AI 分析</span>
              <span className="text-xs text-gray-400">競品連結與分數為可查證依據優先</span>
            </div>
            <button
              onClick={handleExportCharts}
              disabled={isExporting}
              className={`text-sm px-4 py-1.5 rounded-lg transition-colors ${
                isExporting ? "bg-gray-300 text-gray-500 cursor-not-allowed" : "bg-indigo-600 text-white hover:bg-indigo-700"
              }`}
            >
              {isExporting ? "匯出中..." : "匯出儀表板 PNG"}
            </button>
          </div>

          <div ref={dashboardRef} className="bg-slate-50 p-2">
            {!isExporting && (
              <GlobalFilters
                timeRange={timeRange} setTimeRange={setTimeRange}
                audience={audience} setAudience={setAudience}
                excludeOutliers={excludeOutliers} setExcludeOutliers={setExcludeOutliers}
              />
            )}
            <KpiCards data={chartData} competitors={filteredCompetitors} audience={audience} />
            <DecisionSummary data={chartData} />
            <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
              {chartData.priceRange && (
                <PriceChart data={chartData.priceRange} activeCompetitor={activeCompetitor} competitors={filteredCompetitors} isExporting={isExporting} />
              )}
              {chartData.sentiment && (
                <SentimentChart data={chartData.sentiment} activeCompetitor={activeCompetitor} isExporting={isExporting} />
              )}
              {filteredCompetitors.length > 0 && (
                <CompetitorChart data={filteredCompetitors} activeCompetitor={activeCompetitor} onHover={setActiveCompetitor} isExporting={isExporting} />
              )}
              {chartData.trendScore?.length > 0 && (
                <TrendChart data={chartData.trendScore} product={product} timeRange={timeRange} activeCompetitor={activeCompetitor} isExporting={isExporting} />
              )}
            </div>
          </div>
        </div>
      ) : !isPaid ? (
        <div className="border-b border-gray-100 bg-gradient-to-r from-amber-50 to-orange-50 px-6 py-5">
          <div className="flex items-center justify-between">
            <div>
              <div className="flex items-center gap-2 mb-1">
                <span className="text-sm font-semibold text-gray-800">視覺化決策儀表板</span>
                <span className="text-xs bg-amber-100 text-amber-700 px-2 py-0.5 rounded-full font-medium">PRO</span>
              </div>
              <p className="text-xs text-gray-500">解鎖後可查看 KPI、競品連結、用途適配、飽和度與趨勢圖，並匯出 PNG。</p>
            </div>
            <div className="text-3xl opacity-30 select-none">PRO</div>
          </div>
        </div>
      ) : null}

      <div
        className="prose prose-gray max-w-none p-8 prose-headings:text-gray-900 prose-h1:text-2xl prose-h2:text-lg prose-h2:border-b prose-h2:border-gray-200 prose-h2:pb-2 prose-table:text-sm prose-td:text-xs prose-th:text-xs"
        dangerouslySetInnerHTML={{ __html: html }}
      />

      <div className="border-t border-gray-100 bg-amber-50 px-6 py-4 text-center">
        <p className="text-sm text-amber-800 font-medium">需要更精準的資料來源或人工驗證，可進一步做深度調研。</p>
        <p className="text-xs text-amber-600 mt-1">
          適合要做選品、開發、定價、競品定位與市場驗證的團隊。
        </p>
      </div>
    </div>
  );
}
