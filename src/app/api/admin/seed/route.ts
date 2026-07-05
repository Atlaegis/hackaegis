import { NextResponse } from "next/server";
import { db } from "@/lib/db";
import { organizations, events, problemStatements } from "@/lib/db/schema";
import { eq } from "drizzle-orm";
import { requireSuperAdmin, handleAuthError } from "@/lib/auth/rbac";

export async function POST() {
  try {
    await requireSuperAdmin();

    // 1. Insert organization
    const [org] = await db
      .insert(organizations)
      .values({ name: "HackAegis", slug: "hackaegis" })
      .onConflictDoNothing({ target: organizations.slug })
      .returning();

    let orgId: string;
    if (org) {
      orgId = org.id;
    } else {
      const existing = await db.query.organizations.findFirst({
        where: eq(organizations.slug, "hackaegis"),
      });
      orgId = existing!.id;
    }

    // 2. Insert event
    const [event] = await db
      .insert(events)
      .values({
        organizationId: orgId,
        title: "HackAegis September 2025",
        slug: "hackaegis-sep-2025",
        description: "A 24-hour online hackathon. Build innovative solutions across AI/ML, Web Dev, Cybersecurity, and IoT.",
        registrationStart: new Date("2025-08-01T00:00:00+05:30"),
        registrationEnd: new Date("2025-09-10T23:59:59+05:30"),
        eventStart: new Date("2025-09-18T09:00:00+05:30"),
        eventEnd: new Date("2025-09-18T21:00:00+05:30"),
        submissionDeadline: new Date("2025-09-17T23:59:59+05:30"),
        registrationFeeAmount: 9900,
        registrationFeeCurrency: "INR",
        minTeamSize: 2,
        maxTeamSize: 4,
        teamLockDeadline: new Date("2025-09-15T23:59:59+05:30"),
        status: "published",
        rules: "1. Teams must have 2-4 members.\n2. All code must be written during the hackathon.\n3. Open-source libraries allowed.\n4. Submit before deadline.",
        prizesDescription: "1st: ₹50,000\n2nd: ₹30,000\n3rd: ₹15,000\nBest UI/UX: ₹5,000\nBest AI: ₹5,000",
      })
      .onConflictDoNothing({ target: events.slug })
      .returning();

    let eventId: string;
    if (event) {
      eventId = event.id;
    } else {
      const existing = await db.query.events.findFirst({
        where: eq(events.slug, "hackaegis-sep-2025"),
      });
      eventId = existing!.id;
    }

    // 3. Insert problem statements
    const problems = [
      { title: "AI-Powered Campus Safety System", description: "Design an AI safety system for campuses with anomaly detection, real-time alerts, and privacy-preserving design.", category: "AI/ML", sortOrder: 1 },
      { title: "Decentralized Skill Verification Platform", description: "Build a web platform for verifiable skill badges through peer assessments and automated challenges.", category: "Web Development", sortOrder: 2 },
      { title: "Smart Energy Monitoring IoT Dashboard", description: "Create an IoT energy monitoring solution with real-time tracking, wastage detection, and gamification.", category: "IoT & Hardware", sortOrder: 3 },
      { title: "Automated Vulnerability Scanner", description: "Develop a tool that scans student projects for OWASP Top 10 vulnerabilities with beginner-friendly reports.", category: "Cybersecurity", sortOrder: 4 },
    ];

    for (const p of problems) {
      await db
        .insert(problemStatements)
        .values({ eventId, ...p })
        .onConflictDoNothing();
    }

    return NextResponse.json({ success: true, orgId, eventId, problemStatements: problems.length });
  } catch (error) {
    return handleAuthError(error);
  }
}
