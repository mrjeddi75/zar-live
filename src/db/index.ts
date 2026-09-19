import { drizzle as drizzlePg } from "drizzle-orm/node-postgres";
import { drizzle as drizzleNeon } from "drizzle-orm/neon-http";
import { neon } from "@neondatabase/serverless";
import { Pool } from "pg";

const rawDatabaseUrl = process.env.DATABASE_URL;

if (!rawDatabaseUrl) {
  throw new Error("DATABASE_URL is required");
}

const databaseUrl = rawDatabaseUrl;

const useNeonHttp =
  process.env.USE_NEON_HTTP === "1" || /neon\.tech/i.test(databaseUrl);

const globalForDb = globalThis as typeof globalThis & {
  __arenaNextJsPostgresqlPool?: Pool;
};

let pool: Pool | undefined;

function createDb() {
  if (useNeonHttp) {
    // اتصال HTTPS روی پورت 443 (بدون نیاز به TCP 5432)
    const sqlClient = neon(databaseUrl);
    return drizzleNeon(sqlClient);
  }

  pool =
    globalForDb.__arenaNextJsPostgresqlPool ??
    new Pool({
      connectionString: databaseUrl,
    });

  if (process.env.NODE_ENV !== "production") {
    globalForDb.__arenaNextJsPostgresqlPool = pool;
  }

  return drizzlePg(pool);
}

export const db = createDb() as ReturnType<typeof drizzlePg>;
export { pool };
