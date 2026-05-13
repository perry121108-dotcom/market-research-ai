const fs = require("fs"), path = require("path");
const files = {
"package.json":`{"name":"market-research-ai","version":"0.1.0","private":true,"scripts":{"dev":"next dev","build":"next build","start":"next start","lint":"next lint"},"dependencies":{"@google/generative-ai":"^0.24.1","marked":"^13.0.0","next":"14.2.5","react":"^18","react-dom":"^18"},"devDependencies":{"@tailwindcss/typography":"^0.5.13","@types/node":"^20","@types/react":"^18","@types/react-dom":"^18","autoprefixer":"^10.0.1","postcss":"^8","tailwindcss":"^3.4.1","typescript":"^5"}}`,
"next.config.mjs":`/** @type {import('next').NextConfig} */\nconst nextConfig = {};\nexport default nextConfig;`,
"tsconfig.json":`{"compilerOptions":{"lib":["dom","dom.iterable","esnext"],"allowJs":true,"skipLibCheck":true,"strict":true,"noEmit":true,"esModuleInterop":true,"module":"esnext","moduleResolution":"bundler","resolveJsonModule":true,"isolatedModules":true,"jsx":"preserve","incremental":true,"plugins":[{"name":"next"}],"paths":{"@/*":["./src/*"]}},"include":["next-env.d.ts","**/*.ts","**/*.tsx",".next/types/**/*.ts"],"exclude":["node_modules"]}`,
"postcss.config.mjs":`export default { plugins: { tailwindcss: {}, autoprefixer: {} } };`,
"tailwind.config.ts":`import type { Config } from "tailwindcss";\nconst config: Config = { content: ["./src/**/*.{js,ts,jsx,tsx,mdx}"], theme: { extend: {} }, plugins: [require("@tailwindcss/typography")] };\nexport default config;`,
"src/app/globals.css":`@tailwind base;\n@tailwind components;\n@tailwind utilities;`,
"src/app/layout.tsx":`import type { Metadata } from "next";\nimport "./globals.css";\nexport const metadata: Metadata = { title: "MarketScout AI", description: "商品開發市場調研助理" };\nexport default function RootLayout({ children }: { children: React.ReactNode }) {\n  return (<html lang="zh-TW"><body>{children}</body></html>);\n}`,
};
for(const[f,c]of Object.entries(files)){
  const d=path.dirname(f);
  if(d!==".")fs.mkdirSync(d,{recursive:true});
  fs.writeFileSync(f,c,"utf8");
  console.log("✅",f);
}
// page.tsx
fs.mkdirSync("src/app",{recursive:true});
fs.writeFileSync("src/app/page.tsx",`"use client";
import{useState}from"react";
import ReportView from"@/components/ReportView";
const MARKETS=["台灣","日本","美國","蝦皮","Amazon","Shopee東南亞"];
const PURPOSES=["採購評估","商品開發","競品分析","給主管的報告","選品決策"];
export default function Home(){
const[product,setProduct]=useState("");
const[market,setMarket]=useState("台灣");
const[purpose,setPurpose]=useState("商品開發");
const[loading,setLoading]=useState(false);
const[report,setReport]=useState("");
const[error,setError]=useState("");
const handleSubmit=async(e:React.FormEvent)=>{
e.preventDefault();if(!product.trim())return;
setLoading(true);setReport("");setError("");
try{const res=await fetch("/api/research",{method:"POST",headers:{"Content-Type":"application/json"},body:JSON.stringify({product,market,purpose})});
const data=await res.json();if(!res.ok)throw new Error(data.error||"發生錯誤");setReport(data.report);
}catch(err){setError(err instanceof Error?err.message:"發生未知錯誤");}finally{setLoading(false);}};
return(<main className="min-h-screen bg-gray-50">
<header className="bg-white border-b border-gray-200"><div className="max-w-4xl mx-auto px-6 py-4 flex items-center justify-between">
<div><h1 className="text-xl font-bold text-gray-900">🔍 MarketScout AI</h1><p className="text-xs text-gray-500">採購 × 商品開發 × 市場調研</p></div>
<span className="text-xs bg-amber-100 text-amber-700 px-2 py-1 rounded-full">Beta 免費試用中</span></div></header>
<div className="max-w-4xl mx-auto px-6 py-10">
<div className="text-center mb-10"><h2 className="text-3xl font-bold text-gray-900 mb-3">5 分鐘產出一份<br/><span className="text-blue-600">商品開發市場調研報告</span></h2>
<p className="text-gray-500">專為採購助理、商品開發人員、電商選品設計。結合 Google Search Grounding 取得最新市場資訊。</p></div>
<div className="bg-white rounded-2xl shadow-sm border border-gray-200 p-8 mb-8">
<form onSubmit={handleSubmit} className="space-y-5">
<div><label className="block text-sm font-semibold text-gray-700 mb-2">商品 / 品類 <span className="text-red-500">*</span></label>
<input type="text" value={product} onChange={e=>setProduct(e.target.value)} placeholder="例如：防曬外套、寵物烘乾箱、AI 錄音筆"
className="w-full border border-gray-300 rounded-lg px-4 py-3 text-gray-900 placeholder-gray-400 focus:outline-none focus:ring-2 focus:ring-blue-500 text-base" disabled={loading}/></div>
<div className="grid grid-cols-2 gap-4">
<div><label className="block text-sm font-semibold text-gray-700 mb-2">目標市場</label>
<select value={market} onChange={e=>setMarket(e.target.value)} className="w-full border border-gray-300 rounded-lg px-4 py-3 focus:outline-none focus:ring-2 focus:ring-blue-500 bg-white" disabled={loading}>
{MARKETS.map(m=><option key={m} value={m}>{m}</option>)}</select></div>
<div><label className="block text-sm font-semibold text-gray-700 mb-2">調研用途</label>
<select value={purpose} onChange={e=>setPurpose(e.target.value)} className="w-full border border-gray-300 rounded-lg px-4 py-3 focus:outline-none focus:ring-2 focus:ring-blue-500 bg-white" disabled={loading}>
{PURPOSES.map(p=><option key={p} value={p}>{p}</option>)}</select></div></div>
<button type="submit" disabled={loading||!product.trim()} className="w-full bg-blue-600 text-white font-semibold py-3.5 rounded-lg hover:bg-blue-700 disabled:bg-gray-300 disabled:cursor-not-allowed transition-colors">
{loading?"AI 搜尋分析中，約需 30-60 秒...":"🚀 開始生成市場調研報告"}</button></form>
<div className="mt-4 flex flex-wrap gap-2 items-center"><span className="text-xs text-gray-400">快速試試：</span>
{["防曬外套","寵物烘乾箱","AI 錄音筆","電動牙刷","露營燈"].map(tag=>(
<button key={tag} onClick={()=>setProduct(tag)} disabled={loading} className="text-xs bg-gray-100 hover:bg-blue-50 hover:text-blue-600 text-gray-600 px-3 py-1 rounded-full">{tag}</button>))}</div></div>
{loading&&<div className="bg-blue-50 border border-blue-200 rounded-2xl p-8 text-center"><p className="text-blue-700 font-medium">AI 正在透過 Google Search Grounding 搜尋最新市場資料...</p></div>}
{error&&<div className="bg-red-50 border border-red-200 rounded-xl p-4 text-red-700 text-sm">❌ {error}</div>}
{report&&<ReportView report={report} product={product} market={market}/>}</div></main>);}
`,"utf8");
console.log("✅ src/app/page.tsx");
// route.ts
fs.mkdirSync("src/app/api/research",{recursive:true});
fs.writeFileSync("src/app/api/research/route.ts",`import{GoogleGenerativeAI}from"@google/generative-ai";
import{NextRequest,NextResponse}from"next/server";
export async function POST(req:NextRequest){
const apiKey=process.env.GEMINI_API_KEY;
if(!apiKey)return NextResponse.json({error:"伺服器設定錯誤，請聯絡管理員"},{status:500});
const genAI=new GoogleGenerativeAI(apiKey);
const{product,market,purpose}=await req.json();
if(!product||!market||!purpose)return NextResponse.json({error:"缺少必要欄位"},{status:400});
const model=genAI.getGenerativeModel({model:"gemini-2.5-flash",tools:[{googleSearch:{}}]as any});
const today=new Date().toLocaleDateString("zh-TW");
const prompt=\`你是一位專業的市場調研分析師。請使用 Google Search 搜尋最新資料，用繁體中文輸出完整市場調研報告。

商品/品類：\${product}
目標市場：\${market}
調研用途：\${purpose}

---
# \${product} 市場調研報告
**目標市場：** \${market} ｜ **用途：** \${purpose} ｜ **資料時間：** \${today}

## 📊 市場概況
## 👥 目標客群
## 🏆 競品分析
| 競品/品牌 | 目前售價 | 主要優勢 | 弱點 |
|---------|--------|--------|------|
| | | | |
## 💰 市場價格帶
## ⭐ 熱賣賣點
## ❌ 負評與痛點
## 🚀 開發機會
## ⚠️ 採購風險
## 📐 建議規格
---
## 📋 給主管的一頁摘要
**結論：**
**三大機會：** 1. 2. 3.
**三大風險：** 1. 2. 3.
**建議行動：**
---
*本報告由 MarketScout AI 結合 Google Search 即時資料生成*\`;
try{const result=await model.generateContent(prompt);return NextResponse.json({report:result.response.text()});}
catch(err){console.error(err);return NextResponse.json({error:"AI 分析失敗，請稍後再試"},{status:500});}}`,"utf8");
console.log("✅ src/app/api/research/route.ts");
// ReportView
fs.mkdirSync("src/components",{recursive:true});
fs.writeFileSync("src/components/ReportView.tsx",`"use client";
import{useState}from"react";
import{marked}from"marked";
interface Props{report:string;product:string;market:string;}
export default function ReportView({report,product,market}:Props){
const[copied,setCopied]=useState(false);
const handleCopy=async()=>{await navigator.clipboard.writeText(report);setCopied(true);setTimeout(()=>setCopied(false),2000);};
const handleDownload=()=>{const blob=new Blob([report],{type:"text/markdown;charset=utf-8"});const url=URL.createObjectURL(blob);const a=document.createElement("a");a.href=url;a.download=\`market-research-\${product}-\${market}-\${new Date().toISOString().slice(0,10)}.md\`;a.click();URL.revokeObjectURL(url);};
return(<div className="bg-white rounded-2xl shadow-sm border border-gray-200 overflow-hidden">
<div className="flex items-center justify-between px-6 py-4 border-b border-gray-100 bg-gray-50">
<div><span className="text-sm font-semibold text-gray-800">✅ 報告已生成</span>
<span className="ml-2 text-xs text-gray-500">{product} × {market}</span>
<span className="ml-2 text-xs bg-blue-100 text-blue-600 px-2 py-0.5 rounded-full">Google Search Grounding</span></div>
<div className="flex gap-2">
<button onClick={handleCopy} className="text-sm px-4 py-1.5 rounded-lg border border-gray-300 hover:bg-gray-100 text-gray-700">{copied?"✅ 已複製":"📋 複製 Markdown"}</button>
<button onClick={handleDownload} className="text-sm px-4 py-1.5 rounded-lg bg-blue-600 text-white hover:bg-blue-700">⬇️ 下載 .md</button></div></div>
<div className="prose prose-gray max-w-none p-8" dangerouslySetInnerHTML={{__html:marked(report)as string}}/>
<div className="border-t border-gray-100 bg-amber-50 px-6 py-4 text-center">
<p className="text-sm text-amber-800 font-medium">📬 需要更深入的客製化調研報告？</p>
<p className="text-xs text-amber-600 mt-1">企業客製版 NT$3,000 起 · <a href="mailto:your@email.com" className="underline">聯絡我們</a></p></div></div>);}`,"utf8");
console.log("✅ src/components/ReportView.tsx");
console.log("\n🎉 完成！現在執行：npm install  然後  npm run dev");