import { auth } from "@clerk/nextjs/server";
import { redirect } from "next/navigation";
import { db } from "@/lib/db";
import { users } from "@/lib/db/schema";
import { eq } from "drizzle-orm";
import Link from "next/link";

export default async function ParticipantDashboard() {
  const { userId: clerkId } = await auth();
  if (!clerkId) redirect("/sign-in");

  const user = await db.query.users.findFirst({
    where: eq(users.clerkId, clerkId),
  });

  if (!user) redirect("/sign-in");
  if (!user.onboardingCompleted) redirect("/onboarding");

  return (
    <div>
      <h1 className="text-2xl font-bold text-white">
        Welcome back, {user.fullName.split(" ")[0]}
      </h1>
      <p className="mt-1 text-gray-400">Your participant dashboard</p>

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
    </div>
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
