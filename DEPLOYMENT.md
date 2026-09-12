# راهنمای استقرار پروژه «زر» — لپتاپ، گیت‌هاب و کلادفلر

این سند سه مسیر را قدم‌به‌قدم توضیح می‌دهد:
۱) اجرای محلی روی لپتاپ  ۲) انتشار سورس روی GitHub  ۳) استقرار روی Cloudflare Workers

---

## پیش‌نیازها

| ابزار | نسخه | برای چه؟ |
|---|---|---|
| Node.js | ۲۰ به بالا | اجرای پروژه |
| Git | آخرین نسخه | کنترل نسخه و اتصال به گیت‌هاب |
| Docker Desktop (اختیاری) | — | بالا آوردن PostgreSQL روی لپتاپ بدون نصب دستی |
| اکانت GitHub | — | میزبانی سورس |
| اکانت Cloudflare | رایگان | استقرار سرور |
| اکانت Neon | رایگان | دیتابیس PostgreSQL ابری برای کلادفلر |

---

## ۱) اجرا روی لپتاپ

```bash
git clone <آدرس-ریپوی-شما>
cd zar-live
npm install
```

**دیتابیس — دو راه داریم:**

**راه الف (بدون داکر — پیشنهادی): استفاده از همان Neon برای لوکال.** هیچ دیتابیسی روی لپتاپ نصب نمی‌شود؛ فقط Connection String پروژهٔ Neon را در `.env` می‌گذارید (مرحلهٔ «دیتابیس ابری» پایین‌تر). مزیت: همان دیتابیس بعداً هنگام دیپلوی روی کلادفلر هم استفاده می‌شود.

**راه ب (با داکر):**

```bash
docker run --name zar-pg -e POSTGRES_PASSWORD=postgres -e POSTGRES_DB=app_db -p 5432:5432 -d postgres:16
```

(بدون داکر و بدون Neon هم می‌شود: PostgreSQL را روی ویندوز نصب کنید و یک دیتابیس با نام `app_db` بسازید.)

**فایل `.env` بسازید:**

```
# راه ب/محلی:
DATABASE_URL=postgresql://postgres:postgres@127.0.0.1:5432/app_db
# راه الف (Neon) — رشته‌ای که داشبورد Neon می‌دهد:
# DATABASE_URL=postgresql://...neon.tech/neondb?sslmode=require
```

**مرحله ۳ — ساخت جدول‌ها و اجرا:**

```bash
npx drizzle-kit push      # ساخت جدول rate_history در دیتابیس
npm run dev               # اجرای سرور توسعه
```

حالا `http://localhost:3000` را باز کنید. اولین بار چند ثانیه طول می‌کشد (واکشی اولیه از آلان‌چند). برای تست مستقیم API: `http://localhost:3000/api/rates`

**نکته:** برای اجرای پروداکشن روی لپتاپ: `npm run build && npm run start`

---

## ۲) انتشار روی GitHub

> هشدار امنیتی: فایل `.env` هرگز نباید به گیت‌هاب برود. فایل `.gitignore` پروژه همین کار را کنترل می‌کند؛ قبل از push حتماً چک کنید: `git status` نباید `.env` را نشان دهد. اگر قبلاً اشتباهی کامیت شده: `git rm --cached .env`

۱. در github.com یک **Repository جدید** (مثلاً `zar-live`) بسازید — بدون README اولیه.

۲. در پوشهٔ پروژه:

```bash
git init
git add .
git commit -m "zar.live: real-time currency & gold board"
git branch -M main
git remote add origin https://github.com/<username>/zar-live.git
git push -u origin main
```

تمام. سورس حالا روی گیت‌هاب است و هر تغییر بعدی با `git add . && git commit -m "..." && git push` منتشر می‌شود.

---

## ۳) استقرار روی Cloudflare Workers

Next.js کامل (با API Routes و Node runtime) روی Workers با ابزار رسمی **OpenNext** اجرا می‌شود.

### مرحله ۱ — نصب ابزارها

```bash
npm install -D @opennextjs/cloudflare wrangler
npx wrangler login     # پنجرهٔ مرورگر برای ورود به کلادفلر باز می‌شود
```

### مرحله ۲ — فایل‌های کانفیگ (در ریشهٔ پروژه بسازید)

`open-next.config.ts`:

```ts
import { defineCloudflareConfig } from "@opennextjs/cloudflare/config";
export default defineCloudflareConfig({});
```

`wrangler.jsonc`:

```jsonc
{
  "$schema": "node_modules/wrangler/config-schema.json",
  "name": "zar-live",
  "main": ".open-next/worker.js",
  "compatibility_date": "2025-09-01",
  "compatibility_flags": ["nodejs_compat"],
  "assets": { "directory": ".open-next/assets", "binding": "ASSETS" }
}
```

در انتهای `next.config.ts` اضافه کنید:

```ts
import { initOpenNextCloudflareForDev } from "@opennextjs/cloudflare";
/* ...defineConfig قبلی... */
if (process.env.NODE_ENV === "development") {
  void initOpenNextCloudflareForDev();
}
```

و این اسکریپت‌ها را به `package.json` اضافه کنید:

```json
"cf:build": "opennextjs-cloudflare build",
"cf:preview": "opennextjs-cloudflare build && opennextjs-cloudflare preview",
"cf:deploy": "opennextjs-cloudflare build && opennextjs-cloudflare deploy"
```

### مرحله ۳ — دیتابیس ابری (Neon)

درایور `pg` (TCP مستقیم) روی Workers کار نمی‌کند؛ ساده‌ترین راه سازگار، درایور HTTP نئون است:

۱. در `neon.tech` یک پروژهٔ PostgreSQL رایگان بسازید و `Connection String` را کپی کنید (چیزی شبیه `postgresql://...neon.tech/...`).
۲. لوکال با همان رشته در `.env` تست کنید و `npx drizzle-kit push` را روی Neon اجرا کنید تا جدول ساخته شود.
۳. برای اجرای روی Workers، درایور را عوض کنید:

```bash
npm install @neondatabase/serverless
```

و در `src/db/index.ts` (فقط برای محیط کلادفلر) به‌جای Pool از درایور HTTP استفاده کنید:

```ts
import { neon } from "@neondatabase/serverless";
import { drizzle } from "drizzle-orm/neon-http";
export const db = drizzle(neon(process.env.DATABASE_URL!));
```

(راه حرفه‌ای‌تر: Cloudflare Hyperdrive — که `pg` را از طریق binding روی Workers ممکن می‌کند.)

### مرحله ۴ — متغیرها و دیپلوی

```bash
npx wrangler secret put DATABASE_URL     # رشتهٔ اتصال Neon را وارد کنید
npm run cf:preview                       # تست لوکال در محیط شبیه Workers
npm run cf:deploy                        # دیپلوی واقعی
```

پس از دیپلوی آدرسی شبیه `https://zar-live.<subdomain>.workers.dev` دریافت می‌کنید.

### مرحله ۵ (اختیاری) — دیپلوی خودکار از گیت‌هاب

در داشبورد کلادفلر: **Workers → Create → Import a repository** → ریپوی گیت‌هاب را انتخاب کنید و Build command همان `opennextjs-cloudflare build` را بدهید؛ از این پس هر `git push` به main، خودکار دیپلوی می‌شود.

### نکات مهم روی کلادفلر

- **کش سمت سرور** (`src/lib/rates.ts`) درون‌حافظه‌ای است و بین isolateهای Workers مشترک نیست؛ یعنی هر isolate مستقلاً به آلان‌چند درخواست می‌زند. برای ترافیک کم مشکلی نیست؛ برای مقیاس بالا از Cloudflare KV یا Durable Objects برای کش مشترک استفاده کنید.
- پلن رایگان Workers برای این پروژه (یک API + فچ دوره‌ای) کافی است.
- اگر داده‌ها سربرگ «کش موقت» گرفتند، یعنی واکشی جدید از آلان‌چند خطا خورده و آخرین پاسخ موفق سرو می‌شود — رفتار عادی است.
- یک بار `/api/rates` را روی آدرس workers.dev تست کنید؛ باید JSON با `ok:true` برگردد.
