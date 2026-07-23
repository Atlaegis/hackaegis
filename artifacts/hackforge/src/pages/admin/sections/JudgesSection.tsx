import { useState, useMemo, useCallback } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
import { Tabs, TabsList, TabsTrigger, TabsContent } from "@/components/ui/tabs";
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
  Plus,
  Trash2,
  Copy,
  Check,
  ChevronDown,
  ChevronUp,
  Clock,
  Star,
  RefreshCw,
  Globe,
  Mail,
  User,
  Award,
  BarChart3,
  ClipboardList,
  Users,
  Briefcase,
} from "lucide-react";
import { useAdminFetch, adminApi } from "../lib/api";
import type { AdminLog } from "../lib/types";
import ConfirmDialog from "../components/shared/ConfirmDialog";
import StatCard from "../components/shared/StatCard";
import TimelineStep, { type TimelineStepData } from "../components/shared/TimelineStep";

// ─── Types ──────────────────────────────────────────────────────────────────

interface Judge {
  id: number;
  code: string;
  label: string;
  domain: string | null;
  email: string | null;
  bio: string | null;
  yearsOfExperience: number | null;
  createdAt: string;
}

interface TeamScore {
  teamId: number;
  teamName: string;
  totalScore: number;
  judgeBreakdown: Array<{
    judgeId: number;
    judgeName: string;
    score: number;
    totalScore: number;
    innovation: number | null;
    execution: number | null;
    presentation: number | null;
    createdAt: string;
  }>;
}

type DetailTab = "info" | "evaluations" | "timeline" | "metrics";

interface CreateJudgeForm {
  label: string;
  email: string;
  domain: string;
}

const EMPTY_FORM: CreateJudgeForm = {
  label: "",
  email: "",
  domain: "",
};

const DOMAINS = [
  "AI/ML",
  "Web3/Blockchain",
  "FinTech",
  "HealthTech",
  "EdTech",
  "Sustainability",
  "IoT",
  "Cybersecurity",
  "AR/VR",
  "Open Innovation",
];

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

// ─── Main Component ─────────────────────────────────────────────────────────

export default function JudgesSection() {
  const { data: judges, loading, refetch } = useAdminFetch<Judge[]>("/api/codes/judges");
  const { data: scores } = useAdminFetch<TeamScore[]>("/api/admin/scores");
  const { data: logs } = useAdminFetch<AdminLog[]>("/api/admin/logs");

  const [searchQuery, setSearchQuery] = useState("");
  const [domainFilter, setDomainFilter] = useState<string>("all");
  const [expandedJudgeId, setExpandedJudgeId] = useState<number | null>(null);
  const [detailTab, setDetailTab] = useState<DetailTab>("info");

  const [showCreateForm, setShowCreateForm] = useState(false);
  const [createForm, setCreateForm] = useState<CreateJudgeForm>(EMPTY_FORM);
  const [creating, setCreating] = useState(false);

  const [deleteTarget, setDeleteTarget] = useState<Judge | null>(null);
  const [processingIds, setProcessingIds] = useState<Set<number>>(new Set());
  const [copiedText, setCopiedText] = useState<string | null>(null);

  const allJudges = judges ?? [];
  const allScores = scores ?? [];

  // Compute judge evaluation data
  const judgeEvalMap = useMemo(() => {
    const map: Record<number, Array<{ teamId: number; teamName: string; score: number; totalScore: number; date: string }>> = {};
    allScores.forEach((team) => {
      (team.judgeBreakdown ?? []).forEach((entry) => {
        if (!map[entry.judgeId]) map[entry.judgeId] = [];
        map[entry.judgeId].push({
          teamId: team.teamId,
          teamName: team.teamName,
          score: entry.score ?? entry.totalScore,
          totalScore: entry.totalScore,
          date: entry.createdAt,
        });
      });
    });
    return map;
  }, [allScores]);

  // Domain assignment overview
  const domainAssignments = useMemo(() => {
    const map: Record<string, number> = {};
    allJudges.forEach((j) => {
      const d = j.domain || "Unassigned";
      map[d] = (map[d] || 0) + 1;
    });
    return map;
  }, [allJudges]);

  // Filtered judges
  const filtered = useMemo(() => {
    let result = allJudges;

    if (searchQuery.trim()) {
      const q = searchQuery.toLowerCase();
      result = result.filter(
        (j) =>
          j.label.toLowerCase().includes(q) ||
          (j.domain && j.domain.toLowerCase().includes(q)) ||
          (j.email && j.email.toLowerCase().includes(q))
      );
    }

    if (domainFilter !== "all") {
      result = result.filter((j) => j.domain === domainFilter);
    }

    return result;
  }, [allJudges, searchQuery, domainFilter]);

  const hasFilters = searchQuery || domainFilter !== "all";

  const clearFilters = () => {
    setSearchQuery("");
    setDomainFilter("all");
  };

  // ─── Actions ────────────────────────────────────────────────────────────────

  const handleCreateJudge = useCallback(async () => {
    if (!createForm.label.trim()) return;
    setCreating(true);
    try {
      await adminApi("POST", "/api/codes/judges", {
        label: createForm.label,
        domain: createForm.domain || undefined,
        email: createForm.email || undefined,
      });
      setCreateForm(EMPTY_FORM);
      setShowCreateForm(false);
      refetch();
    } catch (e) {
      console.error("Create judge failed:", e);
    } finally {
      setCreating(false);
    }
  }, [createForm, refetch]);

  const handleDeleteJudge = useCallback(
    async (judge: Judge) => {
      setProcessingIds((prev) => new Set(prev).add(judge.id));
      try {
        await adminApi("DELETE", `/api/codes/judges/${judge.id}`);
        if (expandedJudgeId === judge.id) setExpandedJudgeId(null);
        refetch();
      } catch (e) {
        console.error("Delete judge failed:", e);
      } finally {
        setProcessingIds((prev) => {
          const next = new Set(prev);
          next.delete(judge.id);
          return next;
        });
        setDeleteTarget(null);
      }
    },
    [refetch, expandedJudgeId]
  );

  const handleCopy = (text: string) => {
    navigator.clipboard.writeText(text);
    setCopiedText(text);
    setTimeout(() => setCopiedText(null), 2000);
  };

  const toggleExpand = (judgeId: number) => {
    if (expandedJudgeId === judgeId) {
      setExpandedJudgeId(null);
    } else {
      setExpandedJudgeId(judgeId);
      setDetailTab("info");
    }
  };

  // Build timeline for a judge from logs
  const getJudgeTimeline = (judge: Judge): TimelineStepData[] => {
    const judgeLogs = (logs ?? []).filter(
      (log) =>
        log.details?.toLowerCase().includes(judge.label.toLowerCase()) ||
        log.action.toLowerCase().includes(judge.label.toLowerCase())
    );

    const steps: TimelineStepData[] = [];

    steps.push({
      title: "Judge Created",
      description: formatDate(judge.createdAt),
      status: "completed",
    });

    const assignLog = judgeLogs.find(
      (l) => l.action.toLowerCase().includes("assign") || l.action.toLowerCase().includes("domain")
    );
    if (assignLog) {
      steps.push({
        title: "Domain Assigned",
        description: judge.domain || formatDate(assignLog.createdAt),
        status: "completed",
      });
    } else if (judge.domain) {
      steps.push({
        title: "Domain Assigned",
        description: judge.domain,
        status: "completed",
      });
    } else {
      steps.push({
        title: "Domain Assignment",
        description: "No domain assigned",
        status: "upcoming",
      });
    }

    const evalCount = (judgeEvalMap[judge.id] ?? []).length;
    if (evalCount > 0) {
      steps.push({
        title: "Evaluations Started",
        description: `${evalCount} team(s) scored`,
        status: "completed",
      });
    } else {
      steps.push({
        title: "Evaluations",
        description: "No scores submitted yet",
        status: "upcoming",
      });
    }

    const scoreLog = judgeLogs.find(
      (l) => l.action.toLowerCase().includes("score") || l.action.toLowerCase().includes("evaluat")
    );
    if (scoreLog) {
      steps.push({
        title: "Latest Activity",
        description: formatDate(scoreLog.createdAt),
        status: "current",
      });
    }

    return steps;
  };

  // ─── Render ─────────────────────────────────────────────────────────────────

  if (loading && !judges) {
    return (
      <div className="space-y-4">
        <div className="h-10 bg-muted/30 rounded-lg animate-pulse" />
        <div className="h-12 bg-muted/30 rounded-lg animate-pulse" />
        <div className="grid gap-4">
          {[1, 2, 3].map((i) => (
            <div key={i} className="h-40 bg-muted/30 rounded-lg animate-pulse" />
          ))}
        </div>
      </div>
    );
  }

  const totalEvaluations = Object.values(judgeEvalMap).reduce((sum, arr) => sum + arr.length, 0);

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3">
        <div>
          <h2 className="text-lg font-semibold">Judges Management</h2>
          <p className="text-sm text-muted-foreground">
            {allJudges.length} judge{allJudges.length !== 1 ? "s" : ""} registered, {totalEvaluations} evaluation{totalEvaluations !== 1 ? "s" : ""} submitted
          </p>
        </div>
        <Button size="sm" onClick={() => setShowCreateForm(!showCreateForm)}>
          <Plus className="w-4 h-4 mr-2" />
          Add Judge
        </Button>
      </div>

      {/* Stats Row */}
      <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
        <StatCard label="Total Judges" value={allJudges.length} icon={Users} />
        <StatCard label="Evaluations" value={totalEvaluations} icon={ClipboardList} color="text-chart-3" />
        <StatCard
          label="Domains Covered"
          value={Object.keys(domainAssignments).filter((d) => d !== "Unassigned").length}
          icon={Globe}
          color="text-chart-1"
        />
        <StatCard
          label="Avg Score"
          value={
            totalEvaluations > 0
              ? (
                  Object.values(judgeEvalMap)
                    .flat()
                    .reduce((s, e) => s + (e.totalScore ?? e.score), 0) / totalEvaluations
                ).toFixed(1)
              : "---"
          }
          icon={BarChart3}
          color="text-chart-2"
        />
      </div>

      {/* Add Judge Form */}
      <AnimatePresence>
        {showCreateForm && (
          <motion.div
            initial={{ opacity: 0, height: 0 }}
            animate={{ opacity: 1, height: "auto" }}
            exit={{ opacity: 0, height: 0 }}
            className="overflow-hidden"
          >
            <Card className="border-primary/30">
              <CardHeader className="pb-3 pt-4 px-4">
                <CardTitle className="text-sm flex items-center gap-2">
                  <Plus className="w-4 h-4 text-primary" />
                  Add New Judge
                </CardTitle>
              </CardHeader>
              <CardContent className="px-4 pb-4">
                <div className="grid gap-3 sm:grid-cols-3">
                  <Input
                    placeholder="Name *"
                    value={createForm.label}
                    onChange={(e) => setCreateForm((f) => ({ ...f, label: e.target.value }))}
                  />
                  <Input
                    placeholder="Email (optional)"
                    type="email"
                    value={createForm.email}
                    onChange={(e) => setCreateForm((f) => ({ ...f, email: e.target.value }))}
                  />
                  <Select
                    value={createForm.domain}
                    onValueChange={(v) => setCreateForm((f) => ({ ...f, domain: v }))}
                  >
                    <SelectTrigger>
                      <SelectValue placeholder="Select Domain" />
                    </SelectTrigger>
                    <SelectContent>
                      {DOMAINS.map((d) => (
                        <SelectItem key={d} value={d}>
                          {d}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
                <div className="flex gap-2 mt-4">
                  <Button size="sm" onClick={handleCreateJudge} disabled={creating || !createForm.label.trim()}>
                    {creating ? <RefreshCw className="w-4 h-4 mr-2 animate-spin" /> : <Plus className="w-4 h-4 mr-2" />}
                    Add Judge
                  </Button>
                  <Button
                    size="sm"
                    variant="ghost"
                    onClick={() => {
                      setShowCreateForm(false);
                      setCreateForm(EMPTY_FORM);
                    }}
                  >
                    Cancel
                  </Button>
                </div>
              </CardContent>
            </Card>
          </motion.div>
        )}
      </AnimatePresence>

      {/* Domain Assignment Overview */}
      {Object.keys(domainAssignments).length > 0 && (
        <Card>
          <CardHeader className="pb-2 pt-4 px-4">
            <CardTitle className="text-sm flex items-center gap-2">
              <Briefcase className="w-4 h-4 text-muted-foreground" />
              Domain Assignments
            </CardTitle>
          </CardHeader>
          <CardContent className="px-4 pb-4">
            <div className="flex flex-wrap gap-2">
              {Object.entries(domainAssignments).map(([domain, count]) => (
                <Badge
                  key={domain}
                  variant="outline"
                  className="gap-1.5 py-1 px-2.5 text-xs cursor-pointer hover:bg-muted/50 transition-colors"
                  onClick={() => {
                    if (domain === "Unassigned") return;
                    setDomainFilter(domain === domainFilter ? "all" : domain);
                  }}
                >
                  <Globe className="w-3 h-3" />
                  {domain}
                  <span className="font-mono font-bold ml-1">{count}</span>
                </Badge>
              ))}
            </div>
          </CardContent>
        </Card>
      )}

      {/* Search & Filters */}
      <div className="flex flex-col sm:flex-row gap-2">
        <div className="relative flex-1">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
          <Input
            placeholder="Search by name, domain, or email..."
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            className="pl-9"
          />
        </div>
        <div className="flex gap-2 flex-wrap">
          <Select value={domainFilter} onValueChange={setDomainFilter}>
            <SelectTrigger className="w-[160px]">
              <SelectValue placeholder="Domain" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="all">All Domains</SelectItem>
              {DOMAINS.map((d) => (
                <SelectItem key={d} value={d}>
                  {d}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
          {hasFilters && (
            <Button variant="ghost" size="sm" onClick={clearFilters} className="h-9">
              <X className="w-4 h-4 mr-1" />
              Clear
            </Button>
          )}
        </div>
      </div>

      {/* Judges List */}
      {filtered.length === 0 ? (
        <Card>
          <CardContent className="py-12 text-center text-muted-foreground">
            <p className="text-sm">No judges found{hasFilters ? " matching your filters" : ""}.</p>
          </CardContent>
        </Card>
      ) : (
        <div className="grid gap-3">
          <AnimatePresence mode="popLayout">
            {filtered.map((judge) => (
              <JudgeCard
                key={judge.id}
                judge={judge}
                isExpanded={expandedJudgeId === judge.id}
                detailTab={detailTab}
                isProcessing={processingIds.has(judge.id)}
                copiedText={copiedText}
                evaluations={judgeEvalMap[judge.id] ?? []}
                onToggleExpand={() => toggleExpand(judge.id)}
                onSetDetailTab={(tab) => setDetailTab(tab)}
                onDelete={() => setDeleteTarget(judge)}
                onCopy={handleCopy}
                getTimeline={() => getJudgeTimeline(judge)}
              />
            ))}
          </AnimatePresence>
        </div>
      )}

      {/* Delete Judge Dialog */}
      <ConfirmDialog
        open={!!deleteTarget}
        onOpenChange={(open) => {
          if (!open) setDeleteTarget(null);
        }}
        title="Delete Judge"
        description={deleteTarget ? `Are you sure you want to delete "${deleteTarget.label}"? This action cannot be undone.` : ""}
        confirmLabel="Delete"
        variant="destructive"
        onConfirm={() => {
          if (deleteTarget) handleDeleteJudge(deleteTarget);
        }}
      />
    </div>
  );
}

// ─── Judge Card Component ───────────────────────────────────────────────────

interface JudgeCardProps {
  judge: Judge;
  isExpanded: boolean;
  detailTab: DetailTab;
  isProcessing: boolean;
  copiedText: string | null;
  evaluations: Array<{ teamId: number; teamName: string; score: number; totalScore: number; date: string }>;
  onToggleExpand: () => void;
  onSetDetailTab: (tab: DetailTab) => void;
  onDelete: () => void;
  onCopy: (text: string) => void;
  getTimeline: () => TimelineStepData[];
}

function JudgeCard({
  judge,
  isExpanded,
  detailTab,
  isProcessing,
  copiedText,
  evaluations,
  onToggleExpand,
  onSetDetailTab,
  onDelete,
  onCopy,
  getTimeline,
}: JudgeCardProps) {
  const evalCount = evaluations.length;

  return (
    <motion.div
      layout
      initial={{ opacity: 0, y: 8 }}
      animate={{ opacity: 1, y: 0 }}
      exit={{ opacity: 0, scale: 0.95 }}
      transition={{ duration: 0.2 }}
    >
      <Card
        className={`transition-colors ${isProcessing ? "opacity-60 pointer-events-none" : ""} ${
          isExpanded ? "border-primary/40 shadow-md" : ""
        }`}
      >
        <CardHeader className="pb-2 pt-4 px-4">
          <div className="flex items-start gap-3">
            <div className="flex-1 min-w-0">
              <div className="flex flex-wrap items-center gap-2">
                <span className="text-xs font-mono text-muted-foreground">#{judge.id}</span>
                <CardTitle className="text-base truncate">{judge.label}</CardTitle>
                {judge.domain && (
                  <Badge variant="outline" className="text-xs gap-1">
                    <Globe className="w-3 h-3" />
                    {judge.domain}
                  </Badge>
                )}
                <Badge
                  className={`text-xs gap-1 ${
                    evalCount > 0
                      ? "bg-green-500/15 text-green-600 border-green-500/30"
                      : "bg-muted text-muted-foreground border-border"
                  }`}
                >
                  <ClipboardList className="w-3 h-3" />
                  {evalCount} eval{evalCount !== 1 ? "s" : ""}
                </Badge>
              </div>
              <div className="flex flex-wrap gap-x-4 gap-y-1 text-sm text-muted-foreground mt-1.5">
                {judge.email && (
                  <span className="flex items-center gap-1 text-xs">
                    <Mail className="w-3 h-3" />
                    {judge.email}
                  </span>
                )}
                <span className="flex items-center gap-1 text-xs font-mono">
                  <code className="max-w-[140px] truncate">{judge.code}</code>
                  <Button
                    size="sm"
                    variant="ghost"
                    className="h-5 w-5 p-0"
                    onClick={(e) => {
                      e.stopPropagation();
                      onCopy(judge.code);
                    }}
                  >
                    {copiedText === judge.code ? (
                      <Check className="w-3 h-3 text-green-600" />
                    ) : (
                      <Copy className="w-3 h-3" />
                    )}
                  </Button>
                </span>
              </div>
            </div>

            <Button variant="ghost" size="sm" className="h-7 w-7 p-0 flex-shrink-0" onClick={onToggleExpand}>
              {isExpanded ? <ChevronUp className="w-4 h-4" /> : <ChevronDown className="w-4 h-4" />}
            </Button>
          </div>
        </CardHeader>

        <CardContent className="px-4 pb-4 pt-0">
          {/* Expanded detail view */}
          <AnimatePresence>
            {isExpanded && (
              <motion.div
                initial={{ opacity: 0, height: 0 }}
                animate={{ opacity: 1, height: "auto" }}
                exit={{ opacity: 0, height: 0 }}
                transition={{ duration: 0.25 }}
                className="overflow-hidden"
              >
                <div className="mt-4 pt-4 border-t border-border">
                  <Tabs value={detailTab} onValueChange={(v) => onSetDetailTab(v as DetailTab)}>
                    <TabsList className="w-full sm:w-auto grid grid-cols-4 sm:inline-flex mb-4">
                      <TabsTrigger value="info" className="gap-1.5 text-xs">
                        <User className="w-3 h-3" />
                        Profile
                      </TabsTrigger>
                      <TabsTrigger value="evaluations" className="gap-1.5 text-xs">
                        <ClipboardList className="w-3 h-3" />
                        Evaluations
                      </TabsTrigger>
                      <TabsTrigger value="metrics" className="gap-1.5 text-xs">
                        <BarChart3 className="w-3 h-3" />
                        Metrics
                      </TabsTrigger>
                      <TabsTrigger value="timeline" className="gap-1.5 text-xs">
                        <Clock className="w-3 h-3" />
                        Timeline
                      </TabsTrigger>
                    </TabsList>

                    {/* Profile Tab */}
                    <TabsContent value="info" className="mt-0">
                      <JudgeProfileView judge={judge} evalCount={evalCount} copiedText={copiedText} onCopy={onCopy} />
                    </TabsContent>

                    {/* Evaluations Tab */}
                    <TabsContent value="evaluations" className="mt-0">
                      <JudgeEvaluationsView evaluations={evaluations} />
                    </TabsContent>

                    {/* Metrics Tab */}
                    <TabsContent value="metrics" className="mt-0">
                      <JudgeMetricsView evaluations={evaluations} />
                    </TabsContent>

                    {/* Timeline Tab */}
                    <TabsContent value="timeline" className="mt-0">
                      <TimelineStep steps={getTimeline()} />
                    </TabsContent>
                  </Tabs>

                  {/* Action Buttons */}
                  <div className="flex flex-wrap gap-2 mt-4 pt-4 border-t border-border">
                    <Button
                      size="sm"
                      variant="outline"
                      className="h-7 text-xs"
                      onClick={(e) => {
                        e.stopPropagation();
                        onCopy(judge.code);
                      }}
                    >
                      {copiedText === judge.code ? (
                        <Check className="w-3.5 h-3.5 mr-1 text-green-600" />
                      ) : (
                        <Copy className="w-3.5 h-3.5 mr-1" />
                      )}
                      Copy Code
                    </Button>
                    <Button
                      size="sm"
                      variant="outline"
                      className="h-7 text-xs text-red-600 border-red-500/30 hover:bg-red-500/10"
                      onClick={onDelete}
                    >
                      <Trash2 className="w-3.5 h-3.5 mr-1" />
                      Delete
                    </Button>
                  </div>
                </div>
              </motion.div>
            )}
          </AnimatePresence>
        </CardContent>
      </Card>
    </motion.div>
  );
}

// ─── Judge Profile View ─────────────────────────────────────────────────────

function JudgeProfileView({
  judge,
  evalCount,
  copiedText,
  onCopy,
}: {
  judge: Judge;
  evalCount: number;
  copiedText: string | null;
  onCopy: (text: string) => void;
}) {
  return (
    <div className="space-y-4">
      <div className="grid gap-3 sm:grid-cols-2">
        <InfoField label="Name" value={judge.label} icon={User} />
        <InfoField label="Domain Expertise" value={judge.domain || "Not assigned"} icon={Globe} />
        <InfoField label="Email" value={judge.email || "Not provided"} icon={Mail} />
        <InfoField label="Years of Experience" value={judge.yearsOfExperience != null ? `${judge.yearsOfExperience} years` : "N/A"} icon={Briefcase} />
        <InfoField label="Created" value={formatDate(judge.createdAt)} icon={Clock} />
        <InfoField label="Evaluations Completed" value={String(evalCount)} icon={ClipboardList} />
      </div>

      {judge.bio && (
        <div>
          <p className="text-xs font-semibold uppercase text-muted-foreground mb-1">Bio</p>
          <p className="text-sm text-foreground bg-muted/30 p-3 rounded-md">{judge.bio}</p>
        </div>
      )}

      {/* Credentials */}
      <div>
        <p className="text-xs font-semibold uppercase text-muted-foreground mb-2">Login Code</p>
        <div className="flex items-center gap-2 p-3 bg-muted/30 rounded-md">
          <code className="flex-1 text-sm font-mono">{judge.code}</code>
          <Button
            size="sm"
            variant="ghost"
            className="h-7 w-7 p-0"
            onClick={() => onCopy(judge.code)}
          >
            {copiedText === judge.code ? (
              <Check className="w-3.5 h-3.5 text-green-600" />
            ) : (
              <Copy className="w-3.5 h-3.5" />
            )}
          </Button>
        </div>
      </div>
    </div>
  );
}

function InfoField({
  label,
  value,
  icon: Icon,
}: {
  label: string;
  value: string;
  icon?: React.ComponentType<{ className?: string }>;
}) {
  return (
    <div className="space-y-0.5">
      <p className="text-xs text-muted-foreground flex items-center gap-1">
        {Icon && <Icon className="w-3 h-3" />}
        {label}
      </p>
      <p className="text-sm font-medium">{value}</p>
    </div>
  );
}

// ─── Judge Evaluations View ─────────────────────────────────────────────────

function JudgeEvaluationsView({
  evaluations,
}: {
  evaluations: Array<{ teamId: number; teamName: string; score: number; totalScore: number; date: string }>;
}) {
  if (evaluations.length === 0) {
    return (
      <div className="text-center py-8">
        <ClipboardList className="w-8 h-8 text-muted-foreground mx-auto mb-2" />
        <p className="text-sm text-muted-foreground">No evaluations submitted yet</p>
      </div>
    );
  }

  return (
    <div className="space-y-3">
      <p className="text-xs font-semibold uppercase text-muted-foreground">
        Teams Evaluated ({evaluations.length})
      </p>
      <div className="space-y-2">
        {evaluations.map((ev) => (
          <div
            key={ev.teamId}
            className="flex items-center justify-between p-3 bg-muted/30 rounded-md"
          >
            <div className="flex-1 min-w-0">
              <p className="text-sm font-medium truncate">{ev.teamName}</p>
              <p className="text-xs text-muted-foreground">{formatDate(ev.date)}</p>
            </div>
            <div className="flex items-center gap-2 flex-shrink-0">
              <Badge variant="outline" className="gap-1 font-mono">
                <Star className="w-3 h-3 text-amber-500" />
                {ev.totalScore ?? ev.score}
              </Badge>
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}

// ─── Judge Metrics View ─────────────────────────────────────────────────────

function JudgeMetricsView({
  evaluations,
}: {
  evaluations: Array<{ teamId: number; teamName: string; score: number; totalScore: number; date: string }>;
}) {
  if (evaluations.length === 0) {
    return (
      <div className="text-center py-8">
        <BarChart3 className="w-8 h-8 text-muted-foreground mx-auto mb-2" />
        <p className="text-sm text-muted-foreground">No scoring data available</p>
      </div>
    );
  }

  const scores = evaluations.map((e) => e.totalScore ?? e.score);
  const avg = scores.reduce((s, v) => s + v, 0) / scores.length;
  const min = Math.min(...scores);
  const max = Math.max(...scores);

  return (
    <div className="space-y-4">
      <p className="text-xs font-semibold uppercase text-muted-foreground">Performance Metrics</p>

      <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
        <MetricCard label="Total Evaluations" value={String(evaluations.length)} />
        <MetricCard label="Average Score" value={avg.toFixed(1)} />
        <MetricCard label="Lowest Score" value={String(min)} />
        <MetricCard label="Highest Score" value={String(max)} />
      </div>

      {/* Score distribution visual */}
      <div>
        <p className="text-xs text-muted-foreground mb-2">Score Range</p>
        <div className="h-3 bg-muted rounded-full overflow-hidden relative">
          <div
            className="h-full bg-gradient-to-r from-chart-1 to-chart-3 rounded-full"
            style={{ width: `${max > 0 ? (avg / max) * 100 : 0}%` }}
          />
        </div>
        <div className="flex justify-between text-xs text-muted-foreground mt-1">
          <span>{min}</span>
          <span className="font-medium">avg: {avg.toFixed(1)}</span>
          <span>{max}</span>
        </div>
      </div>
    </div>
  );
}

function MetricCard({ label, value }: { label: string; value: string }) {
  return (
    <div className="p-3 bg-muted/30 rounded-md text-center">
      <p className="text-xl font-bold font-mono">{value}</p>
      <p className="text-xs text-muted-foreground mt-0.5">{label}</p>
    </div>
  );
}
