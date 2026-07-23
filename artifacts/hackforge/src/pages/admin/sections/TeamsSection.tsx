import { useState, useMemo, useCallback } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
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
  Users,
  Trophy,
  Shield,
  ShieldOff,
  Trash2,
  Edit3,
  Save,
  XCircle,
  Copy,
  Check,
  ChevronDown,
  ChevronUp,
  ExternalLink,
  Github,
  Key,
  Video,
  Clock,
  Star,
  AlertTriangle,
  RefreshCw,
  Hash,
  Globe,
  Calendar,
  Info,
  Lock,
} from "lucide-react";
import { useAdminFetch, adminApi } from "../lib/api";
import type { Team, AdminLog } from "../lib/types";
import ConfirmDialog from "../components/shared/ConfirmDialog";
import TimelineStep, { type TimelineStepData } from "../components/shared/TimelineStep";

// ─── Extended team type with fields from the API ─────────────────────────────

interface TeamFull extends Team {
  domain?: string;
  status?: string;
  maxMembers?: number;
  disqualifiedAt?: string | null;
  disqualifiedBy?: string | null;
  presentationSlot?: string | null;
  createdAt?: string;
  members?: Array<{ id: number; code: string; label: string }>;
}

interface TeamCredentials {
  teamLoginCode: string;
  meetCodes: string[];
}

type StatusFilter = "all" | "active" | "disqualified" | "finalist";
type DetailTab = "info" | "credentials" | "progress" | "timeline";

// ─── Create Team Form Data ───────────────────────────────────────────────────

interface CreateTeamForm {
  name: string;
  projectTitle: string;
  description: string;
  githubUrl: string;
  domain: string;
}

const EMPTY_FORM: CreateTeamForm = {
  name: "",
  projectTitle: "",
  description: "",
  githubUrl: "",
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

// ─── Utility Functions ───────────────────────────────────────────────────────

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

function getTeamStatus(team: TeamFull): "active" | "disqualified" {
  if (team.status === "disqualified" || team.disqualifiedAt) return "disqualified";
  return "active";
}

// ─── Main Component ──────────────────────────────────────────────────────────

export default function TeamsSection() {
  const { data: teams, loading, refetch } = useAdminFetch<TeamFull[]>("/api/teams");
  const { data: logs } = useAdminFetch<AdminLog[]>("/api/admin/logs");

  // Filters
  const [searchQuery, setSearchQuery] = useState("");
  const [domainFilter, setDomainFilter] = useState<string>("all");
  const [activeTab, setActiveTab] = useState<StatusFilter>("all");

  // Expanded state
  const [expandedTeamId, setExpandedTeamId] = useState<number | null>(null);
  const [detailTab, setDetailTab] = useState<DetailTab>("info");

  // Create team form
  const [showCreateForm, setShowCreateForm] = useState(false);
  const [createForm, setCreateForm] = useState<CreateTeamForm>(EMPTY_FORM);
  const [creating, setCreating] = useState(false);

  // Edit state
  const [editingTeamId, setEditingTeamId] = useState<number | null>(null);
  const [editForm, setEditForm] = useState<CreateTeamForm>(EMPTY_FORM);
  const [saving, setSaving] = useState(false);

  // Credentials cache
  const [credentialsCache, setCredentialsCache] = useState<Record<number, TeamCredentials>>({});
  const [loadingCredentials, setLoadingCredentials] = useState<number | null>(null);

  // Dialogs
  const [removeTarget, setRemoveTarget] = useState<TeamFull | null>(null);
  const [disqualifyTarget, setDisqualifyTarget] = useState<TeamFull | null>(null);
  const [finalistTarget, setFinalistTarget] = useState<TeamFull | null>(null);

  // Copy feedback
  const [copiedText, setCopiedText] = useState<string | null>(null);

  // Processing state
  const [processingIds, setProcessingIds] = useState<Set<number>>(new Set());

  const allTeams = teams ?? [];

  // Status counts
  const counts = useMemo(() => {
    const c = { all: allTeams.length, active: 0, disqualified: 0, finalist: 0 };
    allTeams.forEach((t) => {
      const s = getTeamStatus(t);
      c[s]++;
      if (t.isFinalist) c.finalist++;
    });
    return c;
  }, [allTeams]);

  // Filtered teams
  const filtered = useMemo(() => {
    let result = allTeams;

    // Status tab filter
    if (activeTab === "active") {
      result = result.filter((t) => getTeamStatus(t) === "active");
    } else if (activeTab === "disqualified") {
      result = result.filter((t) => getTeamStatus(t) === "disqualified");
    } else if (activeTab === "finalist") {
      result = result.filter((t) => t.isFinalist);
    }

    // Text search
    if (searchQuery.trim()) {
      const q = searchQuery.toLowerCase();
      result = result.filter(
        (t) =>
          t.name.toLowerCase().includes(q) ||
          (t.projectTitle && t.projectTitle.toLowerCase().includes(q))
      );
    }

    // Domain filter
    if (domainFilter !== "all") {
      result = result.filter((t) => t.domain === domainFilter || t.track === domainFilter);
    }

    return result;
  }, [allTeams, activeTab, searchQuery, domainFilter]);

  const hasFilters = searchQuery || domainFilter !== "all";

  const clearFilters = () => {
    setSearchQuery("");
    setDomainFilter("all");
  };

  // ─── Actions ────────────────────────────────────────────────────────────────

  const handleCreateTeam = useCallback(async () => {
    if (!createForm.name.trim() || !createForm.projectTitle.trim()) return;
    setCreating(true);
    try {
      await adminApi("POST", "/api/teams", {
        name: createForm.name,
        projectTitle: createForm.projectTitle,
        description: createForm.description || null,
        githubUrl: createForm.githubUrl || null,
        domain: createForm.domain || null,
      });
      setCreateForm(EMPTY_FORM);
      setShowCreateForm(false);
      refetch();
    } catch (e) {
      console.error("Create team failed:", e);
    } finally {
      setCreating(false);
    }
  }, [createForm, refetch]);

  const handleSaveEdit = useCallback(
    async (teamId: number) => {
      setSaving(true);
      try {
        await adminApi("PUT", `/api/teams/${teamId}`, {
          name: editForm.name,
          projectTitle: editForm.projectTitle,
          description: editForm.description || null,
          githubUrl: editForm.githubUrl || null,
          domain: editForm.domain || null,
        });
        setEditingTeamId(null);
        refetch();
      } catch (e) {
        console.error("Save team failed:", e);
      } finally {
        setSaving(false);
      }
    },
    [editForm, refetch]
  );

  const handleToggleFinalist = useCallback(
    async (team: TeamFull) => {
      setProcessingIds((prev) => new Set(prev).add(team.id));
      try {
        await adminApi("POST", `/api/teams/${team.id}/finalist`);
        refetch();
      } catch (e) {
        console.error("Toggle finalist failed:", e);
      } finally {
        setProcessingIds((prev) => {
          const next = new Set(prev);
          next.delete(team.id);
          return next;
        });
        setFinalistTarget(null);
      }
    },
    [refetch]
  );

  const handleDisqualify = useCallback(
    async (team: TeamFull, reason: string) => {
      setProcessingIds((prev) => new Set(prev).add(team.id));
      try {
        await adminApi("PUT", `/api/teams/${team.id}`, {
          status: "disqualified",
          disqualifiedAt: new Date().toISOString(),
        });
        refetch();
      } catch (e) {
        console.error("Disqualify failed:", e);
      } finally {
        setProcessingIds((prev) => {
          const next = new Set(prev);
          next.delete(team.id);
          return next;
        });
        setDisqualifyTarget(null);
      }
    },
    [refetch]
  );

  const handleRemoveTeam = useCallback(
    async (team: TeamFull) => {
      setProcessingIds((prev) => new Set(prev).add(team.id));
      try {
        await adminApi("DELETE", `/api/teams/${team.id}`);
        if (expandedTeamId === team.id) setExpandedTeamId(null);
        refetch();
      } catch (e) {
        console.error("Remove team failed:", e);
      } finally {
        setProcessingIds((prev) => {
          const next = new Set(prev);
          next.delete(team.id);
          return next;
        });
        setRemoveTarget(null);
      }
    },
    [refetch, expandedTeamId]
  );

  const fetchCredentials = useCallback(async (teamId: number) => {
    if (credentialsCache[teamId]) return;
    setLoadingCredentials(teamId);
    try {
      const data = await adminApi("GET", `/api/codes/team/${teamId}`);
      setCredentialsCache((prev) => ({ ...prev, [teamId]: data }));
    } catch (e) {
      console.error("Fetch credentials failed:", e);
    } finally {
      setLoadingCredentials(null);
    }
  }, [credentialsCache]);

  const handleCopy = (text: string) => {
    navigator.clipboard.writeText(text);
    setCopiedText(text);
    setTimeout(() => setCopiedText(null), 2000);
  };

  const startEdit = (team: TeamFull) => {
    setEditingTeamId(team.id);
    setEditForm({
      name: team.name,
      projectTitle: team.projectTitle || "",
      description: team.description || "",
      githubUrl: team.githubUrl || "",
      domain: team.domain || team.track || "",
    });
  };

  const toggleExpand = (teamId: number) => {
    if (expandedTeamId === teamId) {
      setExpandedTeamId(null);
    } else {
      setExpandedTeamId(teamId);
      setDetailTab("info");
    }
  };

  // Build timeline for a team from logs
  const getTeamTimeline = (team: TeamFull): TimelineStepData[] => {
    const teamLogs = (logs ?? []).filter(
      (log) =>
        log.details?.toLowerCase().includes(team.name.toLowerCase()) ||
        log.action.toLowerCase().includes(team.name.toLowerCase())
    );

    const steps: TimelineStepData[] = [];

    // Always show created step
    steps.push({
      title: "Team Created",
      description: team.createdAt ? formatDate(team.createdAt) : "Registration",
      status: "completed",
    });

    // Check for code generation events
    const codeLog = teamLogs.find(
      (l) => l.action.toLowerCase().includes("code") || l.action.toLowerCase().includes("assign")
    );
    if (codeLog) {
      steps.push({
        title: "Codes Generated",
        description: formatDate(codeLog.createdAt),
        status: "completed",
      });
    } else {
      steps.push({
        title: "Codes Generated",
        description: "Pending",
        status: team.members && team.members.length > 0 ? "completed" : "upcoming",
      });
    }

    // Submission status
    const submissionLog = teamLogs.find(
      (l) => l.action.toLowerCase().includes("submission") || l.action.toLowerCase().includes("submit")
    );
    if (submissionLog) {
      steps.push({
        title: "Project Submitted",
        description: formatDate(submissionLog.createdAt),
        status: "completed",
      });
    } else {
      steps.push({
        title: "Project Submitted",
        description: "Awaiting submission",
        status: "upcoming",
      });
    }

    // Finalist
    if (team.isFinalist) {
      steps.push({
        title: "Selected as Finalist",
        description: "Qualified for finals",
        status: "completed",
      });
    } else {
      steps.push({
        title: "Finalist Selection",
        description: "Pending evaluation",
        status: "upcoming",
      });
    }

    // Disqualification (if applicable)
    if (getTeamStatus(team) === "disqualified") {
      steps.push({
        title: "Disqualified",
        description: team.disqualifiedAt ? formatDate(team.disqualifiedAt) : "Reason not recorded",
        status: "completed",
      });
    }

    return steps;
  };

  // ─── Render ─────────────────────────────────────────────────────────────────

  if (loading && !teams) {
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

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3">
        <div>
          <h2 className="text-lg font-semibold">Teams Management</h2>
          <p className="text-sm text-muted-foreground">
            {counts.all} teams registered, {counts.finalist} finalist(s)
          </p>
        </div>
        <Button size="sm" onClick={() => setShowCreateForm(!showCreateForm)}>
          <Plus className="w-4 h-4 mr-2" />
          Create Team
        </Button>
      </div>

      {/* Create Team Form */}
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
                  Create New Team
                </CardTitle>
              </CardHeader>
              <CardContent className="px-4 pb-4">
                <div className="grid gap-3 sm:grid-cols-2">
                  <Input
                    placeholder="Team Name *"
                    value={createForm.name}
                    onChange={(e) => setCreateForm((f) => ({ ...f, name: e.target.value }))}
                  />
                  <Input
                    placeholder="Project Title *"
                    value={createForm.projectTitle}
                    onChange={(e) => setCreateForm((f) => ({ ...f, projectTitle: e.target.value }))}
                  />
                  <Input
                    placeholder="GitHub URL"
                    value={createForm.githubUrl}
                    onChange={(e) => setCreateForm((f) => ({ ...f, githubUrl: e.target.value }))}
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
                  <div className="sm:col-span-2">
                    <Textarea
                      placeholder="Description"
                      value={createForm.description}
                      onChange={(e) => setCreateForm((f) => ({ ...f, description: e.target.value }))}
                      rows={3}
                    />
                  </div>
                </div>
                <div className="flex gap-2 mt-4">
                  <Button size="sm" onClick={handleCreateTeam} disabled={creating || !createForm.name.trim() || !createForm.projectTitle.trim()}>
                    {creating ? <RefreshCw className="w-4 h-4 mr-2 animate-spin" /> : <Plus className="w-4 h-4 mr-2" />}
                    Create
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

      {/* Tabs with counters */}
      <Tabs value={activeTab} onValueChange={(v) => setActiveTab(v as StatusFilter)}>
        <TabsList className="w-full sm:w-auto grid grid-cols-4 sm:inline-flex">
          <TabsTrigger value="all" className="gap-1.5 text-xs sm:text-sm">
            <Users className="w-3 h-3" />
            All
            <Badge variant="secondary" className="ml-1 h-5 px-1.5 text-[10px]">
              {counts.all}
            </Badge>
          </TabsTrigger>
          <TabsTrigger value="active" className="gap-1.5 text-xs sm:text-sm">
            <Shield className="w-3 h-3" />
            Active
            <Badge variant="secondary" className="ml-1 h-5 px-1.5 text-[10px] bg-green-500/15 text-green-600 border-green-500/30">
              {counts.active}
            </Badge>
          </TabsTrigger>
          <TabsTrigger value="finalist" className="gap-1.5 text-xs sm:text-sm">
            <Trophy className="w-3 h-3" />
            Finalists
            <Badge variant="secondary" className="ml-1 h-5 px-1.5 text-[10px] bg-amber-500/15 text-amber-600 border-amber-500/30">
              {counts.finalist}
            </Badge>
          </TabsTrigger>
          <TabsTrigger value="disqualified" className="gap-1.5 text-xs sm:text-sm">
            <ShieldOff className="w-3 h-3" />
            Disqualified
            <Badge variant="secondary" className="ml-1 h-5 px-1.5 text-[10px] bg-red-500/15 text-red-600 border-red-500/30">
              {counts.disqualified}
            </Badge>
          </TabsTrigger>
        </TabsList>

        {/* Search & Filters */}
        <div className="mt-4 space-y-3">
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
        </div>

        {/* Teams List */}
        <TabsContent value={activeTab} className="mt-4">
          {filtered.length === 0 ? (
            <Card>
              <CardContent className="py-12 text-center text-muted-foreground">
                <p className="text-sm">No teams found{hasFilters ? " matching your filters" : ""}.</p>
              </CardContent>
            </Card>
          ) : (
            <div className="grid gap-3">
              <AnimatePresence mode="popLayout">
                {filtered.map((team) => (
                  <TeamCard
                    key={team.id}
                    team={team}
                    isExpanded={expandedTeamId === team.id}
                    isEditing={editingTeamId === team.id}
                    editForm={editForm}
                    detailTab={detailTab}
                    isProcessing={processingIds.has(team.id)}
                    credentials={credentialsCache[team.id] ?? null}
                    loadingCredentials={loadingCredentials === team.id}
                    copiedText={copiedText}
                    saving={saving}
                    logs={logs ?? []}
                    onToggleExpand={() => toggleExpand(team.id)}
                    onSetDetailTab={(tab) => setDetailTab(tab)}
                    onStartEdit={() => startEdit(team)}
                    onCancelEdit={() => setEditingTeamId(null)}
                    onSaveEdit={() => handleSaveEdit(team.id)}
                    onEditFormChange={setEditForm}
                    onToggleFinalist={() => setFinalistTarget(team)}
                    onDisqualify={() => setDisqualifyTarget(team)}
                    onRemove={() => setRemoveTarget(team)}
                    onFetchCredentials={() => fetchCredentials(team.id)}
                    onCopy={handleCopy}
                    getTeamTimeline={() => getTeamTimeline(team)}
                  />
                ))}
              </AnimatePresence>
            </div>
          )}
        </TabsContent>
      </Tabs>

      {/* Remove Team Dialog */}
      <ConfirmDialog
        open={!!removeTarget}
        onOpenChange={(open) => {
          if (!open) setRemoveTarget(null);
        }}
        title="Remove Team"
        description={removeTarget ? `Are you sure you want to permanently remove "${removeTarget.name}"? This action cannot be undone.` : ""}
        confirmLabel="Remove"
        variant="destructive"
        onConfirm={() => {
          if (removeTarget) handleRemoveTeam(removeTarget);
        }}
      />

      {/* Disqualify Dialog */}
      <ConfirmDialog
        open={!!disqualifyTarget}
        onOpenChange={(open) => {
          if (!open) setDisqualifyTarget(null);
        }}
        title="Disqualify Team"
        description={disqualifyTarget ? `Disqualify "${disqualifyTarget.name}" from the competition? This will mark them as disqualified.` : ""}
        confirmLabel="Disqualify"
        variant="destructive"
        withReason
        reasonLabel="Reason for disqualification (required)"
        reasonPlaceholder="Enter the reason for disqualification..."
        onConfirm={(reason) => {
          if (disqualifyTarget && reason) handleDisqualify(disqualifyTarget, reason);
        }}
      />

      {/* Finalist Toggle Dialog */}
      <ConfirmDialog
        open={!!finalistTarget}
        onOpenChange={(open) => {
          if (!open) setFinalistTarget(null);
        }}
        title={finalistTarget?.isFinalist ? "Remove Finalist Status" : "Mark as Finalist"}
        description={
          finalistTarget
            ? finalistTarget.isFinalist
              ? `Remove "${finalistTarget.name}" from the finalist list?`
              : `Mark "${finalistTarget.name}" as a finalist?`
            : ""
        }
        confirmLabel={finalistTarget?.isFinalist ? "Remove Finalist" : "Mark Finalist"}
        variant="default"
        onConfirm={() => {
          if (finalistTarget) handleToggleFinalist(finalistTarget);
        }}
      />
    </div>
  );
}

// ─── Team Card Component ─────────────────────────────────────────────────────

interface TeamCardProps {
  team: TeamFull;
  isExpanded: boolean;
  isEditing: boolean;
  editForm: CreateTeamForm;
  detailTab: DetailTab;
  isProcessing: boolean;
  credentials: TeamCredentials | null;
  loadingCredentials: boolean;
  copiedText: string | null;
  saving: boolean;
  logs: AdminLog[];
  onToggleExpand: () => void;
  onSetDetailTab: (tab: DetailTab) => void;
  onStartEdit: () => void;
  onCancelEdit: () => void;
  onSaveEdit: () => void;
  onEditFormChange: (form: CreateTeamForm) => void;
  onToggleFinalist: () => void;
  onDisqualify: () => void;
  onRemove: () => void;
  onFetchCredentials: () => void;
  onCopy: (text: string) => void;
  getTeamTimeline: () => TimelineStepData[];
}

function TeamCard({
  team,
  isExpanded,
  isEditing,
  editForm,
  detailTab,
  isProcessing,
  credentials,
  loadingCredentials,
  copiedText,
  saving,
  onToggleExpand,
  onSetDetailTab,
  onStartEdit,
  onCancelEdit,
  onSaveEdit,
  onEditFormChange,
  onToggleFinalist,
  onDisqualify,
  onRemove,
  onFetchCredentials,
  onCopy,
  getTeamTimeline,
}: TeamCardProps) {
  const status = getTeamStatus(team);
  const domain = team.domain || team.track;

  const statusBadge =
    status === "disqualified" ? (
      <Badge className="bg-red-500/15 text-red-600 border-red-500/30 hover:bg-red-500/20">
        Disqualified
      </Badge>
    ) : (
      <Badge className="bg-green-500/15 text-green-600 border-green-500/30 hover:bg-green-500/20">
        Active
      </Badge>
    );

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
                <span className="text-xs font-mono text-muted-foreground">#{team.id}</span>
                <CardTitle className="text-base truncate">{team.name}</CardTitle>
                {statusBadge}
                {team.isFinalist && (
                  <Badge className="bg-amber-500/15 text-amber-600 border-amber-500/30 hover:bg-amber-500/20 gap-1">
                    <Trophy className="w-3 h-3" />
                    Finalist
                  </Badge>
                )}
                {domain && (
                  <Badge variant="outline" className="text-xs gap-1">
                    <Globe className="w-3 h-3" />
                    {domain}
                  </Badge>
                )}
                {team.members && team.members.length > 0 && (
                  <Badge variant="outline" className="text-xs gap-1">
                    <Users className="w-3 h-3" />
                    {team.members.length}
                  </Badge>
                )}
              </div>
              {team.projectTitle && (
                <p className="text-sm text-muted-foreground mt-1 truncate">{team.projectTitle}</p>
              )}
            </div>

            {/* Expand toggle */}
            <Button variant="ghost" size="sm" className="h-7 w-7 p-0 flex-shrink-0" onClick={onToggleExpand}>
              {isExpanded ? <ChevronUp className="w-4 h-4" /> : <ChevronDown className="w-4 h-4" />}
            </Button>
          </div>
        </CardHeader>

        <CardContent className="px-4 pb-4 pt-0">
          {/* Compact info row */}
          <div className="flex flex-wrap gap-x-4 gap-y-1 text-sm text-muted-foreground mt-2">
            {team.githubUrl && (
              <a
                href={team.githubUrl}
                target="_blank"
                rel="noopener noreferrer"
                className="flex items-center gap-1 hover:text-foreground transition-colors"
              >
                <Github className="w-3.5 h-3.5" />
                GitHub
                <ExternalLink className="w-3 h-3" />
              </a>
            )}
            {team.createdAt && (
              <span className="flex items-center gap-1">
                <Calendar className="w-3.5 h-3.5" />
                {formatDate(team.createdAt)}
              </span>
            )}
          </div>

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
                  {/* Detail Tabs */}
                  <Tabs value={detailTab} onValueChange={(v) => onSetDetailTab(v as DetailTab)}>
                    <TabsList className="w-full sm:w-auto grid grid-cols-4 sm:inline-flex mb-4">
                      <TabsTrigger value="info" className="gap-1.5 text-xs">
                        <Info className="w-3 h-3" />
                        Info
                      </TabsTrigger>
                      <TabsTrigger
                        value="credentials"
                        className="gap-1.5 text-xs"
                        onClick={() => {
                          if (!credentials && !loadingCredentials) {
                            onFetchCredentials();
                          }
                        }}
                      >
                        <Key className="w-3 h-3" />
                        Credentials
                      </TabsTrigger>
                      <TabsTrigger value="progress" className="gap-1.5 text-xs">
                        <Star className="w-3 h-3" />
                        Progress
                      </TabsTrigger>
                      <TabsTrigger value="timeline" className="gap-1.5 text-xs">
                        <Clock className="w-3 h-3" />
                        Timeline
                      </TabsTrigger>
                    </TabsList>

                    {/* Info Tab */}
                    <TabsContent value="info" className="mt-0">
                      {isEditing ? (
                        <EditTeamForm
                          editForm={editForm}
                          onChange={onEditFormChange}
                          onSave={onSaveEdit}
                          onCancel={onCancelEdit}
                          saving={saving}
                        />
                      ) : (
                        <TeamInfoView team={team} />
                      )}
                    </TabsContent>

                    {/* Credentials Tab */}
                    <TabsContent value="credentials" className="mt-0">
                      <TeamCredentialsView
                        team={team}
                        credentials={credentials}
                        loading={loadingCredentials}
                        copiedText={copiedText}
                        onCopy={onCopy}
                        onFetch={onFetchCredentials}
                      />
                    </TabsContent>

                    {/* Progress Tab */}
                    <TabsContent value="progress" className="mt-0">
                      <TeamProgressView team={team} />
                    </TabsContent>

                    {/* Timeline Tab */}
                    <TabsContent value="timeline" className="mt-0">
                      <TimelineStep steps={getTeamTimeline()} />
                    </TabsContent>
                  </Tabs>

                  {/* Action Buttons */}
                  <div className="flex flex-wrap gap-2 mt-4 pt-4 border-t border-border">
                    {!isEditing && (
                      <Button size="sm" variant="outline" className="h-7 text-xs" onClick={onStartEdit}>
                        <Edit3 className="w-3.5 h-3.5 mr-1" />
                        Edit
                      </Button>
                    )}
                    <Button
                      size="sm"
                      variant="outline"
                      className={`h-7 text-xs ${
                        team.isFinalist
                          ? "text-amber-600 border-amber-500/30 hover:bg-amber-500/10"
                          : ""
                      }`}
                      onClick={onToggleFinalist}
                    >
                      <Trophy className="w-3.5 h-3.5 mr-1" />
                      {team.isFinalist ? "Remove Finalist" : "Mark Finalist"}
                    </Button>
                    {status !== "disqualified" && (
                      <Button
                        size="sm"
                        variant="outline"
                        className="h-7 text-xs text-orange-600 border-orange-500/30 hover:bg-orange-500/10"
                        onClick={onDisqualify}
                      >
                        <AlertTriangle className="w-3.5 h-3.5 mr-1" />
                        Disqualify
                      </Button>
                    )}
                    <Button
                      size="sm"
                      variant="outline"
                      className="h-7 text-xs text-red-600 border-red-500/30 hover:bg-red-500/10"
                      onClick={onRemove}
                    >
                      <Trash2 className="w-3.5 h-3.5 mr-1" />
                      Remove
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

// ─── Team Info View ──────────────────────────────────────────────────────────

function TeamInfoView({ team }: { team: TeamFull }) {
  return (
    <div className="space-y-4">
      <div className="grid gap-3 sm:grid-cols-2">
        <InfoField label="Team Name" value={team.name} />
        <InfoField label="Team ID" value={`#${team.id}`} />
        <InfoField label="Project Title" value={team.projectTitle || "Not set"} />
        <InfoField label="Domain" value={team.domain || team.track || "Not specified"} />
        <InfoField label="GitHub URL" value={team.githubUrl || "Not provided"} isLink={!!team.githubUrl} />
        <InfoField label="Status" value={getTeamStatus(team)} />
        <InfoField label="Registration Date" value={formatDate(team.createdAt)} />
        <InfoField label="Hackathon ID" value={team.hackathonId ? `#${team.hackathonId}` : "N/A"} />
      </div>

      {team.description && (
        <div>
          <p className="text-xs font-semibold uppercase text-muted-foreground mb-1">Description</p>
          <p className="text-sm text-foreground bg-muted/30 p-3 rounded-md">{team.description}</p>
        </div>
      )}

      {/* Members list */}
      {team.members && team.members.length > 0 && (
        <div>
          <p className="text-xs font-semibold uppercase text-muted-foreground mb-2">Members ({team.members.length})</p>
          <div className="grid gap-2 sm:grid-cols-2">
            {team.members.map((member) => (
              <div key={member.id} className="flex items-center gap-2 p-2 bg-muted/30 rounded-md text-xs">
                <Hash className="w-3 h-3 text-muted-foreground" />
                <span className="font-mono">{member.code}</span>
                {member.label && <span className="text-muted-foreground">({member.label})</span>}
              </div>
            ))}
          </div>
        </div>
      )}
    </div>
  );
}

function InfoField({
  label,
  value,
  isLink = false,
}: {
  label: string;
  value: string;
  isLink?: boolean;
}) {
  return (
    <div className="space-y-0.5">
      <p className="text-xs text-muted-foreground">{label}</p>
      {isLink ? (
        <a
          href={value}
          target="_blank"
          rel="noopener noreferrer"
          className="text-sm font-medium text-primary hover:underline flex items-center gap-1"
        >
          {value}
          <ExternalLink className="w-3 h-3" />
        </a>
      ) : (
        <p className="text-sm font-medium capitalize">{value}</p>
      )}
    </div>
  );
}

// ─── Team Credentials View ───────────────────────────────────────────────────

function TeamCredentialsView({
  team,
  credentials,
  loading,
  copiedText,
  onCopy,
  onFetch,
}: {
  team: TeamFull;
  credentials: TeamCredentials | null;
  loading: boolean;
  copiedText: string | null;
  onCopy: (text: string) => void;
  onFetch: () => void;
}) {
  if (loading) {
    return (
      <div className="space-y-3">
        <div className="h-10 bg-muted/30 rounded animate-pulse" />
        <div className="h-10 bg-muted/30 rounded animate-pulse" />
        <div className="h-10 bg-muted/30 rounded animate-pulse" />
      </div>
    );
  }

  if (!credentials) {
    return (
      <div className="text-center py-8">
        <Key className="w-8 h-8 text-muted-foreground mx-auto mb-2" />
        <p className="text-sm text-muted-foreground mb-3">Credentials not loaded</p>
        <Button size="sm" variant="outline" onClick={onFetch}>
          <RefreshCw className="w-4 h-4 mr-2" />
          Load Credentials
        </Button>
      </div>
    );
  }

  return (
    <div className="space-y-4">
      {/* Team Login Code */}
      <div>
        <p className="text-xs font-semibold uppercase text-muted-foreground mb-2 flex items-center gap-1">
          <Lock className="w-3 h-3" />
          Team Login Code
        </p>
        <div className="flex items-center gap-2 p-3 bg-muted/30 rounded-md">
          <code className="flex-1 text-sm font-mono">{credentials.teamLoginCode}</code>
          <Button
            size="sm"
            variant="ghost"
            className="h-7 w-7 p-0"
            onClick={() => onCopy(credentials.teamLoginCode)}
          >
            {copiedText === credentials.teamLoginCode ? (
              <Check className="w-3.5 h-3.5 text-green-600" />
            ) : (
              <Copy className="w-3.5 h-3.5" />
            )}
          </Button>
        </div>
      </div>

      {/* Member Codes */}
      {team.members && team.members.length > 0 && (
        <div>
          <p className="text-xs font-semibold uppercase text-muted-foreground mb-2 flex items-center gap-1">
            <Users className="w-3 h-3" />
            Member Codes
          </p>
          <div className="space-y-1.5">
            {team.members.map((member) => (
              <div key={member.id} className="flex items-center gap-2 p-2 bg-muted/20 rounded-md">
                <code className="flex-1 text-xs font-mono">{member.code}</code>
                {member.label && (
                  <span className="text-xs text-muted-foreground">{member.label}</span>
                )}
                <Button
                  size="sm"
                  variant="ghost"
                  className="h-6 w-6 p-0"
                  onClick={() => onCopy(member.code)}
                >
                  {copiedText === member.code ? (
                    <Check className="w-3 h-3 text-green-600" />
                  ) : (
                    <Copy className="w-3 h-3" />
                  )}
                </Button>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Meet Codes */}
      {credentials.meetCodes && credentials.meetCodes.length > 0 && (
        <div>
          <p className="text-xs font-semibold uppercase text-muted-foreground mb-2 flex items-center gap-1">
            <Video className="w-3 h-3" />
            Meet Codes
          </p>
          <div className="space-y-1.5">
            {credentials.meetCodes.map((code, i) => (
              <div key={i} className="flex items-center gap-2 p-2 bg-muted/20 rounded-md">
                <code className="flex-1 text-xs font-mono">{code}</code>
                <Button
                  size="sm"
                  variant="ghost"
                  className="h-6 w-6 p-0"
                  onClick={() => onCopy(code)}
                >
                  {copiedText === code ? (
                    <Check className="w-3 h-3 text-green-600" />
                  ) : (
                    <Copy className="w-3 h-3" />
                  )}
                </Button>
              </div>
            ))}
          </div>
        </div>
      )}
    </div>
  );
}

// ─── Team Progress View ──────────────────────────────────────────────────────

function TeamProgressView({ team }: { team: TeamFull }) {
  const status = getTeamStatus(team);

  return (
    <div className="space-y-4">
      <p className="text-xs font-semibold uppercase text-muted-foreground mb-3">Competition Status</p>

      <div className="grid gap-3 sm:grid-cols-2">
        {/* Finalist Status */}
        <div className="flex items-center gap-3 p-3 bg-muted/30 rounded-md">
          <div
            className={`w-8 h-8 rounded-full flex items-center justify-center flex-shrink-0 ${
              team.isFinalist ? "bg-amber-500/20 text-amber-600" : "bg-muted text-muted-foreground"
            }`}
          >
            <Trophy className="w-4 h-4" />
          </div>
          <div>
            <p className="text-sm font-medium">Finalist</p>
            <p className="text-xs text-muted-foreground">
              {team.isFinalist ? "Qualified for finals" : "Not yet selected"}
            </p>
          </div>
        </div>

        {/* Active Status */}
        <div className="flex items-center gap-3 p-3 bg-muted/30 rounded-md">
          <div
            className={`w-8 h-8 rounded-full flex items-center justify-center flex-shrink-0 ${
              status === "active"
                ? "bg-green-500/20 text-green-600"
                : "bg-red-500/20 text-red-600"
            }`}
          >
            {status === "active" ? <Shield className="w-4 h-4" /> : <ShieldOff className="w-4 h-4" />}
          </div>
          <div>
            <p className="text-sm font-medium capitalize">{status}</p>
            <p className="text-xs text-muted-foreground">
              {status === "disqualified" && team.disqualifiedAt
                ? `Since ${formatDate(team.disqualifiedAt)}`
                : status === "active"
                ? "In good standing"
                : "Removed from competition"}
            </p>
          </div>
        </div>

        {/* Submission Status */}
        <div className="flex items-center gap-3 p-3 bg-muted/30 rounded-md">
          <div className="w-8 h-8 rounded-full flex items-center justify-center flex-shrink-0 bg-muted text-muted-foreground">
            <Github className="w-4 h-4" />
          </div>
          <div>
            <p className="text-sm font-medium">Submission</p>
            <p className="text-xs text-muted-foreground">
              {team.githubUrl ? "GitHub repo linked" : "No submission yet"}
            </p>
          </div>
        </div>

        {/* Presentation Slot */}
        <div className="flex items-center gap-3 p-3 bg-muted/30 rounded-md">
          <div
            className={`w-8 h-8 rounded-full flex items-center justify-center flex-shrink-0 ${
              team.presentationSlot ? "bg-primary/20 text-primary" : "bg-muted text-muted-foreground"
            }`}
          >
            <Video className="w-4 h-4" />
          </div>
          <div>
            <p className="text-sm font-medium">Presentation</p>
            <p className="text-xs text-muted-foreground">
              {team.presentationSlot ? `Slot: ${team.presentationSlot}` : "Not scheduled"}
            </p>
          </div>
        </div>
      </div>
    </div>
  );
}

// ─── Edit Team Form ──────────────────────────────────────────────────────────

function EditTeamForm({
  editForm,
  onChange,
  onSave,
  onCancel,
  saving,
}: {
  editForm: CreateTeamForm;
  onChange: (form: CreateTeamForm) => void;
  onSave: () => void;
  onCancel: () => void;
  saving: boolean;
}) {
  return (
    <div className="space-y-3">
      <div className="grid gap-3 sm:grid-cols-2">
        <Input
          placeholder="Team Name"
          value={editForm.name}
          onChange={(e) => onChange({ ...editForm, name: e.target.value })}
        />
        <Input
          placeholder="Project Title"
          value={editForm.projectTitle}
          onChange={(e) => onChange({ ...editForm, projectTitle: e.target.value })}
        />
        <Input
          placeholder="GitHub URL"
          value={editForm.githubUrl}
          onChange={(e) => onChange({ ...editForm, githubUrl: e.target.value })}
        />
        <Select
          value={editForm.domain}
          onValueChange={(v) => onChange({ ...editForm, domain: v })}
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
        <div className="sm:col-span-2">
          <Textarea
            placeholder="Description"
            value={editForm.description}
            onChange={(e) => onChange({ ...editForm, description: e.target.value })}
            rows={3}
          />
        </div>
      </div>
      <div className="flex gap-2">
        <Button size="sm" onClick={onSave} disabled={saving || !editForm.name.trim()}>
          {saving ? <RefreshCw className="w-4 h-4 mr-2 animate-spin" /> : <Save className="w-4 h-4 mr-2" />}
          Save Changes
        </Button>
        <Button size="sm" variant="ghost" onClick={onCancel}>
          <XCircle className="w-4 h-4 mr-2" />
          Cancel
        </Button>
      </div>
    </div>
  );
}
