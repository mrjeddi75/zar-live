"use client";

import { useEffect, useState } from "react";
import { Clock3, RefreshCw } from "lucide-react";
import type { DigitMode } from "@/lib/format";

const timeFmt = new Intl.DateTimeFormat("fa-IR", {
  timeZone: "Asia/Tehran",
  hour: "2-digit",
  minute: "2-digit",
  second: "2-digit",
});

interface Props {
  status: "live" | "stale" | "offline" | "loading";
  remainingMs: number;
  pollMs: number;
  refreshing: boolean;
  onRefresh: () => void;
  digits: DigitMode;
  onToggleDigits: () => void;
}

export function SiteHeader({
  status,
  remainingMs,
  pollMs,
  refreshing,
  onRefresh,
  digits,
  onToggleDigits,
}: Props) {
  const [now, setNow] = useState<Date | null>(null);

  useEffect(() => {
    setNow(new Date());
    const id = setInterval(() => setNow(new Date()), 1000);
    return () => clearInterval(id);
  }, []);

  const statusLabel = {
    live: "زنده",
    stale: "موقت",
    offline: "قطع",
    loading: "درحال اتصال",
  }[status];

  const statusClass =
    status === "live"
      ? "chip-up"
      : status === "offline"
        ? "chip-down"
        : "chip";

  const progress = Math.min(1, Math.max(0, remainingMs / pollMs));

  return (
    <header className="sticky top-0 z-40 border-b border-slate-200/80 bg-white/90 backdrop-blur">
      <div className="mx-auto flex h-14 max-w-7xl items-center justify-between px-4 sm:px-6">
        <div>
          <div className="text-base font-black text-slate-900">زر</div>
          <div className="text-[10px] text-slate-500">داشبورد لحظه‌ای بازار</div>
        </div>

        <div className="hidden items-center gap-2 sm:flex">
          <span className="chip">
            <Clock3 className="size-3.5" />
            <span className="num" suppressHydrationWarning>
              {now ? timeFmt.format(now) : "--:--:--"}
            </span>
          </span>

          <span className={`chip ${statusClass}`}>{statusLabel}</span>
        </div>

        <div className="flex items-center gap-2">
          <button onClick={onToggleDigits} className="btn control-btn text-xs">
            {digits === "fa" ? "۱۲۳" : "123"}
          </button>

          <button
            onClick={onRefresh}
            className="btn control-btn relative overflow-hidden"
            title="به‌روزرسانی"
          >
            <span
              className="absolute inset-y-0 right-0 bg-blue-50"
              style={{ width: `${progress * 100}%` }}
            />
            <span className="relative z-10 flex items-center gap-1.5">
              <RefreshCw
                className={`size-3.5 ${refreshing ? "animate-spin-soft" : ""}`}
              />
              بروزرسانی
            </span>
          </button>
        </div>
      </div>
    </header>
  );
}
