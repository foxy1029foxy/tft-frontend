// src/components/EffectsIconPlot.jsx
import React, { useEffect, useMemo, useRef, useState } from "react";
import * as XLSX from "xlsx";

/* ---- shadcn/ui ---- */
import { Button } from "./ui/button";
import { Popover, PopoverTrigger, PopoverContent } from "./ui/popover";
import {
  Command,
  CommandInput,
  CommandList,
  CommandEmpty,
  CommandGroup,
  CommandItem,
} from "./ui/command";
/* Radix Dialog（詳細） */
import * as Dialog from "@radix-ui/react-dialog";

import { Check, ChevronsUpDown } from "lucide-react";

/* ===================== 定数 ===================== */
const DATA_PATH = "/data/effects.xlsx";
const CONFIG_PATH = "/data/config.json";
const COST_PATH = "/data/champion_costs.csv";

/** メイン表（一覧）のドメイン */
const DOMAIN = { xmin: -0.5, xmax: 0.2 };

/** 詳細モーダル（フォレスト）既定 */
const DETAIL_DEFAULT = { xMin: -0.5, xMax: 0.5, clamp: { left: true, right: true } };

/* 一覧の行レイアウト */
const ROW_HEIGHT = 160;
const ROW_INNER_GAP = 14;
const ITEM_SIZE = 40;
const GUTTER_LEFT = 150;
const GUTTER_RIGHT = 60;
const X_BUCKET_PX = 16;
const SLOT_COUNT = 4;

/* 詳細図の列幅など */
const DETAIL_ICON_COL = 68;
const DETAIL_RIGHT_COL = 110;
const DETAIL_ROW_H = 50;
const DOT_SIZE = 12;
const CI_THICKNESS = 4.5;
const ZERO_THICKNESS = 1;
const GRID_THICKNESS = 1;
const LIST_GRID_THICKNESS = 1;

/* 色 */
const COLOR = {
  zeroLine: "#111827",
  gridLine: "#54574d42",
  ciLine: "#1f2937",
  dot: "#111827",
  axisLabel: "#1f2937",

  listZeroLine: "#9ca3af",
  listGridLine: "#54574d42",
};

/* 行ストライプ色（うっすら灰色の2トーン） */
const STRIPE_BG_LIGHT = "rgba(0, 0, 0, 0.06)";
const STRIPE_BG_DARK = "rgba(0, 0, 0, 0.11)";

/* 候補から除外するチャンピオン（必要なら調整） */
const BAN_SET = new Set(["tft15_galio", "tft15_ekko"]);

/* ===== 列名エイリアス ===== */
const ALIASES = {
  character_id: [
    "character_id",
    "characterid",
    "champion",
    "champion_id",
    "championid",
    "unit_id",
    "unitid",
    "char_id",
    "charid",
    "name",
  ],
  star_raw: ["star_raw", "star", "stars", "starlevel", "level", "starnum", "star_num"],
  feature: ["feature", "item", "item_name", "itemname", "item_feature", "feat", "itemfeature"],
  coef: ["coef", "coefficient", "coef_mean", "coefmean", "effect", "beta", "point_coef"],
  n_support: ["n_support", "support", "support_n", "count", "freq", "frequency"],
  n_total: ["n_total", "total", "n", "N", "games", "matches", "sample", "samples", "sample_size", "observations", "obs", "n_obs", "records"],
  ci_high: ["ci_high", "cihi", "upper", "upper_ci", "ci_upper", "high", "ub"],
  ci_low: ["ci_low", "cilo", "lower", "lower_ci", "ci_lower", "low", "lb"],
};

/* ===== ID正規化 ===== */
function normalizeChampionId(raw) {
  if (!raw) return raw;
  const s = String(raw).trim();
  const lower = s.toLowerCase();

  if (lower.includes("lulu")) return "TFT15_Lulu";
  if (lower.includes("kogmaw")) return "TFT15_KogMaw";
  if (lower.includes("rammus")) return "TFT15_Rammus";
  if (lower.includes("leesin")) return "TFT15_LeeSin";
  if (lower.includes("drmundo")) return "TFT15_DrMundo";
  if (lower.includes("jarvaniv")) return "TFT15_JarvanIV";
  if (lower.includes("twistedfate")) return "TFT15_TwistedFate";
  if (lower.includes("xinzhao")) return "TFT15_XinZhao";
  if (lower.includes("ksante")) return "TFT15_KSante";
  if (lower.includes("kaisa")) return "TFT15_KaiSa";

  const m = lower.match(/^tft[_]?(\d+)[_]?([a-z0-9_]+)$/i);
  if (m) {
    const setNo = m[1];
    const namePart = m[2];
    const pascal = namePart.replace(/(^[a-z])|(_[a-z])/g, (x) => x.replace("_", "").toUpperCase());
    return `TFT${setNo}_${pascal}`;
  }
  return raw;
}
const displayNameFromId = (id) => String(id || "").split("_").pop() || String(id || "");

/* ===== ヘッダ正規化 & シート推定 ===== */
const normKey = (k) => String(k).toLowerCase().replace(/[^a-z0-9]+/g, "");
function canonKey(k) {
  const nk = normKey(k);
  for (const [canon, arr] of Object.entries(ALIASES)) {
    const all = [canon, ...arr].map(normKey);
    if (all.includes(nk)) return canon;
  }
  return null;
}
function normalizeRows(json) {
  return json.map((row) => {
    const out = {};
    for (const [k, v] of Object.entries(row)) {
      const ck = canonKey(k);
      if (ck) out[ck] = v;
    }
    return out;
  });
}
function pickSheetName(wb) {
  const preferred = ["effects_all", "effects", "items_effects", "tft_items_effects"];
  const byName = wb.SheetNames.find((n) => preferred.includes(String(n).toLowerCase()));
  if (byName) return byName;
  const need = ["character_id", "star_raw", "feature", "coef"];
  for (const name of wb.SheetNames) {
    const ws = wb.Sheets[name];
    const j1 = XLSX.utils.sheet_to_json(ws, { defval: null, range: 0, raw: true, blankrows: false, header: 1 });
    if (!j1?.length) continue;
    const headers = Array.isArray(j1[0]) ? j1[0] : [];
    const test = normalizeRows([Object.fromEntries(headers.map((h, i) => [h ?? `col${i}`, "x"]))]);
    if (test[0] && need.every((k) => Object.prototype.hasOwnProperty.call(test[0], k))) return name;
  }
  return wb.SheetNames[0];
}

/* ===== 画像ヘルパ ===== */
const IMG = {
  champion: (id) => `/assets/champions/${id}.png`,
  star: () => "/assets/star/star.png",
};
function itemFileCandidates(feature) {
  const raw = String(feature || "").trim().replace(/\.png$/i, "");
  const cand = [];
  if (/^TFT\d*_?[_]?Item_/i.test(raw)) cand.push(raw);
  const base = raw.replace(/^((tft\d*|radiant|ornn)?_)?item_/i, "");
  if (/^TFT\d*_?[_]?Item_/i.test(base)) cand.push(base);
  if (base && !/^TFT\d*_?[_]?Item_/i.test(base)) {
    const pascal = base.split(/[_\s]+/).map((w) => (w ? w[0].toUpperCase() + w.slice(1) : "")).join("");
    cand.push(`TFT_Item_${pascal}`);
    cand.push(`TFT5_Item_${pascal}`);
    cand.push(`TFT15_Item_${pascal}`);
    cand.push(`TFT_Item_Artifact_${pascal}`);
  }
  return Array.from(new Set(cand));
}
const ItemIcon = React.memo(function ItemIcon({ feature, left, top, size, title }) {
  const candidates = itemFileCandidates(feature);
  const src = candidates.length ? `/assets/items/${candidates[0]}.png` : "";
  return (
    <img
      src={src}
      alt=""
      loading="lazy"
      className="absolute rounded-md shadow will-change-transform transition-transform duration-100 hover:z-50 hover:scale-[1.06]"
      style={{ left, top, width: size, height: size, filter: "saturate(0.9)" }}
      title={title}
      onError={(e) => {
        const i = candidates.indexOf((e.currentTarget.src || "").split("/").pop()?.replace(".png", ""));
        const next = candidates[i + 1];
        if (next) e.currentTarget.src = `/assets/items/${next}.png`;
        else e.currentTarget.style.display = "none";
      }}
    />
  );
});

/* ===== ユーティリティ ===== */
const round2 = (v) => (Number.isFinite(+v) ? Number((+v).toFixed(2)) : v);
function scaleXRaw(v, xmin, xmax, pxMin, pxMax) {
  const vv = Math.max(xmin, Math.min(xmax, Number(v)));
  return pxMin + ((vv - xmin) / (xmax - xmin)) * (pxMax - pxMin);
}
const clamp = (v, a, b) => Math.min(Math.max(v, a), b);

/* ===== サポートゲート ===== */
const RARE_RX = /(Artifact|Radiant|Emblem|Crest)/i;
const DEFAULT_SUPPORT_GATES = {
  normal: { floor: 80, pct: 0.01, cap: 250 },
  rare: { floor: 30, pct: 0.004, cap: 120, soft_min: 15, soft_ci_high_neg: -0.2 },
};
let SUPPORT_GATES = JSON.parse(JSON.stringify(DEFAULT_SUPPORT_GATES));
const isRare = (f) => RARE_RX.test(String(f || ""));
function passSupportGate(record, N) {
  const ns = Number(record.n_support);
  const ci = Number(record.ci_high);
  if (!Number.isFinite(ns)) return false;
  const g = isRare(record.feature) ? SUPPORT_GATES.rare : SUPPORT_GATES.normal;
  const hard = Math.max(g.floor ?? 0, Math.min(Math.floor(N * (g.pct ?? 0)), g.cap ?? Infinity));
  if (ns >= hard) return true;
  if (isRare(record.feature)) {
    const sm = Number(g.soft_min ?? Infinity);
    const scPos = Number(g.soft_ci_high ?? NaN);
    const scNeg = Number(g.soft_ci_high_neg ?? NaN);
    const posOk = Number.isFinite(scPos) && Number.isFinite(ci) && ci >= scPos;
    const negOk = Number.isFinite(scNeg) && Number.isFinite(ci) && ci <= scNeg;
    if (ns >= sm && (posOk || negOk)) return true;
  }
  return false;
}

/* ===================== メイン ===================== */
export default function EffectsIconPlot() {
  const [rows, setRows] = useState([]);
  const [rowKeys, setRowKeys] = useState([]); // ["TFT15_Senna__S3", ...] 重複OK（並び順＝画面の行順）
  const [plotW, setPlotW] = useState(1000);
  const [patchLabel, setPatchLabel] = useState("Patch");
  const [cfgTargets, setCfgTargets] = useState(null);
  const [minTotalN, setMinTotalN] = useState(500);
  const [detailCfg, setDetailCfg] = useState(DETAIL_DEFAULT);
  const [options, setOptions] = useState([]);
  const [selected, setSelected] = useState(Array(SLOT_COUNT).fill(""));
  const [initialized, setInitialized] = useState(false);
  const [ready, setReady] = useState(false);

  // 詳細モーダル
  const [detailOpen, setDetailOpen] = useState(false);
  const [detailKey, setDetailKey] = useState("");

  // 参照
  const wrapRef = useRef(null);
  const dataRef = useRef({ allRows: null, groupMaxN: null, costMap: null });

  // 詳細ヘッダー用：総N
  const totalN = useMemo(() => {
    const gm = dataRef.current?.groupMaxN;
    return detailKey && gm ? gm.get(detailKey) ?? 0 : 0;
  }, [detailKey]);

  /* レイアウト幅（一覧） */
  useEffect(() => {
    const el = wrapRef.current;
    if (!el) return;
    const ro = new ResizeObserver((entries) => {
      const w = Math.max(600, Math.floor(entries[0].contentRect.width));
      setPlotW(w);
    });
    ro.observe(el);
    return () => ro.disconnect();
  }, []);

  /* 初回ロード：config / cost / excel */
  useEffect(() => {
    let cancelled = false;
    async function bootstrap() {
      // config
      try {
        const r = await fetch(CONFIG_PATH, { cache: "no-cache" });
        if (r.ok) {
          const cfg = await r.json();
          if (cfg?.patchLabel) setPatchLabel(cfg.patchLabel);
          if (Array.isArray(cfg?.targets)) setCfgTargets(cfg.targets);
          if (Number.isFinite(cfg?.minTotalN)) setMinTotalN(Number(cfg.minTotalN));
          if (cfg?.supportGates) {
            SUPPORT_GATES = {
              normal: { ...DEFAULT_SUPPORT_GATES.normal, ...(cfg.supportGates.normal || {}) },
              rare: { ...DEFAULT_SUPPORT_GATES.rare, ...(cfg.supportGates.rare || {}) },
            };
          }
          if (cfg?.detailPlot) setDetailCfg({ ...DETAIL_DEFAULT, ...cfg.detailPlot });
        }
      } catch {}

      // cost csv
      async function loadCostMap() {
        try {
          const res = await fetch(COST_PATH, { cache: "no-cache" });
          if (!res.ok) return { byId: new Map(), byName: new Map() };
          const text = await res.text();
          const lines = text.split(/\r?\n/).filter((l) => l.trim());
          if (!lines.length) return { byId: new Map(), byName: new Map() };

          const split = (s) => s.split(/,|;|\t/).map((v) => v.trim());
          const headers = split(lines[0]).map((h) => h.toLowerCase());
          const iId = headers.findIndex((h) => ["id", "champion_id", "character_id", "name"].includes(h));
          const iCost = headers.findIndex((h) => ["cost", "price"].includes(h));
          if (iId < 0 || iCost < 0) return { byId: new Map(), byName: new Map() };

          const byId = new Map();
          const byName = new Map();
          for (let i = 1; i < lines.length; i++) {
            const cols = split(lines[i]);
            const rawId = cols[iId];
            const cost = Number(cols[iCost]);
            if (!rawId || !Number.isFinite(cost)) continue;
            const idNorm = normalizeChampionId(rawId.includes("_") ? rawId : `TFT15_${rawId}`);
            const nameKey = (idNorm.split("_").pop() || idNorm).toLowerCase();
            byId.set(idNorm, cost);
            byName.set(nameKey, cost);
          }
          return { byId, byName };
        } catch {
          return { byId: new Map(), byName: new Map() };
        }
      }
      const costMap = await loadCostMap();
      if (cancelled) return;
      dataRef.current.costMap = costMap;

      // excel
      try {
        const res = await fetch(DATA_PATH, { cache: "no-cache" });
        if (!res.ok) {
          console.error("Excel not found:", DATA_PATH);
          return;
        }
        const buf = await res.arrayBuffer();
        const wb = XLSX.read(buf, { type: "array" });
        const ws = wb.Sheets[pickSheetName(wb)];
        const all = normalizeRows(XLSX.utils.sheet_to_json(ws, { defval: null }));

        const need = ["character_id", "star_raw", "feature", "coef"];
        if (all.length && !need.every((k) => Object.prototype.hasOwnProperty.call(all[0], k))) {
          console.error("Excel header missing", need);
          return;
        }

        // (champion×star) ごとの最大 N_total
        const groupMaxN = new Map();
        for (const r of all) {
          const champ = normalizeChampionId(r.character_id);
          const star = Number(r.star_raw);
          const N = Number(r.n_total);
          if (!champ || !Number.isFinite(star)) continue;
          const key = `${champ}__S${star}`;
          const prev = groupMaxN.get(key) ?? -Infinity;
          groupMaxN.set(key, Number.isFinite(N) ? Math.max(prev, N) : prev);
        }

        dataRef.current.allRows = all;
        dataRef.current.groupMaxN = groupMaxN;

        // 候補セット（BAN / コスト / N>minTotalN）
        const comboSet = new Set();
        for (const [key, Nmax] of groupMaxN.entries()) {
          const [champ, s] = key.split("__S");
          const star = Number(s);

          if (BAN_SET.has(champ.toLowerCase())) continue;
          if (!(Number.isFinite(Nmax) && Nmax > minTotalN)) continue;

          const nameKey = (String(champ).split("_").pop() || champ).toLowerCase();
          const cost = costMap.byId.get(champ) ?? costMap.byName.get(nameKey);
          if (Number.isFinite(cost)) {
            const allowedStar = cost <= 3 ? 3 : 2;
            if (star !== allowedStar) continue;
          }
          comboSet.add(key);
        }

        const comboArr = Array.from(comboSet)
          .map((k) => {
            const [id, s] = k.split("__S");
            return { id, star: Number(s), key: k, label: `${displayNameFromId(id)} ★${s}` };
          })
          .sort((a, b) => a.label.localeCompare(b.label, "ja"));

        if (!cancelled) {
          setOptions(comboArr);
          setReady(true);

          // 初期 selected（config→fallback）を1回だけ
          if (!initialized) {
            const defaultTargets = [
              { id: "TFT15_Ashe", stars: [2] },
              { id: "TFT15_KaiSa", stars: [3] },
              { id: "TFT15_Yuumi", stars: [2] },
              { id: "TFT15_Leona", stars: [2] },
              { id: "TFT15_Yuumi", stars: [2] },
            ];
            const base = (cfgTargets ?? defaultTargets)
              .flatMap((t) => (t.stars || []).map((st) => `${t.id}__S${st}`))
              .slice(0, SLOT_COUNT);

            const ensureNoEmpty = (arr) => {
              const used = new Set(arr.filter(Boolean));
              const pick = () => comboArr.find((o) => !used.has(o.key))?.key || comboArr[0]?.key || "";
              return arr.map((v) => {
                if (v && comboArr.some((o) => o.key === v)) {
                  used.add(v);
                  return v;
                }
                const k = pick();
                used.add(k);
                return k;
              });
            };
            const normalized = base.map((k) => comboArr.find((o) => o.key === k)?.key || "");
            setSelected(ensureNoEmpty(normalized));
            setInitialized(true);
          }
        }
      } catch (e) {
        console.error(e);
      }
    }
    bootstrap();
    return () => {
      cancelled = true;
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  /* === 一覧の rows 再計算（重複キーをそのまま“別行”として扱う版） === */
  useEffect(() => {
    if (!ready) return;
    const { allRows, groupMaxN } = dataRef.current;
    if (!allRows || !groupMaxN) return;

    // 並び順そのまま（重複OK）→ これが画面の行順になる
    const eligibleKeys = selected.filter(Boolean);

    // 行ヘッダも重複そのままで表示
    setRowKeys(eligibleKeys);

    const out = [];

    eligibleKeys.forEach((key, row) => {
      const [wantedId, wantedStarStr] = key.split("__S");
      const wantedStar = Number(wantedStarStr);
      const N = groupMaxN.get(key) ?? 0;

      const yCenter = row * ROW_HEIGHT + (ROW_HEIGHT - ITEM_SIZE) / 2;

      // 行のアイテム抽出
      const items = [];
      for (const r of allRows) {
        const champ = normalizeChampionId(r.character_id);
        const star = Number(r.star_raw);
        if (champ !== wantedId || star !== wantedStar) continue;

        const coefVal = Number(r.coef);
        if (!Number.isFinite(coefVal) || coefVal > DOMAIN.xmax) continue;
        if (!passSupportGate(r, N)) continue;

        items.push({
          champion: wantedId,
          star: wantedStar,
          feature: String(r.feature),
          coef: Number(r.coef),
          n_support: Number(r.n_support),
          ci_high: Number(r.ci_high),
        });
      }
      if (items.length === 0) return;

      // x近接の縦積み
      const buckets = new Map();
      for (const p of items) {
        const coefR = round2(p.coef);
        const x = scaleXRaw(coefR, DOMAIN.xmin, DOMAIN.xmax, GUTTER_LEFT, plotW - GUTTER_RIGHT);
        const b = Math.round(x / X_BUCKET_PX);
        if (!buckets.has(b)) buckets.set(b, []);
        buckets.get(b).push({ ...p, coef: coefR, x });
      }

      for (const [, arr] of buckets.entries()) {
        arr.sort((a, b) => a.coef - b.coef);
        const m = arr.length;
        const maxK = Math.ceil((m - 1) / 2);
        const halfUsable = Math.max(8, Math.floor((ROW_HEIGHT - ITEM_SIZE) / 2 - ROW_INNER_GAP));
        const spacing = Math.max(6, Math.floor(halfUsable / Math.max(1, maxK)));
        const yOffset = (idx) => {
          if (idx === 0) return 0;
          const k = Math.ceil(idx / 2);
          const sign = idx % 2 === 1 ? -1 : +1;
          return sign * k * spacing;
        };

        arr.forEach((p, i) =>
          out.push({
            ...p,
            x: Math.round(p.x),
            y: Math.round(yCenter + yOffset(i)),
            row, // 念のため保持
          })
        );
      }
    });

    setRows(out);
  }, [ready, plotW, selected]);

  const height = Math.max(rowKeys.length * ROW_HEIGHT, 200);

  // 一覧の目盛り
  const ticks = [];
  for (let t = DOMAIN.xmin; t <= DOMAIN.xmax + 1e-9; t += 0.1) ticks.push(Number(t.toFixed(1)));
  const labelDefs = [-0.5, -0.4, -0.3, -0.2, -0.1, 0, 0.1, 0.2].map((t) => ({
    t,
    text: t === -0.5 ? "-0.5以下" : t.toFixed(1),
  }));
  const tickPos = ticks.map((t) => ({
    t,
    x: Math.round(scaleXRaw(t, DOMAIN.xmin, DOMAIN.xmax, GUTTER_LEFT, plotW - GUTTER_RIGHT)),
  }));

  const handleRowChange = (idx, value) => {
    setSelected((prev) => {
      const next = [...prev];
      next[idx] = value;
      return next;
    });
  };

  return (
    <div className="p-4">
      {/* パッチラベル（白地・黒文字） */}
      <div className="mb-2">
        <span className="inline-flex items-center gap-2 rounded-full px-3 py-1 text-sm font-medium bg-white text-black border border-neutral-300">
          {patchLabel}
        </span>
      </div>

      <div ref={wrapRef} className="relative rounded-xl bg-white shadow overflow-hidden" style={{ width: "100%" }}>
        {/* ヘッダー（上目盛り） */}
        <div className="sticky top-0 z-40 bg-white/95 backdrop-blur px-6 pt-1 pb-1" style={{ width: plotW }}>
          <div className="relative" style={{ height: 34 }}>
            {labelDefs.map(({ t, text }) => (
              <div
                key={"lbl-" + t}
                className="absolute text-gray-700"
                style={{
                  left: Math.round(scaleXRaw(t, DOMAIN.xmin, DOMAIN.xmax, GUTTER_LEFT, plotW - GUTTER_RIGHT)),
                  transform: "translateX(-50%)",
                  marginLeft: "-1em",
                  fontSize: "16.5px",
                  bottom: 2,
                }}
              >
                {text}
              </div>
            ))}
          </div>
        </div>

        {/* 本体（一覧） */}
        <div className="relative p-6" style={{ width: plotW, height }}>
          {/* 行ストライプ */}
          {rowKeys.map((rk, i) => (
            <div
              key={"rowbg-" + i}
              className="absolute"
              style={{
                top: i * ROW_HEIGHT,
                left: 0,
                width: plotW,
                height: ROW_HEIGHT,
                background: i % 2 ? STRIPE_BG_DARK : STRIPE_BG_LIGHT,
              }}
            />
          ))}

          {/* ラベル列の境界線 */}
          <div className="absolute top-0 bottom-0 w-px bg-gray-200" style={{ left: GUTTER_LEFT }} />

          {/* 背景グリッド */}
          {tickPos.map(({ t, x }) => (
            <div
              key={"tick-b-" + t}
              className="absolute top-0 h-full"
              style={{
                left: x,
                width: t === 0 ? 2 : LIST_GRID_THICKNESS,
                backgroundColor: t === 0 ? COLOR.listZeroLine : COLOR.listGridLine,
              }}
            />
          ))}

          {/* 行ラベル（アイコン＋★＋各行 Combobox） */}
          {rowKeys.map((k, i) => {
            const [champ, star] = k.split("__S");
            const top = i * ROW_HEIGHT;
            return (
              <div key={"row-" + i} className="absolute select-none" style={{ top, left: 0, width: GUTTER_LEFT, height: ROW_HEIGHT }}>
                <div className="flex flex-col items-center pt-1">
                  <button
                    type="button"
                    className="group cursor-pointer focus:outline-none"
                    onClick={() => {
                      setDetailKey(k);
                      setDetailOpen(true);
                    }}
                    title="クリックで詳細を表示"
                  >
                    <img src={IMG.champion(champ)} alt="" className="h-16 w-16 rounded-xl border object-cover" loading="lazy" />
                    <div className="flex gap-1 mt-1 justify-center">
                      {Array.from({ length: Number(star) }).map((_, idx) => (
                        <img key={idx} src={IMG.star()} alt="" className="h-4 w-4" loading="lazy" />
                      ))}
                    </div>
                  </button>

                  {/* Combobox（親へのイベントを止める） */}
                  <div
                    className="mt-1 w-full px-2"
                    onPointerDown={(e) => e.stopPropagation()}
                    onMouseDown={(e) => e.stopPropagation()}
                    onClick={(e) => e.stopPropagation()}
                  >
                    <RowCombobox options={options} value={selected[i] ?? ""} onChange={(val) => handleRowChange(i, val)} />
                  </div>
                </div>
              </div>
            );
          })}

          {/* アイテム群（一覧） */}
          {rows.map((r, idx) => (
            <ItemIcon
              key={`${r.champion}-${r.star}-${r.feature}-${r.x}-${r.y}-${idx}`}
              feature={r.feature}
              left={r.x}
              top={r.y}
              size={ITEM_SIZE}
              title={`${r.feature} / coef=${round2(r.coef)} / n=${r.n_support ?? "?"}`}
            />
          ))}
        </div>
      </div>

      {/* ===== 詳細モーダル ===== */}
      <Dialog.Root open={detailOpen} onOpenChange={setDetailOpen}>
        <Dialog.Portal>
          <Dialog.Overlay className="fixed inset-0 bg-black/40 backdrop-blur-sm" />
          <Dialog.Content
            className="fixed left-1/2 top-1/2 w-[92vw] max-w-[1100px]
                    -translate-x-1/2 -translate-y-1/2 rounded-xl bg-white shadow-lg
                    focus:outline-none"
          >
            <DetailHeader label={patchLabel} detailKey={detailKey} totalN={totalN} />
            <div className="px-5 py-4 max-h-[80vh] overflow-y-auto">
              <DetailPlot detailKey={detailKey} dataRef={dataRef} config={detailCfg} />
            </div>
          </Dialog.Content>
        </Dialog.Portal>
      </Dialog.Root>
    </div>
  );
}

/* =============== 詳細モーダル：ヘッダー =============== */
function DetailHeader({ label, detailKey, totalN }) {
  return (
    <div className="flex items-start justify-between bg-black text-white px-5 py-3 rounded-t-xl">
      <div className="flex items-center gap-3">
        {detailKey && (
          <img
            src={`/assets/champions/${detailKey.split("__S")[0]}.png`}
            alt=""
            className="h-10 w-10 rounded-lg object-cover border border-white/20"
            loading="lazy"
          />
        )}
        <div className="leading-tight">
          <Dialog.Title className="text-base font-semibold tracking-tight flex items-center gap-2">
            <span>{detailKey ? displayNameFromId(detailKey.split("__S")[0]) : "Champion"}</span>
            <span className="text-xs font-normal opacity-90">N={(totalN ?? 0).toLocaleString?.() ?? totalN}</span>
          </Dialog.Title>
          <div className="flex items-center gap-1 mt-1">
            {detailKey &&
              Array.from({ length: Number(detailKey.split("__S")[1]) || 1 }).map((_, i) => (
                <img key={i} src="/assets/star/star.png" alt="" className="h-4 w-4" />
              ))}
          </div>
        </div>
      </div>
      <span className="rounded-full bg-white text-black px-3 py-1 text-xs font-medium">{label}</span>
    </div>
  );
}

/* =============== 詳細モーダル：フォレストプロット =============== */
function DetailPlot({ detailKey, dataRef, config }) {
  const wrapRef = useRef(null);
  const [width, setWidth] = useState(900);

  useEffect(() => {
    const el = wrapRef.current;
    if (!el) return;
    const ro = new ResizeObserver((entries) => {
      const w = Math.max(600, Math.floor(entries[0].contentRect.width));
      setWidth(w);
    });
    ro.observe(el);
    return () => ro.disconnect();
  }, []);

  const rows = useMemo(() => {
    if (!detailKey) return [];
    const allRows = dataRef.current.allRows;
    const groupMaxN = dataRef.current.groupMaxN;
    if (!allRows || !groupMaxN) return [];

    const [wantedId, starStr] = detailKey.split("__S");
    const star = Number(starStr);
    const Nmax = groupMaxN.get(detailKey) ?? 0;

    const list = [];
    for (const r of allRows) {
      const champ = normalizeChampionId(r.character_id);
      const s = Number(r.star_raw);
      if (champ !== wantedId || s !== star) continue;
      if (!passSupportGate(r, Nmax)) continue;

      const coef = Number(r.coef);
      const lo = Number(r.ci_low);
      const hi = Number(r.ci_high);
      if (![coef, lo, hi].every(Number.isFinite)) continue;

      list.push({
        feature: String(r.feature),
        coef,
        ci_low: lo,
        ci_high: hi,
        n_support: Number(r.n_support) || 0,
      });
    }
    return list.sort((a, b) => a.coef - b.coef);
  }, [detailKey]);

  const height = Math.max(rows.length * DETAIL_ROW_H, 120);

  const pad = 18;
  const xMin = config?.xMin ?? -0.5;
  const xMax = config?.xMax ?? 0.5;
  const pxMin = DETAIL_ICON_COL + pad;
  const pxMax = Math.max(pxMin + 200, width - DETAIL_RIGHT_COL - pad);

  const ticks = [];
  for (let t = -0.5; t <= 0.5 + 1e-9; t += 0.1) ticks.push(Number(t.toFixed(1)));

  return (
    <div ref={wrapRef} className="relative w-full">
      {/* 上部ラベル */}
      <div className="relative" style={{ height: 28 }}>
        {ticks.map((t) => (
          <div
            key={"lab-" + t}
            className="absolute text-[13px]"
            style={{
              color: COLOR.axisLabel,
              left: Math.round(scaleXRaw(t, xMin, xMax, pxMin, pxMax)),
              transform: "translateX(-50%)",
              top: 6,
            }}
          >
            {t > 0 ? t.toFixed(1) : t === 0 ? "0" : t.toFixed(1)}
          </div>
        ))}
      </div>

      {/* 本体 */}
      <div className="relative rounded-xl border bg-white overflow-hidden" style={{ height }}>
        {/* 行ストライプ */}
        {rows.map((r, i) => (
          <div
            key={"bg-" + i}
            className="absolute"
            style={{
              top: i * DETAIL_ROW_H,
              left: 0,
              right: 0,
              height: DETAIL_ROW_H,
              background: i % 2 ? STRIPE_BG_DARK : STRIPE_BG_LIGHT,
            }}
          />
        ))}

        {/* 縦グリッド */}
        {ticks.map((t) => (
          <div
            key={"v-" + t}
            className="absolute top-0"
            style={{
              left: Math.round(scaleXRaw(t, xMin, xMax, pxMin, pxMax)),
              height: height,
              width: t === 0 ? ZERO_THICKNESS : GRID_THICKNESS,
              backgroundColor: t === 0 ? COLOR.zeroLine : COLOR.gridLine,
            }}
          />
        ))}

        {/* 左列アイコン */}
        {rows.map((r, i) => (
          <ItemIcon
            key={"icon-" + i}
            feature={r.feature}
            left={Math.round((DETAIL_ICON_COL - ITEM_SIZE) / 2)}
            top={Math.round(i * DETAIL_ROW_H + (DETAIL_ROW_H - ITEM_SIZE) / 2)}
            size={ITEM_SIZE}
            title={r.feature}
          />
        ))}

        {/* CI / coef / 右端ラベル */}
        {rows.map((r, i) => {
          const yMid = Math.round(i * DETAIL_ROW_H + DETAIL_ROW_H / 2);

          const loC = clamp(r.ci_low, xMin, xMax);
          const hiC = clamp(r.ci_high, xMin, xMax);
          const x1 = Math.round(scaleXRaw(loC, xMin, xMax, pxMin, pxMax));
          const x2 = Math.round(scaleXRaw(hiC, xMin, xMax, pxMin, pxMax));

          const coefC = clamp(r.coef, xMin, xMax);
          const xDot = Math.round(scaleXRaw(coefC, xMin, xMax, pxMin, pxMax));

          const leftX = Math.min(x1, x2);
          const rightX = Math.max(x1, x2);
          const hitPad = Math.floor(DOT_SIZE / 2);
          const hitL = Math.min(leftX, xDot - hitPad);
          const hitR = Math.max(rightX, xDot + hitPad);
          const hitW = Math.max(12, hitR - hitL);

          const tip = `coef=${round2(r.coef)} | ci_low=${round2(r.ci_low)} | ci_high=${round2(r.ci_high)}`;

          return (
            <React.Fragment key={"row-" + i}>
              <div
                className="absolute"
                style={{
                  left: leftX,
                  width: Math.max(2, rightX - leftX),
                  height: CI_THICKNESS,
                  top: yMid - CI_THICKNESS / 2,
                  borderRadius: 2,
                  backgroundColor: COLOR.ciLine,
                }}
              />
              <div
                className="absolute rounded-full"
                style={{
                  left: xDot - DOT_SIZE / 2,
                  top: yMid - DOT_SIZE / 2,
                  width: DOT_SIZE,
                  height: DOT_SIZE,
                  backgroundColor: COLOR.dot,
                }}
                title={tip}
              />
              <div
                className="absolute cursor-help"
                title={tip}
                style={{ left: hitL, width: hitW, height: 24, top: yMid - 12, background: "transparent" }}
              />
              <div className="absolute text-sm text-neutral-800" style={{ left: pxMax + 14, top: yMid - 10 }}>
                n={r.n_support}
              </div>
            </React.Fragment>
          );
        })}
      </div>
    </div>
  );
}

/* =============== 行の Combobox =============== */
function RowCombobox({ options, value, onChange, className = "" }) {
  const [open, setOpen] = useState(false);
  const selected = options.find((o) => o.key === value);

  return (
    <Popover open={open} onOpenChange={setOpen}>
      <PopoverTrigger asChild>
        <Button
          variant="outline"
          size="sm"
          className={`w-full justify-between rounded-lg ${className}`}
          onPointerDown={(e) => e.stopPropagation()}
          onMouseDown={(e) => e.stopPropagation()}
          onClick={(e) => e.stopPropagation()}
        >
          <div className="flex items-center gap-2 truncate">
            {selected ? (
              <>
                <img
                  src={`/assets/champions/${selected.id}.png`}
                  alt=""
                  className="h-4 w-4 rounded-sm object-cover border"
                  loading="lazy"
                />
                <span className="truncate">
                  {displayNameFromId(selected.id)} ★{selected.star}
                </span>
              </>
            ) : (
              <span className="text-neutral-500">Select…</span>
            )}
          </div>
          <ChevronsUpDown className="h-4 w-4 opacity-60" />
        </Button>
      </PopoverTrigger>

      <PopoverContent
        className="w-[260px] p-0 overscroll-contain"
        align="start"
        sideOffset={6}
        onWheel={(e) => e.stopPropagation()}
        onPointerDown={(e) => e.stopPropagation()}
        onMouseDown={(e) => e.stopPropagation()}
        onClick={(e) => e.stopPropagation()}
      >
        <Command shouldFilter={true}>
          <CommandInput placeholder="Search champion…" />
          <CommandEmpty>No result.</CommandEmpty>

          <CommandList className="max-h-72 overflow-y-auto overscroll-contain" onWheel={(e) => e.stopPropagation()}>
            <CommandGroup heading="Champions">
              {options.map((opt) => (
                <CommandItem
                  key={opt.key}
                  value={`${opt.id} s${opt.star}`}
                  onSelect={() => {
                    onChange(opt.key);
                    setOpen(false);
                  }}
                  className="flex items-center gap-2"
                >
                  <img
                    src={`/assets/champions/${opt.id}.png`}
                    alt=""
                    className="h-5 w-5 rounded-sm object-cover border"
                    loading="lazy"
                  />
                  <span className="flex-1 truncate">
                    {displayNameFromId(opt.id)} ★{opt.star}
                  </span>
                  <Check className={`h-4 w-4 ${value === opt.key ? "opacity-100" : "opacity-0"}`} />
                </CommandItem>
              ))}
            </CommandGroup>
          </CommandList>
        </Command>
      </PopoverContent>
    </Popover>
  );
}
