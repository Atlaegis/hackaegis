import { useState, useMemo } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Switch } from "@/components/ui/switch";
import { Label } from "@/components/ui/label";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import {
  Plus,
  Play,
  CheckCircle2,
  Pencil,
  Trash2,
  Copy,
  X,
  Calendar,
  Trophy,
  Radio,
  Lock,
  Eye,
  BarChart3,
  Users,
  FileText,
  Layers,
  ArrowLeft,
  Loader2,
  ChevronRight,
} from "lucide-react";
import { useAdminFetch, adminApi } from "../lib/api";
import type { Hackathon } from "../lib/types";
import StatCard from "../components/shared/StatCard";
import ConfirmDialog from "../components/shared/ConfirmDialog";

// ---------------------------------------------------------------------------
// Types
// ---------------------------------------------------------------------------

interface EventFormData {
  name: string;
  slug: string;
  tagline: string;
  description: string;
  prizePool: string;
  grandPrize: string;
}

interface EventEditData extends EventFormData {
  streamUrl: string;
  streamActive: boolean;
  meetMode: string;
  submissionLocked: boolean;
  resultsPublished: boolean;
  judgeResultsVisible: boolean;
  phase: string;
}

interface EventAnalytics {
  registrations: number;
  teams: number;
  submissions: number;
  pollParticipation: number;
}

const PHASES = ["registration", "submission", "elimination", "finale", "completed"];

const INITIAL_FORM: EventFormData = {
  name: "",
  slug: "",
  tagline: "",
  description: "",
  prizePool: "",
  grandPrize: "",
};

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------

function slugify(text: string): string {
  return text
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/(^-|-$)/g, "");
}

function statusColor(status: string): string {
  switch (status.toLowerCase()) {
    case "active":
      return "border-green-500/60 bg-green-500/5";
    case "completed":
      return "border-muted-foreground/30 bg-muted/30";
    default:
      return "border-border";
  }
}

function statusBadgeVariant(status: string): "default" | "secondary" | "destructive" | "outline" {
  switch (status.toLowerCase()) {
    case "active":
      return "default";
    case "completed":
      return "secondary";
    default:
      return "outline";
  }
}

// ---------------------------------------------------------------------------
// Component
// ---------------------------------------------------------------------------

export default function EventsSection() {
  const { data: hackathons, loading, refetch } = useAdminFetch<Hackathon[]>("/api/hackathons");

  // UI state
  const [selectedEvent, setSelectedEvent] = useState<Hackathon | null>(null);
  const [showCreateForm, setShowCreateForm] = useState(false);
  const [createForm, setCreateForm] = useState<EventFormData>(INITIAL_FORM);
  const [creating, setCreating] = useState(false);
  const [saving, setSaving] = useState(false);
  const [workspaceTab, setWorkspaceTab] = useState("info");

  // Confirm dialogs
  const [confirmActivate, setConfirmActivate] = useState<Hackathon | null>(null);
  const [confirmComplete, setConfirmComplete] = useState<Hackathon | null>(null);
  const [confirmDelete, setConfirmDelete] = useState<Hackathon | null>(null);

  // Edit state for selected event
  const [editData, setEditData] = useState<EventEditData | null>(null);

  // Analytics (simple fetch per event)
  const [analytics, setAnalytics] = useState<EventAnalytics | null>(null);

  // -------------------------------------------------------------------------
  // Derived
  // -------------------------------------------------------------------------

  const sortedHackathons = useMemo(() => {
    if (!hackathons) return [];
    return [...hackathons].sort((a, b) => {
      if (a.status === "active" && b.status !== "active") return -1;
      if (b.status === "active" && a.status !== "active") return 1;
      return b.id - a.id;
    });
  }, [hackathons]);

  // -------------------------------------------------------------------------
  // Actions
  // -------------------------------------------------------------------------

  const handleCreateEvent = async () => {
    if (!createForm.name.trim() || !createForm.slug.trim()) return;
    setCreating(true);
    try {
      await adminApi("POST", "/api/hackathons", {
        name: createForm.name,
        slug: createForm.slug,
        tagline: createForm.tagline || null,
        description: createForm.description || null,
        prizePool: createForm.prizePool || null,
        grandPrize: createForm.grandPrize || null,
      });
      setCreateForm(INITIAL_FORM);
      setShowCreateForm(false);
      refetch();
    } catch (err: unknown) {
      alert(err instanceof Error ? err.message : "Failed to create event");
    } finally {
      setCreating(false);
    }
  };

  const handleActivate = async (h: Hackathon) => {
    try {
      await adminApi("POST", `/api/hackathons/${h.id}/activate`);
      refetch();
      if (selectedEvent?.id === h.id) {
        setSelectedEvent({ ...h, status: "active" });
      }
    } catch (err: unknown) {
      alert(err instanceof Error ? err.message : "Failed to activate");
    }
    setConfirmActivate(null);
  };

  const handleComplete = async (h: Hackathon) => {
    try {
      await adminApi("POST", `/api/hackathons/${h.id}/complete`);
      refetch();
      if (selectedEvent?.id === h.id) {
        setSelectedEvent({ ...h, status: "completed" });
      }
    } catch (err: unknown) {
      alert(err instanceof Error ? err.message : "Failed to complete");
    }
    setConfirmComplete(null);
  };

  const handleDelete = async (h: Hackathon) => {
    try {
      await adminApi("DELETE", `/api/hackathons/${h.id}`);
      refetch();
      if (selectedEvent?.id === h.id) {
        setSelectedEvent(null);
        setEditData(null);
      }
    } catch (err: unknown) {
      alert(err instanceof Error ? err.message : "Failed to delete");
    }
    setConfirmDelete(null);
  };

  const handleSaveEvent = async () => {
    if (!selectedEvent || !editData) return;
    setSaving(true);
    try {
      await adminApi("PUT", `/api/hackathons/${selectedEvent.id}`, {
        name: editData.name,
        slug: editData.slug,
        tagline: editData.tagline || null,
        description: editData.description || null,
        prizePool: editData.prizePool || null,
        grandPrize: editData.grandPrize || null,
        streamUrl: editData.streamUrl || null,
        streamActive: editData.streamActive,
        meetMode: editData.meetMode,
        submissionLocked: editData.submissionLocked,
        resultsPublished: editData.resultsPublished,
        judgeResultsVisible: editData.judgeResultsVisible,
        phase: editData.phase,
      });
      refetch();
      // Update selected event locally
      setSelectedEvent({
        ...selectedEvent,
        ...editData,
        tagline: editData.tagline || null,
        description: editData.description || null,
        prizePool: editData.prizePool || null,
        grandPrize: editData.grandPrize || null,
        streamUrl: editData.streamUrl || null,
      });
    } catch (err: unknown) {
      alert(err instanceof Error ? err.message : "Failed to save");
    } finally {
      setSaving(false);
    }
  };

  const handleDuplicate = async (h: Hackathon) => {
    const newSlug = `${h.slug}-copy-${Date.now().toString(36)}`;
    try {
      await adminApi("POST", "/api/hackathons", {
        name: `${h.name} (Copy)`,
        slug: newSlug,
        tagline: h.tagline,
        description: h.description,
        prizePool: h.prizePool,
        grandPrize: h.grandPrize,
      });
      refetch();
    } catch (err: unknown) {
      alert(err instanceof Error ? err.message : "Failed to duplicate");
    }
  };

  const openWorkspace = (h: Hackathon) => {
    setSelectedEvent(h);
    setEditData({
      name: h.name,
      slug: h.slug,
      tagline: h.tagline ?? "",
      description: h.description ?? "",
      prizePool: h.prizePool ?? "",
      grandPrize: h.grandPrize ?? "",
      streamUrl: h.streamUrl ?? "",
      streamActive: h.streamActive,
      meetMode: h.meetMode ?? "jitsi",
      submissionLocked: h.submissionLocked,
      resultsPublished: h.resultsPublished,
      judgeResultsVisible: h.judgeResultsVisible,
      phase: h.phase,
    });
    setWorkspaceTab("info");
    // Fetch analytics
    fetchAnalytics(h.id);
  };

  const fetchAnalytics = async (hackathonId: number) => {
    try {
      const [regs, teams] = await Promise.all([
        fetch("/api/admin/registrations", {
          headers: { Authorization: `Bearer ${localStorage.getItem("hackaegis_admin_token")}` },
        }).then((r) => r.json()),
        fetch("/api/admin/teams", {
          headers: { Authorization: `Bearer ${localStorage.getItem("hackaegis_admin_token")}` },
        }).then((r) => r.json()),
      ]);
      const eventRegs = Array.isArray(regs) ? regs.filter((r: { hackathonId?: number | null }) => r.hackathonId === hackathonId) : [];
      const eventTeams = Array.isArray(teams) ? teams.filter((t: { hackathonId?: number | null }) => t.hackathonId === hackathonId) : [];
      setAnalytics({
        registrations: eventRegs.length,
        teams: eventTeams.length,
        submissions: eventTeams.filter((t: { projectTitle?: string }) => t.projectTitle).length,
        pollParticipation: 0, // Would need poll API
      });
    } catch {
      setAnalytics({ registrations: 0, teams: 0, submissions: 0, pollParticipation: 0 });
    }
  };

  // -------------------------------------------------------------------------
  // Render: Event Workspace
  // -------------------------------------------------------------------------

  if (selectedEvent && editData) {
    const isCompleted = selectedEvent.status === "completed";

    return (
      <motion.div
        initial={{ opacity: 0, x: 20 }}
        animate={{ opacity: 1, x: 0 }}
        exit={{ opacity: 0, x: -20 }}
        transition={{ duration: 0.2 }}
        className="space-y-6"
      >
        {/* Header */}
        <div className="flex items-center gap-3">
          <Button
            variant="ghost"
            size="sm"
            onClick={() => {
              setSelectedEvent(null);
              setEditData(null);
            }}
          >
            <ArrowLeft className="w-4 h-4 mr-1" />
            Back
          </Button>
          <div className="flex-1">
            <div className="flex items-center gap-2">
              <h2 className="text-lg font-semibold">{selectedEvent.name}</h2>
              <Badge variant={statusBadgeVariant(selectedEvent.status)}>
                {selectedEvent.status}
              </Badge>
              <Badge variant="outline" className="text-[10px]">
                {selectedEvent.phase}
              </Badge>
            </div>
            <p className="text-xs text-muted-foreground font-mono">/{selectedEvent.slug}</p>
          </div>
          <div className="flex gap-2">
            {selectedEvent.status === "upcoming" && (
              <Button size="sm" variant="default" onClick={() => setConfirmActivate(selectedEvent)}>
                <Play className="w-3 h-3 mr-1" />
                Activate
              </Button>
            )}
            {selectedEvent.status === "active" && (
              <Button size="sm" variant="secondary" onClick={() => setConfirmComplete(selectedEvent)}>
                <CheckCircle2 className="w-3 h-3 mr-1" />
                Complete
              </Button>
            )}
            {isCompleted && (
              <Button size="sm" variant="outline" onClick={() => handleDuplicate(selectedEvent)}>
                <Copy className="w-3 h-3 mr-1" />
                Duplicate
              </Button>
            )}
          </div>
        </div>

        {/* Workspace Tabs */}
        <Tabs value={workspaceTab} onValueChange={setWorkspaceTab}>
          <TabsList>
            <TabsTrigger value="info">Event Info</TabsTrigger>
            <TabsTrigger value="config">Configuration</TabsTrigger>
            <TabsTrigger value="analytics">Analytics</TabsTrigger>
            {isCompleted && <TabsTrigger value="archive">Archive</TabsTrigger>}
          </TabsList>

          {/* EVENT INFO TAB */}
          <TabsContent value="info" className="mt-4">
            <Card>
              <CardContent className="pt-6 space-y-4">
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <div className="space-y-2">
                    <Label>Name</Label>
                    <Input
                      value={editData.name}
                      onChange={(e) => setEditData({ ...editData, name: e.target.value })}
                      disabled={isCompleted}
                    />
                  </div>
                  <div className="space-y-2">
                    <Label>Slug</Label>
                    <Input
                      value={editData.slug}
                      onChange={(e) => setEditData({ ...editData, slug: e.target.value })}
                      disabled={isCompleted}
                      className="font-mono text-sm"
                    />
                  </div>
                </div>

                <div className="space-y-2">
                  <Label>Tagline</Label>
                  <Input
                    value={editData.tagline}
                    onChange={(e) => setEditData({ ...editData, tagline: e.target.value })}
                    disabled={isCompleted}
                    placeholder="Short event tagline"
                  />
                </div>

                <div className="space-y-2">
                  <Label>Description</Label>
                  <Textarea
                    value={editData.description}
                    onChange={(e) => setEditData({ ...editData, description: e.target.value })}
                    disabled={isCompleted}
                    rows={4}
                    placeholder="Event description, dates, venue info..."
                  />
                </div>

                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <div className="space-y-2">
                    <Label>Prize Pool</Label>
                    <Input
                      value={editData.prizePool}
                      onChange={(e) => setEditData({ ...editData, prizePool: e.target.value })}
                      disabled={isCompleted}
                      placeholder="e.g. $10,000"
                    />
                  </div>
                  <div className="space-y-2">
                    <Label>Grand Prize</Label>
                    <Input
                      value={editData.grandPrize}
                      onChange={(e) => setEditData({ ...editData, grandPrize: e.target.value })}
                      disabled={isCompleted}
                      placeholder="e.g. $5,000"
                    />
                  </div>
                </div>

                {!isCompleted && (
                  <div className="flex justify-end pt-2">
                    <Button onClick={handleSaveEvent} disabled={saving}>
                      {saving && <Loader2 className="w-3 h-3 mr-2 animate-spin" />}
                      Save Changes
                    </Button>
                  </div>
                )}
              </CardContent>
            </Card>
          </TabsContent>

          {/* CONFIGURATION TAB */}
          <TabsContent value="config" className="mt-4">
            <Card>
              <CardContent className="pt-6 space-y-6">
                {/* Phase Selector */}
                <div className="space-y-2">
                  <Label>Phase</Label>
                  <Select
                    value={editData.phase}
                    onValueChange={(v) => setEditData({ ...editData, phase: v })}
                    disabled={isCompleted}
                  >
                    <SelectTrigger className="w-48">
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      {PHASES.map((p) => (
                        <SelectItem key={p} value={p}>
                          {p.charAt(0).toUpperCase() + p.slice(1)}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>

                {/* Stream Settings */}
                <div className="space-y-4">
                  <h4 className="text-sm font-medium flex items-center gap-2">
                    <Radio className="w-4 h-4" />
                    Stream Settings
                  </h4>
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4 pl-6">
                    <div className="space-y-2">
                      <Label>Stream URL</Label>
                      <Input
                        value={editData.streamUrl}
                        onChange={(e) => setEditData({ ...editData, streamUrl: e.target.value })}
                        disabled={isCompleted}
                        placeholder="https://..."
                      />
                    </div>
                    <div className="space-y-2">
                      <Label>Meet Mode</Label>
                      <Select
                        value={editData.meetMode}
                        onValueChange={(v) => setEditData({ ...editData, meetMode: v })}
                        disabled={isCompleted}
                      >
                        <SelectTrigger>
                          <SelectValue />
                        </SelectTrigger>
                        <SelectContent>
                          <SelectItem value="jitsi">Jitsi</SelectItem>
                          <SelectItem value="stream">Stream</SelectItem>
                          <SelectItem value="hybrid">Hybrid</SelectItem>
                        </SelectContent>
                      </Select>
                    </div>
                  </div>
                  <div className="flex items-center gap-3 pl-6">
                    <Switch
                      checked={editData.streamActive}
                      onCheckedChange={(v) => setEditData({ ...editData, streamActive: v })}
                      disabled={isCompleted}
                    />
                    <Label>Stream Active</Label>
                  </div>
                </div>

                {/* Submission Control */}
                <div className="space-y-4">
                  <h4 className="text-sm font-medium flex items-center gap-2">
                    <Lock className="w-4 h-4" />
                    Submission Control
                  </h4>
                  <div className="flex items-center gap-3 pl-6">
                    <Switch
                      checked={editData.submissionLocked}
                      onCheckedChange={(v) => setEditData({ ...editData, submissionLocked: v })}
                      disabled={isCompleted}
                    />
                    <Label>Submissions Locked</Label>
                  </div>
                </div>

                {/* Results */}
                <div className="space-y-4">
                  <h4 className="text-sm font-medium flex items-center gap-2">
                    <Eye className="w-4 h-4" />
                    Results Visibility
                  </h4>
                  <div className="space-y-3 pl-6">
                    <div className="flex items-center gap-3">
                      <Switch
                        checked={editData.resultsPublished}
                        onCheckedChange={(v) => setEditData({ ...editData, resultsPublished: v })}
                        disabled={isCompleted}
                      />
                      <Label>Results Published</Label>
                    </div>
                    <div className="flex items-center gap-3">
                      <Switch
                        checked={editData.judgeResultsVisible}
                        onCheckedChange={(v) => setEditData({ ...editData, judgeResultsVisible: v })}
                        disabled={isCompleted}
                      />
                      <Label>Judge Results Visible</Label>
                    </div>
                  </div>
                </div>

                {!isCompleted && (
                  <div className="flex justify-end pt-2">
                    <Button onClick={handleSaveEvent} disabled={saving}>
                      {saving && <Loader2 className="w-3 h-3 mr-2 animate-spin" />}
                      Save Configuration
                    </Button>
                  </div>
                )}
              </CardContent>
            </Card>
          </TabsContent>

          {/* ANALYTICS TAB */}
          <TabsContent value="analytics" className="mt-4">
            <motion.div
              className="grid grid-cols-2 md:grid-cols-4 gap-3"
              initial={{ opacity: 0, y: 8 }}
              animate={{ opacity: 1, y: 0 }}
            >
              <StatCard
                label="Registrations"
                value={analytics?.registrations ?? "..."}
                icon={Users}
                color="text-chart-1"
              />
              <StatCard
                label="Teams"
                value={analytics?.teams ?? "..."}
                icon={Layers}
                color="text-chart-2"
              />
              <StatCard
                label="Submissions"
                value={analytics?.submissions ?? "..."}
                icon={FileText}
                color="text-chart-3"
              />
              <StatCard
                label="Poll Participation"
                value={analytics?.pollParticipation ?? "..."}
                icon={BarChart3}
                color="text-chart-4"
              />
            </motion.div>
          </TabsContent>

          {/* ARCHIVE TAB (completed events only) */}
          {isCompleted && (
            <TabsContent value="archive" className="mt-4">
              <Card>
                <CardHeader>
                  <CardTitle className="text-sm">Archived Event Summary</CardTitle>
                </CardHeader>
                <CardContent className="space-y-3">
                  <div className="grid grid-cols-2 gap-3 text-sm">
                    <div>
                      <span className="text-muted-foreground">Name:</span>{" "}
                      <span className="font-medium">{selectedEvent.name}</span>
                    </div>
                    <div>
                      <span className="text-muted-foreground">Slug:</span>{" "}
                      <span className="font-mono">{selectedEvent.slug}</span>
                    </div>
                    <div>
                      <span className="text-muted-foreground">Prize Pool:</span>{" "}
                      <span className="font-medium">{selectedEvent.prizePool ?? "N/A"}</span>
                    </div>
                    <div>
                      <span className="text-muted-foreground">Grand Prize:</span>{" "}
                      <span className="font-medium">{selectedEvent.grandPrize ?? "N/A"}</span>
                    </div>
                    <div>
                      <span className="text-muted-foreground">Final Phase:</span>{" "}
                      <Badge variant="outline">{selectedEvent.phase}</Badge>
                    </div>
                    <div>
                      <span className="text-muted-foreground">Results Published:</span>{" "}
                      <Badge variant={selectedEvent.resultsPublished ? "default" : "secondary"}>
                        {selectedEvent.resultsPublished ? "Yes" : "No"}
                      </Badge>
                    </div>
                  </div>
                  {selectedEvent.tagline && (
                    <div className="text-sm">
                      <span className="text-muted-foreground">Tagline:</span> {selectedEvent.tagline}
                    </div>
                  )}
                  {selectedEvent.description && (
                    <div className="text-sm">
                      <span className="text-muted-foreground">Description:</span>
                      <p className="mt-1 text-muted-foreground whitespace-pre-wrap">{selectedEvent.description}</p>
                    </div>
                  )}
                  <div className="pt-4">
                    <Button variant="outline" onClick={() => handleDuplicate(selectedEvent)}>
                      <Copy className="w-4 h-4 mr-2" />
                      Duplicate Event
                    </Button>
                  </div>
                </CardContent>
              </Card>
            </TabsContent>
          )}
        </Tabs>

        {/* Confirm Dialogs */}
        <ConfirmDialog
          open={!!confirmActivate}
          onOpenChange={(open) => !open && setConfirmActivate(null)}
          title="Activate Event"
          description={`Activate "${confirmActivate?.name}"? This will set it as the current active hackathon. Any previously active event will be deactivated.`}
          confirmLabel="Activate"
          onConfirm={() => confirmActivate && handleActivate(confirmActivate)}
        />
        <ConfirmDialog
          open={!!confirmComplete}
          onOpenChange={(open) => !open && setConfirmComplete(null)}
          title="Complete Event"
          description={`Mark "${confirmComplete?.name}" as completed? This action will end the hackathon.`}
          confirmLabel="Complete"
          onConfirm={() => confirmComplete && handleComplete(confirmComplete)}
        />
      </motion.div>
    );
  }

  // -------------------------------------------------------------------------
  // Render: Event List
  // -------------------------------------------------------------------------

  return (
    <div className="space-y-6">
      {/* Header with Create button */}
      <div className="flex items-center justify-between">
        <h2 className="text-lg font-semibold">Events</h2>
        <Button size="sm" onClick={() => setShowCreateForm(true)}>
          <Plus className="w-4 h-4 mr-1" />
          Create Event
        </Button>
      </div>

      {/* Create Event Form */}
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
                  <CardTitle className="text-sm">Create New Event</CardTitle>
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
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <div className="space-y-2">
                    <Label>Name *</Label>
                    <Input
                      value={createForm.name}
                      onChange={(e) =>
                        setCreateForm({
                          ...createForm,
                          name: e.target.value,
                          slug: slugify(e.target.value),
                        })
                      }
                      placeholder="HackAegis 2026"
                    />
                  </div>
                  <div className="space-y-2">
                    <Label>
                      Slug *{" "}
                      <span className="text-muted-foreground text-xs">(auto-generated)</span>
                    </Label>
                    <Input
                      value={createForm.slug}
                      onChange={(e) => setCreateForm({ ...createForm, slug: e.target.value })}
                      placeholder="hackaegis-2026"
                      className="font-mono text-sm"
                    />
                    {createForm.slug && hackathons?.some((h) => h.slug === createForm.slug) && (
                      <p className="text-xs text-destructive">Slug already in use</p>
                    )}
                  </div>
                </div>

                <div className="space-y-2">
                  <Label>Tagline</Label>
                  <Input
                    value={createForm.tagline}
                    onChange={(e) => setCreateForm({ ...createForm, tagline: e.target.value })}
                    placeholder="Build. Innovate. Disrupt."
                  />
                </div>

                <div className="space-y-2">
                  <Label>Description</Label>
                  <Textarea
                    value={createForm.description}
                    onChange={(e) => setCreateForm({ ...createForm, description: e.target.value })}
                    placeholder="Event details, dates, venue..."
                    rows={3}
                  />
                </div>

                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <div className="space-y-2">
                    <Label>Prize Pool</Label>
                    <Input
                      value={createForm.prizePool}
                      onChange={(e) => setCreateForm({ ...createForm, prizePool: e.target.value })}
                      placeholder="e.g. $10,000"
                    />
                  </div>
                  <div className="space-y-2">
                    <Label>Grand Prize</Label>
                    <Input
                      value={createForm.grandPrize}
                      onChange={(e) => setCreateForm({ ...createForm, grandPrize: e.target.value })}
                      placeholder="e.g. $5,000"
                    />
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
                    onClick={handleCreateEvent}
                    disabled={
                      creating ||
                      !createForm.name.trim() ||
                      !createForm.slug.trim() ||
                      !!hackathons?.some((h) => h.slug === createForm.slug)
                    }
                  >
                    {creating && <Loader2 className="w-3 h-3 mr-2 animate-spin" />}
                    Create Event
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

      {/* Event Cards */}
      {!loading && sortedHackathons.length === 0 && (
        <Card>
          <CardContent className="py-12 text-center">
            <Calendar className="w-8 h-8 mx-auto text-muted-foreground mb-3" />
            <p className="text-sm text-muted-foreground">No events yet. Create your first hackathon!</p>
          </CardContent>
        </Card>
      )}

      <motion.div
        className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4"
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        transition={{ staggerChildren: 0.05 }}
      >
        <AnimatePresence>
          {sortedHackathons.map((h) => (
            <motion.div
              key={h.id}
              initial={{ opacity: 0, y: 12 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, scale: 0.95 }}
              transition={{ duration: 0.2 }}
            >
              <Card
                className={`cursor-pointer transition-all hover:shadow-md ${statusColor(h.status)}`}
                onClick={() => openWorkspace(h)}
              >
                <CardContent className="pt-4 pb-4">
                  <div className="flex items-start justify-between mb-2">
                    <div className="flex-1 min-w-0">
                      <h3 className="font-medium text-sm truncate">{h.name}</h3>
                      <p className="text-xs text-muted-foreground font-mono truncate">/{h.slug}</p>
                    </div>
                    <ChevronRight className="w-4 h-4 text-muted-foreground shrink-0 mt-0.5" />
                  </div>

                  {h.tagline && (
                    <p className="text-xs text-muted-foreground line-clamp-1 mb-2">{h.tagline}</p>
                  )}

                  <div className="flex items-center gap-2 mb-3">
                    <Badge variant={statusBadgeVariant(h.status)} className="text-[10px]">
                      {h.status}
                    </Badge>
                    <Badge variant="outline" className="text-[10px]">
                      {h.phase}
                    </Badge>
                    {h.prizePool && (
                      <span className="text-[10px] text-muted-foreground flex items-center gap-0.5">
                        <Trophy className="w-3 h-3" />
                        {h.prizePool}
                      </span>
                    )}
                  </div>

                  {/* Quick Actions */}
                  <div className="flex gap-1 pt-1 border-t border-border/50">
                    {h.status === "upcoming" && (
                      <Button
                        variant="ghost"
                        size="sm"
                        className="h-7 px-2 text-xs"
                        onClick={(e) => {
                          e.stopPropagation();
                          setConfirmActivate(h);
                        }}
                      >
                        <Play className="w-3 h-3 mr-1" />
                        Activate
                      </Button>
                    )}
                    {h.status === "active" && (
                      <Button
                        variant="ghost"
                        size="sm"
                        className="h-7 px-2 text-xs"
                        onClick={(e) => {
                          e.stopPropagation();
                          setConfirmComplete(h);
                        }}
                      >
                        <CheckCircle2 className="w-3 h-3 mr-1" />
                        Complete
                      </Button>
                    )}
                    <Button
                      variant="ghost"
                      size="sm"
                      className="h-7 px-2 text-xs"
                      onClick={(e) => {
                        e.stopPropagation();
                        openWorkspace(h);
                      }}
                    >
                      <Pencil className="w-3 h-3 mr-1" />
                      Edit
                    </Button>
                    <Button
                      variant="ghost"
                      size="sm"
                      className="h-7 px-2 text-xs text-destructive hover:text-destructive"
                      onClick={(e) => {
                        e.stopPropagation();
                        setConfirmDelete(h);
                      }}
                    >
                      <Trash2 className="w-3 h-3 mr-1" />
                      Delete
                    </Button>
                  </div>
                </CardContent>
              </Card>
            </motion.div>
          ))}
        </AnimatePresence>
      </motion.div>

      {/* Confirm Dialogs */}
      <ConfirmDialog
        open={!!confirmActivate}
        onOpenChange={(open) => !open && setConfirmActivate(null)}
        title="Activate Event"
        description={`Activate "${confirmActivate?.name}"? This will set it as the current active hackathon. Any previously active event will be deactivated.`}
        confirmLabel="Activate"
        onConfirm={() => confirmActivate && handleActivate(confirmActivate)}
      />
      <ConfirmDialog
        open={!!confirmComplete}
        onOpenChange={(open) => !open && setConfirmComplete(null)}
        title="Complete Event"
        description={`Mark "${confirmComplete?.name}" as completed? This action will end the hackathon.`}
        confirmLabel="Complete"
        onConfirm={() => confirmComplete && handleComplete(confirmComplete)}
      />
      <ConfirmDialog
        open={!!confirmDelete}
        onOpenChange={(open) => !open && setConfirmDelete(null)}
        title="Delete Event"
        description={`Are you sure you want to delete "${confirmDelete?.name}"? This action cannot be undone. All associated data may be lost.`}
        confirmLabel="Delete"
        variant="destructive"
        onConfirm={() => confirmDelete && handleDelete(confirmDelete)}
      />
    </div>
  );
}
