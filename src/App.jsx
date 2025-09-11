import React from "react";
import LandingPage from "./components/LandingPage.jsx";
import { Analytics } from "@vercel/analytics/react";  
import { SpeedInsights } from "@vercel/speed-insights/react";  // ← 追加

export default function App() {
  return (
    <>
      <LandingPage />
      <Analytics />       {/* アクセス解析 */}
      <SpeedInsights />   {/* パフォーマンス計測 */}
    </>
  );
}
