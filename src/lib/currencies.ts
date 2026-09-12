/** متادیتای سمت کلاینت/سرور برای زیباسازی نمایش ارزها. */

export interface CurrencyMeta {
  en: string;
  /** نماد متنی کوتاه روی چیپ */
  sym: string;
}

const META: Record<string, CurrencyMeta> = {
  usd: { en: "US Dollar", sym: "$" },
  eur: { en: "Euro", sym: "€" },
  gbp: { en: "British Pound", sym: "£" },
  aed: { en: "UAE Dirham", sym: "د.إ" },
  try: { en: "Turkish Lira", sym: "₺" },
  cny: { en: "Chinese Yuan", sym: "¥" },
  jpy: { en: "Japanese Yen", sym: "¥" },
  chf: { en: "Swiss Franc", sym: "Fr" },
  cad: { en: "Canadian Dollar", sym: "$" },
  aud: { en: "Australian Dollar", sym: "$" },
  nzd: { en: "New Zealand Dollar", sym: "$" },
  rub: { en: "Russian Ruble", sym: "₽" },
  inr: { en: "Indian Rupee", sym: "₹" },
  krw: { en: "S. Korean Won", sym: "₩" },
  sar: { en: "Saudi Riyal", sym: "﷼" },
  qar: { en: "Qatari Riyal", sym: "﷼" },
  omr: { en: "Omani Rial", sym: "﷼" },
  kwd: { en: "Kuwaiti Dinar", sym: "د.ك" },
  bhd: { en: "Bahraini Dinar", sym: ".د.ب" },
  iqd: { en: "Iraqi Dinar", sym: "ع.د" },
  sek: { en: "Swedish Krona", sym: "kr" },
  nok: { en: "Norwegian Krone", sym: "kr" },
  dkk: { en: "Danish Krone", sym: "kr" },
  afn: { en: "Afghan Afghani", sym: "؋" },
  pkr: { en: "Pakistani Rupee", sym: "₨" },
  thb: { en: "Thai Baht", sym: "฿" },
  myr: { en: "Malaysian Ringgit", sym: "RM" },
  hkd: { en: "Hong Kong Dollar", sym: "$" },
  sgd: { en: "Singapore Dollar", sym: "$" },
  gel: { en: "Georgian Lari", sym: "₾" },
  azn: { en: "Azerbaijani Manat", sym: "₼" },
  amd: { en: "Armenian Dram", sym: "֏" },
  tjs: { en: "Tajik Somoni", sym: "ЅM" },
  tmt: { en: "Turkmen Manat", sym: "m" },
  kgs: { en: "Kyrgyz Som", sym: "⃀" },
  syp: { en: "Syrian Pound", sym: "£" },
  brl: { en: "Brazilian Real", sym: "R$" },
  ars: { en: "Argentine Peso", sym: "$" },
};

/** متادیتای اقلام طلا و سکه (کد = اسلاگ صفحهٔ طلای آلان‌چند) */
const GOLD_META: Record<string, CurrencyMeta> = {
  abshodeh: { en: "Melted Gold", sym: "آب" },
  "18ayar": { en: "18K Gold · gram", sym: "۱۸" },
  sekkeh: { en: "Emami Coin", sym: "امامی" },
  bahar: { en: "Bahar Azadi", sym: "بهار" },
  nim: { en: "Half Coin", sym: "نیم" },
  rob: { en: "Quarter Coin", sym: "ربع" },
  sek: { en: "Gram Coin", sym: "گرمی" },
  usd_xau: { en: "Gold Ounce", sym: "Au" },
  xag: { en: "Silver Ounce", sym: "Ag" },
};

export function isGoldCode(code: string): boolean {
  return code.toLowerCase() in GOLD_META;
}

export function metaFor(code: string): CurrencyMeta {
  const c = code.toLowerCase();
  return META[c] ?? GOLD_META[c] ?? { en: code.toUpperCase(), sym: "◈" };
}

/** پالت گرادیان‌های محتاطانه برای چیپ ارز */
const CHIP_GRADIENTS: Array<[string, string]> = [
  ["#f6dd9a", "#c98f2c"],
  ["#9adcf6", "#2c7fc9"],
  ["#b7f69a", "#3f9c2c"],
  ["#f69ab4", "#c92c5d"],
  ["#c6abff", "#6b3fd4"],
  ["#9af6e2", "#2c9c8a"],
  ["#ffc38a", "#d4762c"],
  ["#a9b8ff", "#3a4fc9"],
  ["#f69ae4", "#a62cc9"],
  ["#8ee6ff", "#1f7ec9"],
];

/** پالت طلایی اختصاصی اقلام طلا/سکه */
const GOLD_GRADIENTS: Array<[string, string]> = [
  ["#fbeec3", "#c98f2c"],
  ["#f6dd9a", "#b57f22"],
  ["#ffd98a", "#a87b1f"],
  ["#f1d48e", "#8f6418"],
  ["#fdeab8", "#c08924"],
  ["#f7e3a1", "#a06d15"],
];

function hashCode(s: string): number {
  let h = 0;
  for (let i = 0; i < s.length; i++) {
    h = (Math.imul(31, h) + s.charCodeAt(i)) | 0;
  }
  return Math.abs(h);
}

export function chipGradient(code: string): string {
  if (isGoldCode(code)) {
    const [a, b] = GOLD_GRADIENTS[hashCode(code.toUpperCase()) % GOLD_GRADIENTS.length];
    return `linear-gradient(135deg, ${a}, ${b})`;
  }
  const [a, b] = CHIP_GRADIENTS[hashCode(code.toUpperCase()) % CHIP_GRADIENTS.length];
  return `linear-gradient(135deg, ${a}, ${b})`;
}

/** سطرهای حواله/استانی که پایین جدول سایت می‌آیند */
export function isVariantName(name: string): boolean {
  return /حواله|استانبول|سلیمانیه|هرات/.test(name);
}
