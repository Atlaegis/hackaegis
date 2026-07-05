import { headers } from "next/headers";
import { NextResponse } from "next/server";
import { Webhook } from "svix";
import { db } from "@/lib/db";
import { users } from "@/lib/db/schema";
import { eq } from "drizzle-orm";

interface ClerkUserData {
  id: string;
  email_addresses: { email_address: string }[];
  first_name: string | null;
  last_name: string | null;
  image_url: string | null;
}

export async function POST(request: Request) {
  if (!process.env.CLERK_WEBHOOK_SECRET) {
    return NextResponse.json({ error: "Webhook not configured" }, { status: 500 });
  }

  const headerPayload = await headers();
  const svixId = headerPayload.get("svix-id");
  const svixTimestamp = headerPayload.get("svix-timestamp");
  const svixSignature = headerPayload.get("svix-signature");

  if (!svixId || !svixTimestamp || !svixSignature) {
    return NextResponse.json({ error: "Missing svix headers" }, { status: 400 });
  }

  const payload = await request.json();
  const body = JSON.stringify(payload);

  const wh = new Webhook(process.env.CLERK_WEBHOOK_SECRET);
  let event: { type: string; data: ClerkUserData };

  try {
    event = wh.verify(body, {
      "svix-id": svixId,
      "svix-timestamp": svixTimestamp,
      "svix-signature": svixSignature,
    }) as { type: string; data: ClerkUserData };
  } catch {
    return NextResponse.json({ error: "Invalid signature" }, { status: 400 });
  }

  const { type, data } = event;

  if (type === "user.created") {
    const email = data.email_addresses[0]?.email_address;
    if (!email) return NextResponse.json({ error: "No email" }, { status: 400 });

    const fullName = [data.first_name, data.last_name].filter(Boolean).join(" ") || "User";

    await db.insert(users).values({
      clerkId: data.id,
      email,
      fullName,
      avatarUrl: data.image_url,
    }).onConflictDoNothing();
  }

  if (type === "user.updated") {
    const email = data.email_addresses[0]?.email_address;
    const fullName = [data.first_name, data.last_name].filter(Boolean).join(" ");

    await db
      .update(users)
      .set({
        email: email || undefined,
        fullName: fullName || undefined,
        avatarUrl: data.image_url || undefined,
        updatedAt: new Date(),
      })
      .where(eq(users.clerkId, data.id));
  }

  if (type === "user.deleted") {
    await db
      .update(users)
      .set({ deletedAt: new Date() })
      .where(eq(users.clerkId, data.id));
  }

  return NextResponse.json({ success: true });
}
