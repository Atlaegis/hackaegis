"use client";

import { useState, useEffect } from "react";
import { useRouter } from "next/navigation";

interface Team {
  id: string;
  name: string;
  description: string | null;
  inviteCode: string;
  status: string;
  members: { id: string; role: string; user: { fullName: string; email: string } }[];
}

interface CurrentEvent {
  id: string;
  title: string;
  slug: string;
}

export default function TeamPage() {
  const router = useRouter();
  const [team, setTeam] = useState<Team | null>(null);
  const [currentEvent, setCurrentEvent] = useState<CurrentEvent | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [mode, setMode] = useState<"view" | "create" | "join">("view");

  useEffect(() => {
    fetchInitialData();
  }, []);

  async function fetchInitialData() {
    try {
      // Fetch the current published event
      const eventRes = await fetch("/api/events/current");
      if (!eventRes.ok) {
        setError("No active event found. Please contact an organizer.");
        setLoading(false);
        return;
      }
      const event = await eventRes.json();
      setCurrentEvent(event);

      // Fetch user info
      const userRes = await fetch("/api/users/me");
      if (!userRes.ok) {
        setLoading(false);
        return;
      }
      const userData = await userRes.json();
      const currentUserId = userData.id || userData.user?.id;

      // Fetch teams and find the user's team
      if (currentUserId) {
        const teamsRes = await fetch(`/api/events/${event.id}/teams`);
        if (teamsRes.ok) {
          const teamsData = await teamsRes.json();
          const teams = Array.isArray(teamsData) ? teamsData : teamsData.teams || [];
          // eslint-disable-next-line @typescript-eslint/no-explicit-any
          const userTeam = teams.find((t: any) =>
            t.members?.some((m: any) => m.userId === currentUserId || m.id === currentUserId)
          );
          if (userTeam) {
            setTeam(userTeam);
          }
        }
      }

      setLoading(false);
    } catch {
      setLoading(false);
    }
  }

  async function handleCreateTeam(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault();
    setError("");

    if (!currentEvent) {
      setError("No active event found. Cannot create team.");
      return;
    }

    const formData = new FormData(e.currentTarget);
    const name = formData.get("name") as string;
    const description = formData.get("description") as string;

    const res = await fetch(`/api/events/${currentEvent.id}/teams`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ name, description }),
    });

    if (!res.ok) {
      const body = await res.json();
      setError(body.error || "Failed to create team");
      return;
    }

    const newTeam = await res.json();
    setTeam(newTeam);
    setMode("view");
    router.refresh();
  }

  async function handleJoinTeam(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault();
    setError("");

    if (!currentEvent) {
      setError("No active event found. Cannot join team.");
      return;
    }

    const formData = new FormData(e.currentTarget);
    const inviteCode = formData.get("inviteCode") as string;

    const res = await fetch(`/api/events/${currentEvent.id}/teams/join-by-code`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ inviteCode }),
    });

    if (!res.ok) {
      const body = await res.json();
      setError(body.error || "Failed to join team");
      return;
    }

    router.refresh();
  }

  if (loading) {
    return <p className="text-gray-400">Loading...</p>;
  }

  if (team) {
    return (
      <div>
        <h1 className="text-2xl font-bold text-white">Your Team</h1>
        <div className="mt-6 rounded-lg border border-gray-800 bg-gray-900/50 p-6">
          <h2 className="text-xl font-semibold text-white">{team.name}</h2>
          {team.description && <p className="mt-2 text-gray-400">{team.description}</p>}
          <div className="mt-4">
            <p className="text-sm text-gray-500">
              Invite Code: <span className="font-mono text-orange-400">{team.inviteCode}</span>
            </p>
            <p className="text-xs text-gray-600 mt-1">Share this code with teammates to let them join.</p>
          </div>
          <div className="mt-6">
            <h3 className="text-sm font-medium text-gray-300">Members</h3>
            <ul className="mt-2 space-y-2">
              {team.members?.map((m) => (
                <li key={m.id} className="flex items-center gap-3 text-sm text-gray-400">
                  <span className="text-white">{m.user.fullName}</span>
                  <span className="rounded bg-gray-800 px-2 py-0.5 text-xs text-gray-500">{m.role}</span>
                </li>
              ))}
            </ul>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div>
      <h1 className="text-2xl font-bold text-white">Team</h1>
      <p className="mt-2 text-gray-400">Create a new team or join an existing one.</p>

      {error && (
        <div className="mt-4 rounded-lg bg-red-900/50 border border-red-700 p-3 text-sm text-red-300">
          {error}
        </div>
      )}

      <div className="mt-6 flex gap-3">
        <button
          onClick={() => setMode("create")}
          className={`rounded-lg px-4 py-2 text-sm font-medium transition-colors ${mode === "create" ? "bg-orange-500 text-white" : "border border-gray-700 text-gray-300 hover:border-gray-600"}`}
        >
          Create Team
        </button>
        <button
          onClick={() => setMode("join")}
          className={`rounded-lg px-4 py-2 text-sm font-medium transition-colors ${mode === "join" ? "bg-orange-500 text-white" : "border border-gray-700 text-gray-300 hover:border-gray-600"}`}
        >
          Join Team
        </button>
      </div>

      {mode === "create" && (
        <form onSubmit={handleCreateTeam} className="mt-6 space-y-4 max-w-md">
          <div>
            <label className="block text-sm font-medium text-gray-300">Team Name *</label>
            <input
              name="name"
              required
              minLength={3}
              className="mt-1 block w-full rounded-lg border border-gray-700 bg-gray-900 px-3 py-2 text-sm text-white placeholder-gray-500 focus:border-orange-500 focus:outline-none"
              placeholder="e.g. Code Crusaders"
            />
          </div>
          <div>
            <label className="block text-sm font-medium text-gray-300">Description</label>
            <textarea
              name="description"
              rows={3}
              className="mt-1 block w-full rounded-lg border border-gray-700 bg-gray-900 px-3 py-2 text-sm text-white placeholder-gray-500 focus:border-orange-500 focus:outline-none"
              placeholder="What's your team about?"
            />
          </div>
          <button
            type="submit"
            className="rounded-lg bg-orange-500 px-5 py-2 text-sm font-semibold text-white hover:bg-orange-400 transition-colors"
          >
            Create Team
          </button>
        </form>
      )}

      {mode === "join" && (
        <form onSubmit={handleJoinTeam} className="mt-6 space-y-4 max-w-md">
          <div>
            <label className="block text-sm font-medium text-gray-300">Invite Code *</label>
            <input
              name="inviteCode"
              required
              minLength={6}
              className="mt-1 block w-full rounded-lg border border-gray-700 bg-gray-900 px-3 py-2 text-sm text-white placeholder-gray-500 focus:border-orange-500 focus:outline-none font-mono"
              placeholder="Enter invite code"
            />
          </div>
          <button
            type="submit"
            className="rounded-lg bg-orange-500 px-5 py-2 text-sm font-semibold text-white hover:bg-orange-400 transition-colors"
          >
            Join Team
          </button>
        </form>
      )}
    </div>
  );
}
