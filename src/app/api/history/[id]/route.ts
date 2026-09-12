import { desc, eq } from "drizzle-orm";
import { db } from "@/db";
import { rateHistory } from "@/db/schema";

export const dynamic = "force-dynamic";

export async function GET(
  _req: Request,
  { params }: { params: Promise<{ id: string }> },
) {
  try {
    const { id } = await params;
    // sanitize: only allow alphanumeric + : - _
    if (!/^[a-zA-Z0-9:_-]+$/.test(id)) {
      return Response.json({ ok: false, error: "invalid id" }, { status: 400 });
    }

    const rows = await db
      .select({
        sell: rateHistory.sell,
        kind: rateHistory.kind,
        direction: rateHistory.direction,
        fetchedAt: rateHistory.fetchedAt,
      })
      .from(rateHistory)
      .where(eq(rateHistory.rateId, id))
      .orderBy(desc(rateHistory.fetchedAt))
      .limit(120);

    // reverse to chronological order
    rows.reverse();

    return Response.json({ ok: true, id, points: rows });
  } catch (e) {
    const msg = e instanceof Error ? e.message : "unknown";
    return Response.json({ ok: false, error: msg }, { status: 500 });
  }
}
