"use client";

import { useEffect, useState } from "react";
import { X, TrendingDown, TrendingUp } from "lucide-react";
import type { LiveRate } from "@/lib/types";
import { metaFor } from "@/lib/currencies";
import { chipGradient } from "@/lib/currencies";
import {
  formatInt,
  formatPrice,
  formatPct,
  toFaDigits,
  type DigitMode,
} from "@/lib/format";
import { Sparkline } from "./sparkline";

interface Props {
  rate: LiveRate | null;
  digits: DigitMode;
  onClose: () => void;
}

interface HistoryPoint {
  sell: number;
  direction: string;
  fetchedAt: string;
  kind: string;
}

export function HistoryModal({ rate, digits, onClose }: Props) {
  const [points, setPoints] = useState<HistoryPoint[]>([]);
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    if (!rate) return;
    setLoading(true);
    fetch(`/api/history/${encodeURIComponent(rate.id)}`)
      .then((r) => r.json())
      .then((d) => {
        if (d.ok && Array.isArray(d.points)) setPoints(d.points);
      })
      .catch(() => {})
      .finally(() => setLoading(false));
  }, [rate]);

  if (!rate) return null;

  const meta = metaFor(rate.code);
  const spark = points.length > 1 ? points.map((p) => p.sell) : rate.spark;
  const first = spark[0];
  const last = spark[spark.length - 1];
  const totalPct = first > 0 ? ((last - first) / first) * 100 : 0;

  // group by hour for summary
  const hourGroups = new Map<string, number>();
  for (const p of points) {
    const d = new Date(p.fetchedAt);
    const key = d.toLocaleTimeString("fa-IR", {
      timeZone: "Asia/Tehran",
      hour: "2-digit",
      minute: "2-digit",
    });
    hourGroups.set(key, p.sell);
  }

  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 px-4 backdrop-blur-sm"
      onClick={(e) => e.target === e.currentTarget && onClose()}
    >
      <div
        className="glass-deep relative w-full max-w-2xl max-h-[85vh] overflow-y-auto rounded-3xl p-6"
        onClick={(e) => e.stopPropagation()}
      >
        {/* header */}
        <div className="flex items-start justify-between gap-3">
          <div className="flex items-center gap-3">
            <div
              className="grid size-11 shrink-0 place-items-center rounded-2xl text-[15px] font-black text-ink-950"
              style={{ background: chipGradient(rate.code) }}
            >
              {meta.sym}
            </div>
            <div>
              <h3 className="text-lg font-bold text-white">{rate.name}</h3>
              <p className="text-xs text-white/40">{meta.en}</p>
            </div>
          </div>
          <button
            onClick={onClose}
            className="grid size-8 shrink-0 place-items-center rounded-full border border-white/[0.08] bg-white/[0.05] text-white/50 hover:bg-white/10 hover:text-white"
          >
            <X className="size-4" />
          </button>
        </div>

        {/* big price */}
        <div className="mt-5 flex items-end justify-between gap-4">
          <div>
            <div className="text-[11px] text-white/40">قیمت فعلی</div>
            <div className="num mt-1 text-4xl font-extrabold text-white">
              {formatPrice(rate.sell, digits)}
              <span className="ms-2 text-sm font-medium text-white/35">تومان</span>
            </div>
            <div className="mt-2 flex items-center gap-2 text-sm">
              <span className="text-white/40">تغییر کل:</span>
              <span
                className={`num font-bold ${totalPct >= 0 ? "text-up" : "text-down"}`}
              >
                {formatPct(totalPct, digits)}
              </span>
              {totalPct >= 0 ? (
                <TrendingUp className="size-4 text-up" />
              ) : (
                <TrendingDown className="size-4 text-down" />
              )}
            </div>
          </div>
          {loading ? (
            <div className="h-28 w-48 animate-pulse rounded-xl bg-white/[0.06]" />
          ) : (
            <Sparkline
              points={spark}
              width={192}
              height={112}
              trend={totalPct > 0.02 ? "up" : totalPct < -0.02 ? "down" : "flat"}
            />
          )}
        </div>

        {/* history table */}
        <div className="mt-6">
          <h4 className="mb-3 text-xs font-semibold uppercase tracking-wider text-white/35">
            تاریخچهٔ ثبت‌شده ({formatInt(points.length, digits)} نقطه)
          </h4>
          <div className="-mx-2 max-h-56 overflow-y-auto rounded-xl border border-white/[0.05] bg-ink-900/50">
            <table className="w-full text-xs">
              <thead className="sticky top-0 bg-ink-900/90">
                <tr className="text-[10px] text-white/30">
                  <th className="px-3 py-2 text-start">زمان</th>
                  <th className="px-3 py-2 text-end">قیمت</th>
                  <th className="px-3 py-2 text-center">جهت</th>
                </tr>
              </thead>
              <tbody>
                {[...points].reverse().map((p, i) => (
                  <tr
                    key={i}
                    className="border-t border-white/[0.04] transition-colors hover:bg-white/[0.03]"
                  >
                    <td className="px-3 py-2 text-white/45" suppressHydrationWarning>
                      {new Date(p.fetchedAt).toLocaleTimeString("fa-IR", {
                        timeZone: "Asia/Tehran",
                        hour: "2-digit",
                        minute: "2-digit",
                        second: "2-digit",
                      })}
                    </td>
                    <td className="px-3 py-2 text-end num font-semibold text-white/80">
                      {formatPrice(p.sell, digits)}
                    </td>
                    <td className="px-3 py-2 text-center">
                      {p.direction === "up" ? (
                        <span className="text-up">↑</span>
                      ) : p.direction === "down" ? (
                        <span className="text-down">↓</span>
                      ) : (
                        <span className="text-white/25">−</span>
                      )}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
            {points.length === 0 && !loading && (
              <div className="py-10 text-center text-sm text-white/30">
                هنوز داده‌ای ثبت نشده است.
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}
