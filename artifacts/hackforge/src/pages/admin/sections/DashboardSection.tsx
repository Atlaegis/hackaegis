import { useEffect, useRef } from "react";
import { motion } from "framer-motion";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import {
  Users,
  UserCheck,
  Clock,
  Activity,
  Gavel,
  FileText,
  Layers,
  BarChart3,
  Radio,
  AlertCircle,
  ArrowRight,
  CheckCircle2,
  ClipboardList,
  Calendar,
  Eye,
} from "lucide-react";
import { useAdminFetch } from "../lib/api";
import type { AdminStats, AdminLog, Registration, ActivityItem } from "../lib/types";
import StatCard from "../components/shared/StatCard";
import ActivityFeed from "../components/shared/ActivityFeed";
import TimelineStep, { type TimelineStepData } from "../components/shared/TimelineStep";

interface DashboardSectionProps {
  onNavigate: (section: string) => void;
}

interface DashboardData extends AdminStats {
  streamActive: boolean;
  unusedCodes: number;
}

const REFRESH_INTERVAL = 30_000;

export default function DashboardSection({ onNavigate }: DashboardSectionProps) {
  const { data: dashboard, refetch: refetchDashboard } = useAdminFetch<DashboardData>("/api/admin/dashboard");
  const { data: logs, refetch: refetchLogs } = useAdminFetch<AdminLog[]>("/api/admin/logs");
  const { data: registrations, refetch: refetchRegistrations } = useAdminFetch<Registration[]>("/api/admin/registrations");
  const intervalRef = useRef<ReturnType<typeof setInterval> | null>(null);

  useEffect(() => {
    intervalRef.current = setInterval(() => {
      refetchDashboard();
      refetchLogs();
      refetchRegistrations();
    }, REFRESH_INTERVAL);
    return () => {
      if (intervalRef.current) clearInterval(intervalRef.current);
    };
  }, [refetchDashboard, refetchLogs, refetchRegistrations]);

  const pendingRegistrations = registrations?.filter((r) => !r.participantCode) ?? [];
  const totalRegistrations = registrations?.length ?? 0;

  const activityItems: ActivityItem[] = (logs ?? []).slice(0, 10).map((log) => ({
    id: String(log.id),
    type: mapLogToType(log.action),
    title: log.action,
    description: log.details ?? undefined,
    timestamp: log.createdAt,
    badge: mapLogToBadge(log.action),
  }));

  const timelineSteps = buildTimeline(dashboard?.activeHackathon?.phase ?? dashboard?.currentPhase ?? "registration");

  const missingSubmissions = dashboard
    ? Math.max(0, (dashboard.activeTeams ?? dashboard.totalTeams) - (dashboard.totalSubmissions ?? 0))
    : 0;

  return (
    <div className="space-y-8">
      {/* Platform Overview */}
      <section>
        <h2 className="text-lg font-semibold mb-4">Platform Overview</h2>
        <motion.div
          className="grid grid-cols-2 md:grid-cols-4 gap-3"
          initial={{ opacity: 0, y: 12 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.3 }}
        >
          <StatCard label="Total Registrations" value={totalRegistrations} icon={Users} color="text-chart-1" />
          <StatCard label="Approved Teams" value={dashboard?.totalTeams ?? 0} icon={UserCheck} color="text-chart-2" />
          <StatCard label="Pending Approvals" value={pendingRegistrations.length} icon={Clock} color="text-orange-500" />
          <StatCard label="Active Participants" value={dashboard?.activeParticipants ?? 0} icon={Activity} color="text-chart-3" />
          <StatCard label="Judges" value={dashboard?.totalJudges ?? 0} icon={Gavel} color="text-chart-4" />
          <StatCard label="Total Submissions" value={dashboard?.totalSubmissions ?? 0} icon={FileText} color="text-chart-5" />
          <StatCard label="Current Phase" value={capitalize(dashboard?.currentPhase ?? "---")} icon={Layers} color="text-primary" />
          <StatCard label="Active Polls" value={dashboard?.activePollQuestion ? 1 : 0} icon={BarChart3} color="text-violet-500" />
        </motion.div>
      </section>

      {/* Quick Overview Cards */}
      <section>
        <h2 className="text-lg font-semibold mb-4">Quick Overview</h2>
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-3">
          <Card>
            <CardContent className="pt-4 pb-3">
              <div className="flex items-center gap-2 mb-1">
                <Calendar className="w-4 h-4 text-primary" />
                <span className="text-xs text-muted-foreground">Current Hackathon</span>
              </div>
              <p className="font-medium text-sm truncate">
                {dashboard?.activeHackathon?.name ?? "No active hackathon"}
              </p>
              {dashboard?.activeHackathon && (
                <Badge variant="outline" className="mt-1 text-[10px]">
                  {capitalize(dashboard.activeHackathon.phase)}
                </Badge>
              )}
            </CardContent>
          </Card>

          <Card>
            <CardContent className="pt-4 pb-3">
              <div className="flex items-center gap-2 mb-1">
                <Radio className="w-4 h-4 text-primary" />
                <span className="text-xs text-muted-foreground">Stream Status</span>
              </div>
              <div className="flex items-center gap-2">
                <div className={`w-2 h-2 rounded-full ${dashboard?.streamActive ? "bg-green-500 animate-pulse" : "bg-muted-foreground"}`} />
                <p className="font-medium text-sm">{dashboard?.streamActive ? "Live" : "Offline"}</p>
              </div>
            </CardContent>
          </Card>

          <Card>
            <CardContent className="pt-4 pb-3">
              <div className="flex items-center gap-2 mb-1">
                <ClipboardList className="w-4 h-4 text-orange-500" />
                <span className="text-xs text-muted-foreground">Pending Registrations</span>
              </div>
              <p className="font-medium text-sm">{pendingRegistrations.length} awaiting review</p>
            </CardContent>
          </Card>

          <Card>
            <CardContent className="pt-4 pb-3">
              <div className="flex items-center gap-2 mb-1">
                <CheckCircle2 className="w-4 h-4 text-green-500" />
                <span className="text-xs text-muted-foreground">System Status</span>
              </div>
              <p className="font-medium text-sm text-green-600">Operational</p>
            </CardContent>
          </Card>
        </div>
      </section>

      {/* Recent Activities */}
      <section>
        <h2 className="text-lg font-semibold mb-4">Recent Activities</h2>
        <Card>
          <CardContent className="pt-4">
            <ActivityFeed items={activityItems} maxItems={10} />
          </CardContent>
        </Card>
      </section>

      {/* Pending Actions */}
      {(pendingRegistrations.length > 0 || missingSubmissions > 0 || dashboard?.activePollQuestion) && (
        <section>
          <h2 className="text-lg font-semibold mb-4">Pending Actions</h2>
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-3">
            {pendingRegistrations.length > 0 && (
              <Card className="border-orange-500/30">
                <CardHeader className="pb-2 pt-4 px-4">
                  <CardTitle className="text-sm flex items-center gap-2">
                    <AlertCircle className="w-4 h-4 text-orange-500" />
                    Registration Approvals
                  </CardTitle>
                </CardHeader>
                <CardContent className="px-4 pb-4">
                  <p className="text-xs text-muted-foreground mb-3">
                    {pendingRegistrations.length} registration(s) awaiting approval
                  </p>
                  <Button size="sm" variant="outline" onClick={() => onNavigate("registrations")}>
                    Go to Registrations <ArrowRight className="w-3 h-3 ml-1" />
                  </Button>
                </CardContent>
              </Card>
            )}

            {missingSubmissions > 0 && (
              <Card className="border-blue-500/30">
                <CardHeader className="pb-2 pt-4 px-4">
                  <CardTitle className="text-sm flex items-center gap-2">
                    <FileText className="w-4 h-4 text-blue-500" />
                    Missing Submissions
                  </CardTitle>
                </CardHeader>
                <CardContent className="px-4 pb-4">
                  <p className="text-xs text-muted-foreground mb-3">
                    {missingSubmissions} team(s) haven't submitted yet
                  </p>
                  <Button size="sm" variant="outline" onClick={() => onNavigate("teams")}>
                    Go to Teams <ArrowRight className="w-3 h-3 ml-1" />
                  </Button>
                </CardContent>
              </Card>
            )}

            {dashboard?.activePollQuestion && (
              <Card className="border-violet-500/30">
                <CardHeader className="pb-2 pt-4 px-4">
                  <CardTitle className="text-sm flex items-center gap-2">
                    <BarChart3 className="w-4 h-4 text-violet-500" />
                    Active Poll
                  </CardTitle>
                </CardHeader>
                <CardContent className="px-4 pb-4">
                  <p className="text-xs text-muted-foreground mb-3 line-clamp-2">
                    {dashboard.activePollQuestion}
                  </p>
                  <Button size="sm" variant="outline" onClick={() => onNavigate("polls")}>
                    Go to Polls <ArrowRight className="w-3 h-3 ml-1" />
                  </Button>
                </CardContent>
              </Card>
            )}
          </div>
        </section>
      )}

      {/* Quick Actions */}
      <section>
        <h2 className="text-lg font-semibold mb-4">Quick Actions</h2>
        <div className="flex flex-wrap gap-3">
          <Button variant="outline" onClick={() => onNavigate("registrations")}>
            <ClipboardList className="w-4 h-4 mr-2" />
            Approve Registrations
          </Button>
          <Button variant="outline" onClick={() => onNavigate("events")}>
            <Calendar className="w-4 h-4 mr-2" />
            Manage Events
          </Button>
          <Button variant="outline" onClick={() => onNavigate("scores")}>
            <Eye className="w-4 h-4 mr-2" />
            View Scores
          </Button>
        </div>
      </section>

      {/* Event Timeline */}
      <section>
        <h2 className="text-lg font-semibold mb-4">Event Timeline</h2>
        <Card>
          <CardContent className="pt-4">
            <TimelineStep steps={timelineSteps} />
          </CardContent>
        </Card>
      </section>
    </div>
  );
}

function capitalize(str: string): string {
  return str.charAt(0).toUpperCase() + str.slice(1);
}

function mapLogToType(action: string): ActivityItem["type"] {
  const lower = action.toLowerCase();
  if (lower.includes("registr")) return "registration";
  if (lower.includes("team")) return "team";
  if (lower.includes("score") || lower.includes("judge")) return "score";
  if (lower.includes("poll") || lower.includes("vote")) return "poll";
  if (lower.includes("hackathon") || lower.includes("event") || lower.includes("phase")) return "event";
  return "system";
}

function mapLogToBadge(action: string): string | undefined {
  const lower = action.toLowerCase();
  if (lower.includes("create") || lower.includes("approve")) return "create";
  if (lower.includes("delete") || lower.includes("reject")) return "delete";
  if (lower.includes("update") || lower.includes("edit")) return "update";
  return undefined;
}

const PHASE_ORDER = ["registration", "submission", "elimination", "finale", "completed"];

function buildTimeline(currentPhase: string): TimelineStepData[] {
  const currentIndex = PHASE_ORDER.indexOf(currentPhase.toLowerCase());
  return PHASE_ORDER.map((phase, i) => ({
    title: capitalize(phase),
    description: i === currentIndex ? "Currently active" : undefined,
    status: i < currentIndex ? "completed" : i === currentIndex ? "current" : "upcoming",
  }));
}
