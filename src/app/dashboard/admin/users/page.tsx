"use client";

import { useEffect, useState } from "react";
import Link from "next/link";

interface User {
  id: string;
  fullName: string;
  email: string;
  college: string | null;
  skills: string[] | null;
  isSuperAdmin: boolean;
  createdAt: string;
}

interface UsersResponse {
  users: User[];
  pagination: {
    page: number;
    limit: number;
    total: number;
    totalPages: number;
  };
}

export default function AdminUsersPage() {
  const [data, setData] = useState<UsersResponse | null>(null);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState("");
  const [page, setPage] = useState(1);
  const limit = 20;

  useEffect(() => {
    fetchUsers();
  }, [page, search]);

  async function fetchUsers() {
    setLoading(true);
    try {
      const params = new URLSearchParams({
        page: page.toString(),
        limit: limit.toString(),
      });
      if (search) params.set("search", search);

      const res = await fetch(`/api/admin/users?${params.toString()}`);
      if (res.ok) {
        const json = await res.json();
        setData(json);
      }
    } finally {
      setLoading(false);
    }
  }

  async function toggleSuperAdmin(userId: string, currentStatus: boolean) {
    const res = await fetch(`/api/admin/users/${userId}`, {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ isSuperAdmin: !currentStatus }),
    });
    if (res.ok) {
      fetchUsers();
    }
  }

  const totalPages = data ? data.pagination.totalPages : 0;

  return (
    <div>
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-white">User Management</h1>
          <p className="mt-1 text-gray-400">
            {data ? `${data.pagination.total} total users` : "Loading..."}
          </p>
        </div>
        <Link
          href="/dashboard/admin"
          className="rounded-lg border border-gray-700 px-4 py-2 text-sm font-medium text-gray-300 hover:bg-gray-800 transition-colors"
        >
          Back to Admin
        </Link>
      </div>

      {/* Search */}
      <div className="mt-6">
        <input
          type="text"
          placeholder="Search by name or email..."
          value={search}
          onChange={(e) => {
            setSearch(e.target.value);
            setPage(1);
          }}
          className="w-full max-w-md rounded-lg border border-gray-800 bg-gray-900 px-4 py-2 text-sm text-white placeholder-gray-500 focus:border-orange-500 focus:outline-none focus:ring-1 focus:ring-orange-500"
        />
      </div>

      {/* Table */}
      <div className="mt-6 overflow-x-auto rounded-lg border border-gray-800">
        <table className="w-full text-left text-sm">
          <thead className="border-b border-gray-800 bg-gray-900/80">
            <tr>
              <th className="px-4 py-3 font-medium text-gray-300">Name</th>
              <th className="px-4 py-3 font-medium text-gray-300">Email</th>
              <th className="px-4 py-3 font-medium text-gray-300">College</th>
              <th className="px-4 py-3 font-medium text-gray-300">Skills</th>
              <th className="px-4 py-3 font-medium text-gray-300">Status</th>
              <th className="px-4 py-3 font-medium text-gray-300">Joined</th>
              <th className="px-4 py-3 font-medium text-gray-300">Actions</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-gray-800">
            {loading ? (
              <tr>
                <td colSpan={7} className="px-4 py-8 text-center text-gray-500">
                  Loading...
                </td>
              </tr>
            ) : data?.users.length === 0 ? (
              <tr>
                <td colSpan={7} className="px-4 py-8 text-center text-gray-500">
                  No users found
                </td>
              </tr>
            ) : (
              data?.users.map((user) => (
                <tr key={user.id} className="hover:bg-gray-900/50">
                  <td className="px-4 py-3 font-medium text-white">
                    {user.fullName}
                  </td>
                  <td className="px-4 py-3 text-gray-400">{user.email}</td>
                  <td className="px-4 py-3 text-gray-400">
                    {user.college || "-"}
                  </td>
                  <td className="px-4 py-3 text-gray-400">
                    {user.skills?.slice(0, 3).join(", ") || "-"}
                  </td>
                  <td className="px-4 py-3">
                    {user.isSuperAdmin && (
                      <span className="rounded-full bg-orange-500/10 px-3 py-1 text-xs font-medium text-orange-400">
                        Super Admin
                      </span>
                    )}
                  </td>
                  <td className="px-4 py-3 text-gray-400">
                    {new Date(user.createdAt).toLocaleDateString()}
                  </td>
                  <td className="px-4 py-3">
                    <div className="flex items-center gap-2">
                      <Link
                        href={`/dashboard/admin/users/${user.id}/roles`}
                        className="rounded-lg bg-orange-500 px-3 py-1.5 text-xs font-semibold text-white hover:bg-orange-400 transition-colors"
                      >
                        Manage Roles
                      </Link>
                      <button
                        onClick={() =>
                          toggleSuperAdmin(user.id, user.isSuperAdmin)
                        }
                        className={`rounded-lg px-3 py-1.5 text-xs font-semibold text-white transition-colors ${
                          user.isSuperAdmin
                            ? "bg-red-600 hover:bg-red-500"
                            : "bg-gray-700 hover:bg-gray-600"
                        }`}
                      >
                        {user.isSuperAdmin ? "Revoke Admin" : "Make Admin"}
                      </button>
                    </div>
                  </td>
                </tr>
              ))
            )}
          </tbody>
        </table>
      </div>

      {/* Pagination */}
      {totalPages > 1 && (
        <div className="mt-4 flex items-center justify-between">
          <p className="text-sm text-gray-400">
            Page {page} of {totalPages}
          </p>
          <div className="flex gap-2">
            <button
              onClick={() => setPage((p) => Math.max(1, p - 1))}
              disabled={page === 1}
              className="rounded-lg border border-gray-700 px-4 py-2 text-sm font-medium text-gray-300 hover:bg-gray-800 disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
            >
              Previous
            </button>
            <button
              onClick={() => setPage((p) => Math.min(totalPages, p + 1))}
              disabled={page === totalPages}
              className="rounded-lg border border-gray-700 px-4 py-2 text-sm font-medium text-gray-300 hover:bg-gray-800 disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
            >
              Next
            </button>
          </div>
        </div>
      )}
    </div>
  );
}
