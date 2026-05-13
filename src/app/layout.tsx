import type { Metadata } from "next";
import "./globals.css";
export const metadata: Metadata = { title: "MarketScout AI", description: "商品開發市場調研助理" };
export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (<html lang="zh-TW"><body>{children}</body></html>);
}