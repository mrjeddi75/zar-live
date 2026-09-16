"use client";

import { useEffect, useState } from "react";
import { ArrowDownRight, ArrowUpRight, Minus } from "lucide-react";
import type { LiveRate } from "@/lib/types";
import { chipGradient, metaFor } from "@/lib/currencies";
import { formatPct, formatPrice, type DigitMode } from "@/lib/format";
import { useAnimatedNumber } from "@/hooks/use-animated-number";
import { Sparkline } from "./sparkline";
import { ConverterInput } from "./converter-input";

interface Props {
  rate: LiveRate;
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

export function CurrencyCard({
  rate,
  digits,
  flash,
  index,
  lastFetchAt,
  prevSell,
  onClick,
}: Props) {
  const value = useAnimatedNumber(rate.sell);
  const meta = metaFor(rate.code);
  const [openCalc, setOpenCalc] = useState(false);

  const trend = rate.sparkPct > 0.02 ? "up" : rate.sparkPct < -0.02 ? "down" : "flat";

  const trendIcon =
    trend === "up" ? (
      <ArrowUpRight className="size-4" />
    ) : trend === "down" ? (
      <ArrowDownRight className="size-4" />
    ) : (
      <Minus className="size-4" />
    );

  const deltaAmount = prevSell !== null ? Math.abs(rate.sell - prevSell) : null;
  const deltaDir =
    prevSell !== null
      ? rate.sell > prevSell
        ? "up"
        : rate.sell < prevSell
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
      <button
        onClick={onClick}
        className="w-full text-right"
        disabled={!onClick}
      >
        <div className="flex items-start justify-between gap-3">
          <div className="flex items-center gap-3">
            <div
              className="grid size-10 place-items-center rounded-xl text-sm font-black text-slate-900"
              style={{ background: chipGradient(rate.code) }}
            >
              {meta.sym}
            </div>
            <div>
              <h3 className="text-sm font-bold text-slate-900">{rate.name}</h3>
              <p className="text-[11px] text-slate-500">{meta.en}</p>
            </div>
          </div>

          <span className={`chip ${trend === "up" ? "chip-up" : trend === "down" ? "chip-down" : ""}`}>
            {trendIcon}
            <span className="num">{formatPct(rate.sparkPct, digits)}</span>
          </span>
        </div>

        <div className="mt-3 flex items-end justify-between gap-3">
          <div>
            <p className="text-[11px] text-slate-500">قیمت لحظه‌ای <TimeAgo at={lastFetchAt} /></p>
            <p className="num mt-1 text-2xl font-black text-slate-900">
              {formatPrice(value, digits)}
            </p>
            {deltaAmount !== null && (
              <p className={`num mt-1 text-xs ${deltaDir === "up" ? "text-green-600" : deltaDir === "down" ? "text-red-600" : "text-slate-400"}`}>
                {deltaDir === "up" ? "+" : deltaDir === "down" ? "−" : ""}
                {formatPrice(deltaAmount, digits)} تومان
              </p>
            )}
          </div>
          <Sparkline points={rate.spark} width={90} height={34} trend={trend} />
        </div>
      </button>

      <div className="mt-3 flex items-center justify-between border-t border-slate-100 pt-3">
        <span className="text-xs text-slate-500">خرید: <span className="num text-slate-700">{formatPrice(rate.buy, digits)}</span></span>
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

      {openCalc && (
        <ConverterInput
          label={`تبدیل ${rate.name}`}
          rate={rate.sell}
          unit="تومان"
          digits={digits}
        />
      )}
    </article>
  );
}
