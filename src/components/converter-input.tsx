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
    <div className="surface-soft mt-3 p-2.5">
      <label className="mb-1.5 block text-[11px] text-slate-500">{label}</label>
      <div className="flex flex-wrap items-center gap-2">
        <input
          type="text"
          inputMode="decimal"
          value={val}
          onChange={(e) => setVal(e.target.value)}
          placeholder="مثلاً ۱۰۰۰"
          className="surface w-full flex-1 px-3 py-2 text-sm outline-none focus:border-blue-300"
        />
        {result !== null && (
          <span className="num text-sm font-bold text-slate-800">
            {formatPrice(result, digits)} {unit}
          </span>
        )}
      </div>
    </div>
  );
}
