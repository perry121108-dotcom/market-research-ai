"use client";

import { useState, useMemo, useRef } from "react";
import { marked } from "marked";
import DOMPurify from "isomorphic-dompurify";
import html2canvas from "html2canvas";
import {
  BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, LabelList,
  ResponsiveContainer, PieChart, Pie, Cell, Legend, LineChart, Line,
} from "recharts";

export interface ChartData {
  priceRange: {
    low: { min: number; max: number };
    mid: { min: number; max: number };
    high: { min: number; max: number };
    currency: string;
  };
  competitors: Array<{ name: string; minPrice: number; maxPrice: number; mentionScore: number }>;
  sentiment: { positive: number; negative: number; neutral: number };
  trendScore: Array<{ year: string; score: number }>;
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

const PIE_COLORS = ["#22c55e", "#ef4444", "#94a3b8"];
const BAR_COLORS = ["#3b82f6", "#6366f1", "#8b5cf6"];

// ── C3: KPI 數字小卡 ────────────────────────────────────────────────────────
function KpiCards({ data, competitors }: { data: ChartData; competitors: ChartData["competitors"] }) {
  const list = competitors.length > 0 ? competitors : data.competitors;
  const top = [...list].sort((a, b) => b.mentionScore - a.mentionScore)[0];
  const avgPrice = list.length > 0
    ? Math.round(list.reduce((s, c) => s + (c.minPrice + c.maxPrice) / 2, 0) / list.length)
    : Math.round((data.priceRange.mid.min + data.priceRange.mid.max) / 2);
  const total = data.sentiment.positive + data.sentiment.negative + data.sentiment.neutral || 100;
  const positivePct = Math.round((data.sentiment.positive / total) * 100);

  const cards = [
    { icon: "🏆", label: "首推競品", value: top?.name ?? "—", sub: `熱度 ${top?.mentionScore ?? 0}/10` },
    { icon: "💰", label: "市場均價", value: `NT$ ${avgPrice.toLocaleString()}`, sub: "中價帶中位數" },
    { icon: "😊", label: "好評率", value: `${positivePct}%`, sub: "正面評論估算佔比" },
  ];

  return (
    <div className="grid grid-cols-3 gap-3 mb-4">
      {cards.map((c) => (
        <div key={c.label} className="bg-white rounded-xl border border-gray-200 px-4 py-3">
          <p className="text-xs text-gray-500 mb-1">{c.icon} {c.label}</p>
          <p className="text-lg font-bold text-gray-900 leading-tight break-words">{c.value}</p>
          <p className="text-xs text-gray-400 mt-0.5">{c.sub}</p>
        </div>
      ))}
    </div>
  );
}

// ── C2: 全局篩選器 ───────────────────────────────────────────────────────────
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
        <span className="text-xs text-gray-500 mr-0.5">時間範圍</span>
        {([ ["1y", "近 1 年"], ["3y", "近 3 年"], ["forecast", "含預估"] ] as [TimeRange, string][]).map(([v, label]) => (
          <button key={v} onClick={() => setTimeRange(v)} className={btnClass(timeRange === v)}>{label}</button>
        ))}
      </div>
      <div className="flex items-center gap-1.5">
        <span className="text-xs text-gray-500 mr-0.5">篩選客群</span>
        {([ ["all", "全部"], ["sme", "中小企業"], ["enterprise", "大型企業"] ] as [AudienceFilter, string][]).map(([v, label]) => (
          <button key={v} onClick={() => setAudience(v)} className={btnClass(audience === v)}>{label}</button>
        ))}
      </div>
      <button
        onClick={() => setExcludeOutliers(!excludeOutliers)}
        className={`flex items-center gap-1.5 text-xs px-2.5 py-1 rounded-full border transition-colors ${
          excludeOutliers ? "bg-amber-500 text-white border-amber-500" : "bg-white text-gray-600 border-gray-300 hover:border-amber-400"
        }`}
      >
        <span>{excludeOutliers ? "✓" : "○"}</span>
        隱藏企業級專案（聚焦標準定價）
      </button>
    </div>
  );
}

// ── 市場價格帶（浮動柱 + 聯動高亮） ─────────────────────────────────────────
function PriceChart({ data, activeCompetitor, competitors, isExporting }: {
  data: ChartData["priceRange"];
  activeCompetitor: string | null;
  competitors: ChartData["competitors"];
  isExporting: boolean;
}) {
  const activeBand = useMemo(() => {
    if (!activeCompetitor) return null;
    const c = competitors.find((x) => x.name === activeCompetitor);
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
        <p className="text-sm font-semibold text-gray-700">💰 市場價格帶（{data.currency}）</p>
        {activeCompetitor && activeBand && !isExporting && (
          <span className="text-xs bg-blue-100 text-blue-600 px-2 py-0.5 rounded-full">
            {activeCompetitor} → {activeBand}
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
                <p>{d.name}：{d.min.toLocaleString()} – {d.max.toLocaleString()} {data.currency}</p>
              </div>
            );
          }} />}
          <Bar dataKey="floor" stackId="a" fill="transparent" isAnimationActive={!isExporting} />
          <Bar dataKey="range" stackId="a" radius={[4, 4, 0, 0]} isAnimationActive={!isExporting}>
            {bars.map((b, i) => (
              <Cell key={i} fill={BAR_COLORS[i]}
                opacity={activeBand && b.name !== activeBand ? 0.25 : 1} />
            ))}
            <LabelList content={(props) => {
              const { x, y, width, index } = props as { x: number; y: number; width: number; index: number };
              const b = bars[index];
              if (!b || b.range <= 0) return null;
              return (
                <text x={Number(x) + Number(width) / 2} y={Number(y) - 4}
                  textAnchor="middle" fontSize={9} fill="#4b5563">
                  {b.min.toLocaleString()}–{b.max.toLocaleString()}
                </text>
              );
            }} />
          </Bar>
        </BarChart>
      </ResponsiveContainer>
    </div>
  );
}

// ── 消費者評論情感 ────────────────────────────────────────────────────────────
function SentimentChart({ data, activeCompetitor, isExporting }: {
  data: ChartData["sentiment"];
  activeCompetitor: string | null;
  isExporting: boolean;
}) {
  const total = data.positive + data.negative + data.neutral || 100;
  const pie = [
    { name: "正面", value: Math.round((data.positive / total) * 100) },
    { name: "負面", value: Math.round((data.negative / total) * 100) },
    { name: "中性", value: Math.round((data.neutral / total) * 100) },
  ];
  return (
    <div>
      <div className="flex items-center gap-2 mb-2">
        <p className="text-sm font-semibold text-gray-700">⭐ 消費者評論情感</p>
        {activeCompetitor && !isExporting && (
          <span className="text-xs bg-gray-100 text-gray-500 px-2 py-0.5 rounded-full">整體市場數據</span>
        )}
      </div>
      <ResponsiveContainer width="100%" height={170}>
        <PieChart>
          <Pie data={pie} dataKey="value" cx="50%" cy="50%" outerRadius={60}
            isAnimationActive={!isExporting}>
            {pie.map((_, i) => <Cell key={i} fill={PIE_COLORS[i]} />)}
          </Pie>
          <Legend iconSize={10} wrapperStyle={{ fontSize: 11 }}
            formatter={(value, entry) =>
              `${value} ${(entry as { payload?: { value: number } }).payload?.value ?? 0}%`
            }
          />
          {!isExporting && <Tooltip formatter={(v) => `${v}%`} />}
        </PieChart>
      </ResponsiveContainer>
      <p className="text-xs text-gray-400 text-center">* 論壇/評測情感估算，非平台評分</p>
    </div>
  );
}

// ── 競品售價區間（浮動柱 + C1 hover 聯動） ───────────────────────────────────
function CompetitorChart({ data, activeCompetitor, onHover, isExporting }: {
  data: ChartData["competitors"];
  activeCompetitor: string | null;
  onHover: (name: string | null) => void;
  isExporting: boolean;
}) {
  const cdata = data.map((c) => ({
    name: c.name, floor: c.minPrice,
    range: c.maxPrice - c.minPrice,
    min: c.minPrice, max: c.maxPrice,
  }));

  return (
    <div>
      <p className="text-sm font-semibold text-gray-700 mb-2">🏆 競品售價區間</p>
      <ResponsiveContainer width="100%" height={170}>
        <BarChart data={cdata} margin={{ top: 20, right: 10, left: 10, bottom: 0 }}
          onMouseLeave={() => !isExporting && onHover(null)}>
          <CartesianGrid strokeDasharray="3 3" vertical={false} />
          <XAxis dataKey="name" tick={{ fontSize: 11 }} />
          <YAxis tick={{ fontSize: 11 }} />
          {!isExporting && <Tooltip content={({ active, payload }) => {
            if (!active || !payload?.length) return null;
            const d = payload[0].payload as { name: string; min: number; max: number };
            return (
              <div className="bg-white border border-gray-200 rounded px-2 py-1 text-xs shadow">
                <p>{d.name}：{d.min.toLocaleString()} – {d.max.toLocaleString()}</p>
              </div>
            );
          }} />}
          <Bar dataKey="floor" stackId="a" fill="transparent" isAnimationActive={!isExporting} />
          <Bar dataKey="range" stackId="a" radius={[2, 2, 0, 0]}
            isAnimationActive={!isExporting}
            onMouseEnter={(entry: unknown) => !isExporting && onHover((entry as { name: string }).name)}>
            {cdata.map((c, i) => (
              <Cell key={i} fill="#3b82f6"
                opacity={activeCompetitor && c.name !== activeCompetitor ? 0.25 : 1} />
            ))}
            <LabelList content={(props) => {
              const { x, y, width, index } = props as { x: number; y: number; width: number; index: number };
              const c = cdata[index];
              if (!c || c.range <= 0) return null;
              return (
                <text x={Number(x) + Number(width) / 2} y={Number(y) - 4}
                  textAnchor="middle" fontSize={9} fill="#4b5563">
                  {c.min.toLocaleString()}–{c.max.toLocaleString()}
                </text>
              );
            }} />
          </Bar>
        </BarChart>
      </ResponsiveContainer>
    </div>
  );
}

// ── 市場熱度趨勢 ─────────────────────────────────────────────────────────────
function TrendChart({ data, product, timeRange, activeCompetitor, isExporting }: {
  data: ChartData["trendScore"];
  product: string;
  timeRange: TimeRange;
  activeCompetitor: string | null;
  isExporting: boolean;
}) {
  const filtered = useMemo(() => {
    if (timeRange === "1y") return data.filter((d) => d.year >= "2024");
    return data;
  }, [data, timeRange]);

  return (
    <div>
      <div className="flex items-center gap-2 mb-2">
        <p className="text-sm font-semibold text-gray-700">📈 {product} 市場熱度趨勢</p>
        {activeCompetitor && !isExporting && (
          <span className="text-xs bg-gray-100 text-gray-500 px-2 py-0.5 rounded-full">整體市場數據</span>
        )}
      </div>
      <ResponsiveContainer width="100%" height={170}>
        <LineChart data={filtered} margin={{ top: 20, right: 10, left: 10, bottom: 0 }}>
          <CartesianGrid strokeDasharray="3 3" vertical={false} />
          <XAxis dataKey="year" tick={{ fontSize: 12 }} />
          <YAxis domain={[0, 100]} tick={{ fontSize: 11 }} />
          {!isExporting && <Tooltip formatter={(v) => `熱度 ${v}/100`} />}
          <Line type="monotone" dataKey="score" stroke="#3b82f6" strokeWidth={2}
            isAnimationActive={!isExporting}
            dot={(props: { cx: number; cy: number; payload: { year: string } }) => (
              <circle key={props.payload.year} cx={props.cx} cy={props.cy} r={4}
                fill={props.payload.year === "2025" && timeRange === "forecast" ? "#f59e0b" : "#3b82f6"}
                stroke="white" strokeWidth={1} />
            )}
          >
            <LabelList dataKey="score" position="top" fontSize={10} fill="#4b5563"
              formatter={(v: number) => v} />
          </Line>
        </LineChart>
      </ResponsiveContainer>
      <p className="text-xs text-gray-400 text-center">
        {timeRange === "forecast" ? "* 2025 為 AI 預估值（橘點）" : "* 2025 為預估值"}
      </p>
    </div>
  );
}

// ── 主組件 ───────────────────────────────────────────────────────────────────
export default function ReportView({ report, product, market, chartData, isPaid }: Props) {
  const [copied, setCopied] = useState(false);
  const [isExporting, setIsExporting] = useState(false);
  const [activeCompetitor, setActiveCompetitor] = useState<string | null>(null);
  const [timeRange, setTimeRange] = useState<TimeRange>("3y");
  const [audience, setAudience] = useState<AudienceFilter>("all");
  const [excludeOutliers, setExcludeOutliers] = useState(false);
  const dashboardRef = useRef<HTMLDivElement>(null);

  // C2 + D2: 依客群篩選 + 排除極端值（動態門檻：超過所有競品最高售價中位數 3 倍）
  const filteredCompetitors = useMemo(() => {
    if (!chartData) return [];
    let list = [...chartData.competitors];
    if (excludeOutliers && list.length > 1) {
      const sortedMax = [...list].sort((a, b) => a.maxPrice - b.maxPrice);
      const medianMax = sortedMax[Math.floor((sortedMax.length - 1) / 2)].maxPrice;
      list = list.filter((c) => c.maxPrice <= medianMax * 3);
    }
    const sorted = list.sort((a, b) => (a.minPrice + a.maxPrice) - (b.minPrice + b.maxPrice));
    if (audience === "all") return sorted;
    if (sorted.length === 0) return sorted;
    const mid = sorted[Math.floor(sorted.length / 2)];
    const medianMid = (mid.minPrice + mid.maxPrice) / 2;
    if (audience === "sme") return sorted.filter((c) => (c.minPrice + c.maxPrice) / 2 <= medianMid);
    return sorted.filter((c) => (c.minPrice + c.maxPrice) / 2 >= medianMid);
  }, [chartData, audience, excludeOutliers]);

  const handleCopy = async () => {
    await navigator.clipboard.writeText(report);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  const handleDownload = () => {
    const blob = new Blob([report], { type: "text/markdown;charset=utf-8" });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = `market-research-${product}-${new Date().toISOString().slice(0, 10)}.md`;
    a.click();
    URL.revokeObjectURL(url);
  };

  // E3: 付費專屬圖表匯出（幽靈截圖法）
  const handleExportCharts = async () => {
    if (!dashboardRef.current) return;
    try {
      setIsExporting(true);
      // 等待 DOM 重繪（關閉動畫後需要一幀讓圖表靜止）
      await new Promise((resolve) => setTimeout(resolve, 150));
      const canvas = await html2canvas(dashboardRef.current, {
        scale: 2,
        backgroundColor: "#ffffff",
        useCORS: true,
      });
      const url = canvas.toDataURL("image/png");
      const a = document.createElement("a");
      a.href = url;
      a.download = `market-dashboard-${product}-${new Date().toISOString().slice(0, 10)}.png`;
      document.body.appendChild(a);
      a.click();
      document.body.removeChild(a);
    } catch (err) {
      console.error("圖表匯出失敗", err);
    } finally {
      setIsExporting(false);
    }
  };

  const html = DOMPurify.sanitize(marked(report) as string);

  return (
    <div className="bg-white rounded-2xl shadow-sm border border-gray-200 overflow-hidden">
      {/* Toolbar */}
      <div className="flex items-center justify-between px-6 py-4 border-b border-gray-100 bg-gray-50">
        <div>
          <span className="text-sm font-semibold text-gray-800">✅ 報告已生成</span>
          <span className="ml-2 text-xs text-gray-500">{product} × {market}</span>
        </div>
        <div className="flex gap-2">
          <button onClick={handleCopy}
            className="text-sm px-4 py-1.5 rounded-lg border border-gray-300 hover:bg-gray-100 transition-colors text-gray-700">
            {copied ? "✅ 已複製" : "📋 複製 Markdown"}
          </button>
          <button onClick={handleDownload}
            className="text-sm px-4 py-1.5 rounded-lg bg-blue-600 text-white hover:bg-blue-700 transition-colors">
            ⬇️ 下載 .md
          </button>
        </div>
      </div>

      {/* 付費版儀表板 */}
      {isPaid && chartData ? (
        <div className="border-b border-gray-100 bg-slate-50 px-6 py-5">
          {/* 儀表板標題列 + 匯出按鈕 */}
          <div className="flex items-center justify-between mb-4">
            <div className="flex items-center gap-2">
              <span className="text-sm font-semibold text-gray-800">📊 視覺化數據摘要</span>
              <span className="text-xs bg-blue-100 text-blue-700 px-2 py-0.5 rounded-full">AI 估算</span>
              <span className="text-xs text-gray-400">基於搜尋資料推估，供參考</span>
            </div>
            {/* E3: 付費專屬匯出按鈕 */}
            <button
              onClick={handleExportCharts}
              disabled={isExporting}
              className={`text-sm px-4 py-1.5 rounded-lg transition-colors ${
                isExporting
                  ? "bg-gray-300 text-gray-500 cursor-not-allowed"
                  : "bg-indigo-600 text-white hover:bg-indigo-700"
              }`}
            >
              {isExporting ? "⏳ 產生中..." : "📥 匯出視覺化看板 PNG"}
            </button>
          </div>

          {/* 截圖範圍（ref 綁定） */}
          <div ref={dashboardRef} className="bg-slate-50 p-2">
            {/* C3: KPI 小卡（使用 filteredCompetitors 確保與圖表一致） */}
            <KpiCards data={chartData} competitors={filteredCompetitors} />
            {/* C2: 全局篩選器（匯出時隱藏，截圖不含互動按鈕） */}
            {!isExporting && (
              <GlobalFilters
                timeRange={timeRange} setTimeRange={setTimeRange}
                audience={audience} setAudience={setAudience}
                excludeOutliers={excludeOutliers} setExcludeOutliers={setExcludeOutliers}
              />
            )}
            {/* 四張圖表（C1 聯動） */}
            <div className="grid grid-cols-2 gap-6">
              {chartData.priceRange && (
                <PriceChart
                  data={chartData.priceRange}
                  activeCompetitor={activeCompetitor}
                  competitors={filteredCompetitors}
                  isExporting={isExporting}
                />
              )}
              {chartData.sentiment && (
                <SentimentChart data={chartData.sentiment} activeCompetitor={activeCompetitor} isExporting={isExporting} />
              )}
              {filteredCompetitors.length > 0 && (
                <CompetitorChart
                  data={filteredCompetitors}
                  activeCompetitor={activeCompetitor}
                  onHover={setActiveCompetitor}
                  isExporting={isExporting}
                />
              )}
              {chartData.trendScore?.length > 0 && (
                <TrendChart
                  data={chartData.trendScore}
                  product={product}
                  timeRange={timeRange}
                  activeCompetitor={activeCompetitor}
                  isExporting={isExporting}
                />
              )}
            </div>
          </div>
        </div>
      ) : !isPaid ? (
        <div className="border-b border-gray-100 bg-gradient-to-r from-amber-50 to-orange-50 px-6 py-5">
          <div className="flex items-center justify-between">
            <div>
              <div className="flex items-center gap-2 mb-1">
                <span className="text-sm font-semibold text-gray-800">📊 視覺化數據摘要</span>
                <span className="text-xs bg-amber-100 text-amber-700 px-2 py-0.5 rounded-full font-medium">PRO</span>
              </div>
              <p className="text-xs text-gray-500">升級付費版，解鎖 KPI 小卡、互動篩選器、四張圖表與 PNG 匯出</p>
            </div>
            <div className="text-3xl opacity-30 select-none">🔒</div>
          </div>
        </div>
      ) : null}

      {/* 文字報告 */}
      <div
        className="prose prose-gray max-w-none p-8 prose-headings:text-gray-900 prose-h1:text-2xl prose-h2:text-lg prose-h2:border-b prose-h2:border-gray-200 prose-h2:pb-2 prose-table:text-sm"
        dangerouslySetInnerHTML={{ __html: html }}
      />

      {/* CTA */}
      <div className="border-t border-gray-100 bg-amber-50 px-6 py-4 text-center">
        <p className="text-sm text-amber-800 font-medium">📬 需要更深入的客製化調研報告？</p>
        <p className="text-xs text-amber-600 mt-1">
          企業客製版（含訪談設計、問卷、供應商清單）NT$3,000 起 ·{" "}
          <a href="mailto:your@email.com" className="underline hover:text-amber-800">聯絡我們</a>
        </p>
      </div>
    </div>
  );
}
