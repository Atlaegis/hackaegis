export const dynamic = "force-dynamic";

import { auth } from "@clerk/nextjs/server";
import { redirect } from "next/navigation";
import { db } from "@/lib/db";
import { users, teamMembers, submissions, evaluations, evaluationScores, eventRoles } from "@/lib/db/schema";
import Link from "next/link";
import { eq, and } from "drizzle-orm";
import { EVALUATION_CRITERIA } from "@/lib/constants/rubric";

export default async function TransparencyPage() {
  const { userId: clerkId } = await auth();
  if (!clerkId) redirect("/sign-in");

  const user = await db.query.users.findFirst({
    where: eq(users.clerkId, clerkId),
  });

  if (!user) redirect("/sign-in");

  // Check if user is registered as a participant for any event
  const participantRole = await db.query.eventRoles.findFirst({
    where: and(eq(eventRoles.userId, user.id), eq(eventRoles.role, "participant")),
  });

  if (!participantRole) {
    return (
      <div className="flex min-h-[40vh] items-center justify-center">
        <div className="text-center">
          <h2 className="text-xl font-bold text-white">Registration Required</h2>
          <p className="mt-2 text-gray-400">Register for an event to view your evaluation status.</p>
          <Link href="/dashboard/participant/event" className="mt-4 inline-block rounded-lg bg-orange-500 px-5 py-2 text-sm font-semibold text-white hover:bg-orange-400">
            Browse Events
          </Link>
        </div>
      </div>
    );
  }

  // Find user's team membership
  const membership = await db.query.teamMembers.findFirst({
    where: eq(teamMembers.userId, user.id),
    with: { team: true },
  });

  if (!membership) {
    return (
      <div>
        <h1 className="text-2xl font-bold text-white">Transparency Dashboard</h1>
        <p className="mt-4 text-gray-400">Join a team and submit a project to see your evaluation status.</p>
      </div>
    );
  }

  // Find submission for this team
  const submission = await db.query.submissions.findFirst({
    where: eq(submissions.teamId, membership.team.id),
  });

  if (!submission) {
    return (
      <div>
        <h1 className="text-2xl font-bold text-white">Transparency Dashboard</h1>
        <div className="mt-6 rounded-lg border border-gray-800 bg-gray-900/50 p-6">
          <p className="text-gray-400">No submission found. Submit your project first to track evaluation status.</p>
        </div>
      </div>
    );
  }

  // Get evaluations for this submission
  const evals = await db.query.evaluations.findMany({
    where: and(
      eq(evaluations.submissionId, submission.id),
      eq(evaluations.status, "completed")
    ),
    with: { scores: true },
  });

  return (
    <div>
      <h1 className="text-2xl font-bold text-white">Transparency Dashboard</h1>
      <p className="mt-2 text-gray-400">
        See exactly how your project was evaluated — scores, feedback, and reasons.
      </p>

      {/* Status */}
      <div className="mt-6 rounded-lg border border-gray-800 bg-gray-900/50 p-6">
        <div className="flex items-center gap-3">
          <span className="text-sm text-gray-500">Status:</span>
          <StatusBadge evaluations={evals} />
        </div>
        <h2 className="mt-3 text-lg font-semibold text-white">{submission.projectTitle}</h2>
        <p className="mt-1 text-sm text-gray-400">
          Submitted: {submission.submittedAt ? new Date(submission.submittedAt).toLocaleString("en-IN") : "Draft"}
        </p>
      </div>

      {/* Evaluations */}
      {evals.length === 0 ? (
        <div className="mt-6 rounded-lg border border-dashed border-gray-700 p-8 text-center">
          <p className="text-gray-400">Your submission is under review. Evaluation results will appear here once judges complete their review.</p>
        </div>
      ) : (
        <div className="mt-6 space-y-6">
          {evals.map((eval_, index) => (
            <div key={eval_.id} className="rounded-lg border border-gray-800 bg-gray-900/50 p-6">
              <div className="flex items-center justify-between">
                <h3 className="text-base font-semibold text-white">Evaluation #{index + 1}</h3>
                <VerdictBadge verdict={eval_.verdict} />
              </div>

              {/* Score Breakdown */}
              <div className="mt-4">
                <h4 className="text-sm font-medium text-gray-300">Score Breakdown</h4>
                <div className="mt-3 space-y-3">
                  {EVALUATION_CRITERIA.map((criteria) => {
                    const score = eval_.scores.find((s) => s.criteriaKey === criteria.key);
                    const scoreValue = score ? Number(score.score) : 0;
                    const percentage = (scoreValue / criteria.maxScore) * 100;

                    return (
                      <div key={criteria.key}>
                        <div className="flex justify-between text-sm">
                          <span className="text-gray-400">{criteria.name} ({(criteria.weight * 100).toFixed(0)}%)</span>
                          <span className="text-white font-medium">{scoreValue}/{criteria.maxScore}</span>
                        </div>
                        <div className="mt-1 h-2 rounded-full bg-gray-800">
                          <div
                            className="h-2 rounded-full bg-orange-500"
                            style={{ width: `${percentage}%` }}
                          />
                        </div>
                      </div>
                    );
                  })}
                </div>
                <div className="mt-4 flex justify-between border-t border-gray-800 pt-3">
                  <span className="text-sm font-medium text-gray-300">Total Weighted Score</span>
                  <span className="text-lg font-bold text-orange-400">
                    {Number(eval_.totalWeightedScore).toFixed(1)}/10
                  </span>
                </div>
              </div>

              {/* Feedback */}
              <div className="mt-6 space-y-4">
                <FeedbackSection title="Strengths" content={eval_.strengths} color="green" />
                <FeedbackSection title="Weaknesses" content={eval_.weaknesses} color="red" />
                {eval_.recommendations && (
                  <FeedbackSection title="Recommendations" content={eval_.recommendations} color="blue" />
                )}
                {eval_.eliminationReason && (
                  <div className="rounded-lg border border-red-800 bg-red-900/20 p-4">
                    <h5 className="text-sm font-semibold text-red-400">Elimination Reason</h5>
                    <p className="mt-1 text-sm text-red-300">{eval_.eliminationReason}</p>
                  </div>
                )}
              </div>

              <p className="mt-4 text-xs text-gray-600">
                Evaluated: {eval_.completedAt ? new Date(eval_.completedAt).toLocaleString("en-IN") : "N/A"}
              </p>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}

function StatusBadge({ evaluations }: { evaluations: { verdict: string | null }[] }) {
  if (evaluations.length === 0) {
    return <span className="rounded-full bg-yellow-500/10 px-3 py-1 text-xs font-medium text-yellow-400">Under Review</span>;
  }
  const hasQualified = evaluations.some((e) => e.verdict === "qualified");
  if (hasQualified) {
    return <span className="rounded-full bg-green-500/10 px-3 py-1 text-xs font-medium text-green-400">Qualified</span>;
  }
  return <span className="rounded-full bg-red-500/10 px-3 py-1 text-xs font-medium text-red-400">Eliminated</span>;
}

function VerdictBadge({ verdict }: { verdict: string | null }) {
  if (verdict === "qualified") {
    return <span className="rounded-full bg-green-500/10 px-3 py-1 text-xs font-medium text-green-400">Qualified</span>;
  }
  if (verdict === "eliminated") {
    return <span className="rounded-full bg-red-500/10 px-3 py-1 text-xs font-medium text-red-400">Eliminated</span>;
  }
  return <span className="rounded-full bg-gray-500/10 px-3 py-1 text-xs font-medium text-gray-400">Pending</span>;
}

function FeedbackSection({ title, content, color }: { title: string; content: string | null; color: "green" | "red" | "blue" }) {
  if (!content) return null;
  const styles = {
    green: { container: "border-green-800 bg-green-900/20", title: "text-green-400", text: "text-green-300" },
    red: { container: "border-red-800 bg-red-900/20", title: "text-red-400", text: "text-red-300" },
    blue: { container: "border-blue-800 bg-blue-900/20", title: "text-blue-400", text: "text-blue-300" },
  };
  const s = styles[color];
  return (
    <div className={`rounded-lg border p-4 ${s.container}`}>
      <h5 className={`text-sm font-semibold ${s.title}`}>{title}</h5>
      <p className={`mt-1 text-sm ${s.text}`}>{content}</p>
    </div>
  );
}
