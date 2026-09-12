export const dynamic = "force-dynamic";
export const runtime = "nodejs";

const JSON_HEADERS = {
  "Content-Type": "application/json; charset=utf-8",
  "Cache-Control": "no-store",
};

/**
 * این روت در هر شرایطی JSON برمی‌گرداند.
 * ایمپورت داینامیک ماژول سرویس تضمین می‌کند حتی اگر سطح ماژول
 * (مثل اتصال دیتابیس یا وابستگی‌ها) خطا داشته باشد، پاسخ همیشه
 * یک JSON تمیز باشد و هرگز صفحهٔ HTML خطا به کلاینت نرسد.
 */
export async function GET() {
  try {
    const { getLiveRates } = await import("@/lib/rates");
    const payload = await getLiveRates();
    return new Response(JSON.stringify(payload), { headers: JSON_HEADERS });
  } catch (err) {
    const message = err instanceof Error ? err.message : "unknown error";
    return new Response(
      JSON.stringify({ ok: false, error: message }),
      { status: 502, headers: JSON_HEADERS },
    );
  }
}
