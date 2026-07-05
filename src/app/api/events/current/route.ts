import { NextResponse } from "next/server";
import { db } from "@/lib/db";
import { events } from "@/lib/db/schema";
import { eq, isNull, and } from "drizzle-orm";

export async function GET() {
  try {
    const publishedEvent = await db.query.events.findFirst({
      where: and(eq(events.status, "published"), isNull(events.deletedAt)),
    });

    if (!publishedEvent) {
      return NextResponse.json(
        { error: "No active event found" },
        { status: 404 }
      );
    }

    return NextResponse.json(publishedEvent);
  } catch (error) {
    console.error("Failed to fetch current event:", error);
    return NextResponse.json(
      { error: "Internal server error" },
      { status: 500 }
    );
  }
}
