export const dynamic = "force-dynamic";

import { db } from "@/lib/db";
import { events, problemStatements, announcements } from "@/lib/db/schema";
import { eq, isNull, desc } from "drizzle-orm";

export default async function EventPage() {
  // Get the first active/published event (we only have one for MVP)
  const event = await db.query.events.findFirst({
    where: eq(events.status, "published"),
  });

  if (!event) {
    return (
      <div>
        <h1 className="text-2xl font-bold text-white">Event</h1>
        <p className="mt-4 text-gray-400">No active event at the moment. Stay tuned!</p>
      </div>
    );
  }

  const problems = await db.query.problemStatements.findMany({
    where: eq(problemStatements.eventId, event.id),
    orderBy: [problemStatements.sortOrder],
  });

  const eventAnnouncements = await db.query.announcements.findMany({
    where: eq(announcements.eventId, event.id),
    orderBy: [desc(announcements.createdAt)],
  });

  return (
    <div>
      <h1 className="text-2xl font-bold text-white">{event.title}</h1>
      <p className="mt-2 text-gray-400">{event.description}</p>

      {/* Timeline */}
      <div className="mt-8 grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
        <InfoCard label="Registration Opens" value={formatDate(event.registrationStart)} />
        <InfoCard label="Registration Closes" value={formatDate(event.registrationEnd)} />
        <InfoCard label="Event Starts" value={formatDate(event.eventStart)} />
        <InfoCard label="Event Ends" value={formatDate(event.eventEnd)} />
      </div>

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
          <p className="mt-3 text-gray-400">Problem statements will be revealed soon.</p>
        ) : (
          <div className="mt-4 space-y-4">
            {problems.map((ps) => (
              <div key={ps.id} className="rounded-lg border border-gray-800 bg-gray-900/50 p-5">
                <div className="flex items-start justify-between gap-4">
                  <h3 className="text-base font-semibold text-white">{ps.title}</h3>
                  {ps.category && (
                    <span className="shrink-0 rounded-full bg-orange-500/10 px-3 py-1 text-xs font-medium text-orange-400">
                      {ps.category}
                    </span>
                  )}
                </div>
                <p className="mt-2 text-sm text-gray-400">{ps.description}</p>
                {ps.deliverables && (
                  <div className="mt-3">
                    <span className="text-xs font-medium text-gray-500 uppercase">Deliverables:</span>
                    <p className="mt-1 text-sm text-gray-400">{ps.deliverables}</p>
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
              <div key={a.id} className="rounded-lg border border-gray-800 bg-gray-900/50 p-4">
                <h3 className="text-sm font-semibold text-white">{a.title}</h3>
                <p className="mt-1 text-sm text-gray-400">{a.content}</p>
                <p className="mt-2 text-xs text-gray-600">{formatDate(a.createdAt)}</p>
              </div>
            ))}
          </div>
        )}
      </section>
    </div>
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
