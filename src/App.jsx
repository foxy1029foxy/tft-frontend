import React from "react";
import LandingPage from "./components/LandingPage.jsx";
import { Analytics } from "@vercel/analytics/react";  // ← 追加

export default function App() {
  return (
    <>
      <LandingPage />
      <Analytics /> {/* ← ここに挿入 */}
    </>
  );
}
