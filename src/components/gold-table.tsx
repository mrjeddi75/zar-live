"use client";

import { ArrowDownRight, ArrowUpRight, Coins, Minus } from "lucide-react";
import type { GoldRate } from "@/lib/types";
import { chipGradient, metaFor } from "@/lib/currencies";
import { formatInt, formatPct, formatPrice, type DigitMode } from "@/lib/format";
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
    <section className="card-clean animate-fade-in p-4 sm:p-5">
      <div className="mb-4 flex items-center gap-2">
        <div className="grid size-8 place-items-center rounded-lg bg-slate-100">
          <Coins className="size-4 text-slate-700" />
        </div>
        <h2 className="text-base font-extrabold text-slate-900">طلا و سکه</h2>
        <span className="chip">{formatInt(golds.length, digits)} قلم</span>
      </div>

      <div className="overflow-x-auto">
        <table className="w-full min-w-[760px] text-sm">
          <thead>
            <tr className="border-b border-slate-200 text-xs text-slate-500">
              <th className="px-2 py-2 text-start">قلم</th>
              <th className="px-2 py-2 text-center">قیمت لحظه‌ای</th>
              <th className="px-2 py-2 text-center">تغییر</th>
              <th className="px-2 py-2 text-center">واقعی</th>
              <th className="px-2 py-2 text-center">حباب</th>
              <th className="px-2 py-2 text-center">روند</th>
              <th className="px-2 py-2 text-center">وضعیت</th>
            </tr>
          </thead>
          <tbody>
            {golds.map((g) => {
              const meta = metaFor(g.code);
              const pct = g.changePct ?? g.sparkPct;
              const trend = pct > 0.01 ? "up" : pct < -0.01 ? "down" : "flat";
              const flash = flashes[g.id];

              return (
                <tr
                  key={g.id}
                  className={`border-b border-slate-100 ${flash === "up" ? "flash-up" : flash === "down" ? "flash-down" : ""}`}
                >
                  <td className="px-2 py-2.5">
                    <div className="flex items-center gap-2.5">
                      <div className="grid size-8 place-items-center rounded-lg text-[11px] font-black text-slate-900" style={{ background: chipGradient(g.code) }}>
                        {meta.sym}
                      </div>
                      <div>
                        <div className="text-[13px] font-bold text-slate-800">{g.name}</div>
                        <div className="text-[10px] text-slate-500">{meta.en}</div>
                      </div>
                    </div>
                  </td>
                  <td className="num px-2 py-2.5 text-center font-extrabold text-slate-900">
                    <Price value={g.sell} digits={digits} />
                    <span className="ms-1 text-[10px] text-slate-500">{g.unit}</span>
                  </td>
                  <td className={`num px-2 py-2.5 text-center font-semibold ${trend === "up" ? "text-green-600" : trend === "down" ? "text-red-600" : "text-slate-500"}`}>
                    {g.changePct !== null ? formatPct(g.changePct, digits) : "—"}
                  </td>
                  <td className="num px-2 py-2.5 text-center text-slate-600">{g.realValue !== null ? formatPrice(g.realValue, digits) : "—"}</td>
                  <td className="num px-2 py-2.5 text-center text-slate-600">
                    {g.bubble !== null ? `${formatPrice(g.bubble, digits)} ${g.bubblePct !== null ? `(${formatPct(g.bubblePct, digits)})` : ""}` : "—"}
                  </td>
                  <td className="px-2 py-2.5 text-center">
                    <div className="mx-auto flex w-fit items-center gap-2">
                      <Sparkline points={g.spark} width={70} height={22} trend={trend} />
                    </div>
                  </td>
                  <td className="px-2 py-2.5 text-center">
                    {g.direction === "up" ? (
                      <span className="chip chip-up"><ArrowUpRight className="size-3" /> صعودی</span>
                    ) : g.direction === "down" ? (
                      <span className="chip chip-down"><ArrowDownRight className="size-3" /> نزولی</span>
                    ) : (
                      <span className="chip"><Minus className="size-3" /> ثابت</span>
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
