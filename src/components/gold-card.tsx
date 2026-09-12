"use client";

import { useEffect, useState } from "react";
import { ArrowDownRight, ArrowUpRight, Clock, Minus } from "lucide-react";
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
    const id = setInterval(
      () => setSec(Math.floor((Date.now() - at) / 1000)),
      1000,
    );
    return () => clearInterval(id);
  }, [at]);
  if (at === 0) return null;
  if (sec < 5) return <span className="text-[10px] text-up/70 font-medium">همین الان</span>;
  if (sec < 60) return <span className="num text-[10px] text-white/35">{sec} ثانیه پیش</span>;
  const m = Math.floor(sec / 60);
  return <span className="num text-[10px] text-white/35">{m} دقیقه پیش</span>;
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
  const animated = useAnimatedNumber(gold.sell);
  const meta = metaFor(gold.code);
  const [showCalc, setShowCalc] = useState(false);

  const pct = gold.changePct ?? gold.sparkPct;
  const trend = pct > 0.01 ? "up" : pct < -0.01 ? "down" : "flat";

  const DirIcon =
    trend === "up"
      ? ArrowUpRight
      : trend === "down"
        ? ArrowDownRight
        : Minus;

  const trendBg =
    trend === "up"
      ? "bg-up/10 border-up/20 text-up"
      : trend === "down"
        ? "bg-down/10 border-down/20 text-down"
        : "bg-white/5 border-white/10 text-white/50";

  // مبلغ تغییر
  const deltaAmount =
    prevSell !== null ? Math.abs(animated - prevSell) : null;
  const deltaDir =
    prevSell !== null
      ? animated > prevSell
        ? "up"
        : animated < prevSell
          ? "down"
          : "flat"
      : null;

  const sparkMin = Math.min(...gold.spark);
  const sparkMax = Math.max(...gold.spark);
  const pos =
    sparkMax > sparkMin
      ? ((gold.sell - sparkMin) / (sparkMax - sparkMin)) * 100
      : 50;

  const clickable = !!onClick;

  return (
    <article
      className={`glass card-hover animate-fade-up group relative overflow-hidden rounded-3xl p-5 cursor-default ${
        flash === "up" ? "flash-up" : flash === "down" ? "flash-down" : ""
      } ${clickable ? "cursor-pointer active:scale-[0.98]" : ""}`}
      style={{ animationDelay: `${index * 90}ms` }}
      onClick={onClick}
    >
      <div
        className="pointer-events-none absolute -top-24 -start-24 size-48 rounded-full opacity-30 blur-3xl transition-opacity duration-500 group-hover:opacity-50"
        style={{ background: chipGradient(gold.code) }}
      />

      {/* هدر */}
      <div className="relative flex items-start justify-between gap-3">
        <div className="flex items-center gap-3">
          <div
            className="grid size-11 place-items-center rounded-2xl text-[15px] font-black text-ink-950 shadow-lg"
            style={{ background: chipGradient(gold.code) }}
          >
            {meta.sym}
          </div>
          <div className="leading-tight">
            <h3 className="text-[15px] font-extrabold text-white">{gold.name}</h3>
            <p className="mt-0.5 text-[11px] font-medium tracking-wide text-white/40">
              {meta.en}
              {clickable && <span className="ms-1 text-gold-400/60">↗</span>}
            </p>
          </div>
        </div>

        <div className="flex flex-col items-end gap-1">
          <span className={`flex items-center gap-1 rounded-full border px-2.5 py-1 text-[11px] font-bold ${trendBg}`}>
            <DirIcon className="size-3.5" strokeWidth={2.6} />
            <span className="num">{formatPct(pct, digits)}</span>
          </span>
          {deltaAmount !== null && (
            <span
              className={`num text-[10px] font-semibold ${
                deltaDir === "up"
                  ? "text-up/80"
                  : deltaDir === "down"
                    ? "text-down/80"
                    : "text-white/30"
              }`}
            >
              {deltaDir === "up" ? "+" : deltaDir === "down" ? "−" : ""}{" "}
              {formatPrice(deltaAmount, digits)}{" "}
              {gold.unit}
            </span>
          )}
        </div>
      </div>

      {/* قیمت */}
      <div className="relative mt-5 flex items-end justify-between gap-2">
        <div>
          <div className="flex items-center gap-1.5 text-[11px] font-medium text-white/40">
            <Clock className="size-3" />
            قیمت لحظه‌ای
            <TimeAgo at={lastFetchAt} />
          </div>
          <div className="num mt-1 text-[30px] leading-none font-extrabold tracking-tight text-white">
            {formatPrice(animated, digits)}
            <span className="ms-1.5 text-xs font-medium text-white/35">{gold.unit}</span>
          </div>
        </div>
        <Sparkline points={gold.spark} width={104} height={38} trend={trend} />
      </div>

      {/* اطلاعات فرعی */}
      <div className="relative mt-4 flex flex-wrap items-center justify-between gap-x-4 gap-y-2 border-t border-white/[0.06] pt-3.5 text-xs">
        <div className="flex items-center gap-1.5">
          <span className="text-white/40">واقعی:</span>
          <span className="num font-bold text-white/80">
            {gold.realValue !== null ? formatPrice(gold.realValue, digits) : "—"}
          </span>
        </div>
        <div className="flex items-center gap-1.5">
          <span className="text-white/40">حباب:</span>
          <span
            className={`num font-bold ${
              gold.bubble === null
                ? "text-white/40"
                : gold.bubble >= 0
                  ? "text-up"
                  : "text-down"
            }`}
          >
            {gold.bubble !== null
              ? `${formatPrice(Math.abs(gold.bubble), digits)}${
                  gold.bubblePct !== null ? ` (${formatPct(gold.bubblePct, digits)})` : ""
                }`
              : "—"}
          </span>
        </div>
        {!clickable && (
          <button
            onClick={(e) => {
              e.stopPropagation();
              setShowCalc((v: boolean) => !v);
            }}
            className="control-btn ms-auto rounded-full border border-gold-400/20 bg-gold-400/[0.07] px-2.5 py-1 text-[10px] font-bold text-gold-300 hover:border-gold-400/45 hover:bg-gold-400/12"
          >
            {showCalc ? "بستن ماشین‌حساب" : "🔢 تبدیل"}
          </button>
        )}
      </div>

      {/* ماشین‌حساب */}
      {showCalc && (
        <ConverterInput
          label={`تبدیل ${gold.name}`}
          rate={gold.sell}
          unit={gold.unit}
          digits={digits}
        />
      )}

      {/* نوار دامنه */}
      <div className="relative mt-3.5">
        <div className="h-1 overflow-hidden rounded-full bg-white/[0.06]">
          <div className="h-full w-full rounded-full bg-gradient-to-l from-up/70 via-gold-400/70 to-down/70" />
        </div>
        <div
          className="absolute top-1/2 size-2.5 -translate-y-1/2 rounded-full border-2 border-ink-950 bg-white shadow-[0_0_10px_rgb(255_255_255/0.5)] transition-[inset-inline-start] duration-700"
          style={{
            insetInlineStart: `calc(${Math.min(100, Math.max(0, pos))}% - 5px)`,
          }}
        />
        <div className="mt-1.5 flex justify-between text-[10px] text-white/30">
          <span className="num">{formatPrice(sparkMin, digits)}</span>
          <span className="num">{formatPrice(sparkMax, digits)}</span>
        </div>
      </div>
    </article>
  );
}
