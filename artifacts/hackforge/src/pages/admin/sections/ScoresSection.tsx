import { useState, useMemo, useCallback } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import {
  Search,
  X,
  ChevronDown,
  ChevronUp,
  Trophy,
  BarChart3,
  TrendingUp,
  Users,
  CheckCircle2,
  Download,
  Eye,
  EyeOff,
  Globe,
  Github,
  ExternalLink,
  FileText,
  MessageSquare,
  RefreshCw,
  Award,
  Target,
  Star,
} from "lucide-react";
import { useAdminFetch, adminApi } from "../lib/api";
import StatCard from "../components/shared/StatCard";
import ConfirmDialog from "../components/shared/ConfirmDialog";

// ─── Types ──────────────────────────────────────────────────────────────────

interface JudgeBreakdown {
  judgeId: number;
  judgeName: string;
  score: number;
  innovation: number | null;
  execution: number | null;
  presentation: number | null;
  feedback: string | null;
  updatedAt: string;
}

interface TeamScore {
  teamId: number;
  teamName: string;
  projectTitle: string;
  hackathonId: number;
  averageScore: number | null;
  averageInnovation: number | null;
  averageExecution: number | null;
  averagePresentation: number | null;
  judgesScored: number;
  totalJudges: number;
  hasSubmission: boolean;
  githubUrl: string | null;
  demoUrl: string | null;
  slidesUrl: string | null;
  rank: number;
  judgeBreakdown: JudgeBreakdown[];
}

interface ScoresResponse {
  judgeCount: number;
  teams: TeamScore[];
}

// ─── Scoring Criteria ────────────────────────────────────────────────────────

interface ScoreCriterion {
  key: string;
  label: string;
  maxScore: number;
  color: string;
}

const SCORING_CRITERIA: ScoreCriterion[] = [
  { key: "innovation", label: "Innovation & Problem Solving", maxScore: 20, color: "bg-violet-500" },
  { key: "technical", label: "Technical Excellence", maxScore: 25, color: "bg-blue-500" },
  { key: "impact", label: "Real-World Impact", maxScore: 20, color: "bg-emerald-500" },
  { key: "uiux", label: "UI/UX Experience", maxScore: 10, color: "bg-amber-500" },
  { key: "presentation", label: "Presentation & Communication", maxScore: 10, color: "bg-rose-500" },
  { key: "completion", label: "Completion & Functionality", maxScore: 10, color: "bg-cyan-500" },
  { key: "teamwork", label: "Teamwork & Management", maxScore: 5, color: "bg-orange-500" },
];

const TOTAL_MAX_SCORE = 100;

// ─── Utility Functions ──────────────────────────────────────────────────────

function formatDate(dateStr: string | undefined | null): string {
  if (!dateStr) return "N/A";
  return new Date(dateStr).toLocaleDateString("en-IN", {
    day: "2-digit",
    month: "short",
    year: "numeric",
    hour: "2-digit",
    minute: "2-digit",
  });
}

function getRankBadge(rank: number): { label: string; className: string } | null {
  switch (rank) {
    case 1:
      return { label: "#1", className: "bg-amber-500/20 text-amber-600 border-amber-500/40" };
    case 2:
      return { label: "#2", className: "bg-slate-300/20 text-slate-500 border-slate-400/40" };
    case 3:
      return { label: "#3", className: "bg-orange-600/20 text-orange-600 border-orange-600/40" };
    default:
      return null;
  }
}

function getScoreColor(score: number, max: number): string {
  const pct = max > 0 ? score / max : 0;
  if (pct >= 0.75) return "text-emerald-600";
  if (pct >= 0.5) return "text-amber-600";
  if (pct >= 0.25) return "text-orange-600";
  return "text-red-600";
}

// ─── Main Component ─────────────────────────────────────────────────────────

export default function ScoresSection() {
  const { data: scoresData, loading, refetch } = useAdminFetch<ScoresResponse>("/api/admin/scores");

  const [searchQuery, setSearchQuery] = useState("");
  const [sortBy, setSortBy] = useState<"rank" | "name" | "score" | "progress">("rank");
  const [expandedTeamId, setExpandedTeamId] = useState<number | null>(null);

  const [publishConfirm, setPublishConfirm] = useState(false);
  const [judgeVisConfirm, setJudgeVisConfirm] = useState(false);
  const [publishing, setPublishing] = useState(false);

  const teams = scoresData?.teams ?? [];
  const judgeCount = scoresData?.judgeCount ?? 0;

  // ─── Analytics ──────────────────────────────────────────────────────────────

  const analytics = useMemo(() => {
    const scoredTeams = teams.filter((t) => t.judgesScored > 0 && t.averageScore != null);
    const totalTeamsScored = scoredTeams.length;
    const scores = scoredTeams.map((t) => t.averageScore as number);
    const avgScore = scores.length > 0 ? scores.reduce((a, b) => a + b, 0) / scores.length : 0;
    const highestScore = scores.length > 0 ? Math.max(...scores) : 0;
    const completionRate =
      teams.length > 0
        ? Math.round((teams.filter((t) => t.judgesScored >= t.totalJudges && t.totalJudges > 0).length / teams.length) * 100)
        : 0;

    // Score distribution
    const distribution = { "0-25": 0, "25-50": 0, "50-75": 0, "75-100": 0 };
    scoredTeams.forEach((t) => {
      const s = t.averageScore as number;
      if (s < 25) distribution["0-25"]++;
      else if (s < 50) distribution["25-50"]++;
      else if (s < 75) distribution["50-75"]++;
      else distribution["75-100"]++;
    });

    return { totalTeamsScored, avgScore, highestScore, completionRate, distribution };
  }, [teams]);

  // ─── Filtered & Sorted Teams ──────────────────────────────────────────────

  const filteredTeams = useMemo(() => {
    let result = [...teams];

    if (searchQuery.trim()) {
      const q = searchQuery.toLowerCase();
      result = result.filter(
        (t) =>
          t.teamName.toLowerCase().includes(q) ||
          t.projectTitle.toLowerCase().includes(q)
      );
    }

    result.sort((a, b) => {
      switch (sortBy) {
        case "rank":
          return a.rank - b.rank;
        case "name":
          return a.teamName.localeCompare(b.teamName);
        case "score":
          return (b.averageScore ?? -1) - (a.averageScore ?? -1);
        case "progress":
          return b.judgesScored / (b.totalJudges || 1) - a.judgesScored / (a.totalJudges || 1);
        default:
          return 0;
      }
    });

    return result;
  }, [teams, searchQuery, sortBy]);

  // ─── Actions ──────────────────────────────────────────────────────────────

  const handlePublishResults = useCallback(async () => {
    setPublishing(true);
    try {
      const hackathonId = teams[0]?.hackathonId;
      if (!hackathonId) return;
      await adminApi("PUT", `/api/hackathons/${hackathonId}`, { resultsPublished: true });
      refetch();
    } catch (e) {
      console.error("Publish results failed:", e);
    } finally {
      setPublishing(false);
      setPublishConfirm(false);
    }
  }, [teams, refetch]);

  const handleToggleJudgeVisibility = useCallback(async (currentlyVisible: boolean) => {
    setPublishing(true);
    try {
      const hackathonId = teams[0]?.hackathonId;
      if (!hackathonId) return;
      await adminApi("PUT", `/api/hackathons/${hackathonId}`, { judgeResultsVisible: !currentlyVisible });
      refetch();
    } catch (e) {
      console.error("Toggle judge visibility failed:", e);
    } finally {
      setPublishing(false);
      setJudgeVisConfirm(false);
    }
  }, [teams, refetch]);

  const handleExportCSV = useCallback(() => {
    const headers = [
      "Rank",
      "Team Name",
      "Project Title",
      "Average Score",
      ...SCORING_CRITERIA.map((c) => c.label),
      "Judges Scored",
      "Total Judges",
      "Has Submission",
    ];

    const rows = filteredTeams.map((team) => [
      team.rank,
      `"${(team.teamName ?? "").replace(/"/g, '""')}"`,
      `"${(team.projectTitle ?? "").replace(/"/g, '""')}"`,
      team.averageScore != null ? team.averageScore.toFixed(2) : "N/A",
      team.averageInnovation != null ? team.averageInnovation.toFixed(2) : "N/A",
      team.averageExecution != null ? team.averageExecution.toFixed(2) : "N/A",
      team.averagePresentation != null ? team.averagePresentation.toFixed(2) : "N/A",
      "N/A", // UI/UX - not in current API breakdown
      "N/A", // Presentation sub
      "N/A", // Completion
      "N/A", // Teamwork
      team.judgesScored,
      team.totalJudges,
      team.hasSubmission ? "Yes" : "No",
    ]);

    const csv = [headers.join(","), ...rows.map((r) => r.join(","))].join("\n");
    const blob = new Blob([csv], { type: "text/csv" });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = `hackathon-scores-${new Date().toISOString().split("T")[0]}.csv`;
    a.click();
    URL.revokeObjectURL(url);
  }, [filteredTeams]);

  const toggleExpand = (teamId: number) => {
    setExpandedTeamId((prev) => (prev === teamId ? null : teamId));
  };

  // ─── Render ─────────────────────────────────────────────────────────────────

  if (loading && !scoresData) {
    return (
      <div className="space-y-4">
        <div className="h-10 bg-muted/30 rounded-lg animate-pulse" />
        <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
          {[1, 2, 3, 4].map((i) => (
            <div key={i} className="h-24 bg-muted/30 rounded-lg animate-pulse" />
          ))}
        </div>
        <div className="grid gap-4">
          {[1, 2, 3].map((i) => (
            <div key={i} className="h-28 bg-muted/30 rounded-lg animate-pulse" />
          ))}
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3">
        <div>
          <h2 className="text-lg font-semibold">Scores & Rankings</h2>
          <p className="text-sm text-muted-foreground">
            {teams.length} team{teams.length !== 1 ? "s" : ""} | {judgeCount} judge{judgeCount !== 1 ? "s" : ""} | {analytics.totalTeamsScored} scored
          </p>
        </div>
        <div className="flex flex-wrap gap-2">
          <Button size="sm" variant="outline" onClick={handleExportCSV} disabled={teams.length === 0}>
            <Download className="w-4 h-4 mr-2" />
            Export CSV
          </Button>
          <Button size="sm" variant="outline" onClick={() => setJudgeVisConfirm(true)} disabled={teams.length === 0}>
            <Eye className="w-4 h-4 mr-2" />
            Show Judge Results
          </Button>
          <Button size="sm" onClick={() => setPublishConfirm(true)} disabled={teams.length === 0}>
            <Trophy className="w-4 h-4 mr-2" />
            Publish Results
          </Button>
        </div>
      </div>

      {/* Analytics Stats */}
      <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
        <StatCard label="Teams Scored" value={analytics.totalTeamsScored} icon={Users} />
        <StatCard
          label="Average Score"
          value={analytics.avgScore > 0 ? analytics.avgScore.toFixed(1) : "---"}
          icon={BarChart3}
          color="text-chart-1"
        />
        <StatCard
          label="Highest Score"
          value={analytics.highestScore > 0 ? analytics.highestScore.toFixed(1) : "---"}
          icon={TrendingUp}
          color="text-chart-2"
        />
        <StatCard
          label="Completion Rate"
          value={`${analytics.completionRate}%`}
          icon={CheckCircle2}
          color="text-chart-3"
        />
      </div>

      {/* Score Distribution */}
      {analytics.totalTeamsScored > 0 && (
        <Card>
          <CardHeader className="pb-2 pt-4 px-4">
            <CardTitle className="text-sm flex items-center gap-2">
              <BarChart3 className="w-4 h-4 text-muted-foreground" />
              Score Distribution
            </CardTitle>
          </CardHeader>
          <CardContent className="px-4 pb-4">
            <div className="grid grid-cols-4 gap-3">
              {Object.entries(analytics.distribution).map(([range, count]) => {
                const total = analytics.totalTeamsScored;
                const pct = total > 0 ? Math.round((count / total) * 100) : 0;
                return (
                  <div key={range} className="text-center">
                    <div className="h-16 flex items-end justify-center mb-2">
                      <motion.div
                        initial={{ height: 0 }}
                        animate={{ height: `${Math.max(pct, 8)}%` }}
                        transition={{ duration: 0.5, delay: 0.1 }}
                        className={`w-full max-w-[40px] rounded-t-md ${
                          range === "75-100"
                            ? "bg-emerald-500/70"
                            : range === "50-75"
                            ? "bg-blue-500/70"
                            : range === "25-50"
                            ? "bg-amber-500/70"
                            : "bg-red-500/70"
                        }`}
                      />
                    </div>
                    <p className="text-xs font-mono font-bold">{count}</p>
                    <p className="text-xs text-muted-foreground">{range}</p>
                  </div>
                );
              })}
            </div>
          </CardContent>
        </Card>
      )}

      {/* Search & Sort */}
      <div className="flex flex-col sm:flex-row gap-2">
        <div className="relative flex-1">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
          <Input
            placeholder="Search by team name or project title..."
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            className="pl-9"
          />
        </div>
        <div className="flex gap-2">
          <Select value={sortBy} onValueChange={(v) => setSortBy(v as typeof sortBy)}>
            <SelectTrigger className="w-[160px]">
              <SelectValue placeholder="Sort by" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="rank">Rank</SelectItem>
              <SelectItem value="score">Score (High to Low)</SelectItem>
              <SelectItem value="name">Name (A-Z)</SelectItem>
              <SelectItem value="progress">Eval Progress</SelectItem>
            </SelectContent>
          </Select>
          {searchQuery && (
            <Button variant="ghost" size="sm" onClick={() => setSearchQuery("")} className="h-9">
              <X className="w-4 h-4 mr-1" />
              Clear
            </Button>
          )}
          <Button variant="ghost" size="icon" className="h-9 w-9" onClick={refetch}>
            <RefreshCw className="w-4 h-4" />
          </Button>
        </div>
      </div>

      {/* Teams List */}
      {filteredTeams.length === 0 ? (
        <Card>
          <CardContent className="py-12 text-center text-muted-foreground">
            <Trophy className="w-10 h-10 mx-auto mb-3 opacity-40" />
            <p className="text-sm">No teams found{searchQuery ? " matching your search" : ""}.</p>
          </CardContent>
        </Card>
      ) : (
        <div className="grid gap-3">
          <AnimatePresence mode="popLayout">
            {filteredTeams.map((team) => (
              <TeamScoreCard
                key={team.teamId}
                team={team}
                isExpanded={expandedTeamId === team.teamId}
                onToggleExpand={() => toggleExpand(team.teamId)}
              />
            ))}
          </AnimatePresence>
        </div>
      )}

      {/* Publish Results Confirm */}
      <ConfirmDialog
        open={publishConfirm}
        onOpenChange={setPublishConfirm}
        title="Publish Results"
        description="Are you sure you want to publish the results? This will make the final rankings visible to all participants."
        confirmLabel={publishing ? "Publishing..." : "Publish"}
        variant="default"
        onConfirm={handlePublishResults}
      />

      {/* Judge Visibility Confirm */}
      <ConfirmDialog
        open={judgeVisConfirm}
        onOpenChange={setJudgeVisConfirm}
        title="Show Judge Results"
        description="This will make individual judge scores visible to judges. They will be able to see how other judges scored."
        confirmLabel={publishing ? "Updating..." : "Show Results"}
        variant="default"
        onConfirm={() => handleToggleJudgeVisibility(false)}
      />
    </div>
  );
}

// ─── Team Score Card ────────────────────────────────────────────────────────

interface TeamScoreCardProps {
  team: TeamScore;
  isExpanded: boolean;
  onToggleExpand: () => void;
}

function TeamScoreCard({ team, isExpanded, onToggleExpand }: TeamScoreCardProps) {
  const rankBadge = getRankBadge(team.rank);
  const progressPct = team.totalJudges > 0 ? (team.judgesScored / team.totalJudges) * 100 : 0;
  const isUnscored = team.judgesScored === 0;

  return (
    <motion.div
      layout
      initial={{ opacity: 0, y: 8 }}
      animate={{ opacity: 1, y: 0 }}
      exit={{ opacity: 0, scale: 0.95 }}
      transition={{ duration: 0.2 }}
    >
      <Card
        className={`transition-colors cursor-pointer ${
          isExpanded ? "border-primary/40 shadow-md" : "hover:border-muted-foreground/30"
        } ${team.rank <= 3 && !isUnscored ? "border-l-4 border-l-amber-500/60" : ""}`}
        onClick={onToggleExpand}
      >
        <CardHeader className="pb-2 pt-4 px-4">
          <div className="flex items-center gap-3">
            {/* Rank */}
            <div className="flex-shrink-0 w-10 text-center">
              {rankBadge && !isUnscored ? (
                <Badge className={`text-xs font-bold px-2 py-0.5 ${rankBadge.className}`}>
                  {rankBadge.label}
                </Badge>
              ) : isUnscored ? (
                <span className="text-xs text-muted-foreground font-mono">--</span>
              ) : (
                <span className="text-sm font-mono font-bold text-muted-foreground">#{team.rank}</span>
              )}
            </div>

            {/* Team Info */}
            <div className="flex-1 min-w-0">
              <div className="flex flex-wrap items-center gap-2">
                <CardTitle className="text-base truncate">{team.teamName}</CardTitle>
                {team.hasSubmission && (
                  <Badge variant="outline" className="text-xs gap-1 bg-green-500/10 text-green-600 border-green-500/30">
                    <CheckCircle2 className="w-3 h-3" />
                    Submitted
                  </Badge>
                )}
                {!team.hasSubmission && (
                  <Badge variant="outline" className="text-xs gap-1 bg-muted text-muted-foreground">
                    <EyeOff className="w-3 h-3" />
                    No Submission
                  </Badge>
                )}
              </div>
              <p className="text-xs text-muted-foreground truncate mt-0.5">
                {team.projectTitle}
              </p>
            </div>

            {/* Score */}
            <div className="flex items-center gap-4 flex-shrink-0">
              {/* Progress */}
              <div className="hidden sm:block text-right">
                <p className="text-xs text-muted-foreground mb-1">
                  {team.judgesScored}/{team.totalJudges} judges
                </p>
                <div className="w-24 h-2 bg-muted rounded-full overflow-hidden">
                  <motion.div
                    initial={{ width: 0 }}
                    animate={{ width: `${progressPct}%` }}
                    transition={{ duration: 0.5 }}
                    className={`h-full rounded-full ${
                      progressPct >= 100
                        ? "bg-emerald-500"
                        : progressPct >= 50
                        ? "bg-blue-500"
                        : "bg-amber-500"
                    }`}
                  />
                </div>
              </div>

              {/* Score Display */}
              <div className="text-right min-w-[60px]">
                <p
                  className={`text-2xl font-bold font-mono ${
                    isUnscored ? "text-muted-foreground" : getScoreColor(team.averageScore ?? 0, TOTAL_MAX_SCORE)
                  }`}
                >
                  {isUnscored ? "---" : (team.averageScore ?? 0).toFixed(1)}
                </p>
                <p className="text-xs text-muted-foreground">/ {TOTAL_MAX_SCORE}</p>
              </div>

              {/* Expand */}
              <Button
                variant="ghost"
                size="sm"
                className="h-7 w-7 p-0 flex-shrink-0"
                onClick={(e) => {
                  e.stopPropagation();
                  onToggleExpand();
                }}
              >
                {isExpanded ? <ChevronUp className="w-4 h-4" /> : <ChevronDown className="w-4 h-4" />}
              </Button>
            </div>
          </div>
        </CardHeader>

        {/* Links row (always visible) */}
        <CardContent className="px-4 pb-3 pt-0">
          <div className="flex items-center gap-3 ml-13">
            {team.githubUrl && (
              <a
                href={team.githubUrl}
                target="_blank"
                rel="noopener noreferrer"
                className="text-xs text-muted-foreground hover:text-foreground flex items-center gap-1 transition-colors"
                onClick={(e) => e.stopPropagation()}
              >
                <Github className="w-3 h-3" />
                GitHub
              </a>
            )}
            {team.demoUrl && (
              <a
                href={team.demoUrl}
                target="_blank"
                rel="noopener noreferrer"
                className="text-xs text-muted-foreground hover:text-foreground flex items-center gap-1 transition-colors"
                onClick={(e) => e.stopPropagation()}
              >
                <Globe className="w-3 h-3" />
                Demo
              </a>
            )}
            {team.slidesUrl && (
              <a
                href={team.slidesUrl}
                target="_blank"
                rel="noopener noreferrer"
                className="text-xs text-muted-foreground hover:text-foreground flex items-center gap-1 transition-colors"
                onClick={(e) => e.stopPropagation()}
              >
                <FileText className="w-3 h-3" />
                Slides
              </a>
            )}
          </div>

          {/* Expanded Content */}
          <AnimatePresence>
            {isExpanded && (
              <motion.div
                initial={{ opacity: 0, height: 0 }}
                animate={{ opacity: 1, height: "auto" }}
                exit={{ opacity: 0, height: 0 }}
                transition={{ duration: 0.25 }}
                className="overflow-hidden"
                onClick={(e) => e.stopPropagation()}
              >
                <div className="mt-4 pt-4 border-t border-border space-y-6">
                  {/* Score Breakdown */}
                  <ScoreBreakdown team={team} />

                  {/* Judge-wise Evaluations */}
                  {team.judgeBreakdown && team.judgeBreakdown.length > 0 && (
                    <JudgeEvaluations breakdowns={team.judgeBreakdown} />
                  )}
                </div>
              </motion.div>
            )}
          </AnimatePresence>
        </CardContent>
      </Card>
    </motion.div>
  );
}

// ─── Score Breakdown ────────────────────────────────────────────────────────

function ScoreBreakdown({ team }: { team: TeamScore }) {
  // Map API fields to criteria. The API currently provides averageInnovation, averageExecution, averagePresentation.
  // We display what's available and show the full criterion list with progress bars.
  const criteriaScores = useMemo(() => {
    // Calculate averages from judgeBreakdown if available
    const breakdowns = team.judgeBreakdown ?? [];
    const count = breakdowns.length || 1;

    // For now, map available data. Fields not in the API return 0.
    return SCORING_CRITERIA.map((criterion) => {
      let value = 0;
      switch (criterion.key) {
        case "innovation":
          value = team.averageInnovation ?? 0;
          break;
        case "technical":
          value = team.averageExecution ?? 0;
          break;
        case "presentation":
          value = team.averagePresentation ?? 0;
          break;
        default:
          // These aren't individually broken out in the current API
          value = 0;
          break;
      }
      return { ...criterion, value };
    });
  }, [team]);

  return (
    <div>
      <h4 className="text-sm font-semibold flex items-center gap-2 mb-3">
        <Target className="w-4 h-4 text-muted-foreground" />
        Score Breakdown
      </h4>
      <div className="space-y-3">
        {criteriaScores.map((criterion) => {
          const pct = criterion.maxScore > 0 ? (criterion.value / criterion.maxScore) * 100 : 0;
          return (
            <div key={criterion.key} className="space-y-1">
              <div className="flex items-center justify-between">
                <span className="text-xs text-muted-foreground">{criterion.label}</span>
                <span className="text-xs font-mono font-bold">
                  {criterion.value > 0 ? criterion.value.toFixed(1) : "---"} / {criterion.maxScore}
                </span>
              </div>
              <div className="h-2.5 bg-muted rounded-full overflow-hidden">
                <motion.div
                  initial={{ width: 0 }}
                  animate={{ width: `${pct}%` }}
                  transition={{ duration: 0.6, delay: 0.05 }}
                  className={`h-full rounded-full ${criterion.color}`}
                />
              </div>
            </div>
          );
        })}

        {/* Total */}
        <div className="pt-3 mt-3 border-t border-border">
          <div className="flex items-center justify-between">
            <span className="text-sm font-semibold flex items-center gap-2">
              <Award className="w-4 h-4 text-primary" />
              Total Score
            </span>
            <span className={`text-lg font-bold font-mono ${getScoreColor(team.averageScore ?? 0, TOTAL_MAX_SCORE)}`}>
              {(team.averageScore ?? 0) > 0 ? (team.averageScore ?? 0).toFixed(1) : "---"} / {TOTAL_MAX_SCORE}
            </span>
          </div>
          <div className="h-3 bg-muted rounded-full overflow-hidden mt-2">
            <motion.div
              initial={{ width: 0 }}
              animate={{ width: `${((team.averageScore ?? 0) / TOTAL_MAX_SCORE) * 100}%` }}
              transition={{ duration: 0.7, delay: 0.1 }}
              className="h-full rounded-full bg-gradient-to-r from-primary/70 to-primary"
            />
          </div>
        </div>
      </div>
    </div>
  );
}

// ─── Judge-wise Evaluations ─────────────────────────────────────────────────

function JudgeEvaluations({ breakdowns }: { breakdowns: JudgeBreakdown[] }) {
  return (
    <div>
      <h4 className="text-sm font-semibold flex items-center gap-2 mb-3">
        <Star className="w-4 h-4 text-muted-foreground" />
        Judge Evaluations ({breakdowns.length})
      </h4>

      {/* Table */}
      <div className="rounded-md border border-border overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full text-sm">
            <thead>
              <tr className="bg-muted/50">
                <th className="text-left px-3 py-2 text-xs font-semibold text-muted-foreground">Judge</th>
                <th className="text-center px-3 py-2 text-xs font-semibold text-muted-foreground">Innovation</th>
                <th className="text-center px-3 py-2 text-xs font-semibold text-muted-foreground">Execution</th>
                <th className="text-center px-3 py-2 text-xs font-semibold text-muted-foreground">Presentation</th>
                <th className="text-center px-3 py-2 text-xs font-semibold text-muted-foreground">Total</th>
                <th className="text-right px-3 py-2 text-xs font-semibold text-muted-foreground">Date</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-border">
              {breakdowns.map((entry) => (
                <tr key={entry.judgeId} className="hover:bg-muted/30 transition-colors">
                  <td className="px-3 py-2.5 font-medium">{entry.judgeName}</td>
                  <td className="px-3 py-2.5 text-center font-mono text-xs">
                    {entry.innovation != null ? entry.innovation : "---"}
                  </td>
                  <td className="px-3 py-2.5 text-center font-mono text-xs">
                    {entry.execution != null ? entry.execution : "---"}
                  </td>
                  <td className="px-3 py-2.5 text-center font-mono text-xs">
                    {entry.presentation != null ? entry.presentation : "---"}
                  </td>
                  <td className="px-3 py-2.5 text-center">
                    <Badge variant="outline" className="font-mono font-bold gap-1">
                      <Star className="w-3 h-3 text-amber-500" />
                      {entry.score}
                    </Badge>
                  </td>
                  <td className="px-3 py-2.5 text-right text-xs text-muted-foreground">
                    {formatDate(entry.updatedAt)}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>

      {/* Judge Feedback */}
      {breakdowns.some((b) => b.feedback) && (
        <div className="mt-4 space-y-3">
          <h5 className="text-xs font-semibold uppercase text-muted-foreground flex items-center gap-2">
            <MessageSquare className="w-3.5 h-3.5" />
            Judge Feedback
          </h5>
          {breakdowns
            .filter((b) => b.feedback)
            .map((entry) => (
              <div key={`feedback-${entry.judgeId}`} className="p-3 bg-muted/30 rounded-md">
                <div className="flex items-center gap-2 mb-1.5">
                  <span className="text-xs font-semibold">{entry.judgeName}</span>
                  <Badge variant="outline" className="text-xs font-mono">
                    {entry.score}/100
                  </Badge>
                </div>
                <p className="text-sm text-muted-foreground leading-relaxed">{entry.feedback}</p>
              </div>
            ))}
        </div>
      )}
    </div>
  );
}
