"use client";

import { useState } from "react";
import type { DigitMode } from "@/lib/format";
import { formatPrice } from "@/lib/format";

interface Props {
  label: string;
  rate: number;
  unit: string;
  digits: DigitMode;
}

export function ConverterInput({ label, rate, unit, digits }: Props) {
  const [val, setVal] = useState<string>("");
  const clean = (s: string) => s.replace(/[^\d۰-۹.]/g, "");
  const parsed = Number(clean(val)) || 0;
  const result = val ? parsed * rate : null;

  return (
    <div className="mt-3 rounded-xl border border-white/[0.07] bg-white/[0.025] p-2.5">
      <label className="mb-1.5 flex items-center gap-1.5 text-[10px] font-medium text-white/35">
        <span className="inline-flex size-4 items-center justify-center rounded bg-gold-400/12 text-[9px] font-bold text-gold-400">
          🔢
        </span>
        {label}
      </label>
      <div className="flex items-center gap-2">
        <input
          type="text"
          inputMode="decimal"
          value={val}
          onChange={(e) => setVal(e.target.value)}
          placeholder="مثلاً ۱۰۰۰"
          className="w-full rounded-lg border border-white/[0.08] bg-ink-900/70 px-3 py-1.5 text-sm text-white placeholder:text-white/20 focus:border-gold-400/40 focus:outline-none focus:ring-1 focus:ring-gold-400/15 num"
        />
        {result !== null && (
          <span className="num shrink-0 whitespace-nowrap text-sm font-bold text-gold-300">
            {formatPrice(result, digits)} {unit}
          </span>
        )}
      </div>
    </div>
  );
}
