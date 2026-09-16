"use client";

import { useEffect, useState } from "react";
import { X } from "lucide-react";
import type { LiveRate } from "@/lib/types";
import { chipGradient, metaFor } from "@/lib/currencies";
import { formatInt, formatPrice, type DigitMode } from "@/lib/format";
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

  return (
    <div
      className="fixed inset-0 z-50 bg-slate-900/45 p-4 backdrop-blur-sm"
      onClick={(e) => e.target === e.currentTarget && onClose()}
    >
      <div className="mx-auto mt-8 max-h-[86vh] w-full max-w-2xl overflow-y-auto rounded-2xl bg-white p-5 shadow-xl sm:p-6" onClick={(e) => e.stopPropagation()}>
        <div className="flex items-center justify-between gap-3">
          <div className="flex items-center gap-3">
            <div
              className="grid size-10 place-items-center rounded-xl font-black text-slate-900"
              style={{ background: chipGradient(rate.code) }}
            >
              {meta.sym}
            </div>
            <div>
              <h3 className="text-base font-extrabold text-slate-900">{rate.name}</h3>
              <p className="text-xs text-slate-500">{meta.en}</p>
            </div>
          </div>
          <button onClick={onClose} className="btn px-2.5 py-2">
            <X className="size-4" />
          </button>
        </div>

        <div className="mt-5 grid gap-4 sm:grid-cols-[1fr_auto] sm:items-end">
          <div>
            <p className="text-xs text-slate-500">قیمت فعلی</p>
            <p className="num mt-1 text-3xl font-black text-slate-900">{formatPrice(rate.sell, digits)}</p>
          </div>
          <div className="surface-soft p-2">
            {loading ? (
              <div className="skeleton h-16 w-28" />
            ) : (
              <Sparkline points={spark} width={128} height={64} trend={rate.direction} />
            )}
          </div>
        </div>

        <div className="mt-5">
          <p className="mb-2 text-xs font-semibold text-slate-500">
            تاریخچه ثبت‌شده ({formatInt(points.length, digits)} نقطه)
          </p>
          <div className="overflow-hidden rounded-xl border border-slate-200">
            <table className="w-full text-xs">
              <thead className="bg-slate-50 text-slate-500">
                <tr>
                  <th className="px-3 py-2 text-start">زمان</th>
                  <th className="px-3 py-2 text-end">قیمت</th>
                  <th className="px-3 py-2 text-center">جهت</th>
                </tr>
              </thead>
              <tbody>
                {[...points].reverse().map((p, i) => (
                  <tr key={i} className="border-t border-slate-100">
                    <td className="px-3 py-2 text-slate-500" suppressHydrationWarning>
                      {new Date(p.fetchedAt).toLocaleTimeString("fa-IR", {
                        timeZone: "Asia/Tehran",
                        hour: "2-digit",
                        minute: "2-digit",
                        second: "2-digit",
                      })}
                    </td>
                    <td className="num px-3 py-2 text-end font-semibold text-slate-800">
                      {formatPrice(p.sell, digits)}
                    </td>
                    <td className="px-3 py-2 text-center text-slate-500">
                      {p.direction === "up" ? "↑" : p.direction === "down" ? "↓" : "—"}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
            {points.length === 0 && !loading && (
              <div className="p-6 text-center text-sm text-slate-500">
                هنوز تاریخچه‌ای ثبت نشده است.
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}
