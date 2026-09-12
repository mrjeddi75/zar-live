import { config } from "dotenv";
import { defineConfig } from "drizzle-kit";

// drizzle-kit خودش .env را می‌خواند؛ این برای اطمینان در همهٔ محیط‌هاست
config();

export default defineConfig({
  dialect: "postgresql",
  schema: "./src/db/schema.ts",
  dbCredentials: {
    // روی لپتاپ/کلادفلر از مقدار DATABASE_URL داخل .env خوانده می‌شود
    url:
      process.env.DATABASE_URL ??
      "postgresql://postgres:postgres@127.0.0.1:5432/app_db",
  },
});
