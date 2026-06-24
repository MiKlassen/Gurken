import { sendPaymentReminders } from "@/lib/payment-reminders";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";
export const maxDuration = 60;

function isAuthorized(request: Request) {
  const cronSecret = process.env.CRON_SECRET;
  const authHeader = request.headers.get("authorization");
  return Boolean(cronSecret && authHeader === `Bearer ${cronSecret}`);
}

export async function GET(request: Request) {
  if (!isAuthorized(request)) {
    return Response.json({ success: false, error: "Unauthorized" }, { status: 401 });
  }

  try {
    const result = await sendPaymentReminders({ enforceCronWindow: true });
    return Response.json({ success: true, ...result });
  } catch (error) {
    console.error("Payment reminder cron failed", error);
    return Response.json(
      {
        success: false,
        error: error instanceof Error ? error.message : "Unknown reminder error"
      },
      { status: 500 }
    );
  }
}
