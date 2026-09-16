export type Direction = "up" | "down" | "flat";

export interface LiveRate {
  /** شناسهٔ یکتا: ترکیب کد و نام (برای سطرهایی مثل «دلار استانبول») */
  id: string;
  /** کد کوتاه ارز، مثل usd */
  code: string;
  /** نام فارسی از منبع، مثل «دلار آمریکا» */
  name: string;
  /** کد پرچم کشور، مثل us */
  flag: string | null;
  /** قیمت خرید (تومان) */
  buy: number;
  /** قیمت فروش (تومان) */
  sell: number;
  /** نرخ برابری هر واحد با دلار (در صورت وجود) */
  usdRate: number | null;
  direction: Direction;
  /** سطرهای حواله/استانی (دلار استانبول، سلیمانیه، هرات...) */
  variant: boolean;
  /** نقاط اسپارک‌لاین (صعودی زمانی) */
  spark: number[];
  /** درصد تغییر روند رصدشده */
  sparkPct: number;
  /** درصد تغییر اعلام‌شده از خود منبع (فعلاً برای طلا/سکه) */
  changePct: number | null;
}

/** قلم طلا/سکه؛ buy و sell = قیمت لحظه‌ای */
export interface GoldRate extends LiveRate {
  unit: "تومان" | "دلار";
  /** قیمت واقعی (بدون حباب) */
  realValue: number | null;
  /** مقدار حباب (تومان) */
  bubble: number | null;
  /** درصد حباب */
  bubblePct: number | null;
}

export interface LiveRatesPayload {
  ok: true;
  rates: LiveRate[];
  golds: GoldRate[];
  /** متن «آخرین بروزرسانی» استخراج‌شده از خود صفحهٔ آلان‌چند */
  sourceUpdate: string | null;
  /** متن بروزرسانی صفحهٔ طلا */
  goldUpdate: string | null;
  /** زمان سرور ما (ISO) */
  serverTime: string;
  /** از کش استال سرو شده (منبع در دسترس نبود) */
  stale: boolean;
  /** سلامت لایهٔ دیتابیس و تعداد رکوردهای تازه */
  db?: {
    ok: boolean;
    latestUpserted: number;
    historyInserted: number;
    error: string | null;
  };
}
