// src/components/ChampionDetailDialog.jsx
import React, { useMemo } from "react";
import {
  Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription,
} from "./ui/dialog";

const IMG = {
  champion: (id) => `/assets/champions/${id}.png`,
  star: () => "/assets/star/star.png",
};
const displayNameFromId = (id) =>
  (String(id || "").split("_").pop() || String(id || ""));

export default function ChampionDetailDialog({
  open,
  onOpenChange,
  championKey,   // 例: "TFT15_Senna__S3"
  patchLabel = "Patch",
}) {
  const meta = useMemo(() => {
    if (!championKey) return null;
    const [id, s] = String(championKey).split("__S");
    return { id, star: Number(s) || 1, name: displayNameFromId(id) };
  }, [championKey]);

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-[1100px] w-[92vw] p-0 overflow-hidden">
        {/* ヘッダー（黒地・白抜き） */}
        <div className="flex items-start justify-between bg-black text-white px-5 py-3">
          <div className="flex items-center gap-3">
            {meta && (
              <img
                src={IMG.champion(meta.id)}
                alt=""
                className="h-10 w-10 rounded-lg object-cover border border-white/20"
                loading="lazy"
              />
            )}
            <div className="leading-tight">
              <DialogTitle className="text-base font-semibold tracking-tight">
                {meta ? meta.name : "Champion"}
              </DialogTitle>
              <div className="flex items-center gap-1 mt-1">
                {meta &&
                  Array.from({ length: meta.star }).map((_, i) => (
                    <img key={i} src={IMG.star()} alt="" className="h-4 w-4" />
                  ))}
              </div>
            </div>
          </div>

          <span className="rounded-full bg-white text-black px-3 py-1 text-xs font-medium">
            {patchLabel}
          </span>
        </div>

        {/* 本文：後でフォレストプロットを差し込む */}
        <div className="px-5 py-4 max-h-[80vh] overflow-y-auto">
          <div className="rounded-lg border border-dashed p-6 text-sm text-neutral-600">
            フォレストプロット（-0.5〜0.5、端はクランプ）をここに描画します。
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
}
