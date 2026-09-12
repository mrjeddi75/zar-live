"use client";

import { useEffect, useState } from "react";
import { Clock, Landmark, RefreshCw } from "lucide-react";
import type { DigitMode } from "@/lib/format";

const timeFmt = new Intl.DateTimeFormat("fa-IR", {
  timeZone: "Asia/Tehran",
  hour: "2-digit",
  minute: "2-digit",
  second: "2-digit",
});
const dateFmt = new Intl.DateTimeFormat("fa-IR", {
  timeZone: "Asia/Tehran",
  weekday: "long",
  day: "numeric",
  month: "long",
  year: "numeric",
});

function useTehranClock() {
  const [now, setNow] = useState<Date | null>(null);
  useEffect(() => {
    setNow(new Date());
    const id = setInterval(() => setNow(new Date()), 1000);
    return () => clearInterval(id);
  }, []);
  return now;
}

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
  const now = useTehranClock();
  const seconds = Math.max(0, Math.ceil(remainingMs / 1000));
  const R = 11;
  const C = 2 * Math.PI * R;
  const progress = Math.min(1, Math.max(0, remainingMs / pollMs));

  const statusMeta = {
    live: { label: "زنده", dot: "bg-up", cls: "text-up" },
    stale: { label: "کش موقت", dot: "bg-gold-400", cls: "text-gold-300" },
    offline: { label: "قطع", dot: "bg-down", cls: "text-down" },
    loading: { label: "در حال اتصال", dot: "bg-sky-400", cls: "text-sky-300" },
  }[status];

  return (
    <header className="sticky top-0 z-50 border-b border-white/[0.07] bg-ink-950/72 backdrop-blur-xl">
      <div className="mx-auto flex h-16 max-w-7xl items-center justify-between gap-3 px-4 sm:px-6">
        {/* برند */}
        <div className="flex items-center gap-3">
          <div
            className="grid size-10 shrink-0 place-items-center rounded-xl shadow-[0_0_28px_-6px_rgb(238_198_95/0.55)]"
            style={{
              background: "linear-gradient(135deg,#f6dd9a,#dfa938 55%,#9c6b1c)",
            }}
          >
            <Landmark className="size-5 text-ink-950" strokeWidth={2.4} />
          </div>
          <div className="leading-tight">
            <div className="flex items-baseline gap-1.5">
              <span className="gold-text text-2xl font-black">زر</span>
              <span className="text-[10px] font-medium tracking-widest text-white/35">
                ZAR.LIVE
              </span>
            </div>
            <div className="text-[11px] text-white/45">
              تابلوی لحظه‌ای نرخ ارز
            </div>
          </div>
        </div>

        {/* ساعت تهران */}
        <div className="hidden items-center gap-2.5 rounded-full border border-white/[0.07] bg-white/[0.03] px-4 py-1.5 md:flex">
          <Clock className="size-3.5 text-gold-400" />
          <span className="num text-sm font-semibold text-white/85" suppressHydrationWarning>
            {now ? timeFmt.format(now) : "--:--:--"}
          </span>
          <span className="hidden text-xs text-white/40 lg:inline" suppressHydrationWarning>
            {now ? dateFmt.format(now) : ""}
          </span>
        </div>

        {/* اکشن‌ها */}
        <div className="flex items-center gap-2">
          <span
            className={`hidden items-center gap-1.5 rounded-full border border-white/[0.07] bg-white/[0.03] px-3 py-1.5 text-xs font-semibold sm:flex ${statusMeta.cls}`}
          >
            <span
              className={`size-1.5 rounded-full ${statusMeta.dot} ${
                status === "live" ? "animate-pulse-dot" : ""
              }`}
            />
            {statusMeta.label}
          </span>

          <button
            onClick={onToggleDigits}
            className="control-btn rounded-full border border-white/[0.08] bg-white/[0.03] px-3 py-1.5 text-xs font-semibold text-white/70 hover:border-gold-400/40 hover:text-gold-300"
            title="تغییر نوع ارقام"
          >
            {digits === "fa" ? "۱۲۳" : "123"}
          </button>

          <button
            onClick={onRefresh}
            className="control-btn relative grid size-9 place-items-center rounded-full border border-white/[0.08] bg-white/[0.03] text-white/70 hover:border-gold-400/40 hover:text-gold-300"
            title={`به‌روزرسانی خودکار تا ${seconds} ثانیه دیگر`}
          >
            <svg className="absolute inset-0 size-full -rotate-90" viewBox="0 0 36 36">
              <circle
                cx="18"
                cy="18"
                r={R}
                fill="none"
                stroke="rgb(255 255 255 / 0.08)"
                strokeWidth="2"
              />
              <circle
                cx="18"
                cy="18"
                r={R}
                fill="none"
                stroke="#eec65f"
                strokeWidth="2"
                strokeLinecap="round"
                strokeDasharray={C}
                strokeDashoffset={C * (1 - progress)}
                style={{ transition: "stroke-dashoffset 0.2s linear" }}
              />
            </svg>
            <RefreshCw
              className={`size-4 ${refreshing ? "animate-spin-slow" : ""}`}
            />
          </button>
        </div>
      </div>
    </header>
  );
}
