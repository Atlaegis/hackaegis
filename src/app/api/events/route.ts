import { NextResponse } from "next/server";
import { db } from "@/lib/db";
import { events, eventRoles } from "@/lib/db/schema";
import { eq, and, isNull, sql } from "drizzle-orm";

export async function GET() {
  try {
    const publishedEvents = await db
      .select({
        id: events.id,
        title: events.title,
        slug: events.slug,
        description: events.description,
        bannerUrl: events.bannerUrl,
        registrationStart: events.registrationStart,
        registrationEnd: events.registrationEnd,
        eventStart: events.eventStart,
        eventEnd: events.eventEnd,
        registrationFeeAmount: events.registrationFeeAmount,
        registrationFeeCurrency: events.registrationFeeCurrency,
        maxParticipants: events.maxParticipants,
        status: events.status,
        participantCount: sql<number>`count(${eventRoles.id})::int`.as("participant_count"),
      })
      .from(events)
      .leftJoin(
        eventRoles,
        and(
          eq(eventRoles.eventId, events.id),
          eq(eventRoles.role, "participant")
        )
      )
      .where(and(eq(events.status, "published"), isNull(events.deletedAt)))
      .groupBy(events.id)
      .orderBy(events.eventStart);

    return NextResponse.json(publishedEvents);
  } catch (error) {
    console.error("Failed to fetch events:", error);
    return NextResponse.json(
      { error: "Internal server error" },
      { status: 500 }
    );
  }
}
