"use client";

import { useEffect, useState } from "react";
import { ArrowDownRight, ArrowUpRight, Minus } from "lucide-react";
import type { GoldRate } from "@/lib/types";
import { chipGradient, metaFor } from "@/lib/currencies";
import { formatPct, formatPrice, type DigitMode } from "@/lib/format";
import { useAnimatedNumber } from "@/hooks/use-animated-number";
import { Sparkline } from "./sparkline";
import { ConverterInput } from "./converter-input";

interface Props {
  gold: GoldRate;
  digits: DigitMode;
  flash: "up" | "down" | null;
  index: number;
  lastFetchAt: number;
  prevSell: number | null;
  onClick?: () => void;
}

function TimeAgo({ at }: { at: number }) {
  const [sec, setSec] = useState(0);
  useEffect(() => {
    const id = setInterval(() => setSec(Math.floor((Date.now() - at) / 1000)), 1000);
    return () => clearInterval(id);
  }, [at]);
  if (at === 0) return null;
  if (sec < 5) return <span className="text-[10px] text-slate-400">همین الان</span>;
  if (sec < 60) return <span className="num text-[10px] text-slate-400">{sec} ثانیه پیش</span>;
  return <span className="num text-[10px] text-slate-400">{Math.floor(sec / 60)} دقیقه پیش</span>;
}

export function GoldCard({
  gold,
  digits,
  flash,
  index,
  lastFetchAt,
  prevSell,
  onClick,
}: Props) {
  const value = useAnimatedNumber(gold.sell);
  const meta = metaFor(gold.code);
  const [openCalc, setOpenCalc] = useState(false);

  const pct = gold.changePct ?? gold.sparkPct;
  const trend = pct > 0.02 ? "up" : pct < -0.02 ? "down" : "flat";

  const trendIcon =
    trend === "up" ? <ArrowUpRight className="size-4" /> : trend === "down" ? <ArrowDownRight className="size-4" /> : <Minus className="size-4" />;

  const deltaAmount = prevSell !== null ? Math.abs(gold.sell - prevSell) : null;
  const deltaDir =
    prevSell !== null
      ? gold.sell > prevSell
        ? "up"
        : gold.sell < prevSell
          ? "down"
          : "flat"
      : "flat";

  return (
    <article
      className={`card-clean card-clean-hover animate-fade-in p-4 ${
        flash === "up" ? "flash-up" : flash === "down" ? "flash-down" : ""
      }`}
      style={{ animationDelay: `${index * 40}ms` }}
    >
      <button onClick={onClick} className="w-full text-right" disabled={!onClick}>
        <div className="flex items-start justify-between gap-3">
          <div className="flex items-center gap-3">
            <div
              className="grid size-10 place-items-center rounded-xl text-sm font-black text-slate-900"
              style={{ background: chipGradient(gold.code) }}
            >
              {meta.sym}
            </div>
            <div>
              <h3 className="text-sm font-bold text-slate-900">{gold.name}</h3>
              <p className="text-[11px] text-slate-500">{meta.en}</p>
            </div>
          </div>
          <span className={`chip ${trend === "up" ? "chip-up" : trend === "down" ? "chip-down" : ""}`}>
            {trendIcon}
            <span className="num">{formatPct(pct, digits)}</span>
          </span>
        </div>

        <div className="mt-3 flex items-end justify-between gap-3">
          <div>
            <p className="text-[11px] text-slate-500">قیمت لحظه‌ای <TimeAgo at={lastFetchAt} /></p>
            <p className="num mt-1 text-2xl font-black text-slate-900">
              {formatPrice(value, digits)}
              <span className="ms-1 text-xs font-medium text-slate-500">{gold.unit}</span>
            </p>
            {deltaAmount !== null && (
              <p className={`num mt-1 text-xs ${deltaDir === "up" ? "text-green-600" : deltaDir === "down" ? "text-red-600" : "text-slate-400"}`}>
                {deltaDir === "up" ? "+" : deltaDir === "down" ? "−" : ""}
                {formatPrice(deltaAmount, digits)} {gold.unit}
              </p>
            )}
          </div>
          <Sparkline points={gold.spark} width={90} height={34} trend={trend} />
        </div>
      </button>

      <div className="mt-3 border-t border-slate-100 pt-3 text-xs text-slate-600">
        <div className="flex items-center justify-between">
          <span>
            قیمت واقعی: <span className="num">{gold.realValue !== null ? formatPrice(gold.realValue, digits) : "—"}</span>
          </span>
          <button
            onClick={(e) => {
              e.stopPropagation();
              setOpenCalc((v) => !v);
            }}
            className="btn text-xs px-2.5 py-1.5"
          >
            🔢 تبدیل
          </button>
        </div>
      </div>

      {openCalc && (
        <ConverterInput
          label={`تبدیل ${gold.name}`}
          rate={gold.sell}
          unit={gold.unit}
          digits={digits}
        />
      )}
    </article>
  );
}
