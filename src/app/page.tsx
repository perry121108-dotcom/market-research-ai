"use client";

import { useState, useEffect } from "react";
import ReportView from "@/components/ReportView";
import type { ChartData } from "@/components/ReportView";

const COUNTRIES = ["台灣", "日本", "美國", "東南亞", "韓國", "香港", "中國大陸"];

const CHANNELS_BY_COUNTRY: Record<string, string[]> = {
  "台灣":   ["蝦皮 Shopee", "momo 購物", "PChome", "Pinkoi", "LINE 禮物", "實體門市", "自營官網"],
  "日本":   ["Amazon JP", "樂天市場", "Yahoo! ショッピング", "ZOZOTOWN", "實體門市", "自營官網"],
  "美國":   ["Amazon US", "eBay", "Etsy", "Walmart", "實體門市", "自營官網"],
  "東南亞": ["Shopee", "Lazada", "TikTok Shop", "Tokopedia", "實體門市", "自營官網"],
  "韓國":   ["Coupang", "Naver 쇼핑", "11번가", "Kakao 쇼핑", "實體門市", "自營官網"],
  "香港":   ["HKTVmall", "Carousell", "Amazon HK", "實體門市", "自營官網"],
  "中國大陸": ["淘寶 / 天貓", "京東", "拼多多", "小紅書", "抖音電商", "實體門市", "自營官網"],
};

const PURPOSES = ["採購評估", "商品開發", "競品分析", "給主管的報告", "選品決策"];

const STORAGE_KEY = "ms_access_unlocked";

export default function Home() {
  const [product, setProduct] = useState("");
  const [country, setCountry] = useState("台灣");
  const [channel, setChannel] = useState(CHANNELS_BY_COUNTRY["台灣"][0]);
  const [purpose, setPurpose] = useState("商品開發");

  const handleCountryChange = (newCountry: string) => {
    setCountry(newCountry);
    setChannel(CHANNELS_BY_COUNTRY[newCountry]?.[0] ?? "自營官網");
  };
  const [isPaid, setIsPaid] = useState(false);
  const [loading, setLoading] = useState(false);
  const [report, setReport] = useState("");
  const [chartData, setChartData] = useState<ChartData | null>(null);
  const [error, setError] = useState("");

  const [accessCode, setAccessCode] = useState("");
  const [codeError, setCodeError] = useState("");
  const [codeLoading, setCodeLoading] = useState(false);
  const [showCodeInput, setShowCodeInput] = useState(false);

  useEffect(() => {
    if (localStorage.getItem(STORAGE_KEY) === "1") {
      setIsPaid(true);
    }
  }, []);

  const handleVerifyCode = async () => {
    if (!accessCode.trim()) return;
    setCodeLoading(true);
    setCodeError("");
    try {
      const res = await fetch("/api/verify-code", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ code: accessCode.trim() }),
      });
      const data = await res.json();
      if (res.ok && data.valid) {
        localStorage.setItem(STORAGE_KEY, "1");
        setIsPaid(true);
        setShowCodeInput(false);
        setAccessCode("");
      } else {
        setCodeError(data.error ?? "授權碼無效");
      }
    } catch {
      setCodeError("驗證失敗，請稍後再試");
    } finally {
      setCodeLoading(false);
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!product.trim()) return;

    setLoading(true);
    setReport("");
    setChartData(null);
    setError("");

    try {
      const res = await fetch("/api/research", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ product, country, channel, purpose }),
      });

      const data = await res.json();
      if (!res.ok) throw new Error(data.error || "發生錯誤");
      setReport(data.report);
      if (data.chartData) setChartData(data.chartData);
    } catch (err) {
      setError(err instanceof Error ? err.message : "發生未知錯誤");
    } finally {
      setLoading(false);
    }
  };

  return (
    <main className="min-h-screen bg-gray-50">
      <header className="bg-white border-b border-gray-200">
        <div className="max-w-4xl mx-auto px-6 py-4 flex items-center justify-between">
          <div>
            <h1 className="text-xl font-bold text-gray-900">🔍 MarketScout AI</h1>
            <p className="text-xs text-gray-500">採購 × 商品開發 × 市場調研</p>
          </div>
          <span className="text-xs bg-amber-100 text-amber-700 px-2 py-1 rounded-full font-medium">
            Beta 免費試用中
          </span>
        </div>
      </header>

      <div className="max-w-4xl mx-auto px-6 py-10">
        <div className="text-center mb-10">
          <h2 className="text-3xl font-bold text-gray-900 mb-3">
            5 分鐘產出一份<br />
            <span className="text-blue-600">商品開發市場調研報告</span>
          </h2>
          <p className="text-gray-500 text-base max-w-xl mx-auto">
            專為採購助理、商品開發人員、電商選品設計。<br />
            輸入商品品類，AI 自動分析競品、價格帶、消費者痛點與開發機會。
          </p>
        </div>

        <div className="bg-white rounded-2xl shadow-sm border border-gray-200 p-8 mb-8">
          <form onSubmit={handleSubmit} className="space-y-5">
            <div>
              <label className="block text-sm font-semibold text-gray-700 mb-2">
                商品 / 品類 <span className="text-red-500">*</span>
              </label>
              <input
                type="text"
                value={product}
                onChange={(e) => setProduct(e.target.value)}
                placeholder="例如：防曬外套、寵物烘乾箱、AI 錄音筆、不鏽鋼保溫杯"
                className="w-full border border-gray-300 rounded-lg px-4 py-3 text-gray-900 placeholder-gray-400 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent text-base"
                disabled={loading}
              />
            </div>

            <div className="grid grid-cols-3 gap-4">
              <div>
                <label className="block text-sm font-semibold text-gray-700 mb-2">國家 / 地區</label>
                <select
                  value={country}
                  onChange={(e) => handleCountryChange(e.target.value)}
                  className="w-full border border-gray-300 rounded-lg px-4 py-3 text-gray-900 focus:outline-none focus:ring-2 focus:ring-blue-500 bg-white"
                  disabled={loading}
                >
                  {COUNTRIES.map((c) => (
                    <option key={c} value={c}>{c}</option>
                  ))}
                </select>
              </div>

              <div>
                <label className="block text-sm font-semibold text-gray-700 mb-2">銷售通路</label>
                <select
                  value={channel}
                  onChange={(e) => setChannel(e.target.value)}
                  className="w-full border border-gray-300 rounded-lg px-4 py-3 text-gray-900 focus:outline-none focus:ring-2 focus:ring-blue-500 bg-white"
                  disabled={loading}
                >
                  {(CHANNELS_BY_COUNTRY[country] ?? []).map((c) => (
                    <option key={c} value={c}>{c}</option>
                  ))}
                </select>
              </div>

              <div>
                <label className="block text-sm font-semibold text-gray-700 mb-2">調研用途</label>
                <select
                  value={purpose}
                  onChange={(e) => setPurpose(e.target.value)}
                  className="w-full border border-gray-300 rounded-lg px-4 py-3 text-gray-900 focus:outline-none focus:ring-2 focus:ring-blue-500 bg-white"
                  disabled={loading}
                >
                  {PURPOSES.map((p) => (
                    <option key={p} value={p}>{p}</option>
                  ))}
                </select>
              </div>
            </div>

            {/* Plan selector */}
            <div>
              <label className="block text-sm font-semibold text-gray-700 mb-2">選擇方案</label>
              {isPaid ? (
                <div className="rounded-xl border-2 border-blue-500 bg-blue-50 px-4 py-3 flex items-center justify-between">
                  <div>
                    <div className="flex items-center gap-2">
                      <span className="font-semibold text-gray-800 text-sm">專業版</span>
                      <span className="text-xs bg-amber-100 text-amber-700 px-1.5 py-0.5 rounded-full font-medium">PRO ✓</span>
                    </div>
                    <div className="text-xs text-gray-500 mt-0.5">文字報告 + 視覺化圖表已解鎖</div>
                  </div>
                  <button
                    type="button"
                    onClick={() => { localStorage.removeItem(STORAGE_KEY); setIsPaid(false); }}
                    className="text-xs text-gray-400 hover:text-gray-600"
                  >
                    切換免費版
                  </button>
                </div>
              ) : (
                <div className="grid grid-cols-2 gap-3">
                  <div className="rounded-xl border-2 border-blue-500 bg-blue-50 px-4 py-3">
                    <div className="font-semibold text-gray-800 text-sm">免費版（目前）</div>
                    <div className="text-xs text-gray-500 mt-0.5">文字調研報告</div>
                  </div>
                  <div className="rounded-xl border-2 border-gray-200 bg-white px-4 py-3">
                    <div className="flex items-center gap-2 mb-1">
                      <span className="font-semibold text-gray-800 text-sm">專業版</span>
                      <span className="text-xs bg-amber-100 text-amber-700 px-1.5 py-0.5 rounded-full font-medium">PRO</span>
                    </div>
                    <div className="text-xs text-gray-500 mb-2">文字報告 + 視覺化圖表</div>
                    {!showCodeInput ? (
                      <button
                        type="button"
                        onClick={() => setShowCodeInput(true)}
                        className="text-xs text-blue-600 hover:underline"
                      >
                        輸入授權碼解鎖 →
                      </button>
                    ) : (
                      <div className="space-y-1.5">
                        <input
                          type="text"
                          value={accessCode}
                          onChange={(e) => { setAccessCode(e.target.value); setCodeError(""); }}
                          onKeyDown={(e) => e.key === "Enter" && handleVerifyCode()}
                          placeholder="授權碼"
                          maxLength={64}
                          className="w-full border border-gray-300 rounded-lg px-3 py-1.5 text-xs focus:outline-none focus:ring-2 focus:ring-blue-500"
                        />
                        {codeError && <p className="text-xs text-red-500">{codeError}</p>}
                        <div className="flex gap-1.5">
                          <button
                            type="button"
                            onClick={handleVerifyCode}
                            disabled={codeLoading || !accessCode.trim()}
                            className="flex-1 text-xs bg-blue-600 text-white rounded-lg py-1.5 hover:bg-blue-700 disabled:bg-gray-300 disabled:cursor-not-allowed"
                          >
                            {codeLoading ? "驗證中..." : "確認"}
                          </button>
                          <button
                            type="button"
                            onClick={() => { setShowCodeInput(false); setAccessCode(""); setCodeError(""); }}
                            className="text-xs text-gray-400 hover:text-gray-600 px-2"
                          >
                            取消
                          </button>
                        </div>
                      </div>
                    )}
                  </div>
                </div>
              )}
            </div>

            <button
              type="submit"
              disabled={loading || !product.trim()}
              className="w-full bg-blue-600 text-white font-semibold py-3.5 rounded-lg hover:bg-blue-700 disabled:bg-gray-300 disabled:cursor-not-allowed transition-colors text-base"
            >
              {loading ? "AI 分析中，約需 30-60 秒..." : "🚀 開始生成市場調研報告"}
            </button>
          </form>

          <div className="mt-4 flex flex-wrap gap-2 items-center">
            <span className="text-xs text-gray-400">快速試試：</span>
            {["防曬外套", "寵物烘乾箱", "AI 錄音筆", "電動牙刷", "露營燈"].map((tag) => (
              <button
                key={tag}
                onClick={() => setProduct(tag)}
                className="text-xs bg-gray-100 hover:bg-blue-50 hover:text-blue-600 text-gray-600 px-3 py-1 rounded-full transition-colors"
                disabled={loading}
              >
                {tag}
              </button>
            ))}
          </div>
        </div>

        {loading && (
          <div className="bg-blue-50 border border-blue-200 rounded-2xl p-8 text-center">
            <div className="animate-spin text-4xl mb-4 inline-block">⚙️</div>
            <p className="text-blue-700 font-medium">AI 正在分析市場資料...</p>
            <p className="text-blue-500 text-sm mt-1">正在研究競品、價格帶、消費者評論與市場趨勢</p>
          </div>
        )}

        {error && (
          <div className="bg-red-50 border border-red-200 rounded-xl p-4 text-red-700 text-sm">
            ❌ {error}
          </div>
        )}

        {report && <ReportView report={report} product={product} market={`${country} × ${channel}`} chartData={chartData} isPaid={isPaid} />}

        {!report && !loading && (
          <div className="grid grid-cols-3 gap-4 mt-4">
            {[
              { icon: "⏱️", title: "5-10 分鐘", desc: "從輸入到報告，不需要花一整天做研究" },
              { icon: "📊", title: "10 個維度", desc: "競品、價格、痛點、機會、採購風險一次涵蓋" },
              { icon: "📋", title: "主管摘要", desc: "自動生成一頁式摘要，直接拿去開會" },
            ].map((item) => (
              <div key={item.title} className="bg-white rounded-xl p-5 border border-gray-200 text-center">
                <div className="text-2xl mb-2">{item.icon}</div>
                <div className="font-semibold text-gray-800 text-sm mb-1">{item.title}</div>
                <div className="text-gray-500 text-xs">{item.desc}</div>
              </div>
            ))}
          </div>
        )}
      </div>
    </main>
  );
}
