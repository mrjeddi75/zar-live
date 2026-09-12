import * as cheerio from "cheerio";
import { parseFaNumber } from "./format";
import { isVariantName } from "./currencies";
import type { Direction } from "./types";

export interface RawRate {
  id: string;
  code: string;
  name: string;
  flag: string | null;
  buy: number;
  sell: number;
  usdRate: number | null;
  direction: Direction;
  variant: boolean;
}

export interface RawGold {
  id: string;
  code: string;
  name: string;
  price: number;
  unit: "تومان" | "دلار";
  changePct: number | null;
  realValue: number | null;
  bubble: number | null;
  bubblePct: number | null;
  direction: Direction;
}

export interface RawFetchResult {
  rates: RawRate[];
  sourceUpdate: string | null;
  mode: "api" | "scrape";
}

const PAGE_URL = "https://alanchand.com/currencies-price";
const GOLD_URL = "https://alanchand.com/gold-price";
const API_URL = "https://api.alanchand.com";

const UA =
  "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/126.0.0.0 Safari/537.36";

/**
 * استراتژی واکشی:
 * ۱) اگر توکن رسمی آلان‌چند در env باشد (ALANCHAND_API_TOKEN) از API JSON استفاده می‌شود.
 * ۲) در غیر این صورت صفحهٔ عمومی currencies-price به‌صورت سرورساید واکشی و با cheerio پارس می‌شود.
 */
export async function fetchRawRates(): Promise<RawFetchResult> {
  const token = process.env.ALANCHAND_API_TOKEN;
  if (token) {
    try {
      return await fetchFromApi(token);
    } catch {
      // در صورت شکست API، به اسکرپ صفحه برمی‌گردیم
    }
  }
  return await scrapePage();
}

async function fetchFromApi(token: string): Promise<RawFetchResult> {
  const res = await fetch(`${API_URL}?type=currency`, {
    headers: {
      Authorization: `Bearer ${token}`,
      Accept: "application/json",
      "User-Agent": UA,
    },
    cache: "no-store",
    signal: AbortSignal.timeout(10_000),
  });
  if (!res.ok) throw new Error(`alanchand api http ${res.status}`);
  const data: unknown = await res.json();
  const rates: RawRate[] = [];
  if (data && typeof data === "object") {
    for (const [code, value] of Object.entries(data as Record<string, unknown>)) {
      if (!value || typeof value !== "object") continue;
      const v = value as Record<string, unknown>;
      const sell = Number(v.price ?? v.sell ?? v.sell_price);
      if (!Number.isFinite(sell) || sell <= 0) continue;
      const buy = Number(v.buy ?? v.buy_price);
      const name = String(v.name ?? code.toUpperCase());
      const change = Number(v.change ?? 0);
      rates.push({
        id: `${code.toLowerCase()}:${name}`,
        code: code.toLowerCase(),
        name,
        flag: null,
        buy: Number.isFinite(buy) && buy > 0 ? buy : sell,
        sell,
        usdRate: null,
        direction: change > 0 ? "up" : change < 0 ? "down" : "flat",
        variant: isVariantName(name),
      });
    }
  }
  if (rates.length < 5) throw new Error("alanchand api returned too few rows");
  return { rates, sourceUpdate: null, mode: "api" };
}

async function scrapePage(): Promise<RawFetchResult> {
  const res = await fetch(PAGE_URL, {
    headers: {
      "User-Agent": UA,
      "Accept-Language": "fa-IR,fa;q=0.9,en;q=0.5",
      Accept: "text/html,application/xhtml+xml",
    },
    cache: "no-store",
    signal: AbortSignal.timeout(12_000),
  });
  if (!res.ok) throw new Error(`alanchand page http ${res.status}`);
  const ct = res.headers.get("content-type") ?? "";
  if (!ct.includes("text/html")) {
    throw new Error("alanchand page: unexpected content-type");
  }
  const html = await res.text();
  const $ = cheerio.load(html);

  const rates: RawRate[] = [];

  $("tr[onclick]").each((_i, row) => {
    const $row = $(row);
    const onclick = $row.attr("onclick") ?? "";
    const m = /currencies-price\/([a-z0-9_]+)/i.exec(onclick);
    if (!m) return;
    const code = m[1].toLowerCase();

    const title = ($row.attr("title") ?? "").replace(/^قیمت\s*/, "").trim();
    const cellName = $row.find("td.currName").text().trim();
    const name = title || cellName;
    if (!name) return;

    const flagM = /flag\s+flag-([a-z]+)/i.exec($row.find("td.currName").html() ?? "");

    // متن سلول‌ها شامل اسپن‌های خالی priceSymbol هم می‌شود که متنی ندارند
    const buy = parseFaNumber($row.find("td.buyPrice").text());
    const sell = parseFaNumber($row.find("td.sellPrice").text());
    const usdText = $row.find("td.usdRate").text();
    const usdRate = usdText.includes("-") ? null : parseFaNumber(usdText);

    if (buy === null || sell === null || buy <= 0 || sell <= 0) return;

    const symClass = $row.find("td.sellPrice .priceSymbol").attr("class") ?? "";
    const direction: Direction = /\bup\b/.test(symClass)
      ? "up"
      : /\bdown\b/.test(symClass)
        ? "down"
        : "flat";

    rates.push({
      id: `${code}:${name}`,
      code,
      name,
      flag: flagM ? flagM[1] : null,
      buy,
      sell,
      usdRate,
      direction,
      variant: isVariantName(name),
    });
  });

  if (rates.length < 10) {
    throw new Error("scrape: unexpected page structure");
  }

  const um = /آخرین\s*بروز\s*رسانی\s*:\s*([۰-۹0-9:٫٬\s\u0600-\u06FF]+)/.exec(html);
  const sourceUpdate = um ? um[1].replace(/\s+/g, " ").trim() : null;

  return { rates, sourceUpdate, mode: "scrape" };
}

/** تشخیص علامت منفی از متن خام (خط تیرهٔ ASCII یا U+2212) */
function signed(text: string, value: number | null): number | null {
  if (value === null) return null;
  return /[-−]/.test(text) ? -Math.abs(value) : value;
}

/**
 * واکشی قیمت‌های طلا و سکه از صفحهٔ gold-price.
 * ستون‌ها: نام | قیمت + تغییرات | قیمت واقعی | مقدار حباب(درصد)
 */
export async function fetchRawGolds(): Promise<{
  golds: RawGold[];
  sourceUpdate: string | null;
}> {
  const res = await fetch(GOLD_URL, {
    headers: {
      "User-Agent": UA,
      "Accept-Language": "fa-IR,fa;q=0.9,en;q=0.5",
      Accept: "text/html,application/xhtml+xml",
    },
    cache: "no-store",
    signal: AbortSignal.timeout(12_000),
  });
  if (!res.ok) throw new Error(`alanchand gold http ${res.status}`);
  const ct = res.headers.get("content-type") ?? "";
  if (!ct.includes("text/html")) {
    throw new Error("alanchand gold: unexpected content-type");
  }
  const html = await res.text();
  const $ = cheerio.load(html);

  const golds: RawGold[] = [];

  $("tr.clickable-row").each((_i, row) => {
    const $row = $(row);
    const m = /gold-price\/([a-z0-9_-]+)/i.exec($row.attr("onclick") ?? "");
    if (!m) return;
    const code = m[1].toLowerCase();

    const title = ($row.attr("title") ?? "")
      .replace(/^مشاهده\s*قیمت\s*لحظه‌ای\s*/, "")
      .trim();
    const tds = $row.find("td");
    const name = title || tds.eq(0).text().trim();
    if (!name || tds.length < 2) return;

    // سلول قیمت: متن قبل از اسپن درصد است
    const priceCell = tds.eq(1);
    const priceHtml = priceCell.html() ?? "";
    const beforeSpan = priceHtml.split(/<span/i)[0].replace(/<[^>]+>/g, " ");
    const fullCellText = priceCell.text();
    const unit: "تومان" | "دلار" = fullCellText.includes("$") ? "دلار" : "تومان";
    const price = signed(beforeSpan, parseFaNumber(beforeSpan));
    if (price === null || price <= 0) return;

    // درصد تغییر: علامت از خود متن یا از کلاس جهت
    const symSpan = priceCell.find(".priceSymbol");
    const symClass = symSpan.attr("class") ?? "";
    const direction: Direction = /\bup\b/.test(symClass)
      ? "up"
      : /\bdown\b/.test(symClass)
        ? "down"
        : "flat";
    const pctText = symSpan.text();
    let changePct = signed(pctText, parseFaNumber(pctText));
    if (changePct !== null && direction === "down" && changePct > 0) {
      changePct = -changePct;
    }
    if (direction === "flat" && changePct !== null && Math.abs(changePct) < 0.005) {
      changePct = 0;
    }

    // قیمت واقعی
    const realText = tds.eq(2).text();
    const realValue =
      tds.eq(2).text().trim().startsWith("-") && parseFaNumber(realText) === null
        ? null
        : signed(realText, parseFaNumber(realText));

    // حباب: مقدار + درصد
    let bubble: number | null = null;
    let bubblePct: number | null = null;
    if (tds.length >= 4) {
      const bubCell = tds.eq(3);
      const bubHtml = bubCell.html() ?? "";
      const bubBefore = bubHtml.split(/<span/i)[0].replace(/<[^>]+>/g, " ");
      const bubParsed = parseFaNumber(bubBefore);
      if (bubParsed !== null && !bubCell.text().includes("(-)")) {
        bubble = signed(bubBefore, bubParsed);
        const bubSpanText = bubCell.find(".priceSymbol").text();
        bubblePct = signed(bubSpanText, parseFaNumber(bubSpanText));
      }
    }

    golds.push({
      id: `gold:${code}:${name}`,
      code,
      name,
      price,
      unit,
      changePct,
      realValue,
      bubble,
      bubblePct,
      direction,
    });
  });

  if (golds.length < 5) {
    throw new Error("gold scrape: unexpected page structure");
  }

  const um = /آخرین\s*بروز\s*رسانی\s*:\s*([۰-۹0-9:٫٬\s\u0600-\u06FF]+)/.exec(html);
  const sourceUpdate = um ? um[1].replace(/\s+/g, " ").trim() : null;

  return { golds, sourceUpdate };
}
