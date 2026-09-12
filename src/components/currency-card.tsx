"use client";

import { ArrowDownRight, ArrowUpRight, Minus } from "lucide-react";
import type { LiveRate } from "@/lib/types";
import { chipGradient, metaFor } from "@/lib/currencies";
import { formatPct, formatPrice, formatUsdRate, type DigitMode } from "@/lib/format";
import { useAnimatedNumber } from "@/hooks/use-animated-number";
import { Sparkline } from "./sparkline";

interface Props {
  rate: LiveRate;
  digits: DigitMode;
  flash: "up" | "down" | null;
  index: number;
}

export function CurrencyCard({ rate, digits, flash, index }: Props) {
  const animated = useAnimatedNumber(rate.sell);
  const meta = metaFor(rate.code);

  const dirIcon =
    rate.direction === "up" ? (
      <ArrowUpRight className="size-3.5" strokeWidth={2.6} />
    ) : rate.direction === "down" ? (
      <ArrowDownRight className="size-3.5" strokeWidth={2.6} />
    ) : (
      <Minus className="size-3.5" strokeWidth={2.6} />
    );

  const trend = rate.sparkPct > 0.02 ? "up" : rate.sparkPct < -0.02 ? "down" : "flat";
  const trendColor =
    trend === "up" ? "text-up" : trend === "down" ? "text-down" : "text-white/40";
  const trendBg =
    trend === "up"
      ? "bg-up/10 border-up/20 text-up"
      : trend === "down"
        ? "bg-down/10 border-down/20 text-down"
        : "bg-white/5 border-white/10 text-white/50";

  const sparkMin = Math.min(...rate.spark);
  const sparkMax = Math.max(...rate.spark);
  const pos =
    sparkMax > sparkMin ? ((rate.sell - sparkMin) / (sparkMax - sparkMin)) * 100 : 50;

  return (
    <article
      className={`glass card-hover animate-fade-in-up group relative overflow-hidden rounded-3xl p-5 ${
        flash === "up" ? "flash-up" : flash === "down" ? "flash-down" : ""
      }`}
      style={{ animationDelay: `${index * 90}ms` }}
    >
      {/* هالهٔ نور گوشه */}
      <div
        className="pointer-events-none absolute -top-24 -start-24 size-48 rounded-full opacity-25 blur-3xl transition-opacity duration-500 group-hover:opacity-45"
        style={{ background: chipGradient(rate.code) }}
      />

      <div className="relative flex items-start justify-between gap-3">
        <div className="flex items-center gap-3">
          <div
            className="grid size-11 place-items-center rounded-2xl text-lg font-black text-ink-950 shadow-lg"
            style={{ background: chipGradient(rate.code) }}
          >
            {meta.sym}
          </div>
          <div className="leading-tight">
            <h3 className="text-[15px] font-bold text-white">{rate.name}</h3>
            <p className="mt-0.5 text-[11px] font-medium tracking-wide text-white/40">
              {meta.en} · {rate.code.toUpperCase()}
            </p>
          </div>
        </div>
        <span
          className={`flex items-center gap-1 rounded-full border px-2.5 py-1 text-[11px] font-bold ${trendBg}`}
        >
          {dirIcon}
          <span className="num">{formatPct(rate.sparkPct, digits)}</span>
        </span>
      </div>

      <div className="relative mt-5 flex items-end justify-between gap-2">
        <div>
          <div className="text-[11px] font-medium text-white/40">قیمت فروش</div>
          <div className="num mt-1 text-[34px] leading-none font-extrabold tracking-tight text-white">
            {formatPrice(animated, digits)}
            <span className="ms-1.5 text-xs font-medium text-white/35">تومان</span>
          </div>
        </div>
        <Sparkline points={rate.spark} width={108} height={40} trend={trend} />
      </div>

      <div className="relative mt-4 flex items-center justify-between border-t border-white/[0.06] pt-3.5 text-xs">
        <div className="flex items-center gap-1.5">
          <span className="text-white/40">خرید:</span>
          <span className="num font-bold text-white/80">
            {formatPrice(rate.buy, digits)}
          </span>
        </div>
        <div className={`flex items-center gap-1 ${trendColor}`}>
          <span className="text-white/40">برابری دلار:</span>
          <span className="num font-bold text-white/70">
            {formatUsdRate(rate.usdRate, digits)}
          </span>
        </div>
      </div>

      {/* نوار دامنهٔ رصد */}
      <div className="relative mt-3.5">
        <div className="h-1 overflow-hidden rounded-full bg-white/[0.06]">
          <div
            className="h-full rounded-full bg-gradient-to-l from-up/70 via-gold-400/70 to-down/70"
            style={{ width: "100%" }}
          />
        </div>
        <div
          className="absolute top-1/2 size-2.5 -translate-y-1/2 rounded-full border-2 border-ink-950 bg-white shadow-[0_0_10px_rgb(255_255_255/0.5)] transition-[inset-inline-start] duration-700"
          style={{ insetInlineStart: `calc(${Math.min(100, Math.max(0, pos))}% - 5px)` }}
        />
        <div className="mt-1.5 flex justify-between text-[10px] text-white/30">
          <span className="num">{formatPrice(sparkMin, digits)}</span>
          <span className="num">{formatPrice(sparkMax, digits)}</span>
        </div>
      </div>
    </article>
  );
}
