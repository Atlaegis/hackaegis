"use client";

import { useState, useEffect } from "react";
import Link from "next/link";

interface Event {
  id: string;
  title: string;
  slug: string;
  description: string | null;
  bannerUrl: string | null;
  registrationStart: string;
  registrationEnd: string;
  eventStart: string;
  eventEnd: string;
  registrationFeeAmount: number | null;
  registrationFeeCurrency: string | null;
  maxParticipants: number | null;
  status: string;
  participantCount?: number;
}

interface UserEvent {
  role: string;
  assignedAt: string;
  event: Event;
}

export default function EventBrowsePage() {
  const [myEvents, setMyEvents] = useState<UserEvent[]>([]);
  const [allEvents, setAllEvents] = useState<Event[]>([]);
  const [loading, setLoading] = useState(true);
  const [registering, setRegistering] = useState<string | null>(null);
  const [message, setMessage] = useState<{ type: "success" | "error" | "info"; text: string } | null>(null);

  useEffect(() => {
    fetchData();
  }, []);

  async function fetchData() {
    try {
      const [myRes, allRes] = await Promise.all([
        fetch("/api/users/me/events"),
        fetch("/api/events"),
      ]);

      if (myRes.ok) {
        const myData = await myRes.json();
        setMyEvents(myData);
      }

      if (allRes.ok) {
        const allData = await allRes.json();
        setAllEvents(allData);
      }
    } catch {
      setMessage({ type: "error", text: "Failed to load events." });
    } finally {
      setLoading(false);
    }
  }

  async function handleRegister(eventId: string) {
    setRegistering(eventId);
    setMessage(null);

    try {
      const res = await fetch(`/api/events/${eventId}/register`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
      });

      const data = await res.json();

      if (data.requiresPayment) {
        setMessage({ type: "info", text: "Payment integration coming soon. Registration requires payment." });
        return;
      }

      if (!res.ok) {
        setMessage({ type: "error", text: data.error || "Registration failed." });
        return;
      }

      setMessage({ type: "success", text: "Successfully registered! Refreshing..." });
      // Refresh data
      setTimeout(() => {
        setMessage(null);
        fetchData();
      }, 1500);
    } catch {
      setMessage({ type: "error", text: "Network error. Please try again." });
    } finally {
      setRegistering(null);
    }
  }

  const myEventIds = new Set(myEvents.map((e) => e.event.id));
  const availableEvents = allEvents.filter((e) => !myEventIds.has(e.id));

  if (loading) {
    return (
      <div className="flex items-center gap-3 text-gray-400">
        <div className="h-5 w-5 animate-spin rounded-full border-2 border-gray-600 border-t-orange-500" />
        Loading events...
      </div>
    );
  }

  return (
    <div>
      <h1 className="text-2xl font-bold text-white">Events</h1>
      <p className="mt-1 text-gray-400">
        Browse and register for hackathon events
      </p>

      {message && (
        <div
          className={`mt-4 rounded-lg border p-3 text-sm ${
            message.type === "success"
              ? "border-green-700 bg-green-900/50 text-green-300"
              : message.type === "error"
              ? "border-red-700 bg-red-900/50 text-red-300"
              : "border-blue-700 bg-blue-900/50 text-blue-300"
          }`}
        >
          {message.text}
        </div>
      )}

      {/* My Events Section */}
      {myEvents.length > 0 && (
        <section className="mt-8">
          <h2 className="text-lg font-semibold text-white">My Events</h2>
          <p className="mt-1 text-sm text-gray-500">Events you are registered for</p>
          <div className="mt-4 grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
            {myEvents.map((ue) => (
              <div
                key={ue.event.id}
                className="rounded-xl border border-gray-800 bg-gray-900/50 p-6"
              >
                <div className="flex items-start justify-between gap-2">
                  <h3 className="text-base font-semibold text-white">
                    {ue.event.title}
                  </h3>
                  <span className="shrink-0 rounded-full bg-green-500/10 px-2.5 py-0.5 text-xs font-medium text-green-400">
                    Registered
                  </span>
                </div>
                {ue.event.description && (
                  <p className="mt-2 text-sm text-gray-400 line-clamp-2">
                    {ue.event.description}
                  </p>
                )}
                <div className="mt-3 flex items-center gap-3 text-xs text-gray-500">
                  <span>{formatDate(ue.event.eventStart)}</span>
                  <span>-</span>
                  <span>{formatDate(ue.event.eventEnd)}</span>
                </div>
                <Link
                  href={`/dashboard/participant/event/${ue.event.id}`}
                  className="mt-4 inline-block rounded-lg border border-gray-700 px-4 py-2 text-sm font-medium text-gray-300 hover:border-orange-500/50 hover:text-white transition-colors"
                >
                  View Details
                </Link>
              </div>
            ))}
          </div>
        </section>
      )}

      {/* Available Events Section */}
      <section className="mt-10">
        <h2 className="text-lg font-semibold text-white">
          {myEvents.length > 0 ? "Browse More Events" : "Available Events"}
        </h2>
        <p className="mt-1 text-sm text-gray-500">
          {availableEvents.length > 0
            ? "Register for an event to participate"
            : "No additional events available right now."}
        </p>

        {availableEvents.length > 0 && (
          <div className="mt-4 grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
            {availableEvents.map((event) => (
              <div
                key={event.id}
                className="rounded-xl border border-gray-800 bg-gray-900/50 p-6"
              >
                <div className="flex items-start justify-between gap-2">
                  <h3 className="text-base font-semibold text-white">
                    {event.title}
                  </h3>
                  <EventStatusBadge event={event} />
                </div>
                {event.description && (
                  <p className="mt-2 text-sm text-gray-400 line-clamp-2">
                    {event.description}
                  </p>
                )}
                <div className="mt-3 flex items-center gap-3 text-xs text-gray-500">
                  <span>{formatDate(event.eventStart)}</span>
                  <span>-</span>
                  <span>{formatDate(event.eventEnd)}</span>
                </div>
                {event.maxParticipants && (
                  <p className="mt-2 text-xs text-gray-500">
                    {event.participantCount ?? 0}/{event.maxParticipants} registered
                  </p>
                )}
                <div className="mt-4 flex items-center gap-3">
                  <button
                    onClick={() => handleRegister(event.id)}
                    disabled={registering === event.id || !isRegistrationOpen(event)}
                    className="rounded-lg bg-orange-500 px-4 py-2 text-sm font-semibold text-white hover:bg-orange-400 transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
                  >
                    {registering === event.id
                      ? "Registering..."
                      : `Participate${event.registrationFeeAmount ? ` — ₹${event.registrationFeeAmount}` : ""}`}
                  </button>
                  <Link
                    href={`/dashboard/participant/event/${event.id}`}
                    className="text-sm text-gray-400 hover:text-white transition-colors"
                  >
                    Details
                  </Link>
                </div>
              </div>
            ))}
          </div>
        )}

        {availableEvents.length === 0 && myEvents.length === 0 && (
          <div className="mt-6 rounded-xl border border-gray-800 bg-gray-900/50 p-8 text-center">
            <p className="text-gray-400">
              No events are currently available. Check back later!
            </p>
          </div>
        )}
      </section>
    </div>
  );
}

function EventStatusBadge({ event }: { event: Event }) {
  const now = new Date();
  const regEnd = new Date(event.registrationEnd);
  const regStart = new Date(event.registrationStart);

  if (now < regStart) {
    return (
      <span className="shrink-0 rounded-full bg-gray-500/10 px-2.5 py-0.5 text-xs font-medium text-gray-400">
        Upcoming
      </span>
    );
  }

  if (now > regEnd) {
    return (
      <span className="shrink-0 rounded-full bg-gray-500/10 px-2.5 py-0.5 text-xs font-medium text-gray-400">
        Closed
      </span>
    );
  }

  return (
    <span className="shrink-0 rounded-full bg-blue-500/10 px-2.5 py-0.5 text-xs font-medium text-blue-400">
      Open
    </span>
  );
}

function isRegistrationOpen(event: Event): boolean {
  const now = new Date();
  const regStart = new Date(event.registrationStart);
  const regEnd = new Date(event.registrationEnd);
  return now >= regStart && now <= regEnd;
}

function formatDate(date: string): string {
  return new Date(date).toLocaleDateString("en-IN", {
    day: "numeric",
    month: "short",
    year: "numeric",
  });
}
