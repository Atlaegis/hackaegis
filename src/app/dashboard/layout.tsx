export const dynamic = "force-dynamic";

import { UserButton } from "@clerk/nextjs";
import { auth } from "@clerk/nextjs/server";
import Link from "next/link";
import { db } from "@/lib/db";
import { users, eventRoles } from "@/lib/db/schema";
import { eq, and } from "drizzle-orm";

export default async function DashboardLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  const { userId: clerkId } = await auth();
  let hasAdminAccess = false;

  if (clerkId) {
    const user = await db.query.users.findFirst({
      where: eq(users.clerkId, clerkId),
      columns: { id: true, isSuperAdmin: true },
    });

    if (user?.isSuperAdmin) {
      hasAdminAccess = true;
    } else if (user) {
      const adminRole = await db.query.eventRoles.findFirst({
        where: and(
          eq(eventRoles.userId, user.id),
          eq(eventRoles.role, "admin")
        ),
      });
      hasAdminAccess = !!adminRole;
    }
  }

  return (
    <div className="min-h-screen bg-gray-950">
      {/* Top Nav */}
      <header className="sticky top-0 z-50 border-b border-gray-800 bg-black/80 backdrop-blur-sm">
        <div className="mx-auto flex h-14 max-w-7xl items-center justify-between px-4">
          <Link href="/" className="text-lg font-bold text-white">
            Hack<span className="text-orange-400">Aegis</span>
          </Link>
          <nav className="flex items-center gap-1">
            <Link
              href="/dashboard/participant"
              className="rounded-md px-3 py-1.5 text-sm font-medium text-gray-300 hover:bg-gray-800 hover:text-white transition-colors"
            >
              Dashboard
            </Link>
            <Link
              href="/dashboard/participant/event"
              className="rounded-md px-3 py-1.5 text-sm font-medium text-gray-300 hover:bg-gray-800 hover:text-white transition-colors"
            >
              Event
            </Link>
            <Link
              href="/dashboard/participant/team"
              className="rounded-md px-3 py-1.5 text-sm font-medium text-gray-300 hover:bg-gray-800 hover:text-white transition-colors"
            >
              Team
            </Link>
            <Link
              href="/dashboard/participant/submission"
              className="rounded-md px-3 py-1.5 text-sm font-medium text-gray-300 hover:bg-gray-800 hover:text-white transition-colors"
            >
              Submission
            </Link>
            <Link
              href="/dashboard/participant/transparency"
              className="rounded-md px-3 py-1.5 text-sm font-medium text-gray-300 hover:bg-gray-800 hover:text-white transition-colors"
            >
              Transparency
            </Link>
            {hasAdminAccess && (
              <Link
                href="/dashboard/admin"
                className="rounded-md px-3 py-1.5 text-sm font-medium text-orange-400 hover:bg-gray-800 hover:text-orange-300 transition-colors"
              >
                Admin
              </Link>
            )}
          </nav>
          <UserButton />
        </div>
      </header>

      {/* Content */}
      <div className="mx-auto max-w-7xl px-4 py-8">{children}</div>
    </div>
  );
}
