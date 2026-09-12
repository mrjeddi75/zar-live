"use client";

import { ArrowDownRight, ArrowUpRight, Coins, Minus } from "lucide-react";
import type { GoldRate } from "@/lib/types";
import { chipGradient, metaFor } from "@/lib/currencies";
import {
  formatInt,
  formatPct,
  formatPrice,
  type DigitMode,
} from "@/lib/format";
import { useAnimatedNumber } from "@/hooks/use-animated-number";
import { Sparkline } from "./sparkline";

interface Props {
  golds: GoldRate[];
  digits: DigitMode;
  flashes: Record<string, "up" | "down">;
}

function Price({ value, digits }: { value: number; digits: DigitMode }) {
  const v = useAnimatedNumber(value);
  return <span className="num">{formatPrice(v, digits)}</span>;
}

export function GoldTable({ golds, digits, flashes }: Props) {
  return (
    <section
      className="glass animate-fade-in-up rounded-3xl p-4 sm:p-6"
      style={{ animationDelay: "320ms" }}
    >
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div className="flex items-center gap-3">
          <div className="grid size-9 place-items-center rounded-xl bg-gold-400/12">
            <Coins className="size-4.5 text-gold-400" />
          </div>
          <h2 className="text-lg font-extrabold text-white">طلا و سکه</h2>
          <span className="num rounded-full border border-gold-400/25 bg-gold-400/10 px-2.5 py-0.5 text-[11px] font-bold text-gold-300">
            {formatInt(golds.length, digits)} قلم
          </span>
        </div>
        <p className="text-[11px] text-white/35">
          قیمت‌ها به تومان؛ انس‌ها به دلار جهانی
        </p>
      </div>

      <div className="mt-4 -mx-4 overflow-x-auto px-4 sm:mx-0 sm:px-0">
        <table className="w-full min-w-[820px] border-separate border-spacing-y-1.5 text-sm">
          <thead>
            <tr className="text-[11px] font-semibold text-white/35">
              <th className="px-3 pb-1 text-start font-medium">قلم</th>
              <th className="px-3 pb-1 text-center font-medium">قیمت لحظه‌ای</th>
              <th className="px-3 pb-1 text-center font-medium">تغییر روز</th>
              <th className="hidden px-3 pb-1 text-center font-medium md:table-cell">
                قیمت واقعی
              </th>
              <th className="hidden px-3 pb-1 text-center font-medium lg:table-cell">
                حباب
              </th>
              <th className="hidden px-3 pb-1 text-center font-medium md:table-cell">
                روند رصد
              </th>
              <th className="px-3 pb-1 text-center font-medium">وضعیت</th>
            </tr>
          </thead>
          <tbody>
            {golds.map((g) => {
              const meta = metaFor(g.code);
              const flash = flashes[g.id];
              const pct = g.changePct ?? g.sparkPct;
              const trend = pct > 0.01 ? "up" : pct < -0.01 ? "down" : "flat";
              return (
                <tr
                  key={g.id}
                  className={`group transition-colors hover:bg-white/[0.035] ${
                    flash === "up"
                      ? "flash-up"
                      : flash === "down"
                        ? "flash-down"
                        : ""
                  }`}
                >
                  <td className="rounded-s-xl border-y border-s border-white/[0.05] bg-ink-900/55 px-3 py-2.5 group-hover:border-gold-400/20">
                    <div className="flex items-center gap-2.5">
                      <div
                        className="grid size-9 shrink-0 place-items-center rounded-xl text-[11px] font-black text-ink-950"
                        style={{ background: chipGradient(g.code) }}
                      >
                        {meta.sym}
                      </div>
                      <div className="leading-tight">
                        <div className="text-[13px] font-bold text-white">{g.name}</div>
                        <div className="mt-0.5 text-[10px] tracking-wide text-white/35">
                          {meta.en} · {g.unit === "دلار" ? "دلار جهانی" : "تومان"}
                        </div>
                      </div>
                    </div>
                  </td>
                  <td className="border-y border-white/[0.05] bg-ink-900/55 px-3 py-2.5 text-center group-hover:border-gold-400/20">
                    <span className="text-[15px] font-extrabold text-white">
                      <Price value={g.sell} digits={digits} />
                    </span>
                  </td>
                  <td className="border-y border-white/[0.05] bg-ink-900/55 px-3 py-2.5 text-center group-hover:border-gold-400/20">
                    <span
                      className={`num text-[13px] font-bold ${
                        trend === "up"
                          ? "text-up"
                          : trend === "down"
                            ? "text-down"
                            : "text-white/40"
                      }`}
                    >
                      {g.changePct !== null ? formatPct(g.changePct, digits) : "—"}
                    </span>
                  </td>
                  <td className="hidden border-y border-white/[0.05] bg-ink-900/55 px-3 py-2.5 text-center text-white/60 group-hover:border-gold-400/20 md:table-cell">
                    <span className="num">
                      {g.realValue !== null ? formatPrice(g.realValue, digits) : "—"}
                    </span>
                  </td>
                  <td className="hidden border-y border-white/[0.05] bg-ink-900/55 px-3 py-2.5 text-center group-hover:border-gold-400/20 lg:table-cell">
                    {g.bubble !== null ? (
                      <span
                        className={`num text-[12px] font-bold ${
                          g.bubble >= 0 ? "text-up" : "text-down"
                        }`}
                      >
                        {formatPrice(Math.abs(g.bubble), digits)}
                        {g.bubblePct !== null && (
                          <span className="ms-1 text-white/35">
                            ({formatPct(g.bubblePct, digits)})
                          </span>
                        )}
                      </span>
                    ) : (
                      <span className="text-white/30">—</span>
                    )}
                  </td>
                  <td className="hidden border-y border-white/[0.05] bg-ink-900/55 px-3 py-2.5 group-hover:border-gold-400/20 md:table-cell">
                    <div className="flex items-center justify-center gap-2">
                      <Sparkline points={g.spark} width={92} height={26} trend={trend} />
                    </div>
                  </td>
                  <td className="rounded-e-xl border-y border-e border-white/[0.05] bg-ink-900/55 px-3 py-2.5 text-center group-hover:border-gold-400/20">
                    {g.direction === "up" ? (
                      <span className="inline-flex items-center gap-1 rounded-full border border-up/20 bg-up/10 px-2 py-0.5 text-[10px] font-bold text-up">
                        <ArrowUpRight className="size-3" strokeWidth={2.6} />
                        صعودی
                      </span>
                    ) : g.direction === "down" ? (
                      <span className="inline-flex items-center gap-1 rounded-full border border-down/20 bg-down/10 px-2 py-0.5 text-[10px] font-bold text-down">
                        <ArrowDownRight className="size-3" strokeWidth={2.6} />
                        نزولی
                      </span>
                    ) : (
                      <span className="inline-flex items-center gap-1 rounded-full border border-white/10 bg-white/5 px-2 py-0.5 text-[10px] font-bold text-white/45">
                        <Minus className="size-3" strokeWidth={2.6} />
                        ثابت
                      </span>
                    )}
                  </td>
                </tr>
              );
            })}
          </tbody>
        </table>
      </div>
    </section>
  );
}
