"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import {
  Activity,
  ArrowRightLeft,
  CloudOff,
  Radio,
  RefreshCw,
  TrendingDown,
  TrendingUp,
} from "lucide-react";
import type { GoldRate, LiveRate, LiveRatesPayload } from "@/lib/types";
import { formatInt, formatPrice, type DigitMode } from "@/lib/format";
import { isGoldCode, metaFor } from "@/lib/currencies";
import { SiteHeader } from "./site-header";
import { Ticker } from "./ticker";
import { CurrencyCard } from "./currency-card";
import { GoldCard } from "./gold-card";
import { HistoryModal } from "./history-modal";
import { GoldTable } from "./gold-table";
import { RatesTable } from "./rates-table";

const POLL_MS = 15_000;
const RETRY_MS = 5_000;
const DIGITS_KEY = "zar-digits-v1";

/** کارت‌های شاخص اصلی — ترکیبی از ارز + طلا/سکه */
interface FeaturedItem {
  /** "currency" or "gold" */
  kind: "currency" | "gold";
  code: string;
}

const FEATURED_ITEMS: FeaturedItem[] = [
  { kind: "currency", code: "usd" },
  { kind: "gold", code: "18ayar" },
  { kind: "gold", code: "usd_xau" },
  { kind: "currency", code: "eur" },
  { kind: "currency", code: "try" },
  { kind: "currency", code: "aed" },
  { kind: "currency", code: "cny" },
];

export function LiveBoard() {
  const [data, setData] = useState<LiveRatesPayload | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [refreshing, setRefreshing] = useState(false);
  const [flashes, setFlashes] = useState<Record<string, "up" | "down">>({});
  const [digits, setDigits] = useState<DigitMode>("fa");
  const [longOffline, setLongOffline] = useState(false);
  const [, setTick] = useState(0);

  /* مودال تاریخچه */
  const [modalRate, setModalRate] = useState<LiveRate | null>(null);
  const [modalGold, setModalGold] = useState<GoldRate | null>(null);

  const lastFetchRef = useRef(0);
  const failRef = useRef(false);
  const hardFails = useRef(0);
  const hasDataRef = useRef(false);
  const prevSells = useRef<Map<string, number>>(new Map());
  const flashTimer = useRef(0);

  const maybeSelfHeal = useCallback(() => {
    if (hasDataRef.current || hardFails.current < 6) return;
    try {
      const last = Number(sessionStorage.getItem("zar-heal-at") ?? 0);
      const count = Number(sessionStorage.getItem("zar-heal-n") ?? 0);
      if (count < 2 && Date.now() - last > 45_000) {
        sessionStorage.setItem("zar-heal-at", String(Date.now()));
        sessionStorage.setItem("zar-heal-n", String(count + 1));
        window.location.replace(window.location.href);
      }
    } catch {
      /* ignore */
    }
  }, []);

  useEffect(() => {
    try {
      const d = localStorage.getItem(DIGITS_KEY);
      if (d === "fa" || d === "lat") setDigits(d);
    } catch {
      /* ignore */
    }
  }, []);

  const toggleDigits = useCallback(() => {
    setDigits((prev) => {
      const next = prev === "fa" ? "lat" : "fa";
      try {
        localStorage.setItem(DIGITS_KEY, next);
      } catch {
        /* ignore */
      }
      return next;
    });
  }, []);

  const load = useCallback(async () => {
    if (refreshing) return;
    setRefreshing(true);
    try {
      const res = await fetch("/api/rates", {
        cache: "no-store",
        headers: { Accept: "application/json", "X-Requested-With": "fetch" },
      });
      const ct = res.headers.get("content-type") ?? "";
      if (!ct.includes("application/json")) {
        throw new Error(res.ok ? "gateway-html" : `gateway-${res.status}`);
      }
      let json: unknown;
      try {
        json = await res.json();
      } catch {
        throw new Error("پاسخ سرور قابل خواندن نیست");
      }
      const gwMsg = (json as { message?: string } | null)?.message;
      if (!res.ok && typeof gwMsg === "string" && /sandbox/i.test(gwMsg)) {
        throw new Error("sandbox-gone");
      }
      if (
        !res.ok ||
        typeof json !== "object" ||
        json === null ||
        (json as { ok?: boolean }).ok !== true
      ) {
        throw new Error(
          (json as { error?: string } | null)?.error ?? `خطای ${res.status}`,
        );
      }
      const payload = json as LiveRatesPayload;

      const nextFlashes = new Map<string, "up" | "down">();
      const newSells = new Map<string, number>();
      for (const r of [...payload.rates, ...payload.golds]) {
        const prev = prevSells.current.get(r.id);
        if (prev !== undefined && prev !== r.sell) {
          nextFlashes.set(r.id, r.sell > prev ? "up" : "down");
        }
        newSells.set(r.id, r.sell);
      }
      prevSells.current = newSells;
      if (nextFlashes.size > 0) {
        setFlashes(Object.fromEntries(nextFlashes));
        window.clearTimeout(flashTimer.current);
        flashTimer.current = window.setTimeout(() => setFlashes({}), 950);
      }

      setData(payload);
      setError(null);
      failRef.current = false;
      hardFails.current = 0;
      hasDataRef.current = true;
      setLongOffline(false);
      try {
        sessionStorage.removeItem("zar-heal-n");
      } catch {
        /* ignore */
      }
    } catch (e) {
      failRef.current = true;
      hardFails.current += 1;
      if (hardFails.current >= 6 && !hasDataRef.current) {
        setLongOffline(true);
      }
      const raw = e instanceof Error ? e.message : "";
      let friendly: string;
      if (raw === "gateway-html") {
        friendly = "سرور پیش‌نمایش در حال راه‌اندازی است";
      } else if (raw === "sandbox-gone") {
        friendly = "نمونهٔ سرور در حال جایگزینی است";
      } else if (/^gateway-\d+$/.test(raw)) {
        friendly = `سرور موقتاً در دسترس نیست (${raw.slice(8)})`;
      } else if (/failed to fetch|networkerror/i.test(raw)) {
        friendly = "اتصال شبکه برقرار نشد";
      } else {
        friendly = raw || "خطای ناشناخته";
      }
      setError(friendly);
      maybeSelfHeal();
    } finally {
      lastFetchRef.current = Date.now();
      setRefreshing(false);
    }
  }, [refreshing, maybeSelfHeal]);

  /* موتور رفرش */
  useEffect(() => {
    const id = setInterval(() => {
      setTick((t) => t + 1);
      const wait = failRef.current ? RETRY_MS : POLL_MS;
      if (
        document.visibilityState === "visible" &&
        Date.now() - lastFetchRef.current >= wait
      ) {
        void load();
      }
    }, 250);
    return () => clearInterval(id);
  }, [load]);

  useEffect(() => {
    const onVis = () => {
      const wait = failRef.current ? RETRY_MS : POLL_MS;
      if (
        document.visibilityState === "visible" &&
        Date.now() - lastFetchRef.current >= wait
      ) {
        void load();
      }
    };
    document.addEventListener("visibilitychange", onVis);
    return () => document.removeEventListener("visibilitychange", onVis);
  }, [load]);

  // محاسبات نمایشی
  const effectivePoll = error ? RETRY_MS : POLL_MS;
  const remaining = Math.max(
    0,
    effectivePoll - (Date.now() - lastFetchRef.current),
  );

  const status: "live" | "stale" | "offline" | "loading" = !data && error
    ? "offline"
    : !data
      ? "loading"
      : data.stale || error
        ? "stale"
        : "live";

  /* ساخت لیست کارت‌های شاخص از FEATURED_ITEMS */
  function getFeaturedItems(): Array<
    | { type: "cur"; rate: LiveRate; index: number }
    | { type: "gold"; gold: GoldRate; index: number }
  > {
    if (!data) return [];
    const out: Array<
      | { type: "cur"; rate: LiveRate; index: number }
      | { type: "gold"; gold: GoldRate; index: number }
    > = [];
    let i = 0;
    for (const fi of FEATURED_ITEMS) {
      if (fi.kind === "currency") {
        const r = data.rates.find(
          (r) => r.code === fi.code && !r.variant,
        );
        if (r) {
          out.push({ type: "cur", rate: r, index: i++ });
        }
      } else {
        const g = data.golds.find((g) => g.code === fi.code);
        if (g) {
          out.push({ type: "gold", gold: g, index: i++ });
        }
      }
    }
    return out;
  }

  const featured = getFeaturedItems();

  const hasGolds = (data?.golds.length ?? 0) > 0;

  /* دادهٔ مقایسه برای کارت تبدیل سریع */
  const usdRate =
    data?.rates.find((r) => r.code === "usd" && !r.variant) ?? null;
  const eurRate =
    data?.rates.find((r) => r.code === "eur" && !r.variant) ?? null;
  const gold18 = data?.golds.find((g) => g.code === "18ayar") ?? null;
  const sekkeh = data?.golds.find((g) => g.code === "sekkeh") ?? null;

  return (
    <div className="relative min-h-screen">
      {/* دکور */}
      <div className="pointer-events-none absolute inset-x-0 top-0 -z-10 h-[560px] overflow-hidden">
        <div className="dot-grid absolute inset-0" />
        <div className="absolute -top-40 left-1/2 h-[420px] w-[720px] -translate-x-1/2 rounded-full bg-gold-500/[0.09] blur-[120px]" />
        <div className="absolute right-[8%] top-24 h-56 w-56 rounded-full bg-up/[0.05] blur-[100px]" />
        <div className="absolute left-[10%] top-40 h-56 w-56 rounded-full bg-down/[0.045] blur-[100px]" />
      </div>

      {data && (
        <Ticker rates={[...data.rates, ...data.golds]} digits={digits} />
      )}

      <SiteHeader
        status={status}
        remainingMs={remaining}
        pollMs={effectivePoll}
        refreshing={refreshing}
        onRefresh={() => void load()}
        digits={digits}
        onToggleDigits={toggleDigits}
      />

      <main className="mx-auto max-w-7xl px-4 pb-8 sm:px-6">
        {/* عنوان */}
        <section className="animate-fade-in-up flex flex-wrap items-end justify-between gap-4 pb-8 pt-10">
          <div className="max-w-2xl">
            <div className="mb-3 inline-flex items-center gap-2 rounded-full border border-gold-400/25 bg-gold-400/[0.08] px-3 py-1 text-[11px] font-bold text-gold-300">
              <Radio className="size-3.5" />
              متصل به منبع زندهٔ alanchand.com
            </div>
            <h1 className="text-3xl font-black leading-[1.25] text-white sm:text-[2.6rem]">
              ارز، طلا و سکه؛{" "}
              <span className="gold-text">لحظه‌ای و شفاف</span>
            </h1>
            <p className="mt-3 text-sm leading-7 text-white/50">
              قیمت‌های خرید و فروش هر ۱۵ ثانیه از صفحات عمومی آلان‌چند واکشی،
              در پایگاه‌داده ثبت و با نمودار روند به‌صورت زنده نمایش داده می‌شوند.
              روی هر کارت کلیک کنید تا تاریخچهٔ کامل را ببینید.
            </p>
          </div>

          <div className="flex flex-col items-start gap-2 text-[11px] text-white/40 sm:items-end">
            {data?.sourceUpdate && (
              <div className="flex items-center gap-1.5 rounded-full border border-white/[0.07] bg-white/[0.03] px-3 py-1.5">
                <span className="size-1.5 rounded-full bg-gold-400" />
                بازار ارز:{" "}
                <span className="num font-bold text-white/70">{data.sourceUpdate}</span>
              </div>
            )}
            {data?.goldUpdate && hasGolds && (
              <div className="flex items-center gap-1.5 rounded-full border border-white/[0.07] bg-white/[0.03] px-3 py-1.5">
                <span className="size-1.5 rounded-full bg-gold-400" />
                بازار طلا:{" "}
                <span className="num font-bold text-white/70">{data.goldUpdate}</span>
              </div>
            )}
            <div className="num" suppressHydrationWarning>
              {data && (
                <>
                  آخرین واکشی ما:{" "}
                  {new Date(data.serverTime).toLocaleTimeString("fa-IR", {
                    timeZone: "Asia/Tehran",
                  })}
                </>
              )}
            </div>
          </div>
        </section>

        {/* بنر خطا */}
        {(error || data?.stale) && (
          <div className="mb-6 flex items-start gap-3 rounded-2xl border border-gold-500/25 bg-gold-500/[0.07] px-4 py-3 text-sm text-gold-200">
            <CloudOff className="mt-0.5 size-4.5 shrink-0 text-gold-400" />
            <span>
              {data
                ? "اتصال موقت با سرور/منبع برقرار نشد؛ آخرین دادهٔ ذخیره‌شده نمایش داده می‌شود و تلاش مجدد خودکار هر چند ثانیه تکرار خواهد شد."
                : `هنوز اتصال اولیه برقرار نشده است (${
                    error ?? "در حال تلاش"
                  }). سیستم به‌صورت خودکار هر چند ثانیه دوباره تلاش می‌کند و به محض وصل شدن، داده‌ها نمایش داده می‌شوند.`}
              {longOffline && !data && (
                <span className="mt-1.5 block text-xs text-gold-200/60">
                  اگر این وضعیت ادامه داشت، لطفاً صفحهٔ پیش‌نمایش را یک‌بار ببندید و
                  از داشبورد دوباره باز کنید تا به سرور تازه متصل شوید.
                </span>
              )}
            </span>
            <button
              onClick={() => void load()}
              className="control-btn ms-auto flex shrink-0 items-center gap-1.5 rounded-full border border-gold-400/30 px-3 py-1 text-xs font-bold text-gold-300 hover:bg-gold-400/10"
            >
              <RefreshCw
                className={`size-3.5 ${refreshing ? "animate-spin-slow" : ""}`}
              />
              تلاش مجدد
            </button>
          </div>
        )}

        {/* ════════════ کارت‌های شاخص (۷ مورد) ═══════════ */}
        {featured.length > 0 ? (
          <section className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4">
            {featured.map((item) =>
              item.type === "cur" ? (
                <CurrencyCard
                  key={item.rate.id}
                  rate={item.rate}
                  digits={digits}
                  flash={flashes[item.rate.id] ?? null}
                  index={item.index}
                  lastFetchAt={lastFetchRef.current}
                  prevSell={
                    (() => {
                      const p = prevSells.current.get(item.rate.id);
                      // خود قیمت فعلی را برگردان؛ prevSells همین لحظه به‌روز شده
                      // پس باید مقدار قبلی را از قبل از آخرین لود بدست آوردیم
                      return p && p !== item.rate.sell ? p : null;
                    })()
                  }
                  onClick={() => setModalRate(item.rate)}
                />
              ) : (
                <GoldCard
                  key={item.gold.id}
                  gold={item.gold}
                  digits={digits}
                  flash={flashes[item.gold.id] ?? null}
                  index={item.index}
                  lastFetchAt={lastFetchRef.current}
                  prevSell={
                    (() => {
                      const p = prevSells.current.get(item.gold.id);
                      return p && p !== item.gold.sell ? p : null;
                    })()
                  }
                  onClick={() => setModalGold(item.gold)}
                />
              ),
            )}
          </section>
        ) : data ? null : (
          <section className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4">
            {Array.from({ length: 7 }).map((_, i) => (
              <div key={i} className="glass rounded-3xl p-5">
                <div className="skeleton h-11 w-40 rounded-2xl" />
                <div className="skeleton mt-6 h-9 w-32 rounded-xl" />
                <div className="skeleton mt-4 h-4 w-full rounded-lg" />
                <div className="skeleton mt-2 h-4 w-2/3 rounded-lg" />
              </div>
            ))}
          </section>
        )}

        {/* ════════════ کارت تبدیل سریع ═══════════ */}
        {data && (
          <section
            className="glass animate-fade-in-up mt-6 rounded-3xl p-5"
            style={{ animationDelay: "200ms" }}
          >
            <div className="mb-4 flex items-center gap-3">
              <div className="grid size-9 place-items-center rounded-xl bg-gold-400/12">
                <ArrowRightLeft className="size-4.5 text-gold-400" />
              </div>
              <h2 className="text-base font-extrabold text-white">
                تبدیل سریع
              </h2>
            </div>

            <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-3">
              {/* دلار → یورو */}
              <QuickConvertRow
                label="دلار → یورو"
                from={usdRate}
                to={eurRate}
                digits={digits}
                hint={`۱۰۰۰$ ≈ ${
                  usdRate && eurRate
                    ? formatPrice(Math.round((1000 / usdRate.sell) * eurRate.sell), digits)
                    : "—"
                } €`}
              />

              {/* طلا ۱۸ عیار → سکه امامی */}
              <QuickConvertRow
                label="گرم طلای ۱۸عیار → سکه"
                from={gold18}
                to={sekkeh}
                digits={digits}
                isGold
                hint={`۱۰ گرم ≈ ${
                  gold18 && sekkeh
                    ? Math.round((10 * gold18.sell) / sekkeh.sell * 100) / 100
                    : "—"
                } سکه`}
              />

              {/* دلار → طلا ۱۸ عیار (گرم) */}
              <QuickConvertRow
                label="دلار → گرم طلا ۱۸عیار"
                from={usdRate}
                to={gold18}
                digits={digits}
                crossKind
                hint={`۱۰۰۰$ ≈ ${
                  usdRate && gold18
                    ? formatPrice(
                        Math.round((1000 / usdRate.sell) * gold18.sell),
                        digits,
                      )
                    : "—"
                } تومان`}
              />
            </div>

            <p className="mt-3 text-[10px] leading-4 text-white/30">
              این مقادیر تخمینی هستند و بر اساس نرخ لحظه‌ای محاسبه شده‌اند. برای
              تبدیل دقیق‌تر، روی کارت هر قلم کلیک کنید و از ماشین‌حساب داخل آن استفاده کنید.
            </p>
          </section>
        )}

        {/* نوار آمار */}
        {data && (
          <section
            className="animate-fade-in-up mt-6 grid grid-cols-3 gap-3 sm:gap-4"
            style={{ animationDelay: "240ms" }}
          >
            <div className="glass flex items-center gap-3 rounded-2xl px-4 py-3.5">
              <div className="grid size-9 place-items-center rounded-xl bg-white/[0.06]">
                <Activity className="size-4 text-gold-400" />
              </div>
              <div>
                <div className="num text-lg font-extrabold text-white">
                  {formatInt(data.rates.length + data.golds.length, digits)}
                </div>
                <div className="text-[11px] text-white/40">قلم رصدشده</div>
              </div>
            </div>
            <div className="glass flex items-center gap-3 rounded-2xl px-4 py-3.5">
              <div className="grid size-9 place-items-center rounded-xl bg-up/10">
                <TrendingUp className="size-4 text-up" />
              </div>
              <div>
                <div className="num text-lg font-extrabold text-up">
                  {formatInt(
                    [
                      ...data.rates,
                      ...data.golds,
                    ].filter((r) => r.direction === "up").length,
                    digits,
                  )}
                </div>
                <div className="text-[11px] text-white/40">در مسیر صعود</div>
              </div>
            </div>
            <div className="glass flex items-center gap-3 rounded-2xl px-4 py-3.5">
              <div className="grid size-9 place-items-center rounded-xl bg-down/10">
                <TrendingDown className="size-4 text-down" />
              </div>
              <div>
                <div className="num text-lg font-extrabold text-down">
                  {formatInt(
                    [
                      ...data.rates,
                      ...data.golds,
                    ].filter((r) => r.direction === "down").length,
                    digits,
                  )}
                </div>
                <div className="text-[11px] text-white/40">در مسیر نزول</div>
              </div>
            </div>
          </section>
        )}

        {/* جدول ارزها */}
        <div className="mt-6">
          {data ? (
            <RatesTable rates={data.rates} digits={digits} flashes={flashes} />
          ) : (
            <div className="glass rounded-3xl p-6">
              <div className="skeleton h-10 w-full rounded-xl" />
              {Array.from({ length: 8 }).map((_, i) => (
                <div key={i} className="skeleton mt-3 h-12 w-full rounded-xl" />
              ))}
            </div>
          )}
        </div>

        {/* جدول طلا و سکه */}
        {data && hasGolds && (
          <div className="mt-6">
            <GoldTable golds={data.golds} digits={digits} flashes={flashes} />
          </div>
        )}
      </main>

      {/* فوتر */}
      <footer className="border-t border-white/[0.06] py-8">
        <div className="mx-auto flex max-w-7xl flex-col items-center justify-between gap-4 px-4 text-center sm:flex-row sm:px-6 sm:text-start">
          <div>
            <div className="flex items-center justify-center gap-2 sm:justify-start">
              <span className="gold-text text-lg font-black">زر</span>
              <span className="text-[10px] tracking-widest text-white/30">
                ZAR.LIVE
              </span>
            </div>
            <p className="mt-1.5 max-w-md text-[11px] leading-5 text-white/35">
              قیمت‌ها صرفاً جهت استعلام است و ممکن است با بازار اختلاف داشته باشد.
              منبع داده:{" "}
              <a
                href="https://alanchand.com/currencies-price"
                target="_blank"
                rel="noopener noreferrer"
                className="text-gold-400/80 underline-offset-4 hover:underline"
              >
                alanchand.com
              </a>
            </p>
          </div>
          <div className="text-[11px] leading-5 text-white/30">
            <div>Next.js · TypeScript · PostgreSQL · Drizzle ORM</div>
            <div className="num mt-0.5">
              به‌روزرسانی خودکار هر {formatInt(15, digits)} ثانیه
            </div>
          </div>
        </div>
      </footer>

      {/* مودال تاریخچه — ارز */}
      {modalRate && (
        <HistoryModal
          rate={modalRate}
          digits={digits}
          onClose={() => setModalRate(null)}
        />
      )}

      {/* مودال_history — طلا */}
      {modalGold && (
        <HistoryModal
          rate={modalGold as unknown as LiveRate}
          digits={digits}
          onClose={() => setModalGold(null)}
        />
      )}
    </div>
  );
}

/* ────────────── کامپوننت کمکی: سطر تبدیل سریع ────────────── */

function QuickConvertRow({
  label,
  from,
  to,
  digits,
  isGold,
  crossKind,
  hint,
}: {
  label: string;
  from:
    | (LiveRate & { sell: number })
    | (GoldRate & { sell: number })
    | null;
  to:
    | (LiveRate & { sell: number })
    | (GoldRate & { sell: number })
    | null;
  digits: DigitMode;
  isGold?: boolean;
  crossKind?: boolean;
  hint: string;
}) {
  return (
    <div className="flex flex-col gap-1.5 rounded-2xl border border-white/[0.06] bg-white/[0.02] px-4 py-3">
      <span className="text-xs font-semibold text-white/60">{label}</span>
      <span className="num text-lg font-bold text-white/85">{hint}</span>
      {!from || !to ? (
        <span className="text-[10px] text-white/25">
          منتظر دریافت داده…
        </span>
      ) : null}
    </div>
  );
}
