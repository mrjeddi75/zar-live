"use client";

import { ArrowDownRight, ArrowUpRight, Minus } from "lucide-react";
import type { LiveRate } from "@/lib/types";
import { formatPrice, type DigitMode } from "@/lib/format";

interface Props {
  rates: LiveRate[];
  digits: DigitMode;
}

function TickerItem({ rate, digits }: { rate: LiveRate; digits: DigitMode }) {
  const Icon =
    rate.direction === "up"
      ? ArrowUpRight
      : rate.direction === "down"
        ? ArrowDownRight
        : Minus;
  const color =
    rate.direction === "up"
      ? "text-up"
      : rate.direction === "down"
        ? "text-down"
        : "text-white/35";
  return (
    <div className="flex shrink-0 items-center gap-2 px-5">
      <span className="text-xs font-semibold text-white/70">{rate.name}</span>
      <span className="num text-xs font-bold text-white">{formatPrice(rate.sell, digits)}</span>
      <Icon className={`size-3.5 ${color}`} strokeWidth={2.5} />
      <span className="me-3 h-1 w-1 rounded-full bg-white/15" />
    </div>
  );
}

export function Ticker({ rates, digits }: Props) {
  const list = rates.filter((r) => !r.variant);
  if (list.length === 0) return null;
  return (
    <div className="ticker relative overflow-hidden border-b border-white/[0.07] bg-ink-900/60 py-2.5">
      {/* محو شدن لبه‌ها */}
      <div className="pointer-events-none absolute inset-y-0 right-0 z-10 w-16 bg-gradient-to-l from-ink-950 to-transparent" />
      <div className="pointer-events-none absolute inset-y-0 left-0 z-10 w-16 bg-gradient-to-r from-ink-950 to-transparent" />
      <div className="ticker-track flex w-max">
        {[...list, ...list].map((r, i) => (
          <TickerItem key={`${r.id}-${i}`} rate={r} digits={digits} />
        ))}
      </div>
    </div>
  );
}
