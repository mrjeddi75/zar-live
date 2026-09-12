import { desc, gt, sql } from "drizzle-orm";
import { db } from "@/db";
import { rateHistory } from "@/db/schema";
import { fetchRawGolds, fetchRawRates, type RawGold, type RawRate } from "./alanchand";
import type { Direction, GoldRate, LiveRate, LiveRatesPayload } from "./types";

/**
 * کش درون‌حافظه‌ای: تمام کلاینت‌ها به‌جای زدن مستقیم به آلان‌چند،
 * هر ۱۲ ثانیه حداکثر یک واکشی واقعی را بین خود تقسیم می‌کنند.
 */
const CACHE_TTL_MS = 12_000;
const PERSIST_MIN_INTERVAL_MS = 90_000;

let cache: { payload: LiveRatesPayload; at: number } | null = null;
let inFlight: Promise<LiveRatesPayload> | null = null;

const lastPersisted = new Map<string, { sell: number; at: number }>();

export async function getLiveRates(): Promise<LiveRatesPayload> {
  if (cache && Date.now() - cache.at < CACHE_TTL_MS) {
    return cache.payload;
  }
  if (inFlight) return inFlight;
  inFlight = refresh()
    .catch((err: unknown) => {
      if (cache) {
        return { ...cache.payload, stale: true };
      }
      throw err;
    })
    .finally(() => {
      inFlight = null;
    });
  return inFlight;
}

async function refresh(): Promise<LiveRatesPayload> {
  // ارز و طلا به‌صورت موازی؛ شکست طلا جریان ارز را نمی‌خواباند
  const [curRes, goldRes] = await Promise.allSettled([
    fetchRawRates(),
    fetchRawGolds(),
  ]);

  if (curRes.status === "rejected" && goldRes.status === "rejected") {
    throw curRes.reason instanceof Error
      ? curRes.reason
      : new Error("both sources failed");
  }

  const rawRates: RawRate[] =
    curRes.status === "fulfilled" ? curRes.value.rates : [];
  const rawGolds: RawGold[] =
    goldRes.status === "fulfilled" ? goldRes.value.golds : [];

  const allIds = [...rawRates, ...rawGolds].map((r) => r.id);

  await Promise.all([
    persistIfChanged(rawRates.map((r) => ({ ...r, price: r.sell })), "currency"),
    persistIfChanged(rawGolds.map((r) => ({ ...r, price: r.price })), "gold"),
  ]);
  const history = await loadHistory(allIds);

  const rates: LiveRate[] = rawRates.map((r) => {
    const { spark, sparkPct } = buildSpark(r.id, r.sell, r.direction, history);
    return {
      id: r.id,
      code: r.code,
      name: r.name,
      flag: r.flag,
      buy: r.buy,
      sell: r.sell,
      usdRate: r.usdRate,
      direction: r.direction,
      variant: r.variant,
      spark,
      sparkPct,
      changePct: null,
    };
  });

  const golds: GoldRate[] = rawGolds.map((g) => {
    const { spark, sparkPct } = buildSpark(g.id, g.price, g.direction, history);
    return {
      id: g.id,
      code: g.code,
      name: g.name,
      flag: null,
      buy: g.price,
      sell: g.price,
      usdRate: null,
      direction: g.direction,
      variant: false,
      spark,
      sparkPct,
      changePct: g.changePct,
      unit: g.unit,
      realValue: g.realValue,
      bubble: g.bubble,
      bubblePct: g.bubblePct,
    };
  });

  const payload: LiveRatesPayload = {
    ok: true,
    rates,
    golds,
    sourceUpdate: curRes.status === "fulfilled" ? curRes.value.sourceUpdate : null,
    goldUpdate: goldRes.status === "fulfilled" ? goldRes.value.sourceUpdate : null,
    serverTime: new Date().toISOString(),
    stale: false,
  };
  cache = { payload, at: Date.now() };
  return payload;
}

interface PersistableRow {
  id: string;
  code: string;
  name: string;
  price: number;
  direction: Direction;
}

/** درج در تاریخچه فقط هنگام تغییر قیمت یا گذشت زمان کافی */
async function persistIfChanged(
  items: PersistableRow[],
  kind: "currency" | "gold",
): Promise<void> {
  if (items.length === 0) return;
  try {
    const now = Date.now();
    const rows = items
      .filter((r) => {
        const lp = lastPersisted.get(r.id);
        if (lp && lp.sell === r.price && now - lp.at < PERSIST_MIN_INTERVAL_MS) {
          return false;
        }
        lastPersisted.set(r.id, { sell: r.price, at: now });
        return true;
      })
      .map((r) => ({
        rateId: r.id.slice(0, 96),
        code: r.code.slice(0, 24),
        name: r.name.slice(0, 96),
        kind,
        buy: r.price,
        sell: r.price,
        direction: r.direction,
        source: kind === "gold" ? "gold" : "alanchand",
      }));
    if (rows.length > 0) {
      await db.insert(rateHistory).values(rows);
    }
  } catch {
    // دیتابیس در دسترس نبود — سرویس اصلی نباید بخوابد
  }
}

async function loadHistory(ids: string[]): Promise<Map<string, number[]>> {
  const map = new Map<string, number[]>();
  try {
    const rows = await db
      .select({
        rateId: rateHistory.rateId,
        sell: rateHistory.sell,
        fetchedAt: rateHistory.fetchedAt,
      })
      .from(rateHistory)
      .where(gt(rateHistory.fetchedAt, sql`now() - interval '24 hours'`))
      .orderBy(desc(rateHistory.fetchedAt))
      .limit(1500);

    const wanted = new Set(ids);
    for (const row of rows) {
      if (!wanted.has(row.rateId)) continue;
      const arr = map.get(row.rateId);
      if (arr) {
        if (arr.length < 48) arr.push(row.sell);
      } else {
        map.set(row.rateId, [row.sell]);
      }
    }
    // سطرها desc هستند؛ به صعودی برمی‌گردانیم
    for (const [k, arr] of map) map.set(k, arr.reverse());
  } catch {
    // بدون دیتابیس ادامه می‌دهیم
  }
  return map;
}

function buildSpark(
  id: string,
  price: number,
  direction: Direction,
  history: Map<string, number[]>,
): { spark: number[]; sparkPct: number } {
  let spark = history.get(id) ?? [];
  if (spark.length < 6) {
    spark = seedSparkline(id, price, direction);
  }
  const first = spark[0];
  const last = spark[spark.length - 1];
  const sparkPct = first > 0 ? ((last - first) / first) * 100 : 0;
  return { spark, sparkPct };
}

/**
 * وقتی تاریخچهٔ واقعی هنوز جمع نشده، یک مسیر تصادفی قطعی (قطعی به‌ازای هر قلم)
 * می‌سازیم تا نمودار از ثانیهٔ اول زنده به‌نظر برسد؛ با رصد، نقاط واقعی جای آن را می‌گیرند.
 */
function seedSparkline(id: string, price: number, direction: Direction, points = 42): number[] {
  let h = 0;
  for (let i = 0; i < id.length; i++) {
    h = (Math.imul(31, h) + id.charCodeAt(i)) | 0;
  }
  let rngState = h || 123456789;
  const rand = () => {
    // xorshift32 قطعی
    rngState ^= rngState << 13;
    rngState ^= rngState >>> 17;
    rngState ^= rngState << 5;
    return ((rngState >>> 0) % 10_000) / 10_000;
  };

  const vol = Math.max(price * 0.0011, price > 0 ? 0.01 : 0);
  const drift =
    direction === "up" ? vol * 0.22 : direction === "down" ? -vol * 0.22 : 0;

  const out: number[] = new Array<number>(points);
  let v = price;
  for (let i = points - 1; i >= 0; i--) {
    out[i] = Math.max(price * 0.001, roundSmart(v));
    // به عقب حرکت می‌کنیم، پس جهت را معکوس اعمال می‌کنیم
    v = v - drift + (rand() - 0.5) * 2 * vol;
  }
  out[points - 1] = price;
  return out;
}

function roundSmart(v: number): number {
  return v < 1000 ? Math.round(v * 100) / 100 : Math.round(v);
}
