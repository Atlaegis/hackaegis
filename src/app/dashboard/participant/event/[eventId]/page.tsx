export const dynamic = "force-dynamic";

import { auth } from "@clerk/nextjs/server";
import { redirect } from "next/navigation";
import { db } from "@/lib/db";
import {
  events,
  eventRoles,
  problemStatements,
  announcements,
  users,
  teamMembers,
} from "@/lib/db/schema";
import { eq, and, desc, isNull } from "drizzle-orm";
import Link from "next/link";

export default async function EventDetailPage({
  params,
}: {
  params: Promise<{ eventId: string }>;
}) {
  const { userId: clerkId } = await auth();
  if (!clerkId) redirect("/sign-in");

  const { eventId } = await params;

  const user = await db.query.users.findFirst({
    where: eq(users.clerkId, clerkId),
  });

  if (!user) redirect("/onboarding");

  // Fetch event
  const event = await db.query.events.findFirst({
    where: and(eq(events.id, eventId), isNull(events.deletedAt)),
  });

  if (!event) {
    return (
      <div>
        <h1 className="text-2xl font-bold text-white">Event Not Found</h1>
        <p className="mt-4 text-gray-400">
          This event does not exist or has been removed.
        </p>
        <Link
          href="/dashboard/participant/event"
          className="mt-4 inline-block text-sm text-orange-400 hover:text-orange-300"
        >
          Back to Events
        </Link>
      </div>
    );
  }

  // Fetch problem statements
  const problems = await db.query.problemStatements.findMany({
    where: and(
      eq(problemStatements.eventId, eventId),
      isNull(problemStatements.deletedAt)
    ),
    orderBy: [problemStatements.sortOrder],
  });

  // Fetch announcements
  const eventAnnouncements = await db.query.announcements.findMany({
    where: and(
      eq(announcements.eventId, eventId),
      isNull(announcements.deletedAt)
    ),
    orderBy: [desc(announcements.createdAt)],
  });

  // Check registration status
  const userRole = await db.query.eventRoles.findFirst({
    where: and(
      eq(eventRoles.eventId, eventId),
      eq(eventRoles.userId, user.id),
      eq(eventRoles.role, "participant")
    ),
  });

  const isRegistered = !!userRole;

  // Get user's team in this specific event
  const allTeamMemberships = await db.query.teamMembers.findMany({
    where: eq(teamMembers.userId, user.id),
    with: { team: true },
  });
  const userTeamMembership = allTeamMemberships.find(m => m.team.eventId === eventId) || null;
  const userTeam = userTeamMembership ? userTeamMembership.team : null;

  return (
    <div>
      {/* Header */}
      <div className="flex items-start justify-between gap-4">
        <div>
          <Link
            href="/dashboard/participant/event"
            className="text-sm text-gray-500 hover:text-gray-300 transition-colors"
          >
            &larr; All Events
          </Link>
          <h1 className="mt-2 text-2xl font-bold text-white">{event.title}</h1>
          {event.description && (
            <p className="mt-2 text-gray-400">{event.description}</p>
          )}
        </div>
        <RegistrationBadge isRegistered={isRegistered} />
      </div>

      {/* Timeline */}
      <div className="mt-8 grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
        <InfoCard
          label="Registration Opens"
          value={formatDate(event.registrationStart)}
        />
        <InfoCard
          label="Registration Closes"
          value={formatDate(event.registrationEnd)}
        />
        <InfoCard label="Event Starts" value={formatDate(event.eventStart)} />
        <InfoCard label="Event Ends" value={formatDate(event.eventEnd)} />
      </div>

      {/* Team Info */}
      {isRegistered && (
        <section className="mt-8">
          <h2 className="text-xl font-bold text-white">Your Team</h2>
          {userTeam ? (
            <div className="mt-3 rounded-lg border border-gray-800 bg-gray-900/50 p-5">
              <div className="flex items-center justify-between">
                <h3 className="text-base font-semibold text-white">
                  {userTeam.name}
                </h3>
                <span className="rounded-full bg-orange-500/10 px-2.5 py-0.5 text-xs font-medium text-orange-400">
                  {userTeam.status}
                </span>
              </div>
              {userTeam.description && (
                <p className="mt-2 text-sm text-gray-400">
                  {userTeam.description}
                </p>
              )}
              <Link
                href="/dashboard/participant/team"
                className="mt-3 inline-block text-sm text-orange-400 hover:text-orange-300"
              >
                Manage Team &rarr;
              </Link>
            </div>
          ) : (
            <div className="mt-3 rounded-lg border border-gray-800 bg-gray-900/50 p-5">
              <p className="text-sm text-gray-400">
                You haven&apos;t joined a team for this event yet.
              </p>
              <Link
                href="/dashboard/participant/team"
                className="mt-2 inline-block text-sm text-orange-400 hover:text-orange-300"
              >
                Create or Join a Team &rarr;
              </Link>
            </div>
          )}
        </section>
      )}

      {/* Rules */}
      {event.rules && (
        <section className="mt-10">
          <h2 className="text-xl font-bold text-white">Rules</h2>
          <div className="mt-3 rounded-lg border border-gray-800 bg-gray-900/50 p-5 text-sm text-gray-300 whitespace-pre-wrap">
            {event.rules}
          </div>
        </section>
      )}

      {/* Problem Statements */}
      <section className="mt-10">
        <h2 className="text-xl font-bold text-white">Problem Statements</h2>
        {problems.length === 0 ? (
          <p className="mt-3 text-gray-400">
            Problem statements will be revealed soon.
          </p>
        ) : (
          <div className="mt-4 space-y-4">
            {problems.map((ps) => (
              <div
                key={ps.id}
                className="rounded-lg border border-gray-800 bg-gray-900/50 p-5"
              >
                <div className="flex items-start justify-between gap-4">
                  <h3 className="text-base font-semibold text-white">
                    {ps.title}
                  </h3>
                  {ps.category && (
                    <span className="shrink-0 rounded-full bg-orange-500/10 px-3 py-1 text-xs font-medium text-orange-400">
                      {ps.category}
                    </span>
                  )}
                </div>
                <p className="mt-2 text-sm text-gray-400">{ps.description}</p>
                {ps.deliverables && (
                  <div className="mt-3">
                    <span className="text-xs font-medium text-gray-500 uppercase">
                      Deliverables:
                    </span>
                    <p className="mt-1 text-sm text-gray-400">
                      {ps.deliverables}
                    </p>
                  </div>
                )}
              </div>
            ))}
          </div>
        )}
      </section>

      {/* Announcements */}
      <section className="mt-10">
        <h2 className="text-xl font-bold text-white">Announcements</h2>
        {eventAnnouncements.length === 0 ? (
          <p className="mt-3 text-gray-400">No announcements yet.</p>
        ) : (
          <div className="mt-4 space-y-3">
            {eventAnnouncements.map((a) => (
              <div
                key={a.id}
                className="rounded-lg border border-gray-800 bg-gray-900/50 p-4"
              >
                <div className="flex items-start justify-between gap-3">
                  <h3 className="text-sm font-semibold text-white">
                    {a.title}
                  </h3>
                  {a.isPinned && (
                    <span className="shrink-0 rounded bg-yellow-500/10 px-2 py-0.5 text-xs text-yellow-400">
                      Pinned
                    </span>
                  )}
                </div>
                <p className="mt-1 text-sm text-gray-400">{a.content}</p>
                <p className="mt-2 text-xs text-gray-600">
                  {formatDate(a.createdAt)}
                </p>
              </div>
            ))}
          </div>
        )}
      </section>
    </div>
  );
}

function RegistrationBadge({ isRegistered }: { isRegistered: boolean }) {
  if (isRegistered) {
    return (
      <span className="shrink-0 rounded-full bg-green-500/10 px-3 py-1.5 text-sm font-medium text-green-400">
        Registered
      </span>
    );
  }
  return (
    <span className="shrink-0 rounded-full bg-gray-500/10 px-3 py-1.5 text-sm font-medium text-gray-400">
      Not Registered
    </span>
  );
}

function InfoCard({ label, value }: { label: string; value: string }) {
  return (
    <div className="rounded-lg border border-gray-800 bg-gray-900/50 p-4">
      <p className="text-xs text-gray-500 uppercase">{label}</p>
      <p className="mt-1 text-sm font-semibold text-white">{value}</p>
    </div>
  );
}

function formatDate(date: Date | string): string {
  return new Date(date).toLocaleDateString("en-IN", {
    day: "numeric",
    month: "short",
    year: "numeric",
    hour: "2-digit",
    minute: "2-digit",
  });
}
