"use client";

import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { Activity, AlertCircle, Database, RefreshCw } from "lucide-react";
import type { GoldRate, LiveRate, LiveRatesPayload } from "@/lib/types";
import { formatInt, type DigitMode } from "@/lib/format";
import { SiteHeader } from "./site-header";
import { CurrencyCard } from "./currency-card";
import { GoldCard } from "./gold-card";
import { HistoryModal } from "./history-modal";
import { GoldTable } from "./gold-table";
import { RatesTable } from "./rates-table";

const POLL_MS = 15_000;
const RETRY_MS = 5_000;
const DIGITS_KEY = "zar-digits-v1";

const FEATURED_ITEMS: Array<{ kind: "currency" | "gold"; code: string }> = [
  { kind: "currency", code: "usd" },
  { kind: "gold", code: "18ayar" },
  { kind: "gold", code: "usd_xau" },
  { kind: "gold", code: "xag" },
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
  const [prevValues, setPrevValues] = useState<Record<string, number>>({});
  const [digits, setDigits] = useState<DigitMode>("fa");
  const [, setTick] = useState(0);

  const [modalRate, setModalRate] = useState<LiveRate | null>(null);
  const [modalGold, setModalGold] = useState<GoldRate | null>(null);

  const lastFetchRef = useRef(0);
  const failRef = useRef(false);
  const pricesRef = useRef<Map<string, number>>(new Map());
  const flashTimer = useRef(0);

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
        headers: { Accept: "application/json" },
      });

      const ct = res.headers.get("content-type") ?? "";
      if (!ct.includes("application/json")) {
        throw new Error("پاسخ غیرمنتظره از سرور");
      }

      const json: unknown = await res.json();
      if (
        !res.ok ||
        typeof json !== "object" ||
        json === null ||
        (json as { ok?: boolean }).ok !== true
      ) {
        throw new Error((json as { error?: string }).error ?? `خطا ${res.status}`);
      }

      const payload = json as LiveRatesPayload;

      const previous = pricesRef.current;
      const next = new Map<string, number>();
      const nextFlash = new Map<string, "up" | "down">();
      const nextPrevValues: Record<string, number> = {};

      for (const item of [...payload.rates, ...payload.golds]) {
        const prev = previous.get(item.id);
        if (prev !== undefined) {
          nextPrevValues[item.id] = prev;
          if (prev !== item.sell) {
            nextFlash.set(item.id, item.sell > prev ? "up" : "down");
          }
        }
        next.set(item.id, item.sell);
      }

      pricesRef.current = next;
      setPrevValues(nextPrevValues);

      if (nextFlash.size > 0) {
        setFlashes(Object.fromEntries(nextFlash));
        window.clearTimeout(flashTimer.current);
        flashTimer.current = window.setTimeout(() => setFlashes({}), 700);
      }

      setData(payload);
      setError(null);
      failRef.current = false;
    } catch (e) {
      failRef.current = true;
      setError(e instanceof Error ? e.message : "خطای ناشناخته");
    } finally {
      lastFetchRef.current = Date.now();
      setRefreshing(false);
    }
  }, [refreshing]);

  useEffect(() => {
    const id = setInterval(() => {
      setTick((t) => t + 1);
      const wait = failRef.current ? RETRY_MS : POLL_MS;
      if (document.visibilityState === "visible" && Date.now() - lastFetchRef.current >= wait) {
        void load();
      }
    }, 250);

    return () => clearInterval(id);
  }, [load]);

  const effectivePoll = error ? RETRY_MS : POLL_MS;
  const remaining = Math.max(0, effectivePoll - (Date.now() - lastFetchRef.current));

  const status: "live" | "stale" | "offline" | "loading" = !data && error
    ? "offline"
    : !data
      ? "loading"
      : data.stale || error
        ? "stale"
        : "live";

  const featured = useMemo(() => {
    if (!data) return [] as Array<{ type: "cur"; rate: LiveRate } | { type: "gold"; gold: GoldRate }>;
    const out: Array<{ type: "cur"; rate: LiveRate } | { type: "gold"; gold: GoldRate }> = [];

    for (const f of FEATURED_ITEMS) {
      if (f.kind === "currency") {
        const r = data.rates.find((x) => x.code === f.code && !x.variant);
        if (r) out.push({ type: "cur", rate: r });
      } else {
        const g = data.golds.find((x) => x.code === f.code);
        if (g) out.push({ type: "gold", gold: g });
      }
    }

    return out;
  }, [data]);

  const stats = data
    ? {
        total: data.rates.length + data.golds.length,
        up: [...data.rates, ...data.golds].filter((x) => x.direction === "up").length,
        down: [...data.rates, ...data.golds].filter((x) => x.direction === "down").length,
      }
    : null;

  return (
    <div className="min-h-screen">
      <SiteHeader
        status={status}
        remainingMs={remaining}
        pollMs={effectivePoll}
        refreshing={refreshing}
        onRefresh={() => void load()}
        digits={digits}
        onToggleDigits={toggleDigits}
      />

      <main className="mx-auto max-w-7xl px-4 py-6 sm:px-6 sm:py-8">
        <section className="animate-fade-in">
          <h1 className="title-main">داشبورد لحظه‌ای ارز، طلا و سکه</h1>
          <p className="mt-2 max-w-2xl text-sm text-muted">
            تمرکز روی اطلاعات مهم: قیمت لحظه‌ای، روند کوتاه‌مدت، و تاریخچهٔ قابل بررسی.
          </p>

          <div className="mt-4 flex flex-wrap gap-2">
            {data?.db && (
              <span className={`chip ${data.db.ok ? "chip-up" : "chip-down"}`}>
                <Database className="size-3.5" />
                DB: {data.db.ok ? `ok · +${data.db.historyInserted}` : "error"}
              </span>
            )}
            {data?.sourceUpdate && <span className="chip">ارز: {data.sourceUpdate}</span>}
            {data?.goldUpdate && <span className="chip">طلا: {data.goldUpdate}</span>}
          </div>
        </section>

        {error && (
          <section className="surface mt-4 flex items-center gap-2 p-3 text-sm text-red-700">
            <AlertCircle className="size-4" />
            {error}
          </section>
        )}

        <section className="mt-5 grid grid-cols-1 gap-3 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4">
          {featured.length === 0 && (
            <>
              {Array.from({ length: 8 }).map((_, i) => (
                <div key={i} className="card-clean p-4">
                  <div className="skeleton h-5 w-32" />
                  <div className="skeleton mt-3 h-8 w-40" />
                  <div className="skeleton mt-3 h-4 w-full" />
                </div>
              ))}
            </>
          )}

          {featured.map((item, i) =>
            item.type === "cur" ? (
              <CurrencyCard
                key={item.rate.id}
                rate={item.rate}
                digits={digits}
                flash={flashes[item.rate.id] ?? null}
                index={i}
                lastFetchAt={lastFetchRef.current}
                prevSell={prevValues[item.rate.id] ?? null}
                onClick={() => setModalRate(item.rate)}
              />
            ) : (
              <GoldCard
                key={item.gold.id}
                gold={item.gold}
                digits={digits}
                flash={flashes[item.gold.id] ?? null}
                index={i}
                lastFetchAt={lastFetchRef.current}
                prevSell={prevValues[item.gold.id] ?? null}
                onClick={() => setModalGold(item.gold)}
              />
            ),
          )}
        </section>

        {stats && (
          <section className="mt-5 grid grid-cols-3 gap-3">
            <div className="card-clean p-3">
              <div className="flex items-center gap-2 text-slate-500"><Activity className="size-4" /> کل اقلام</div>
              <div className="num mt-1 text-xl font-black text-slate-900">{formatInt(stats.total, digits)}</div>
            </div>
            <div className="card-clean p-3">
              <div className="text-slate-500">صعودی</div>
              <div className="num mt-1 text-xl font-black text-green-600">{formatInt(stats.up, digits)}</div>
            </div>
            <div className="card-clean p-3">
              <div className="text-slate-500">نزولی</div>
              <div className="num mt-1 text-xl font-black text-red-600">{formatInt(stats.down, digits)}</div>
            </div>
          </section>
        )}

        <div className="mt-5">
          {data ? (
            <RatesTable rates={data.rates} digits={digits} flashes={flashes} />
          ) : (
            <div className="card-clean p-4">
              <div className="skeleton h-10 w-full" />
            </div>
          )}
        </div>

        {data && data.golds.length > 0 && (
          <div className="mt-5">
            <GoldTable golds={data.golds} digits={digits} flashes={flashes} />
          </div>
        )}
      </main>

      <footer className="mt-6 border-t border-slate-200 bg-white py-5">
        <div className="mx-auto flex max-w-7xl flex-col gap-2 px-4 text-xs text-slate-500 sm:px-6 sm:flex-row sm:items-center sm:justify-between">
          <span>زر · طراحی مینیمال، RTL، قابل توسعه</span>
          <span className="num">Refresh: {Math.round(POLL_MS / 1000)}s</span>
        </div>
      </footer>

      {modalRate && (
        <HistoryModal rate={modalRate} digits={digits} onClose={() => setModalRate(null)} />
      )}

      {modalGold && (
        <HistoryModal rate={modalGold as unknown as LiveRate} digits={digits} onClose={() => setModalGold(null)} />
      )}
    </div>
  );
}
