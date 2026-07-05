"use client";

import { useEffect, useState } from "react";
import { useParams } from "next/navigation";
import Link from "next/link";

interface EventRole {
  id: string;
  eventId: string;
  eventTitle: string;
  role: string;
  assignedAt: string;
}

interface UserInfo {
  id: string;
  fullName: string;
  email: string;
}

interface Event {
  id: string;
  title: string;
}

export default function UserRolesPage() {
  const params = useParams();
  const userId = params.userId as string;

  const [userInfo, setUserInfo] = useState<UserInfo | null>(null);
  const [roles, setRoles] = useState<EventRole[]>([]);
  const [events, setEvents] = useState<Event[]>([]);
  const [loading, setLoading] = useState(true);

  const [selectedEvent, setSelectedEvent] = useState("");
  const [selectedRole, setSelectedRole] = useState("participant");
  const [submitting, setSubmitting] = useState(false);

  useEffect(() => {
    fetchData();
  }, [userId]);

  async function fetchData() {
    setLoading(true);
    try {
      const [rolesRes, eventsRes] = await Promise.all([
        fetch(`/api/admin/users/${userId}/roles`),
        fetch("/api/events/current"),
      ]);

      if (rolesRes.ok) {
        const json = await rolesRes.json();
        setUserInfo(json.user);
        setRoles(json.roles);
      }

      if (eventsRes.ok) {
        const json = await eventsRes.json();
        setEvents(json.events || []);
      }
    } finally {
      setLoading(false);
    }
  }

  async function addRole(e: React.FormEvent) {
    e.preventDefault();
    if (!selectedEvent || !selectedRole) return;

    setSubmitting(true);
    try {
      const res = await fetch(`/api/admin/users/${userId}/roles`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          eventId: selectedEvent,
          role: selectedRole,
        }),
      });

      if (res.ok) {
        setSelectedEvent("");
        setSelectedRole("participant");
        fetchData();
      }
    } finally {
      setSubmitting(false);
    }
  }

  async function removeRole(roleId: string) {
    const res = await fetch(`/api/admin/users/${userId}/roles`, {
      method: "DELETE",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ roleId }),
    });

    if (res.ok) {
      fetchData();
    }
  }

  if (loading) {
    return (
      <div className="flex min-h-[50vh] items-center justify-center">
        <p className="text-gray-400">Loading...</p>
      </div>
    );
  }

  return (
    <div>
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-white">Manage Roles</h1>
          <p className="mt-1 text-gray-400">
            Assign event roles for this user
          </p>
        </div>
        <Link
          href="/dashboard/admin/users"
          className="rounded-lg border border-gray-700 px-4 py-2 text-sm font-medium text-gray-300 hover:bg-gray-800 transition-colors"
        >
          Back to Users
        </Link>
      </div>

      {/* User Info */}
      {userInfo && (
        <div className="mt-6 rounded-lg border border-gray-800 bg-gray-900/50 p-6">
          <h2 className="text-lg font-semibold text-white">
            {userInfo.fullName}
          </h2>
          <p className="mt-1 text-sm text-gray-400">{userInfo.email}</p>
        </div>
      )}

      {/* Current Roles */}
      <div className="mt-6">
        <h3 className="text-lg font-semibold text-white">Current Roles</h3>
        {roles.length === 0 ? (
          <p className="mt-3 text-sm text-gray-500">
            No event roles assigned yet.
          </p>
        ) : (
          <div className="mt-3 overflow-x-auto rounded-lg border border-gray-800">
            <table className="w-full text-left text-sm">
              <thead className="border-b border-gray-800 bg-gray-900/80">
                <tr>
                  <th className="px-4 py-3 font-medium text-gray-300">
                    Event
                  </th>
                  <th className="px-4 py-3 font-medium text-gray-300">Role</th>
                  <th className="px-4 py-3 font-medium text-gray-300">
                    Assigned
                  </th>
                  <th className="px-4 py-3 font-medium text-gray-300">
                    Actions
                  </th>
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-800">
                {roles.map((role) => (
                  <tr key={role.id} className="hover:bg-gray-900/50">
                    <td className="px-4 py-3 text-white">
                      {role.eventTitle}
                    </td>
                    <td className="px-4 py-3">
                      <span className="rounded-full bg-orange-500/10 px-3 py-1 text-xs font-medium text-orange-400">
                        {role.role}
                      </span>
                    </td>
                    <td className="px-4 py-3 text-gray-400">
                      {new Date(role.assignedAt).toLocaleDateString()}
                    </td>
                    <td className="px-4 py-3">
                      <button
                        onClick={() => removeRole(role.id)}
                        className="rounded-lg bg-red-600 px-3 py-1.5 text-xs font-semibold text-white hover:bg-red-500 transition-colors"
                      >
                        Remove
                      </button>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>

      {/* Add Role Form */}
      <div className="mt-8">
        <h3 className="text-lg font-semibold text-white">Add New Role</h3>
        <form
          onSubmit={addRole}
          className="mt-4 rounded-lg border border-gray-800 bg-gray-900/50 p-6"
        >
          <div className="grid gap-4 sm:grid-cols-3">
            <div>
              <label className="block text-sm font-medium text-gray-300">
                Event
              </label>
              <select
                value={selectedEvent}
                onChange={(e) => setSelectedEvent(e.target.value)}
                className="mt-1 w-full rounded-lg border border-gray-800 bg-gray-900 px-3 py-2 text-sm text-white focus:border-orange-500 focus:outline-none focus:ring-1 focus:ring-orange-500"
              >
                <option value="">Select an event</option>
                {events.map((event) => (
                  <option key={event.id} value={event.id}>
                    {event.title}
                  </option>
                ))}
              </select>
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-300">
                Role
              </label>
              <select
                value={selectedRole}
                onChange={(e) => setSelectedRole(e.target.value)}
                className="mt-1 w-full rounded-lg border border-gray-800 bg-gray-900 px-3 py-2 text-sm text-white focus:border-orange-500 focus:outline-none focus:ring-1 focus:ring-orange-500"
              >
                <option value="participant">Participant</option>
                <option value="organizer">Organizer</option>
                <option value="judge">Judge</option>
                <option value="admin">Admin</option>
              </select>
            </div>
            <div className="flex items-end">
              <button
                type="submit"
                disabled={!selectedEvent || submitting}
                className="rounded-lg bg-orange-500 px-4 py-2 text-sm font-semibold text-white hover:bg-orange-400 disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
              >
                {submitting ? "Adding..." : "Add Role"}
              </button>
            </div>
          </div>
        </form>
      </div>
    </div>
  );
}
