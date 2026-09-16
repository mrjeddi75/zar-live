"use client";

import { useEffect, useMemo, useState } from "react";
import {
  ArrowDownRight,
  ArrowUpDown,
  ArrowUpRight,
  ChevronDown,
  ChevronUp,
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
      <span className="chip chip-up">
        <ArrowUpRight className="size-3" /> صعودی
      </span>
    );
  if (d === "down")
    return (
      <span className="chip chip-down">
        <ArrowDownRight className="size-3" /> نزولی
      </span>
    );
  return (
    <span className="chip">
      <Minus className="size-3" /> ثابت
    </span>
  );
}

export function RatesTable({ rates, digits, flashes }: Props) {
  const [query, setQuery] = useState("");
  const [filter, setFilter] = useState<FilterKey>("all");
  const [sort, setSort] = useState<SortKey>("default");
  const [pins, setPins] = useState<Set<string>>(new Set());
  const [expanded, setExpanded] = useState(false);

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
      if (r.variant) return false;
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

  const isSearching = query.trim().length > 0;
  const visibleRows = expanded || isSearching ? filtered : filtered.slice(0, 10);
  const remainingCount = Math.max(0, filtered.length - 10);

  const chips: Array<{ key: FilterKey; label: string }> = [
    { key: "all", label: "همه" },
    { key: "pinned", label: "نشان‌شده" },
    { key: "up", label: "صعودی" },
    { key: "down", label: "نزولی" },
  ];

  return (
    <section className="card-clean animate-fade-in p-4 sm:p-5">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div className="flex items-center gap-2">
          <h2 className="text-base font-extrabold text-slate-900">همهٔ ارزها</h2>
          <span className="chip">
            {isSearching || expanded
              ? `${formatInt(filtered.length, digits)} مورد`
              : `${formatInt(Math.min(10, filtered.length), digits)} از ${formatInt(filtered.length, digits)} مورد`}
          </span>
        </div>

        <div className="flex flex-wrap items-center gap-2">
          <label className="relative">
            <Search className="absolute right-2.5 top-1/2 size-3.5 -translate-y-1/2 text-slate-400" />
            <input
              value={query}
              onChange={(e) => setQuery(e.target.value)}
              placeholder="جستجو ارز..."
              className="surface-soft w-48 py-2 pr-8 pl-2 text-sm outline-none focus:border-blue-300"
            />
          </label>

          <div className="surface-soft flex items-center gap-1 p-1">
            <ArrowUpDown className="mx-1 size-3.5 text-slate-400" />
            <button onClick={() => setSort("default")} className={`btn px-2 py-1 text-xs ${sort === "default" ? "btn-primary" : ""}`}>پیش‌فرض</button>
            <button onClick={() => setSort("price-desc")} className={`btn px-2 py-1 text-xs ${sort === "price-desc" ? "btn-primary" : ""}`}>بیشترین</button>
            <button onClick={() => setSort("price-asc")} className={`btn px-2 py-1 text-xs ${sort === "price-asc" ? "btn-primary" : ""}`}>کمترین</button>
          </div>
        </div>
      </div>

      <div className="mt-3 flex flex-wrap gap-2">
        {chips.map((c) => (
          <button
            key={c.key}
            onClick={() => setFilter(c.key)}
            className={`btn px-3 py-1.5 text-xs ${filter === c.key ? "btn-primary" : ""}`}
          >
            {c.key === "pinned" && <Star className="size-3" />}
            {c.label}
          </button>
        ))}
      </div>

      <div className="mt-4 overflow-x-auto">
        <table className="w-full min-w-[760px] text-sm">
          <thead>
            <tr className="border-b border-slate-200 text-xs text-slate-500">
              <th className="px-2 py-2 text-start">ارز</th>
              <th className="px-2 py-2 text-center">خرید</th>
              <th className="px-2 py-2 text-center">قیمت لحظه‌ای</th>
              <th className="px-2 py-2 text-center">USD</th>
              <th className="px-2 py-2 text-center">روند</th>
              <th className="px-2 py-2 text-center">وضعیت</th>
              <th className="px-2 py-2 text-center">نشان</th>
            </tr>
          </thead>
          <tbody>
            {visibleRows.map((r) => {
              const meta = metaFor(r.code);
              const trend = r.sparkPct > 0.02 ? "up" : r.sparkPct < -0.02 ? "down" : "flat";
              const flash = flashes[r.id];
              const pinned = pins.has(r.id);

              return (
                <tr
                  key={r.id}
                  className={`border-b border-slate-100 ${flash === "up" ? "flash-up" : flash === "down" ? "flash-down" : ""}`}
                >
                  <td className="px-2 py-2.5">
                    <div className="flex items-center gap-2.5">
                      <div className="grid size-8 place-items-center rounded-lg text-xs font-black text-slate-900" style={{ background: chipGradient(r.code) }}>
                        {meta.sym}
                      </div>
                      <div>
                        <div className="text-[13px] font-bold text-slate-800">{r.name}</div>
                        <div className="text-[10px] text-slate-500">{meta.en}</div>
                      </div>
                    </div>
                  </td>
                  <td className="num px-2 py-2.5 text-center text-slate-600"><Price value={r.buy} digits={digits} /></td>
                  <td className="num px-2 py-2.5 text-center font-extrabold text-slate-900"><Price value={r.sell} digits={digits} /></td>
                  <td className="num px-2 py-2.5 text-center text-slate-600">{formatUsdRate(r.usdRate, digits)}</td>
                  <td className="px-2 py-2.5 text-center">
                    <div className="mx-auto flex w-fit items-center gap-2">
                      <Sparkline points={r.spark} width={70} height={22} trend={trend} />
                      <span className={`num text-xs font-semibold ${trend === "up" ? "text-green-600" : trend === "down" ? "text-red-600" : "text-slate-500"}`}>
                        {formatPct(r.sparkPct, digits)}
                      </span>
                    </div>
                  </td>
                  <td className="px-2 py-2.5 text-center"><DirectionBadge d={r.direction} /></td>
                  <td className="px-2 py-2.5 text-center">
                    <button onClick={() => togglePin(r.id)} className="btn px-2 py-1 text-xs">
                      <Star className={`size-3.5 ${pinned ? "fill-yellow-400 text-yellow-500" : "text-slate-500"}`} />
                    </button>
                  </td>
                </tr>
              );
            })}
          </tbody>
        </table>
      </div>

      {!isSearching && remainingCount > 0 && (
        <div className="mt-4 flex justify-center">
          <button onClick={() => setExpanded((p) => !p)} className="btn control-btn">
            {expanded ? (
              <>
                <ChevronUp className="size-4" /> نمایش کمتر (۱۰ ارز اول)
              </>
            ) : (
              <>
                <ChevronDown className="size-4" /> مشاهده همهٔ ارزها ({formatInt(remainingCount, digits)} ارز دیگر)
              </>
            )}
          </button>
        </div>
      )}

      {filtered.length === 0 && (
        <div className="py-8 text-center text-sm text-slate-500">نتیجه‌ای پیدا نشد.</div>
      )}
    </section>
  );
}
