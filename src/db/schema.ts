import {
  doublePrecision,
  index,
  pgTable,
  serial,
  timestamp,
  varchar,
} from "drizzle-orm/pg-core";

/**
 * تاریخچهٔ اسنپ‌شات قیمت‌ها (ارز + طلا/سکه).
 * فقط وقتی قیمت تغییر کند (یا کمیاب‌شدن نمونه) ردیف جدید درج می‌شود
 * تا حجم جدول کنترل شود. از این تاریخچه برای اسپارک‌لاین و درصد روند استفاده می‌کنیم.
 */
export const rateHistory = pgTable(
  "rate_history",
  {
    id: serial("id").primaryKey(),
    rateId: varchar("rate_id", { length: 96 }).notNull(),
    code: varchar("code", { length: 24 }).notNull(),
    name: varchar("name", { length: 96 }).notNull(),
    kind: varchar("kind", { length: 8 }).notNull().default("currency"),
    buy: doublePrecision("buy").notNull(),
    sell: doublePrecision("sell").notNull(),
    direction: varchar("direction", { length: 8 }).notNull(),
    source: varchar("source", { length: 16 }).notNull(),
    fetchedAt: timestamp("fetched_at", { withTimezone: true })
      .notNull()
      .defaultNow(),
  },
  (t) => [index("rate_history_rate_time_idx").on(t.rateId, t.fetchedAt)],
);
