import { neon } from "@neondatabase/serverless";
import { drizzle } from "drizzle-orm/neon-http";
import { eq } from "drizzle-orm";
import { organizations } from "./schema/organizations";
import { events, problemStatements } from "./schema/events";

async function seed() {
  if (!process.env.DATABASE_URL) {
    throw new Error("DATABASE_URL environment variable is not set");
  }

  const sql = neon(process.env.DATABASE_URL);
  const db = drizzle(sql);

  console.log("Seeding database...");

  // 1. Insert organization
  const [org] = await db
    .insert(organizations)
    .values({
      name: "HackAegis",
      slug: "hackaegis",
    })
    .onConflictDoNothing({ target: organizations.slug })
    .returning();

  let organizationId: string;
  if (org) {
    console.log("Created organization:", org.id);
    organizationId = org.id;
  } else {
    // Organization already exists, fetch it
    const existingOrg = await db
      .select()
      .from(organizations)
      .where(eq(organizations.slug, "hackaegis"))
      .limit(1);
    if (!existingOrg.length) {
      throw new Error("Failed to find or create organization");
    }
    console.log("Organization already exists:", existingOrg[0].id);
    organizationId = existingOrg[0].id;
  }

  // 2. Insert event
  const [event] = await db
    .insert(events)
    .values({
      organizationId,
      title: "HackAegis September 2025",
      slug: "hackaegis-sep-2025",
      description:
        "A 24-hour hackathon bringing together students and professionals to solve real-world problems using cutting-edge technology. Build innovative solutions across AI/ML, Web Development, Cybersecurity, and IoT domains.",
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
      rules:
        "1. Teams must have 2-4 members.\n2. All code must be written during the hackathon.\n3. Use of open-source libraries is allowed.\n4. Pre-trained models are allowed but must be disclosed.\n5. Teams must submit before the deadline.",
      prizesDescription:
        "1st Place: Rs. 50,000 + Internship Opportunities\n2nd Place: Rs. 30,000\n3rd Place: Rs. 15,000\nBest UI/UX: Rs. 5,000\nBest Use of AI: Rs. 5,000",
    })
    .onConflictDoNothing({ target: events.slug })
    .returning();

  let finalEventId: string;
  if (event) {
    console.log("Created event:", event.id);
    finalEventId = event.id;
  } else {
    const existingEvent = await db
      .select()
      .from(events)
      .where(eq(events.slug, "hackaegis-sep-2025"))
      .limit(1);
    if (!existingEvent.length) {
      throw new Error("Failed to find or create event");
    }
    console.log("Event already exists:", existingEvent[0].id);
    finalEventId = existingEvent[0].id;
  }

  // 3. Insert problem statements
  const problems = [
    {
      eventId: finalEventId,
      title: "AI-Powered Campus Safety System",
      description:
        "Design and develop an AI-powered safety system for educational campuses that can detect anomalies, send real-time alerts, and provide actionable insights to security personnel. The system should leverage computer vision, natural language processing, or sensor data to improve campus security without compromising privacy.",
      category: "AI/ML",
      objectives:
        "1. Real-time anomaly detection from video feeds or sensor data\n2. Intelligent alert classification (critical, moderate, low)\n3. Dashboard for security team with actionable insights\n4. Privacy-preserving design (no facial recognition storage)",
      deliverables:
        "Working prototype with demo video, source code, architecture diagram, and presentation deck.",
      constraints:
        "Must work on edge devices (Raspberry Pi or equivalent). Must not store biometric data. Must process alerts within 5 seconds.",
      evaluationFocus: "Innovation, technical depth, real-world applicability, privacy considerations",
      sortOrder: 1,
    },
    {
      eventId: finalEventId,
      title: "Decentralized Skill Verification Platform",
      description:
        "Build a web platform that allows students to earn verifiable skill badges through peer assessments and automated challenges. The platform should provide tamper-proof credentials that employers can independently verify, reducing reliance on traditional certificates.",
      category: "Web Development",
      objectives:
        "1. Peer assessment workflow with anti-cheating measures\n2. Automated coding challenges with real-time evaluation\n3. Verifiable credential issuance (blockchain or cryptographic proof)\n4. Employer verification portal",
      deliverables:
        "Deployed web application, API documentation, demo with sample credentials, and architecture overview.",
      constraints:
        "Must support at least 3 skill domains. Verification must work without requiring employer registration. Must handle concurrent users gracefully.",
      evaluationFocus: "User experience, scalability, security of credential system, code quality",
      sortOrder: 2,
    },
    {
      eventId: finalEventId,
      title: "Smart Energy Monitoring IoT Dashboard",
      description:
        "Create an IoT-based energy monitoring solution for college hostels or labs that tracks electricity consumption in real-time, identifies wastage patterns, and gamifies energy saving among residents or departments.",
      category: "IoT & Hardware",
      objectives:
        "1. Real-time power consumption monitoring per zone/room\n2. Wastage detection and automated alerts\n3. Gamification leaderboard for energy-saving competitions\n4. Predictive analytics for consumption forecasting",
      deliverables:
        "Hardware prototype (or simulation), web/mobile dashboard, data pipeline architecture, and presentation.",
      constraints:
        "Must work with standard current sensors. Dashboard must update within 10 seconds. Must support at least 10 simultaneous monitoring points in simulation.",
      evaluationFocus: "Hardware-software integration, data accuracy, user engagement, sustainability impact",
      sortOrder: 3,
    },
    {
      eventId: finalEventId,
      title: "Automated Vulnerability Scanner for Student Projects",
      description:
        "Develop a tool that automatically scans student web projects for common security vulnerabilities (OWASP Top 10), generates beginner-friendly reports explaining each issue, and suggests specific fixes with code examples.",
      category: "Cybersecurity",
      objectives:
        "1. Automated scanning for at least 5 OWASP Top 10 vulnerabilities\n2. Beginner-friendly report generation with severity ratings\n3. Context-aware fix suggestions with code snippets\n4. CI/CD integration (GitHub Actions or similar)",
      deliverables:
        "CLI tool or web interface, sample scan reports, integration guide, and demo on a vulnerable test application.",
      constraints:
        "Must complete scan within 2 minutes for a typical student project. Must not perform destructive testing. Reports must be understandable by first-year CS students.",
      evaluationFocus: "Detection accuracy, report quality, ease of integration, educational value",
      sortOrder: 4,
    },
  ];

  for (const problem of problems) {
    await db
      .insert(problemStatements)
      .values(problem)
      .onConflictDoNothing();
  }

  console.log(`Inserted ${problems.length} problem statements`);
  console.log("\nSeed completed successfully!");
  console.log(`Event ID: ${finalEventId}`);
}

seed().catch((err) => {
  console.error("Seed failed:", err);
  process.exit(1);
});
