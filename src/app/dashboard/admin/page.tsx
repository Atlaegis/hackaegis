export const dynamic = "force-dynamic";

import { getCurrentUser } from "@/lib/auth/rbac";
import { db } from "@/lib/db";
import { users, teams, submissions } from "@/lib/db/schema";
import { count } from "drizzle-orm";
import Link from "next/link";

export default async function AdminDashboard() {
  const user = await getCurrentUser();

  if (!user.isSuperAdmin) {
    return (
      <div className="flex min-h-[50vh] items-center justify-center">
        <div className="rounded-lg border border-gray-800 bg-gray-900/50 p-8 text-center">
          <h1 className="text-xl font-bold text-white">Access Denied</h1>
          <p className="mt-2 text-gray-400">
            You do not have permission to access the admin dashboard.
          </p>
        </div>
      </div>
    );
  }

  const [usersCount] = await db.select({ value: count() }).from(users);
  const [teamsCount] = await db.select({ value: count() }).from(teams);
  const [submissionsCount] = await db.select({ value: count() }).from(submissions);

  return (
    <div>
      <h1 className="text-2xl font-bold text-white">Admin Dashboard</h1>
      <p className="mt-1 text-gray-400">Manage users, roles, and platform settings</p>

      {/* Stats */}
      <div className="mt-8 grid gap-4 sm:grid-cols-3">
        <div className="rounded-lg border border-gray-800 bg-gray-900/50 p-6">
          <p className="text-sm font-medium text-gray-400">Total Users</p>
          <p className="mt-2 text-3xl font-bold text-white">{usersCount.value}</p>
        </div>
        <div className="rounded-lg border border-gray-800 bg-gray-900/50 p-6">
          <p className="text-sm font-medium text-gray-400">Total Teams</p>
          <p className="mt-2 text-3xl font-bold text-white">{teamsCount.value}</p>
        </div>
        <div className="rounded-lg border border-gray-800 bg-gray-900/50 p-6">
          <p className="text-sm font-medium text-gray-400">Total Submissions</p>
          <p className="mt-2 text-3xl font-bold text-white">{submissionsCount.value}</p>
        </div>
      </div>

      {/* Navigation */}
      <div className="mt-8 grid gap-4 sm:grid-cols-2">
        <Link
          href="/dashboard/admin/users"
          className="block rounded-lg border border-gray-800 bg-gray-900/50 p-6 hover:border-orange-500/50 hover:bg-gray-900 transition-colors"
        >
          <h3 className="text-lg font-semibold text-white">Users</h3>
          <p className="mt-2 text-sm text-gray-400">
            View all users, manage roles, and toggle super admin access
          </p>
        </Link>
        <Link
          href="/dashboard/admin/users"
          className="block rounded-lg border border-gray-800 bg-gray-900/50 p-6 hover:border-orange-500/50 hover:bg-gray-900 transition-colors"
        >
          <h3 className="text-lg font-semibold text-white">Roles</h3>
          <p className="mt-2 text-sm text-gray-400">
            Assign event-specific roles to users (organizer, judge, admin)
          </p>
        </Link>
      </div>
    </div>
  );
}
