export const dynamic = "force-dynamic";

import { auth } from "@clerk/nextjs/server";
import { redirect } from "next/navigation";
import { db } from "@/lib/db";
import { users, eventRoles, events } from "@/lib/db/schema";
import { eq, and, isNull } from "drizzle-orm";
import Link from "next/link";

export default async function ParticipantDashboard() {
  const { userId: clerkId } = await auth();
  if (!clerkId) redirect("/sign-in");

  const user = await db.query.users.findFirst({
    where: eq(users.clerkId, clerkId),
  });

  if (!user) redirect("/onboarding");
  if (!user.onboardingCompleted) redirect("/onboarding");

  // Fetch user's registered events
  const userEvents = await db
    .select({
      id: events.id,
      title: events.title,
      slug: events.slug,
      description: events.description,
      eventStart: events.eventStart,
      eventEnd: events.eventEnd,
      status: events.status,
      registeredAt: eventRoles.assignedAt,
    })
    .from(eventRoles)
    .innerJoin(events, eq(events.id, eventRoles.eventId))
    .where(
      and(
        eq(eventRoles.userId, user.id),
        eq(eventRoles.role, "participant"),
        isNull(events.deletedAt)
      )
    )
    .orderBy(events.eventStart);

  const hasEvents = userEvents.length > 0;

  return (
    <div>
      <h1 className="text-2xl font-bold text-white">
        Welcome back, {user.fullName.split(" ")[0]}
      </h1>
      <p className="mt-1 text-gray-400">Your participant dashboard</p>

      {hasEvents ? (
        <>
          {/* Registered Events */}
          <section className="mt-8">
            <h2 className="text-lg font-semibold text-white">Your Events</h2>
            <div className="mt-4 grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
              {userEvents.map((event) => (
                <div
                  key={event.id}
                  className="rounded-xl border border-gray-800 bg-gray-900/50 p-6"
                >
                  <h3 className="text-base font-semibold text-white">
                    {event.title}
                  </h3>
                  {event.description && (
                    <p className="mt-2 text-sm text-gray-400 line-clamp-2">
                      {event.description}
                    </p>
                  )}
                  <div className="mt-3 text-xs text-gray-500">
                    {formatDate(event.eventStart)} - {formatDate(event.eventEnd)}
                  </div>
                  <div className="mt-4 flex flex-wrap gap-2">
                    <QuickLink
                      href={`/dashboard/participant/event/${event.id}`}
                      label="Event"
                    />
                    <QuickLink
                      href="/dashboard/participant/team"
                      label="Team"
                    />
                    <QuickLink
                      href="/dashboard/participant/submission"
                      label="Submission"
                    />
                    <QuickLink
                      href="/dashboard/participant/transparency"
                      label="Transparency"
                    />
                  </div>
                </div>
              ))}
            </div>
          </section>

          {/* Browse more events link */}
          <div className="mt-6">
            <Link
              href="/dashboard/participant/event"
              className="text-sm text-orange-400 hover:text-orange-300 transition-colors"
            >
              Browse more events &rarr;
            </Link>
          </div>
        </>
      ) : (
        <>
          {/* No events CTA */}
          <div className="mt-8 rounded-xl border border-gray-800 bg-gray-900/50 p-8 text-center">
            <h2 className="text-lg font-semibold text-white">
              No events yet
            </h2>
            <p className="mt-2 text-sm text-gray-400">
              Browse available events to participate in a hackathon
            </p>
            <Link
              href="/dashboard/participant/event"
              className="mt-4 inline-block rounded-lg bg-orange-500 px-5 py-2.5 text-sm font-semibold text-white hover:bg-orange-400 transition-colors"
            >
              Browse Events
            </Link>
          </div>

          {/* Static cards as fallback navigation */}
          <div className="mt-8 grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
            <DashboardCard
              title="Event"
              description="View event details, problem statements, and announcements"
              href="/dashboard/participant/event"
            />
            <DashboardCard
              title="Team"
              description="Create or join a team, manage members"
              href="/dashboard/participant/team"
            />
            <DashboardCard
              title="Submission"
              description="Submit your project links and deliverables"
              href="/dashboard/participant/submission"
            />
            <DashboardCard
              title="Transparency"
              description="View your scores, feedback, and evaluation status"
              href="/dashboard/participant/transparency"
            />
          </div>
        </>
      )}
    </div>
  );
}

function QuickLink({ href, label }: { href: string; label: string }) {
  return (
    <Link
      href={href}
      className="rounded-md border border-gray-700 px-3 py-1.5 text-xs font-medium text-gray-300 hover:border-orange-500/50 hover:text-white transition-colors"
    >
      {label}
    </Link>
  );
}

function DashboardCard({
  title,
  description,
  href,
}: {
  title: string;
  description: string;
  href: string;
}) {
  return (
    <Link
      href={href}
      className="block rounded-xl border border-gray-800 bg-gray-900/50 p-6 hover:border-orange-500/50 hover:bg-gray-900 transition-colors"
    >
      <h3 className="text-lg font-semibold text-white">{title}</h3>
      <p className="mt-2 text-sm text-gray-400">{description}</p>
    </Link>
  );
}

function formatDate(date: Date | string): string {
  return new Date(date).toLocaleDateString("en-IN", {
    day: "numeric",
    month: "short",
    year: "numeric",
  });
}
