import { desc, gt, inArray, sql } from "drizzle-orm";
import { db } from "@/db";
import { rateHistory, rateLatest } from "@/db/schema";
import {
  fetchRawGolds,
  fetchRawRates,
  type RawGold,
  type RawRate,
} from "./alanchand";
import type {
  Direction,
  GoldRate,
  LiveRate,
  LiveRatesPayload,
} from "./types";

const CACHE_TTL_MS = 12_000;
const FORCE_HISTORY_EVERY_MS = 5 * 60_000; // هر ۵ دقیقه یک نمونه اجباری

let cache: { payload: LiveRatesPayload; at: number } | null = null;
let inFlight: Promise<LiveRatesPayload> | null = null;

export async function getLiveRates(): Promise<LiveRatesPayload> {
  if (cache && Date.now() - cache.at < CACHE_TTL_MS) return cache.payload;
  if (inFlight) return inFlight;

  inFlight = refresh()
    .catch((err: unknown) => {
      if (cache) return { ...cache.payload, stale: true };
      throw err;
    })
    .finally(() => {
      inFlight = null;
    });

  return inFlight;
}

async function refresh(): Promise<LiveRatesPayload> {
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

  const dbStats = await persistWithLatest(rawRates, rawGolds);
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
    db: dbStats,
  };

  cache = { payload, at: Date.now() };
  return payload;
}

interface PersistItem {
  id: string;
  code: string;
  name: string;
  kind: "currency" | "gold";
  buy: number;
  sell: number;
  direction: Direction;
  source: string;
}

async function persistWithLatest(rawRates: RawRate[], rawGolds: RawGold[]) {
  const items: PersistItem[] = [
    ...rawRates.map((r) => ({
      id: r.id,
      code: r.code,
      name: r.name,
      kind: "currency" as const,
      buy: r.buy,
      sell: r.sell,
      direction: r.direction,
      source: "alanchand",
    })),
    ...rawGolds.map((g) => ({
      id: g.id,
      code: g.code,
      name: g.name,
      kind: "gold" as const,
      buy: g.price,
      sell: g.price,
      direction: g.direction,
      source: "gold",
    })),
  ];

  if (items.length === 0) {
    return {
      ok: true,
      latestUpserted: 0,
      historyInserted: 0,
      error: null,
    };
  }

  try {
    const ids = items.map((i) => i.id.slice(0, 96));
    const latestRows = await db
      .select({
        rateId: rateLatest.rateId,
        sell: rateLatest.sell,
        changedAt: rateLatest.changedAt,
      })
      .from(rateLatest)
      .where(inArray(rateLatest.rateId, ids));

    const latestMap = new Map(
      latestRows.map((r) => [r.rateId, { sell: r.sell, changedAt: r.changedAt }]),
    );

    const now = Date.now();
    const historyRows: Array<{
      rateId: string;
      code: string;
      name: string;
      kind: "currency" | "gold";
      buy: number;
      sell: number;
      direction: Direction;
      source: string;
    }> = [];

    const latestUpserts = items.map((i) => {
      const rateId = i.id.slice(0, 96);
      const code = i.code.slice(0, 24);
      const name = i.name.slice(0, 96);

      const prev = latestMap.get(rateId);
      const changed = !prev || Number(prev.sell) !== Number(i.sell);
      const oldEnough =
        !prev ||
        !prev.changedAt ||
        now - new Date(prev.changedAt).getTime() > FORCE_HISTORY_EVERY_MS;

      if (changed || oldEnough) {
        historyRows.push({
          rateId,
          code,
          name,
          kind: i.kind,
          buy: i.buy,
          sell: i.sell,
          direction: i.direction,
          source: i.source,
        });
      }

      return {
        rateId,
        code,
        name,
        kind: i.kind,
        buy: i.buy,
        sell: i.sell,
        direction: i.direction,
        source: i.source,
      };
    });

    if (historyRows.length > 0) {
      await db.insert(rateHistory).values(historyRows);
    }

    await db
      .insert(rateLatest)
      .values(latestUpserts)
      .onConflictDoUpdate({
        target: rateLatest.rateId,
        set: {
          code: sql`excluded.code`,
          name: sql`excluded.name`,
          kind: sql`excluded.kind`,
          buy: sql`excluded.buy`,
          sell: sql`excluded.sell`,
          direction: sql`excluded.direction`,
          source: sql`excluded.source`,
          seenAt: sql`now()`,
          changedAt: sql`case when ${rateLatest.sell} is distinct from excluded.sell then now() else ${rateLatest.changedAt} end`,
        },
      });

    return {
      ok: true,
      latestUpserted: latestUpserts.length,
      historyInserted: historyRows.length,
      error: null,
    };
  } catch (err) {
    const message = err instanceof Error ? err.message : "unknown db error";
    console.error("[rates][db] persist failed:", message);
    return {
      ok: false,
      latestUpserted: 0,
      historyInserted: 0,
      error: message,
    };
  }
}

async function loadHistory(ids: string[]): Promise<Map<string, number[]>> {
  const map = new Map<string, number[]>();
  if (ids.length === 0) return map;

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
      .limit(2500);

    const wanted = new Set(ids.map((i) => i.slice(0, 96)));

    for (const row of rows) {
      if (!wanted.has(row.rateId)) continue;
      const arr = map.get(row.rateId);
      if (arr) {
        if (arr.length < 64) arr.push(row.sell);
      } else {
        map.set(row.rateId, [row.sell]);
      }
    }

    for (const [k, arr] of map) map.set(k, arr.reverse());
  } catch (err) {
    const msg = err instanceof Error ? err.message : "unknown load error";
    console.error("[rates][db] load history failed:", msg);
  }

  return map;
}

function buildSpark(
  id: string,
  price: number,
  direction: Direction,
  history: Map<string, number[]>,
): { spark: number[]; sparkPct: number } {
  let spark = history.get(id.slice(0, 96)) ?? [];
  if (spark.length < 6) {
    spark = seedSparkline(id, price, direction);
  }
  const first = spark[0];
  const last = spark[spark.length - 1];
  const sparkPct = first > 0 ? ((last - first) / first) * 100 : 0;
  return { spark, sparkPct };
}

function seedSparkline(
  id: string,
  price: number,
  direction: Direction,
  points = 42,
): number[] {
  let h = 0;
  for (let i = 0; i < id.length; i++) {
    h = (Math.imul(31, h) + id.charCodeAt(i)) | 0;
  }
  let rngState = h || 123456789;
  const rand = () => {
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
    v = v - drift + (rand() - 0.5) * 2 * vol;
  }
  out[points - 1] = price;
  return out;
}

function roundSmart(v: number): number {
  return v < 1000 ? Math.round(v * 100) / 100 : Math.round(v);
}
