import { NextResponse } from "next/server";
import { db } from "@/lib/db";
import { events, eventRoles, payments } from "@/lib/db/schema";
import { eq, and, isNull } from "drizzle-orm";
import { getCurrentUser, handleAuthError, UnauthorizedError, ForbiddenError } from "@/lib/auth/rbac";

export async function GET(
  _request: Request,
  { params }: { params: Promise<{ eventId: string }> }
) {
  try {
    const user = await getCurrentUser();
    const { eventId } = await params;

    // Validate event exists and is not deleted
    const event = await db.query.events.findFirst({
      where: and(eq(events.id, eventId), isNull(events.deletedAt)),
    });

    if (!event) {
      return NextResponse.json(
        { error: "Event not found" },
        { status: 404 }
      );
    }

    // Check if user has a role for this event
    const userRole = await db.query.eventRoles.findFirst({
      where: and(
        eq(eventRoles.eventId, eventId),
        eq(eventRoles.userId, user.id)
      ),
    });

    // Check payment status if applicable
    let paymentStatus: string | null = null;
    if (event.registrationFeeAmount && event.registrationFeeAmount > 0) {
      const payment = await db.query.payments.findFirst({
        where: and(
          eq(payments.eventId, eventId),
          eq(payments.userId, user.id)
        ),
      });
      paymentStatus = payment?.status ?? null;
    }

    return NextResponse.json({
      registered: !!userRole,
      role: userRole?.role ?? null,
      paymentStatus,
    });
  } catch (error) {
    if (error instanceof UnauthorizedError || error instanceof ForbiddenError) {
      return handleAuthError(error);
    }
    console.error("Registration status error:", error);
    return NextResponse.json({ error: "Failed to check registration status." }, { status: 500 });
  }
}
