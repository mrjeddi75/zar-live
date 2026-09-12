"use client";

import { useEffect, useMemo, useState } from "react";
import {
  ArrowDownRight,
  ArrowUpDown,
  ArrowUpRight,
  Minus,
  Search,
  Star,
} from "lucide-react";
import type { Direction, LiveRate } from "@/lib/types";
import { chipGradient, metaFor } from "@/lib/currencies";
import {
  formatInt,
  formatPct,
  formatPrice,
  formatUsdRate,
  type DigitMode,
} from "@/lib/format";
import { useAnimatedNumber } from "@/hooks/use-animated-number";
import { Sparkline } from "./sparkline";

type FilterKey = "all" | "pinned" | "up" | "down";
type SortKey = "default" | "price-desc" | "price-asc" | "name";

interface Props {
  rates: LiveRate[];
  digits: DigitMode;
  flashes: Record<string, "up" | "down">;
}

const PINS_KEY = "zar-pins-v1";

function Price({ value, digits }: { value: number; digits: DigitMode }) {
  const v = useAnimatedNumber(value);
  return <span className="num">{formatPrice(v, digits)}</span>;
}

function DirectionBadge({ d }: { d: Direction }) {
  if (d === "up")
    return (
      <span className="inline-flex items-center gap-1 rounded-full border border-up/20 bg-up/10 px-2 py-0.5 text-[10px] font-bold text-up">
        <ArrowUpRight className="size-3" strokeWidth={2.6} />
        صعودی
      </span>
    );
  if (d === "down")
    return (
      <span className="inline-flex items-center gap-1 rounded-full border border-down/20 bg-down/10 px-2 py-0.5 text-[10px] font-bold text-down">
        <ArrowDownRight className="size-3" strokeWidth={2.6} />
        نزولی
      </span>
    );
  return (
    <span className="inline-flex items-center gap-1 rounded-full border border-white/10 bg-white/5 px-2 py-0.5 text-[10px] font-bold text-white/45">
      <Minus className="size-3" strokeWidth={2.6} />
      ثابت
    </span>
  );
}

export function RatesTable({ rates, digits, flashes }: Props) {
  const [query, setQuery] = useState("");
  const [filter, setFilter] = useState<FilterKey>("all");
  const [sort, setSort] = useState<SortKey>("default");
  const [pins, setPins] = useState<Set<string>>(new Set());

  useEffect(() => {
    try {
      const raw = localStorage.getItem(PINS_KEY);
      if (raw) setPins(new Set(JSON.parse(raw) as string[]));
    } catch {
      /* ignore */
    }
  }, []);

  const togglePin = (id: string) => {
    setPins((prev) => {
      const next = new Set(prev);
      if (next.has(id)) next.delete(id);
      else next.add(id);
      try {
        localStorage.setItem(PINS_KEY, JSON.stringify([...next]));
      } catch {
        /* ignore */
      }
      return next;
    });
  };

  const filtered = useMemo(() => {
    const q = query.trim().toLowerCase();
    let list = rates.filter((r) => {
      if (filter === "pinned" && !pins.has(r.id)) return false;
      if (filter === "up" && r.direction !== "up") return false;
      if (filter === "down" && r.direction !== "down") return false;
      if (!q) return true;
      return (
        r.name.toLowerCase().includes(q) ||
        r.code.toLowerCase().includes(q) ||
        metaFor(r.code).en.toLowerCase().includes(q)
      );
    });
    switch (sort) {
      case "price-desc":
        list = [...list].sort((a, b) => b.sell - a.sell);
        break;
      case "price-asc":
        list = [...list].sort((a, b) => a.sell - b.sell);
        break;
      case "name":
        list = [...list].sort((a, b) => a.name.localeCompare(b.name, "fa"));
        break;
    }
    return list;
  }, [rates, query, filter, sort, pins]);

  const chips: Array<{ key: FilterKey; label: string }> = [
    { key: "all", label: "همه" },
    { key: "pinned", label: "نشان‌شده" },
    { key: "up", label: "صعودی" },
    { key: "down", label: "نزولی" },
  ];
  const sorts: Array<{ key: SortKey; label: string }> = [
    { key: "default", label: "پیش‌فرض" },
    { key: "price-desc", label: "گران‌ترین" },
    { key: "price-asc", label: "ارزان‌ترین" },
    { key: "name", label: "نام" },
  ];

  return (
    <section className="glass animate-fade-in-up rounded-3xl p-4 sm:p-6" style={{ animationDelay: "280ms" }}>
      {/* سربرگ بخش */}
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div className="flex items-center gap-3">
          <h2 className="text-lg font-extrabold text-white">همهٔ ارزها</h2>
          <span className="num rounded-full border border-gold-400/25 bg-gold-400/10 px-2.5 py-0.5 text-[11px] font-bold text-gold-300">
            {formatInt(filtered.length, digits)} مورد
          </span>
        </div>

        <div className="flex flex-wrap items-center gap-2">
          {/* جستجو */}
          <label className="group relative">
            <Search className="absolute start-3 top-1/2 size-4 -translate-y-1/2 text-white/30 transition-colors group-focus-within:text-gold-400" />
            <input
              value={query}
              onChange={(e) => setQuery(e.target.value)}
              placeholder="جستجو: دلار، یورو، درهم..."
              className="w-56 rounded-full border border-white/[0.08] bg-ink-900/80 py-2 pe-4 ps-9 text-sm text-white placeholder:text-white/25 focus:border-gold-400/50 focus:outline-none focus:ring-2 focus:ring-gold-400/15"
            />
          </label>

          {/* مرتب‌سازی */}
          <div className="flex items-center gap-1 rounded-full border border-white/[0.08] bg-ink-900/80 p-1">
            <ArrowUpDown className="ms-1.5 size-3.5 text-white/30" />
            {sorts.map((s) => (
              <button
                key={s.key}
                onClick={() => setSort(s.key)}
                className={`control-btn rounded-full px-2.5 py-1 text-[11px] font-semibold ${
                  sort === s.key
                    ? "bg-gold-400/15 text-gold-300"
                    : "text-white/45 hover:text-white/80"
                }`}
              >
                {s.label}
              </button>
            ))}
          </div>
        </div>
      </div>

      {/* چیپ‌های فیلتر */}
      <div className="mt-4 flex flex-wrap items-center gap-1.5">
        {chips.map((c) => (
          <button
            key={c.key}
            onClick={() => setFilter(c.key)}
            className={`control-btn flex items-center gap-1.5 rounded-full border px-3.5 py-1.5 text-xs font-bold ${
              filter === c.key
                ? "border-gold-400/50 bg-gold-400/12 text-gold-300 shadow-[0_0_18px_-6px_rgb(238_198_95/0.45)]"
                : "border-white/[0.08] bg-white/[0.03] text-white/50 hover:border-white/20 hover:text-white/85"
            }`}
          >
            {c.key === "pinned" && (
              <Star
                className={`size-3 ${filter === "pinned" ? "fill-gold-400 text-gold-400" : ""}`}
              />
            )}
            {c.label}
          </button>
        ))}
      </div>

      {/* جدول */}
      <div className="mt-4 -mx-4 overflow-x-auto px-4 sm:mx-0 sm:px-0">
        <table className="w-full min-w-[820px] border-separate border-spacing-y-1.5 text-sm">
          <thead>
            <tr className="text-[11px] font-semibold text-white/35">
              <th className="px-3 pb-1 text-start font-medium">ارز</th>
              <th className="px-3 pb-1 text-center font-medium">قیمت خرید</th>
              <th className="px-3 pb-1 text-center font-medium">قیمت فروش</th>
              <th className="hidden px-3 pb-1 text-center font-medium lg:table-cell">
                یک دلار چند؟
              </th>
              <th className="hidden px-3 pb-1 text-center font-medium md:table-cell">
                روند رصد
              </th>
              <th className="px-3 pb-1 text-center font-medium">وضعیت</th>
              <th className="px-3 pb-1 text-center font-medium">نشان</th>
            </tr>
          </thead>
          <tbody>
            {filtered.map((r) => {
              const meta = metaFor(r.code);
              const flash = flashes[r.id];
              const trend =
                r.sparkPct > 0.02 ? "up" : r.sparkPct < -0.02 ? "down" : "flat";
              const pinned = pins.has(r.id);
              return (
                <tr
                  key={r.id}
                  className={`group rounded-xl transition-colors hover:bg-white/[0.035] ${
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
                        className="grid size-9 shrink-0 place-items-center rounded-xl text-sm font-black text-ink-950"
                        style={{ background: chipGradient(r.code) }}
                      >
                        {meta.sym}
                      </div>
                      <div className="leading-tight">
                        <div className="text-[13px] font-bold text-white">
                          {r.name}
                        </div>
                        <div className="mt-0.5 text-[10px] tracking-wide text-white/35">
                          {meta.en}
                        </div>
                      </div>
                    </div>
                  </td>
                  <td className="border-y border-white/[0.05] bg-ink-900/55 px-3 py-2.5 text-center group-hover:border-gold-400/20">
                    <Price value={r.buy} digits={digits} />
                  </td>
                  <td className="border-y border-white/[0.05] bg-ink-900/55 px-3 py-2.5 text-center group-hover:border-gold-400/20">
                    <span className="text-[15px] font-extrabold text-white">
                      <Price value={r.sell} digits={digits} />
                    </span>
                  </td>
                  <td className="hidden border-y border-white/[0.05] bg-ink-900/55 px-3 py-2.5 text-center text-white/60 group-hover:border-gold-400/20 lg:table-cell">
                    {formatUsdRate(r.usdRate, digits)}
                  </td>
                  <td className="hidden border-y border-white/[0.05] bg-ink-900/55 px-3 py-2.5 group-hover:border-gold-400/20 md:table-cell">
                    <div className="flex items-center justify-center gap-2">
                      <Sparkline points={r.spark} width={92} height={26} trend={trend} />
                      <span
                        className={`num text-[11px] font-bold ${
                          trend === "up"
                            ? "text-up"
                            : trend === "down"
                              ? "text-down"
                              : "text-white/35"
                        }`}
                      >
                        {formatPct(r.sparkPct, digits)}
                      </span>
                    </div>
                  </td>
                  <td className="border-y border-white/[0.05] bg-ink-900/55 px-3 py-2.5 text-center group-hover:border-gold-400/20">
                    <DirectionBadge d={r.direction} />
                  </td>
                  <td className="rounded-e-xl border-y border-e border-white/[0.05] bg-ink-900/55 px-3 py-2.5 text-center group-hover:border-gold-400/20">
                    <button
                      onClick={() => togglePin(r.id)}
                      className="control-btn text-white/25 hover:text-gold-400"
                      title={pinned ? "حذف نشان" : "نشان کردن"}
                    >
                      <Star
                        className={`mx-auto size-4 ${
                          pinned ? "fill-gold-400 text-gold-400" : ""
                        }`}
                      />
                    </button>
                  </td>
                </tr>
              );
            })}
          </tbody>
        </table>

        {filtered.length === 0 && (
          <div className="grid place-items-center gap-2 py-14 text-center">
            <Search className="size-8 text-white/15" />
            <p className="text-sm text-white/40">
              موردی مطابق جستجوی شما پیدا نشد.
            </p>
          </div>
        )}
      </div>
    </section>
  );
}
