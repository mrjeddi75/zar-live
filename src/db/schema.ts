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
  (t) => [
    index("rate_history_rate_time_idx").on(t.rateId, t.fetchedAt),
    index("rate_history_kind_time_idx").on(t.kind, t.fetchedAt),
  ],
);

/**
 * آخرین وضعیت هر نماد برای تشخیص تغییرات واقعی بین درخواست‌ها.
 * این جدول مشکل از دست رفتن state در serverless را حل می‌کند.
 */
export const rateLatest = pgTable(
  "rate_latest",
  {
    rateId: varchar("rate_id", { length: 96 }).primaryKey(),
    code: varchar("code", { length: 24 }).notNull(),
    name: varchar("name", { length: 96 }).notNull(),
    kind: varchar("kind", { length: 8 }).notNull(),
    buy: doublePrecision("buy").notNull(),
    sell: doublePrecision("sell").notNull(),
    direction: varchar("direction", { length: 8 }).notNull(),
    source: varchar("source", { length: 16 }).notNull(),
    changedAt: timestamp("changed_at", { withTimezone: true })
      .notNull()
      .defaultNow(),
    seenAt: timestamp("seen_at", { withTimezone: true }).notNull().defaultNow(),
  },
  (t) => [index("rate_latest_kind_idx").on(t.kind), index("rate_latest_code_idx").on(t.code)],
);
