import { useState, useEffect, useMemo, useCallback, useRef } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Label } from "@/components/ui/label";
import {
  Tooltip,
  TooltipContent,
  TooltipProvider,
  TooltipTrigger,
} from "@/components/ui/tooltip";
import {
  Plus,
  Play,
  Pause,
  Square,
  BarChart3,
  Vote,
  TrendingUp,
  Users,
  Copy,
  Trash2,
  Download,
  ChevronDown,
  ChevronUp,
  Loader2,
  X,
  Radio,
  Activity,
} from "lucide-react";
import { useAdminFetch, adminApi } from "../lib/api";
import StatCard from "../components/shared/StatCard";
import ConfirmDialog from "../components/shared/ConfirmDialog";

// ---------------------------------------------------------------------------
// Types
// ---------------------------------------------------------------------------

interface Poll {
  id: number;
  question: string;
  isActive: boolean;
  isFrozen: boolean;
  totalVotes: number;
  createdAt: string;
}

interface PollResult {
  teamId: number;
  teamName: string;
  votes: number;
}

interface PollResultsData {
  poll: Poll;
  results: PollResult[];
  totalVotes: number;
}

type TargetAudience = "all" | "teams" | "judges" | "finalists";

interface CreatePollForm {
  question: string;
  description: string;
  audience: TargetAudience;
}

const INITIAL_FORM: CreatePollForm = {
  question: "",
  description: "",
  audience: "all",
};

const AUDIENCE_OPTIONS: { value: TargetAudience; label: string; icon: string }[] = [
  { value: "all", label: "All", icon: "globe" },
  { value: "teams", label: "Teams", icon: "users" },
  { value: "judges", label: "Judges", icon: "gavel" },
  { value: "finalists", label: "Finalists", icon: "trophy" },
];

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------

function formatDate(dateStr: string): string {
  const d = new Date(dateStr);
  return d.toLocaleDateString("en-US", {
    month: "short",
    day: "numeric",
    year: "numeric",
    hour: "2-digit",
    minute: "2-digit",
  });
}

function exportResultsCSV(poll: Poll, results: PollResult[], totalVotes: number) {
  const header = "Team,Votes,Percentage\n";
  const rows = results
    .sort((a, b) => b.votes - a.votes)
    .map((r) => {
      const pct = totalVotes > 0 ? ((r.votes / totalVotes) * 100).toFixed(1) : "0.0";
      return `"${r.teamName.replace(/"/g, '""')}",${r.votes},${pct}%`;
    })
    .join("\n");
  const csv = header + rows + `\n\nTotal Votes,${totalVotes}`;
  const blob = new Blob([csv], { type: "text/csv" });
  const url = URL.createObjectURL(blob);
  const a = document.createElement("a");
  a.href = url;
  a.download = `poll-${poll.id}-results.csv`;
  a.click();
  URL.revokeObjectURL(url);
}

// ---------------------------------------------------------------------------
// Sub-components
// ---------------------------------------------------------------------------

function LiveIndicator() {
  return (
    <span className="inline-flex items-center gap-1.5">
      <span className="relative flex h-2.5 w-2.5">
        <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-green-400 opacity-75" />
        <span className="relative inline-flex rounded-full h-2.5 w-2.5 bg-green-500" />
      </span>
      <span className="text-xs font-semibold text-green-600 uppercase tracking-wide">Live</span>
    </span>
  );
}

function PollStatusBadge({ poll }: { poll: Poll }) {
  if (poll.isActive) {
    return (
      <Badge className="bg-green-500/15 text-green-700 border-green-500/30 hover:bg-green-500/20">
        Active
      </Badge>
    );
  }
  if (poll.isFrozen) {
    return (
      <Badge className="bg-blue-500/15 text-blue-700 border-blue-500/30 hover:bg-blue-500/20">
        Frozen
      </Badge>
    );
  }
  return <Badge variant="secondary">Inactive</Badge>;
}

// ---------------------------------------------------------------------------
// Poll Results Expandable
// ---------------------------------------------------------------------------

function PollResultsPanel({
  poll,
  isExpanded,
  onToggle,
}: {
  poll: Poll;
  isExpanded: boolean;
  onToggle: () => void;
}) {
  const [results, setResults] = useState<PollResult[] | null>(null);
  const [totalVotes, setTotalVotes] = useState(0);
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    if (isExpanded && !results) {
      setLoading(true);
      adminApi("GET", `/api/polls/${poll.id}/results`)
        .then((data: PollResultsData) => {
          setResults(data.results ?? []);
          setTotalVotes(data.totalVotes ?? 0);
        })
        .catch(() => {
          setResults([]);
          setTotalVotes(0);
        })
        .finally(() => setLoading(false));
    }
  }, [isExpanded, poll.id, results]);

  const sortedResults = useMemo(() => {
    if (!results) return [];
    return [...results].sort((a, b) => b.votes - a.votes);
  }, [results]);

  const maxVotes = useMemo(() => {
    if (!sortedResults.length) return 0;
    return sortedResults[0].votes;
  }, [sortedResults]);

  return (
    <div>
      <Button
        variant="ghost"
        size="sm"
        className="h-7 px-2 text-xs gap-1"
        onClick={onToggle}
      >
        <BarChart3 className="w-3 h-3" />
        Results
        {isExpanded ? (
          <ChevronUp className="w-3 h-3" />
        ) : (
          <ChevronDown className="w-3 h-3" />
        )}
      </Button>

      <AnimatePresence>
        {isExpanded && (
          <motion.div
            initial={{ opacity: 0, height: 0 }}
            animate={{ opacity: 1, height: "auto" }}
            exit={{ opacity: 0, height: 0 }}
            transition={{ duration: 0.2 }}
            className="overflow-hidden"
          >
            <div className="mt-3 p-4 bg-muted/30 rounded-lg border border-border/50">
              {loading && (
                <div className="flex justify-center py-4">
                  <Loader2 className="w-4 h-4 animate-spin text-muted-foreground" />
                </div>
              )}

              {!loading && sortedResults.length === 0 && (
                <p className="text-xs text-muted-foreground text-center py-4">
                  No votes recorded yet.
                </p>
              )}

              {!loading && sortedResults.length > 0 && (
                <div className="space-y-3">
                  <div className="flex items-center justify-between mb-2">
                    <span className="text-xs font-medium text-muted-foreground">
                      Vote Distribution
                    </span>
                    <div className="flex items-center gap-2">
                      <span className="text-xs text-muted-foreground">
                        Total: <span className="font-semibold text-foreground">{totalVotes}</span>
                      </span>
                      <Button
                        variant="ghost"
                        size="sm"
                        className="h-6 px-2 text-xs"
                        onClick={() => exportResultsCSV(poll, sortedResults, totalVotes)}
                      >
                        <Download className="w-3 h-3 mr-1" />
                        CSV
                      </Button>
                    </div>
                  </div>

                  {sortedResults.map((r, idx) => {
                    const pct = totalVotes > 0 ? (r.votes / totalVotes) * 100 : 0;
                    const barWidth = maxVotes > 0 ? (r.votes / maxVotes) * 100 : 0;
                    const isLeader = idx === 0 && r.votes > 0;

                    return (
                      <div key={r.teamId} className="space-y-1">
                        <div className="flex items-center justify-between text-xs">
                          <span className={`font-medium ${isLeader ? "text-green-600" : ""}`}>
                            {isLeader && "🏆 "}
                            {r.teamName}
                          </span>
                          <span className="text-muted-foreground">
                            {r.votes} vote{r.votes !== 1 ? "s" : ""} ({pct.toFixed(1)}%)
                          </span>
                        </div>
                        <div className="h-2 bg-muted rounded-full overflow-hidden">
                          <motion.div
                            className={`h-full rounded-full ${
                              isLeader
                                ? "bg-gradient-to-r from-green-500 to-emerald-400"
                                : "bg-gradient-to-r from-primary/70 to-primary/50"
                            }`}
                            initial={{ width: 0 }}
                            animate={{ width: `${barWidth}%` }}
                            transition={{ duration: 0.5, ease: "easeOut" }}
                          />
                        </div>
                      </div>
                    );
                  })}
                </div>
              )}
            </div>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}

// ---------------------------------------------------------------------------
// Main Component
// ---------------------------------------------------------------------------

export default function PollsSection() {
  const { data: polls, loading, refetch } = useAdminFetch<Poll[]>("/api/polls");

  // UI State
  const [showCreateForm, setShowCreateForm] = useState(false);
  const [createForm, setCreateForm] = useState<CreatePollForm>(INITIAL_FORM);
  const [creating, setCreating] = useState(false);
  const [expandedPollId, setExpandedPollId] = useState<number | null>(null);
  const [actionLoading, setActionLoading] = useState<number | null>(null);

  // Confirm dialog
  const [confirmDeactivate, setConfirmDeactivate] = useState<Poll | null>(null);

  // Auto-refresh ref
  const intervalRef = useRef<ReturnType<typeof setInterval> | null>(null);

  // ---------------------------------------------------------------------------
  // Derived data
  // ---------------------------------------------------------------------------

  const activePoll = useMemo(() => polls?.find((p) => p.isActive) ?? null, [polls]);

  const sortedPolls = useMemo(() => {
    if (!polls) return [];
    return [...polls].sort((a, b) => {
      // Active first, then frozen, then by creation date desc
      if (a.isActive && !b.isActive) return -1;
      if (!a.isActive && b.isActive) return 1;
      if (a.isFrozen && !b.isFrozen) return -1;
      if (!a.isFrozen && b.isFrozen) return 1;
      return new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime();
    });
  }, [polls]);

  const totalVotesAll = useMemo(
    () => polls?.reduce((sum, p) => sum + (p.totalVotes ?? 0), 0) ?? 0,
    [polls]
  );

  const avgParticipation = useMemo(() => {
    if (!polls || polls.length === 0) return 0;
    const pollsWithVotes = polls.filter((p) => p.totalVotes > 0);
    if (pollsWithVotes.length === 0) return 0;
    return Math.round(
      pollsWithVotes.reduce((sum, p) => sum + p.totalVotes, 0) / pollsWithVotes.length
    );
  }, [polls]);

  // ---------------------------------------------------------------------------
  // Auto-refresh when a poll is active
  // ---------------------------------------------------------------------------

  const refetchStable = useCallback(() => {
    refetch();
  }, [refetch]);

  useEffect(() => {
    if (activePoll) {
      intervalRef.current = setInterval(refetchStable, 10000);
    } else {
      if (intervalRef.current) {
        clearInterval(intervalRef.current);
        intervalRef.current = null;
      }
    }
    return () => {
      if (intervalRef.current) {
        clearInterval(intervalRef.current);
      }
    };
  }, [activePoll, refetchStable]);

  // ---------------------------------------------------------------------------
  // Actions
  // ---------------------------------------------------------------------------

  const handleCreatePoll = async () => {
    if (!createForm.question.trim()) return;
    setCreating(true);
    try {
      const fullQuestion = createForm.description.trim()
        ? `${createForm.question.trim()}\n\n${createForm.description.trim()}`
        : createForm.question.trim();
      await adminApi("POST", "/api/polls", { question: fullQuestion });
      setCreateForm(INITIAL_FORM);
      setShowCreateForm(false);
      refetch();
    } catch (err: unknown) {
      alert(err instanceof Error ? err.message : "Failed to create poll");
    } finally {
      setCreating(false);
    }
  };

  const handleActivate = async (poll: Poll) => {
    setActionLoading(poll.id);
    try {
      await adminApi("POST", `/api/polls/${poll.id}/activate`);
      refetch();
    } catch (err: unknown) {
      alert(err instanceof Error ? err.message : "Failed to activate poll");
    } finally {
      setActionLoading(null);
    }
  };

  const handleDeactivate = async (poll: Poll) => {
    setActionLoading(poll.id);
    try {
      await adminApi("POST", `/api/polls/${poll.id}/deactivate`);
      refetch();
    } catch (err: unknown) {
      alert(err instanceof Error ? err.message : "Failed to deactivate poll");
    } finally {
      setActionLoading(null);
      setConfirmDeactivate(null);
    }
  };

  const handleDuplicate = async (poll: Poll) => {
    try {
      const question = poll.question;
      await adminApi("POST", "/api/polls", { question });
      refetch();
    } catch (err: unknown) {
      alert(err instanceof Error ? err.message : "Failed to duplicate poll");
    }
  };

  // ---------------------------------------------------------------------------
  // Render
  // ---------------------------------------------------------------------------

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-3">
          <h2 className="text-lg font-semibold">Polls</h2>
          {activePoll && <LiveIndicator />}
        </div>
        <Button size="sm" onClick={() => setShowCreateForm(true)}>
          <Plus className="w-4 h-4 mr-1" />
          Create Poll
        </Button>
      </div>

      {/* Analytics Summary */}
      <motion.div
        className="grid grid-cols-2 md:grid-cols-4 gap-3"
        initial={{ opacity: 0, y: 8 }}
        animate={{ opacity: 1, y: 0 }}
      >
        <StatCard
          label="Total Polls"
          value={polls?.length ?? "..."}
          icon={Vote}
          color="text-chart-1"
        />
        <StatCard
          label="Active Poll"
          value={activePoll ? "1" : "0"}
          subtitle={activePoll ? activePoll.question.split("\n")[0].slice(0, 30) : "None"}
          icon={Radio}
          color="text-chart-2"
        />
        <StatCard
          label="Total Votes"
          value={loading ? "..." : totalVotesAll}
          icon={TrendingUp}
          color="text-chart-3"
        />
        <StatCard
          label="Avg. Participation"
          value={loading ? "..." : `${avgParticipation}`}
          subtitle="votes per poll"
          icon={Activity}
          color="text-chart-4"
        />
      </motion.div>

      {/* Create Poll Form */}
      <AnimatePresence>
        {showCreateForm && (
          <motion.div
            initial={{ opacity: 0, height: 0 }}
            animate={{ opacity: 1, height: "auto" }}
            exit={{ opacity: 0, height: 0 }}
            transition={{ duration: 0.2 }}
          >
            <Card className="border-primary/30">
              <CardHeader className="pb-3">
                <div className="flex items-center justify-between">
                  <CardTitle className="text-sm">Create New Poll</CardTitle>
                  <Button
                    variant="ghost"
                    size="sm"
                    onClick={() => {
                      setShowCreateForm(false);
                      setCreateForm(INITIAL_FORM);
                    }}
                  >
                    <X className="w-4 h-4" />
                  </Button>
                </div>
              </CardHeader>
              <CardContent className="space-y-4">
                <div className="space-y-2">
                  <Label>Poll Question *</Label>
                  <Input
                    value={createForm.question}
                    onChange={(e) =>
                      setCreateForm({ ...createForm, question: e.target.value })
                    }
                    placeholder="Which team should win the People's Choice award?"
                  />
                </div>

                <div className="space-y-2">
                  <Label>
                    Description{" "}
                    <span className="text-muted-foreground text-xs">(optional)</span>
                  </Label>
                  <Textarea
                    value={createForm.description}
                    onChange={(e) =>
                      setCreateForm({ ...createForm, description: e.target.value })
                    }
                    placeholder="Additional context for voters..."
                    rows={2}
                  />
                </div>

                {/* Target Audience Selector */}
                <div className="space-y-2">
                  <Label>
                    Target Audience{" "}
                    <span className="text-muted-foreground text-xs">(for future use)</span>
                  </Label>
                  <div className="flex gap-2">
                    {AUDIENCE_OPTIONS.map((opt) => (
                      <Button
                        key={opt.value}
                        type="button"
                        variant={createForm.audience === opt.value ? "default" : "outline"}
                        size="sm"
                        className="h-8 px-3 text-xs"
                        onClick={() =>
                          setCreateForm({ ...createForm, audience: opt.value })
                        }
                      >
                        {opt.label}
                      </Button>
                    ))}
                  </div>
                </div>

                <div className="flex justify-end gap-2 pt-2">
                  <Button
                    variant="outline"
                    onClick={() => {
                      setShowCreateForm(false);
                      setCreateForm(INITIAL_FORM);
                    }}
                  >
                    Cancel
                  </Button>
                  <Button
                    onClick={handleCreatePoll}
                    disabled={creating || !createForm.question.trim()}
                  >
                    {creating && <Loader2 className="w-3 h-3 mr-2 animate-spin" />}
                    Create Poll
                  </Button>
                </div>
              </CardContent>
            </Card>
          </motion.div>
        )}
      </AnimatePresence>

      {/* Loading State */}
      {loading && (
        <div className="flex justify-center py-12">
          <Loader2 className="w-6 h-6 animate-spin text-muted-foreground" />
        </div>
      )}

      {/* Empty State */}
      {!loading && sortedPolls.length === 0 && (
        <Card>
          <CardContent className="py-12 text-center">
            <Vote className="w-8 h-8 mx-auto text-muted-foreground mb-3" />
            <p className="text-sm text-muted-foreground">
              No polls yet. Create your first poll to start collecting votes!
            </p>
          </CardContent>
        </Card>
      )}

      {/* Poll List */}
      {!loading && sortedPolls.length > 0 && (
        <motion.div
          className="space-y-3"
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          transition={{ staggerChildren: 0.05 }}
        >
          <AnimatePresence>
            {sortedPolls.map((poll) => {
              const isActive = poll.isActive;
              const isFrozen = poll.isFrozen;
              const isExpanded = expandedPollId === poll.id;
              const isLoading = actionLoading === poll.id;

              return (
                <motion.div
                  key={poll.id}
                  initial={{ opacity: 0, y: 12 }}
                  animate={{ opacity: 1, y: 0 }}
                  exit={{ opacity: 0, scale: 0.95 }}
                  transition={{ duration: 0.2 }}
                >
                  <Card
                    className={`transition-all ${
                      isActive
                        ? "border-green-500/60 bg-green-500/5 shadow-[0_0_15px_rgba(34,197,94,0.1)]"
                        : isFrozen
                        ? "border-blue-500/40 bg-blue-500/5"
                        : "border-border"
                    }`}
                  >
                    <CardContent className="pt-4 pb-4">
                      {/* Poll Header Row */}
                      <div className="flex items-start justify-between gap-3">
                        <div className="flex-1 min-w-0">
                          <div className="flex items-center gap-2 mb-1">
                            <h3 className="font-medium text-sm truncate">
                              {poll.question.split("\n")[0]}
                            </h3>
                            <PollStatusBadge poll={poll} />
                            {isActive && <LiveIndicator />}
                          </div>
                          <div className="flex items-center gap-3 text-xs text-muted-foreground">
                            <span>{poll.totalVotes} vote{poll.totalVotes !== 1 ? "s" : ""}</span>
                            <span>Created {formatDate(poll.createdAt)}</span>
                          </div>
                        </div>
                      </div>

                      {/* Management Controls */}
                      <div className="flex items-center gap-2 mt-3 pt-3 border-t border-border/50 flex-wrap">
                        {/* Start / Activate */}
                        {!isActive && (
                          <TooltipProvider>
                            <Tooltip>
                              <TooltipTrigger asChild>
                                <Button
                                  variant="default"
                                  size="sm"
                                  className="h-7 px-3 text-xs bg-green-600 hover:bg-green-700 text-white"
                                  onClick={() => handleActivate(poll)}
                                  disabled={isLoading}
                                >
                                  {isLoading ? (
                                    <Loader2 className="w-3 h-3 mr-1 animate-spin" />
                                  ) : (
                                    <Play className="w-3 h-3 mr-1" />
                                  )}
                                  Start
                                </Button>
                              </TooltipTrigger>
                              <TooltipContent>
                                <p>
                                  {activePoll && activePoll.id !== poll.id
                                    ? "This will deactivate the currently active poll"
                                    : "Activate this poll for voting"}
                                </p>
                              </TooltipContent>
                            </Tooltip>
                          </TooltipProvider>
                        )}

                        {/* Pause / Freeze (shown when active) */}
                        {isActive && (
                          <Button
                            variant="default"
                            size="sm"
                            className="h-7 px-3 text-xs bg-amber-500 hover:bg-amber-600 text-white"
                            onClick={() => setConfirmDeactivate(poll)}
                            disabled={isLoading}
                          >
                            {isLoading ? (
                              <Loader2 className="w-3 h-3 mr-1 animate-spin" />
                            ) : (
                              <Pause className="w-3 h-3 mr-1" />
                            )}
                            Pause
                          </Button>
                        )}

                        {/* End / Deactivate (shown when active or frozen) */}
                        {(isActive || isFrozen) && (
                          <Button
                            variant="default"
                            size="sm"
                            className="h-7 px-3 text-xs bg-red-600 hover:bg-red-700 text-white"
                            onClick={() => setConfirmDeactivate(poll)}
                            disabled={isLoading}
                          >
                            {isLoading ? (
                              <Loader2 className="w-3 h-3 mr-1 animate-spin" />
                            ) : (
                              <Square className="w-3 h-3 mr-1" />
                            )}
                            End
                          </Button>
                        )}

                        {/* Divider */}
                        <div className="w-px h-4 bg-border/50 mx-1" />

                        {/* Results Toggle */}
                        <PollResultsPanel
                          poll={poll}
                          isExpanded={isExpanded}
                          onToggle={() =>
                            setExpandedPollId(isExpanded ? null : poll.id)
                          }
                        />

                        {/* Duplicate */}
                        <Button
                          variant="ghost"
                          size="sm"
                          className="h-7 px-2 text-xs"
                          onClick={() => handleDuplicate(poll)}
                        >
                          <Copy className="w-3 h-3 mr-1" />
                          Duplicate
                        </Button>

                        {/* Delete (disabled, coming soon) */}
                        <TooltipProvider>
                          <Tooltip>
                            <TooltipTrigger asChild>
                              <span>
                                <Button
                                  variant="ghost"
                                  size="sm"
                                  className="h-7 px-2 text-xs text-destructive hover:text-destructive opacity-50 cursor-not-allowed"
                                  disabled
                                >
                                  <Trash2 className="w-3 h-3 mr-1" />
                                  Delete
                                </Button>
                              </span>
                            </TooltipTrigger>
                            <TooltipContent>
                              <p>Coming soon</p>
                            </TooltipContent>
                          </Tooltip>
                        </TooltipProvider>
                      </div>
                    </CardContent>
                  </Card>
                </motion.div>
              );
            })}
          </AnimatePresence>
        </motion.div>
      )}

      {/* Active Poll Notice */}
      {activePoll && (
        <motion.div
          initial={{ opacity: 0, y: 8 }}
          animate={{ opacity: 1, y: 0 }}
          className="text-xs text-muted-foreground text-center"
        >
          <Users className="w-3 h-3 inline mr-1" />
          Only one poll can be active at a time. Starting a new poll may deactivate the current one.
        </motion.div>
      )}

      {/* Confirm Dialog for Deactivate/End */}
      <ConfirmDialog
        open={!!confirmDeactivate}
        onOpenChange={(open) => !open && setConfirmDeactivate(null)}
        title="End Poll"
        description={`Are you sure you want to end "${confirmDeactivate?.question.split("\n")[0]}"? Voting will be stopped and the poll will become inactive.`}
        confirmLabel="End Poll"
        variant="destructive"
        onConfirm={() => confirmDeactivate && handleDeactivate(confirmDeactivate)}
      />
    </div>
  );
}
