export type DigitMode = "fa" | "lat";

const FA_DIGITS = "۰۱۲۳۴۵۶۷۸۹";
const AR_DIGITS = "٠١٢٣٤٥٦٧٨٩";

/** اعداد فارسی/عربی را به عدد JS تبدیل می‌کند (سمت سرور برای پارس HTML). */
export function parseFaNumber(input: string | null | undefined): number | null {
  if (!input) return null;
  let out = "";
  for (const ch of input) {
    const fi = FA_DIGITS.indexOf(ch);
    if (fi > -1) {
      out += String(fi);
      continue;
    }
    const ai = AR_DIGITS.indexOf(ch);
    if (ai > -1) {
      out += String(ai);
      continue;
    }
    if (ch === "٫" || ch === ".") {
      out += ".";
      continue;
    }
    if (ch === "٬" || ch === "," || ch === " " || ch === " ") continue;
    if (ch >= "0" && ch <= "9") out += ch;
  }
  if (out === "" || out === ".") return null;
  const n = Number(out);
  return Number.isFinite(n) ? n : null;
}

const en = new Intl.NumberFormat("en-US", { maximumFractionDigits: 0 });
const fa = new Intl.NumberFormat("fa-IR", { maximumFractionDigits: 0 });

export function formatPrice(n: number, digits: DigitMode): string {
  return digits === "fa" ? fa.format(Math.round(n)) : en.format(Math.round(n));
}

export function formatUsdRate(n: number | null, digits: DigitMode): string {
  if (n === null || !Number.isFinite(n)) return "—";
  const f = new Intl.NumberFormat(digits === "fa" ? "fa-IR" : "en-US", {
    maximumFractionDigits: 3,
  });
  return f.format(n);
}

export function formatPct(n: number, digits: DigitMode): string {
  const f = new Intl.NumberFormat(digits === "fa" ? "fa-IR" : "en-US", {
    maximumFractionDigits: 2,
    minimumFractionDigits: 0,
  });
  const sign = n > 0 ? "+" : "";
  return `${sign}${f.format(n)}${digits === "fa" ? "٪" : "%"}`;
}

export function formatInt(n: number, digits: DigitMode): string {
  return digits === "fa" ? fa.format(n) : en.format(n);
}

/** تبدیل ارقام لاتین به فارسی (برای رشته‌های آماده مثل زمان). */
export function toFaDigits(input: string): string {
  return input.replace(/[0-9]/g, (d) => FA_DIGITS[Number(d)]);
}
