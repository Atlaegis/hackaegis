import { useState, useMemo, useCallback } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Label } from "@/components/ui/label";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Switch } from "@/components/ui/switch";
import { Progress } from "@/components/ui/progress";
import {
  Megaphone,
  FileText,
  Award,
  Plus,
  Trash2,
  Pencil,
  Eye,
  EyeOff,
  Loader2,
  X,
  AlertTriangle,
  BookOpen,
  ExternalLink,
  Users,
  Check,
  Zap,
  LayoutTemplate,
  Send,
  Filter,
} from "lucide-react";
import { useAdminFetch, adminApi } from "../lib/api";
import StatCard from "../components/shared/StatCard";
import ConfirmDialog from "../components/shared/ConfirmDialog";

// ---------------------------------------------------------------------------
// Types
// ---------------------------------------------------------------------------

interface Announcement {
  id: number;
  title: string;
  content: string;
  priority: string;
  targetRole: string;
  isPublished: boolean;
  createdAt: string;
}

interface Resource {
  id: number;
  title: string;
  description: string;
  category: string;
  url: string;
  fileType: string;
  sortOrder: number;
  isPublished: boolean;
}

interface Certificate {
  id: number;
  teamId: number;
  type: string;
  url: string;
  issuedAt: string;
}

interface Team {
  id: number;
  name: string;
}

type SubTab = "announcements" | "resources" | "certificates";

// ---------------------------------------------------------------------------
// Constants
// ---------------------------------------------------------------------------

const PRIORITIES = ["low", "normal", "high", "urgent"] as const;
const TARGET_ROLES = ["all", "participants", "judges", "finalists", "winners"] as const;
const RESOURCE_CATEGORIES = [
  "General",
  "Problem Statement",
  "Rulebook",
  "API",
  "Dataset",
  "Template",
  "Brand Asset",
  "FAQ",
] as const;
const CERTIFICATE_TYPES = ["participation", "winner", "runner_up", "special_mention"] as const;

const ANNOUNCEMENT_TEMPLATES = [
  {
    name: "Registration Approved",
    title: "Registration Approved - Welcome to HackAegis!",
    content:
      "Congratulations! Your team registration has been approved. You are now officially part of HackAegis. Please check the Resources section for problem statements and guidelines. Good luck!",
  },
  {
    name: "Schedule Update",
    title: "Schedule Update - Important Timing Change",
    content:
      "Please note the following schedule change: [Describe the change here]. Make sure to update your calendars accordingly. Contact the organizing team if you have any questions.",
  },
  {
    name: "Rule Change",
    title: "Rule Update - Please Read Carefully",
    content:
      "An important rule has been updated: [Describe the rule change here]. This change is effective immediately. Please review the updated rulebook in the Resources section for full details.",
  },
  {
    name: "Winner Announcement",
    title: "And the Winners Are...",
    content:
      "We are thrilled to announce the winners of HackAegis! After careful evaluation by our panel of judges, the results are in. Congratulations to all participants for their incredible work!",
  },
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

function priorityColor(priority: string): string {
  switch (priority) {
    case "urgent":
      return "bg-red-500/15 text-red-700 border-red-500/30";
    case "high":
      return "bg-amber-500/15 text-amber-700 border-amber-500/30";
    case "normal":
      return "bg-blue-500/15 text-blue-700 border-blue-500/30";
    case "low":
    default:
      return "bg-gray-500/15 text-gray-600 border-gray-500/30";
  }
}

function targetColor(target: string): string {
  switch (target) {
    case "judges":
      return "bg-purple-500/15 text-purple-700 border-purple-500/30";
    case "finalists":
      return "bg-emerald-500/15 text-emerald-700 border-emerald-500/30";
    case "winners":
      return "bg-yellow-500/15 text-yellow-700 border-yellow-500/30";
    case "participants":
      return "bg-cyan-500/15 text-cyan-700 border-cyan-500/30";
    case "all":
    default:
      return "bg-slate-500/15 text-slate-600 border-slate-500/30";
  }
}

function certTypeLabel(type: string): string {
  switch (type) {
    case "winner":
      return "Winner";
    case "runner_up":
      return "Runner Up";
    case "special_mention":
      return "Special Mention";
    case "participation":
    default:
      return "Participation";
  }
}

function certTypeColor(type: string): string {
  switch (type) {
    case "winner":
      return "bg-yellow-500/15 text-yellow-700 border-yellow-500/30";
    case "runner_up":
      return "bg-slate-400/15 text-slate-600 border-slate-400/30";
    case "special_mention":
      return "bg-purple-500/15 text-purple-700 border-purple-500/30";
    case "participation":
    default:
      return "bg-blue-500/15 text-blue-700 border-blue-500/30";
  }
}

// ---------------------------------------------------------------------------
// Sub-components
// ---------------------------------------------------------------------------

function SubTabButton({
  active,
  label,
  icon: Icon,
  onClick,
}: {
  active: boolean;
  label: string;
  icon: React.ComponentType<{ className?: string }>;
  onClick: () => void;
}) {
  return (
    <Button
      variant={active ? "default" : "outline"}
      size="sm"
      className="h-8 px-4 text-xs gap-1.5"
      onClick={onClick}
    >
      <Icon className="w-3.5 h-3.5" />
      {label}
    </Button>
  );
}

// ---------------------------------------------------------------------------
// Announcements Sub-section
// ---------------------------------------------------------------------------

function AnnouncementsTab() {
  const { data: announcements, loading, refetch } = useAdminFetch<Announcement[]>("/api/cms/announcements");

  const [showForm, setShowForm] = useState(false);
  const [editingId, setEditingId] = useState<number | null>(null);
  const [formTitle, setFormTitle] = useState("");
  const [formContent, setFormContent] = useState("");
  const [formPriority, setFormPriority] = useState<string>("normal");
  const [formTarget, setFormTarget] = useState<string>("all");
  const [formPublished, setFormPublished] = useState(true);
  const [submitting, setSubmitting] = useState(false);
  const [deleteTarget, setDeleteTarget] = useState<Announcement | null>(null);
  const [filterPriority, setFilterPriority] = useState<string>("all");
  const [filterTarget, setFilterTarget] = useState<string>("all");

  const resetForm = useCallback(() => {
    setFormTitle("");
    setFormContent("");
    setFormPriority("normal");
    setFormTarget("all");
    setFormPublished(true);
    setEditingId(null);
  }, []);

  const openCreate = () => {
    resetForm();
    setShowForm(true);
  };

  const openEdit = (a: Announcement) => {
    setFormTitle(a.title);
    setFormContent(a.content);
    setFormPriority(a.priority);
    setFormTarget(a.targetRole);
    setFormPublished(a.isPublished);
    setEditingId(a.id);
    setShowForm(true);
  };

  const applyTemplate = (tpl: (typeof ANNOUNCEMENT_TEMPLATES)[number]) => {
    setFormTitle(tpl.title);
    setFormContent(tpl.content);
    setShowForm(true);
  };

  const handleSubmit = async () => {
    if (!formTitle.trim() || !formContent.trim()) return;
    setSubmitting(true);
    try {
      const body = {
        title: formTitle.trim(),
        content: formContent.trim(),
        priority: formPriority,
        targetRole: formTarget,
        isPublished: formPublished,
      };
      if (editingId) {
        await adminApi("PUT", `/api/cms/announcements/${editingId}`, body);
      } else {
        await adminApi("POST", "/api/cms/announcements", body);
      }
      resetForm();
      setShowForm(false);
      refetch();
    } catch (err: unknown) {
      alert(err instanceof Error ? err.message : "Failed to save announcement");
    } finally {
      setSubmitting(false);
    }
  };

  const handleTogglePublish = async (a: Announcement) => {
    try {
      await adminApi("PUT", `/api/cms/announcements/${a.id}`, {
        isPublished: !a.isPublished,
      });
      refetch();
    } catch (err: unknown) {
      alert(err instanceof Error ? err.message : "Failed to toggle publish");
    }
  };

  const handleDelete = async () => {
    if (!deleteTarget) return;
    try {
      await adminApi("DELETE", `/api/cms/announcements/${deleteTarget.id}`);
      refetch();
    } catch (err: unknown) {
      alert(err instanceof Error ? err.message : "Failed to delete announcement");
    } finally {
      setDeleteTarget(null);
    }
  };

  const filtered = useMemo(() => {
    if (!announcements) return [];
    let list = [...announcements];
    if (filterPriority !== "all") {
      list = list.filter((a) => a.priority === filterPriority);
    }
    if (filterTarget !== "all") {
      list = list.filter((a) => a.targetRole === filterTarget);
    }
    return list.sort((a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime());
  }, [announcements, filterPriority, filterTarget]);

  return (
    <div className="space-y-5">
      {/* Templates */}
      <Card>
        <CardHeader className="pb-2">
          <CardTitle className="text-sm flex items-center gap-2">
            <LayoutTemplate className="w-4 h-4" />
            Quick Templates
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="flex flex-wrap gap-2">
            {ANNOUNCEMENT_TEMPLATES.map((tpl) => (
              <Button
                key={tpl.name}
                variant="outline"
                size="sm"
                className="h-7 text-xs"
                onClick={() => applyTemplate(tpl)}
              >
                {tpl.name}
              </Button>
            ))}
          </div>
        </CardContent>
      </Card>

      {/* Create / Edit Form */}
      <AnimatePresence>
        {showForm && (
          <motion.div
            initial={{ opacity: 0, height: 0 }}
            animate={{ opacity: 1, height: "auto" }}
            exit={{ opacity: 0, height: 0 }}
            transition={{ duration: 0.2 }}
          >
            <Card className="border-primary/30">
              <CardHeader className="pb-3">
                <div className="flex items-center justify-between">
                  <CardTitle className="text-sm">
                    {editingId ? "Edit Announcement" : "Create Announcement"}
                  </CardTitle>
                  <Button
                    variant="ghost"
                    size="sm"
                    onClick={() => {
                      setShowForm(false);
                      resetForm();
                    }}
                  >
                    <X className="w-4 h-4" />
                  </Button>
                </div>
              </CardHeader>
              <CardContent className="space-y-4">
                <div className="space-y-2">
                  <Label>Title *</Label>
                  <Input
                    value={formTitle}
                    onChange={(e) => setFormTitle(e.target.value)}
                    placeholder="Announcement title..."
                  />
                </div>

                <div className="space-y-2">
                  <Label>Content *</Label>
                  <Textarea
                    value={formContent}
                    onChange={(e) => setFormContent(e.target.value)}
                    placeholder="Announcement content..."
                    rows={4}
                  />
                </div>

                <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
                  <div className="space-y-2">
                    <Label>Priority</Label>
                    <Select value={formPriority} onValueChange={setFormPriority}>
                      <SelectTrigger>
                        <SelectValue />
                      </SelectTrigger>
                      <SelectContent>
                        {PRIORITIES.map((p) => (
                          <SelectItem key={p} value={p}>
                            {p.charAt(0).toUpperCase() + p.slice(1)}
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  </div>

                  <div className="space-y-2">
                    <Label>Target Audience</Label>
                    <Select value={formTarget} onValueChange={setFormTarget}>
                      <SelectTrigger>
                        <SelectValue />
                      </SelectTrigger>
                      <SelectContent>
                        {TARGET_ROLES.map((r) => (
                          <SelectItem key={r} value={r}>
                            {r.charAt(0).toUpperCase() + r.slice(1)}
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  </div>

                  <div className="space-y-2">
                    <Label>Publish</Label>
                    <div className="flex items-center gap-2 pt-1.5">
                      <Switch checked={formPublished} onCheckedChange={setFormPublished} />
                      <span className="text-xs text-muted-foreground">
                        {formPublished ? "Published" : "Draft"}
                      </span>
                    </div>
                  </div>
                </div>

                <div className="flex justify-end gap-2 pt-2">
                  <Button
                    variant="outline"
                    onClick={() => {
                      setShowForm(false);
                      resetForm();
                    }}
                  >
                    Cancel
                  </Button>
                  <Button
                    onClick={handleSubmit}
                    disabled={submitting || !formTitle.trim() || !formContent.trim()}
                  >
                    {submitting && <Loader2 className="w-3 h-3 mr-2 animate-spin" />}
                    <Send className="w-3 h-3 mr-1" />
                    {editingId ? "Update" : "Publish"}
                  </Button>
                </div>
              </CardContent>
            </Card>
          </motion.div>
        )}
      </AnimatePresence>

      {/* Toolbar */}
      <div className="flex items-center justify-between flex-wrap gap-2">
        <div className="flex items-center gap-2">
          <Filter className="w-3.5 h-3.5 text-muted-foreground" />
          <Select value={filterPriority} onValueChange={setFilterPriority}>
            <SelectTrigger className="h-7 w-[120px] text-xs">
              <SelectValue placeholder="Priority" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="all">All Priorities</SelectItem>
              {PRIORITIES.map((p) => (
                <SelectItem key={p} value={p}>
                  {p.charAt(0).toUpperCase() + p.slice(1)}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
          <Select value={filterTarget} onValueChange={setFilterTarget}>
            <SelectTrigger className="h-7 w-[130px] text-xs">
              <SelectValue placeholder="Target" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="all">All Targets</SelectItem>
              {TARGET_ROLES.map((r) => (
                <SelectItem key={r} value={r}>
                  {r.charAt(0).toUpperCase() + r.slice(1)}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>
        {!showForm && (
          <Button size="sm" onClick={openCreate}>
            <Plus className="w-4 h-4 mr-1" />
            New Announcement
          </Button>
        )}
      </div>

      {/* Loading */}
      {loading && (
        <div className="flex justify-center py-12">
          <Loader2 className="w-6 h-6 animate-spin text-muted-foreground" />
        </div>
      )}

      {/* Empty */}
      {!loading && filtered.length === 0 && (
        <Card>
          <CardContent className="py-12 text-center">
            <Megaphone className="w-8 h-8 mx-auto text-muted-foreground mb-3" />
            <p className="text-sm text-muted-foreground">
              No announcements yet. Create one to broadcast to participants.
            </p>
          </CardContent>
        </Card>
      )}

      {/* Announcements List */}
      {!loading && filtered.length > 0 && (
        <motion.div className="space-y-3" initial={{ opacity: 0 }} animate={{ opacity: 1 }}>
          {filtered.map((a) => (
            <motion.div
              key={a.id}
              initial={{ opacity: 0, y: 8 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.15 }}
            >
              <Card
                className={`transition-all ${
                  a.priority === "urgent"
                    ? "border-red-500/40 bg-red-500/5"
                    : a.priority === "high"
                    ? "border-amber-500/30 bg-amber-500/5"
                    : ""
                } ${!a.isPublished ? "opacity-60" : ""}`}
              >
                <CardContent className="pt-4 pb-4">
                  <div className="flex items-start justify-between gap-3">
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center gap-2 mb-1 flex-wrap">
                        <h3 className="font-medium text-sm">{a.title}</h3>
                        <Badge className={`text-[10px] px-1.5 py-0 ${priorityColor(a.priority)}`}>
                          {a.priority}
                        </Badge>
                        <Badge className={`text-[10px] px-1.5 py-0 ${targetColor(a.targetRole)}`}>
                          {a.targetRole}
                        </Badge>
                        {!a.isPublished && (
                          <Badge variant="secondary" className="text-[10px] px-1.5 py-0">
                            Draft
                          </Badge>
                        )}
                      </div>
                      <p className="text-xs text-muted-foreground line-clamp-2 mt-1">
                        {a.content}
                      </p>
                      <p className="text-[10px] text-muted-foreground mt-2">
                        {formatDate(a.createdAt)}
                      </p>
                    </div>
                  </div>

                  <div className="flex items-center gap-1 mt-3 pt-3 border-t border-border/50">
                    <Button
                      variant="ghost"
                      size="sm"
                      className="h-7 px-2 text-xs"
                      onClick={() => openEdit(a)}
                    >
                      <Pencil className="w-3 h-3 mr-1" />
                      Edit
                    </Button>
                    <Button
                      variant="ghost"
                      size="sm"
                      className="h-7 px-2 text-xs"
                      onClick={() => handleTogglePublish(a)}
                    >
                      {a.isPublished ? (
                        <>
                          <EyeOff className="w-3 h-3 mr-1" />
                          Unpublish
                        </>
                      ) : (
                        <>
                          <Eye className="w-3 h-3 mr-1" />
                          Publish
                        </>
                      )}
                    </Button>
                    <Button
                      variant="ghost"
                      size="sm"
                      className="h-7 px-2 text-xs text-destructive hover:text-destructive"
                      onClick={() => setDeleteTarget(a)}
                    >
                      <Trash2 className="w-3 h-3 mr-1" />
                      Delete
                    </Button>
                  </div>
                </CardContent>
              </Card>
            </motion.div>
          ))}
        </motion.div>
      )}

      {/* Delete Confirm */}
      <ConfirmDialog
        open={!!deleteTarget}
        onOpenChange={(open) => !open && setDeleteTarget(null)}
        title="Delete Announcement"
        description={`Are you sure you want to delete "${deleteTarget?.title}"? This action cannot be undone.`}
        confirmLabel="Delete"
        variant="destructive"
        onConfirm={handleDelete}
      />
    </div>
  );
}

// ---------------------------------------------------------------------------
// Resources Sub-section
// ---------------------------------------------------------------------------

function ResourcesTab() {
  const { data: resources, loading, refetch } = useAdminFetch<Resource[]>("/api/cms/resources");

  const [showForm, setShowForm] = useState(false);
  const [formTitle, setFormTitle] = useState("");
  const [formDescription, setFormDescription] = useState("");
  const [formCategory, setFormCategory] = useState<string>("General");
  const [formUrl, setFormUrl] = useState("");
  const [formFileType, setFormFileType] = useState("");
  const [submitting, setSubmitting] = useState(false);
  const [deleteTarget, setDeleteTarget] = useState<Resource | null>(null);

  const resetForm = () => {
    setFormTitle("");
    setFormDescription("");
    setFormCategory("General");
    setFormUrl("");
    setFormFileType("");
  };

  const handleSubmit = async () => {
    if (!formTitle.trim() || !formUrl.trim()) return;
    setSubmitting(true);
    try {
      await adminApi("POST", "/api/cms/resources", {
        title: formTitle.trim(),
        description: formDescription.trim(),
        category: formCategory,
        url: formUrl.trim(),
        fileType: formFileType.trim() || "link",
      });
      resetForm();
      setShowForm(false);
      refetch();
    } catch (err: unknown) {
      alert(err instanceof Error ? err.message : "Failed to create resource");
    } finally {
      setSubmitting(false);
    }
  };

  const handleTogglePublish = async (r: Resource) => {
    try {
      await adminApi("PUT", `/api/cms/resources/${r.id}`, {
        isPublished: !r.isPublished,
      });
      refetch();
    } catch {
      // silent
    }
  };

  const handleDelete = async () => {
    if (!deleteTarget) return;
    try {
      await adminApi("DELETE", `/api/cms/resources/${deleteTarget.id}`);
      refetch();
    } catch (err: unknown) {
      alert(err instanceof Error ? err.message : "Failed to delete resource");
    } finally {
      setDeleteTarget(null);
    }
  };

  const sorted = useMemo(() => {
    if (!resources) return [];
    return [...resources].sort((a, b) => a.sortOrder - b.sortOrder);
  }, [resources]);

  return (
    <div className="space-y-5">
      {/* Create Form */}
      <AnimatePresence>
        {showForm && (
          <motion.div
            initial={{ opacity: 0, height: 0 }}
            animate={{ opacity: 1, height: "auto" }}
            exit={{ opacity: 0, height: 0 }}
            transition={{ duration: 0.2 }}
          >
            <Card className="border-primary/30">
              <CardHeader className="pb-3">
                <div className="flex items-center justify-between">
                  <CardTitle className="text-sm">Add Resource</CardTitle>
                  <Button variant="ghost" size="sm" onClick={() => { setShowForm(false); resetForm(); }}>
                    <X className="w-4 h-4" />
                  </Button>
                </div>
              </CardHeader>
              <CardContent className="space-y-4">
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                  <div className="space-y-2">
                    <Label>Title *</Label>
                    <Input
                      value={formTitle}
                      onChange={(e) => setFormTitle(e.target.value)}
                      placeholder="Resource title..."
                    />
                  </div>
                  <div className="space-y-2">
                    <Label>Category</Label>
                    <Select value={formCategory} onValueChange={setFormCategory}>
                      <SelectTrigger>
                        <SelectValue />
                      </SelectTrigger>
                      <SelectContent>
                        {RESOURCE_CATEGORIES.map((c) => (
                          <SelectItem key={c} value={c}>
                            {c}
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  </div>
                </div>

                <div className="space-y-2">
                  <Label>Description</Label>
                  <Textarea
                    value={formDescription}
                    onChange={(e) => setFormDescription(e.target.value)}
                    placeholder="Brief description..."
                    rows={2}
                  />
                </div>

                <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                  <div className="space-y-2">
                    <Label>URL *</Label>
                    <Input
                      value={formUrl}
                      onChange={(e) => setFormUrl(e.target.value)}
                      placeholder="https://..."
                    />
                  </div>
                  <div className="space-y-2">
                    <Label>File Type</Label>
                    <Input
                      value={formFileType}
                      onChange={(e) => setFormFileType(e.target.value)}
                      placeholder="pdf, zip, link..."
                    />
                  </div>
                </div>

                <div className="flex justify-end gap-2 pt-2">
                  <Button variant="outline" onClick={() => { setShowForm(false); resetForm(); }}>
                    Cancel
                  </Button>
                  <Button
                    onClick={handleSubmit}
                    disabled={submitting || !formTitle.trim() || !formUrl.trim()}
                  >
                    {submitting && <Loader2 className="w-3 h-3 mr-2 animate-spin" />}
                    Add Resource
                  </Button>
                </div>
              </CardContent>
            </Card>
          </motion.div>
        )}
      </AnimatePresence>

      {/* Toolbar */}
      <div className="flex items-center justify-end">
        {!showForm && (
          <Button size="sm" onClick={() => setShowForm(true)}>
            <Plus className="w-4 h-4 mr-1" />
            Add Resource
          </Button>
        )}
      </div>

      {/* Loading */}
      {loading && (
        <div className="flex justify-center py-12">
          <Loader2 className="w-6 h-6 animate-spin text-muted-foreground" />
        </div>
      )}

      {/* Empty */}
      {!loading && sorted.length === 0 && (
        <Card>
          <CardContent className="py-12 text-center">
            <BookOpen className="w-8 h-8 mx-auto text-muted-foreground mb-3" />
            <p className="text-sm text-muted-foreground">
              No resources yet. Add documents, links, and files for participants.
            </p>
          </CardContent>
        </Card>
      )}

      {/* Resource List */}
      {!loading && sorted.length > 0 && (
        <motion.div className="space-y-2" initial={{ opacity: 0 }} animate={{ opacity: 1 }}>
          {sorted.map((r) => (
            <Card key={r.id} className={`${!r.isPublished ? "opacity-60" : ""}`}>
              <CardContent className="py-3 flex items-center justify-between gap-3">
                <div className="flex-1 min-w-0">
                  <div className="flex items-center gap-2 flex-wrap">
                    <span className="font-medium text-sm">{r.title}</span>
                    <Badge variant="secondary" className="text-[10px] px-1.5 py-0">
                      {r.category}
                    </Badge>
                    {r.fileType && (
                      <Badge variant="outline" className="text-[10px] px-1.5 py-0">
                        {r.fileType}
                      </Badge>
                    )}
                    {!r.isPublished && (
                      <Badge variant="secondary" className="text-[10px] px-1.5 py-0 bg-amber-100 text-amber-700">
                        Draft
                      </Badge>
                    )}
                  </div>
                  {r.description && (
                    <p className="text-xs text-muted-foreground mt-0.5 truncate">{r.description}</p>
                  )}
                </div>
                <div className="flex items-center gap-1 shrink-0">
                  <Button variant="ghost" size="sm" className="h-7 px-2" asChild>
                    <a href={r.url} target="_blank" rel="noopener noreferrer">
                      <ExternalLink className="w-3 h-3" />
                    </a>
                  </Button>
                  <Button
                    variant="ghost"
                    size="sm"
                    className="h-7 px-2 text-xs"
                    onClick={() => handleTogglePublish(r)}
                  >
                    {r.isPublished ? <EyeOff className="w-3 h-3" /> : <Eye className="w-3 h-3" />}
                  </Button>
                  <Button
                    variant="ghost"
                    size="sm"
                    className="h-7 px-2 text-xs text-destructive hover:text-destructive"
                    onClick={() => setDeleteTarget(r)}
                  >
                    <Trash2 className="w-3 h-3" />
                  </Button>
                </div>
              </CardContent>
            </Card>
          ))}
        </motion.div>
      )}

      {/* Delete Confirm */}
      <ConfirmDialog
        open={!!deleteTarget}
        onOpenChange={(open) => !open && setDeleteTarget(null)}
        title="Delete Resource"
        description={`Are you sure you want to delete "${deleteTarget?.title}"?`}
        confirmLabel="Delete"
        variant="destructive"
        onConfirm={handleDelete}
      />
    </div>
  );
}

// ---------------------------------------------------------------------------
// Certificates Sub-section
// ---------------------------------------------------------------------------

function CertificatesTab() {
  const { data: certificates, loading, refetch } = useAdminFetch<Certificate[]>("/api/cms/certificates");
  const { data: teams } = useAdminFetch<Team[]>("/api/teams");

  const [formTeamId, setFormTeamId] = useState<string>("");
  const [formType, setFormType] = useState<string>("participation");
  const [formUrl, setFormUrl] = useState("");
  const [submitting, setSubmitting] = useState(false);
  const [deleteTarget, setDeleteTarget] = useState<Certificate | null>(null);

  // Bulk state
  const [bulkType, setBulkType] = useState<string>("participation");
  const [bulkRunning, setBulkRunning] = useState(false);
  const [bulkProgress, setBulkProgress] = useState(0);
  const [bulkTotal, setBulkTotal] = useState(0);

  const handleSubmit = async () => {
    if (!formTeamId || !formUrl.trim()) return;
    setSubmitting(true);
    try {
      await adminApi("POST", "/api/cms/certificates", {
        teamId: parseInt(formTeamId),
        type: formType,
        url: formUrl.trim(),
      });
      setFormTeamId("");
      setFormUrl("");
      refetch();
    } catch (err: unknown) {
      alert(err instanceof Error ? err.message : "Failed to issue certificate");
    } finally {
      setSubmitting(false);
    }
  };

  const handleBulkIssue = async () => {
    if (!teams || teams.length === 0) return;
    setBulkRunning(true);
    setBulkProgress(0);
    setBulkTotal(teams.length);

    for (let i = 0; i < teams.length; i++) {
      try {
        await adminApi("POST", "/api/cms/certificates", {
          teamId: teams[i].id,
          type: bulkType,
          url: `/certificates/${bulkType}/${teams[i].id}`,
        });
      } catch {
        // continue on error
      }
      setBulkProgress(i + 1);
    }

    setBulkRunning(false);
    refetch();
  };

  const handleDelete = async () => {
    if (!deleteTarget) return;
    try {
      await adminApi("DELETE", `/api/cms/certificates/${deleteTarget.id}`);
      refetch();
    } catch (err: unknown) {
      alert(err instanceof Error ? err.message : "Failed to delete certificate");
    } finally {
      setDeleteTarget(null);
    }
  };

  // Stats
  const stats = useMemo(() => {
    if (!certificates) return { total: 0, byType: {} as Record<string, number> };
    const byType: Record<string, number> = {};
    certificates.forEach((c) => {
      byType[c.type] = (byType[c.type] || 0) + 1;
    });
    return { total: certificates.length, byType };
  }, [certificates]);

  const sorted = useMemo(() => {
    if (!certificates) return [];
    return [...certificates].sort(
      (a, b) => new Date(b.issuedAt).getTime() - new Date(a.issuedAt).getTime()
    );
  }, [certificates]);

  const teamName = (id: number) => teams?.find((t) => t.id === id)?.name ?? `Team #${id}`;

  return (
    <div className="space-y-5">
      {/* Stats */}
      <div className="grid grid-cols-2 md:grid-cols-5 gap-3">
        <StatCard label="Total Issued" value={stats.total} icon={Award} color="text-chart-1" />
        <StatCard
          label="Participation"
          value={stats.byType["participation"] ?? 0}
          icon={Award}
          color="text-blue-600"
        />
        <StatCard
          label="Winner"
          value={stats.byType["winner"] ?? 0}
          icon={Award}
          color="text-yellow-600"
        />
        <StatCard
          label="Runner Up"
          value={stats.byType["runner_up"] ?? 0}
          icon={Award}
          color="text-slate-500"
        />
        <StatCard
          label="Special Mention"
          value={stats.byType["special_mention"] ?? 0}
          icon={Award}
          color="text-purple-600"
        />
      </div>

      {/* Issue Single Certificate */}
      <Card>
        <CardHeader className="pb-3">
          <CardTitle className="text-sm">Issue Certificate</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="grid grid-cols-1 sm:grid-cols-4 gap-3 items-end">
            <div className="space-y-1.5">
              <Label className="text-xs">Team</Label>
              <Select value={formTeamId} onValueChange={setFormTeamId}>
                <SelectTrigger className="h-8 text-xs">
                  <SelectValue placeholder="Select team..." />
                </SelectTrigger>
                <SelectContent>
                  {teams?.map((t) => (
                    <SelectItem key={t.id} value={String(t.id)}>
                      {t.name}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            <div className="space-y-1.5">
              <Label className="text-xs">Type</Label>
              <Select value={formType} onValueChange={setFormType}>
                <SelectTrigger className="h-8 text-xs">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  {CERTIFICATE_TYPES.map((t) => (
                    <SelectItem key={t} value={t}>
                      {certTypeLabel(t)}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            <div className="space-y-1.5">
              <Label className="text-xs">Certificate URL</Label>
              <Input
                className="h-8 text-xs"
                value={formUrl}
                onChange={(e) => setFormUrl(e.target.value)}
                placeholder="https://..."
              />
            </div>
            <Button
              size="sm"
              className="h-8"
              onClick={handleSubmit}
              disabled={submitting || !formTeamId || !formUrl.trim()}
            >
              {submitting ? (
                <Loader2 className="w-3 h-3 mr-1 animate-spin" />
              ) : (
                <Check className="w-3 h-3 mr-1" />
              )}
              Issue
            </Button>
          </div>
        </CardContent>
      </Card>

      {/* Bulk Issuance */}
      <Card>
        <CardHeader className="pb-3">
          <CardTitle className="text-sm flex items-center gap-2">
            <Zap className="w-4 h-4" />
            Bulk Certificate Issuance
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="flex items-end gap-3 flex-wrap">
            <div className="space-y-1.5">
              <Label className="text-xs">Type</Label>
              <Select value={bulkType} onValueChange={setBulkType}>
                <SelectTrigger className="h-8 w-[160px] text-xs">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  {CERTIFICATE_TYPES.map((t) => (
                    <SelectItem key={t} value={t}>
                      {certTypeLabel(t)}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            <Button
              size="sm"
              className="h-8"
              onClick={handleBulkIssue}
              disabled={bulkRunning || !teams || teams.length === 0}
            >
              {bulkRunning ? (
                <Loader2 className="w-3 h-3 mr-1 animate-spin" />
              ) : (
                <Users className="w-3 h-3 mr-1" />
              )}
              Issue to All Teams ({teams?.length ?? 0})
            </Button>
          </div>

          {bulkRunning && (
            <div className="mt-3 space-y-1.5">
              <div className="flex items-center justify-between text-xs text-muted-foreground">
                <span>
                  Issuing certificates... {bulkProgress}/{bulkTotal}
                </span>
                <span>{Math.round((bulkProgress / bulkTotal) * 100)}%</span>
              </div>
              <Progress value={(bulkProgress / bulkTotal) * 100} className="h-2" />
            </div>
          )}
        </CardContent>
      </Card>

      {/* Loading */}
      {loading && (
        <div className="flex justify-center py-12">
          <Loader2 className="w-6 h-6 animate-spin text-muted-foreground" />
        </div>
      )}

      {/* Empty */}
      {!loading && sorted.length === 0 && (
        <Card>
          <CardContent className="py-12 text-center">
            <Award className="w-8 h-8 mx-auto text-muted-foreground mb-3" />
            <p className="text-sm text-muted-foreground">
              No certificates issued yet. Use the form above to start issuing.
            </p>
          </CardContent>
        </Card>
      )}

      {/* Certificate List */}
      {!loading && sorted.length > 0 && (
        <motion.div className="space-y-2" initial={{ opacity: 0 }} animate={{ opacity: 1 }}>
          {sorted.map((c) => (
            <Card key={c.id}>
              <CardContent className="py-3 flex items-center justify-between gap-3">
                <div className="flex items-center gap-3 min-w-0">
                  <div>
                    <div className="flex items-center gap-2">
                      <span className="font-medium text-sm">{teamName(c.teamId)}</span>
                      <Badge className={`text-[10px] px-1.5 py-0 ${certTypeColor(c.type)}`}>
                        {certTypeLabel(c.type)}
                      </Badge>
                    </div>
                    <p className="text-[10px] text-muted-foreground mt-0.5">
                      Issued {formatDate(c.issuedAt)}
                    </p>
                  </div>
                </div>
                <div className="flex items-center gap-1 shrink-0">
                  <Button variant="ghost" size="sm" className="h-7 px-2" asChild>
                    <a href={c.url} target="_blank" rel="noopener noreferrer">
                      <ExternalLink className="w-3 h-3" />
                    </a>
                  </Button>
                  <Button
                    variant="ghost"
                    size="sm"
                    className="h-7 px-2 text-destructive hover:text-destructive"
                    onClick={() => setDeleteTarget(c)}
                  >
                    <Trash2 className="w-3 h-3" />
                  </Button>
                </div>
              </CardContent>
            </Card>
          ))}
        </motion.div>
      )}

      {/* Delete Confirm */}
      <ConfirmDialog
        open={!!deleteTarget}
        onOpenChange={(open) => !open && setDeleteTarget(null)}
        title="Delete Certificate"
        description="Are you sure you want to delete this certificate? This action cannot be undone."
        confirmLabel="Delete"
        variant="destructive"
        onConfirm={handleDelete}
      />
    </div>
  );
}

// ---------------------------------------------------------------------------
// Main Component
// ---------------------------------------------------------------------------

export default function AnnouncementsSection() {
  const [activeTab, setActiveTab] = useState<SubTab>("announcements");
  const { data: announcements } = useAdminFetch<Announcement[]>("/api/cms/announcements");
  const { data: resources } = useAdminFetch<Resource[]>("/api/cms/resources");

  // Analytics
  const totalAnnouncements = announcements?.length ?? 0;
  const publishedCount = announcements?.filter((a) => a.isPublished).length ?? 0;
  const urgentCount = announcements?.filter((a) => a.priority === "urgent").length ?? 0;
  const totalResources = resources?.length ?? 0;

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-3">
          <h2 className="text-lg font-semibold">Communication Hub</h2>
          <Badge variant="secondary" className="text-[10px]">
            {totalAnnouncements + totalResources} items
          </Badge>
        </div>
      </div>

      {/* Analytics */}
      <motion.div
        className="grid grid-cols-2 md:grid-cols-4 gap-3"
        initial={{ opacity: 0, y: 8 }}
        animate={{ opacity: 1, y: 0 }}
      >
        <StatCard
          label="Total Announcements"
          value={totalAnnouncements}
          icon={Megaphone}
          color="text-chart-1"
        />
        <StatCard
          label="Published"
          value={publishedCount}
          icon={Eye}
          color="text-chart-2"
        />
        <StatCard
          label="Urgent"
          value={urgentCount}
          icon={AlertTriangle}
          color="text-red-600"
        />
        <StatCard
          label="Total Resources"
          value={totalResources}
          icon={FileText}
          color="text-chart-4"
        />
      </motion.div>

      {/* Tab Switcher */}
      <div className="flex items-center gap-2 border-b border-border pb-3">
        <SubTabButton
          active={activeTab === "announcements"}
          label="Announcements"
          icon={Megaphone}
          onClick={() => setActiveTab("announcements")}
        />
        <SubTabButton
          active={activeTab === "resources"}
          label="Resources"
          icon={BookOpen}
          onClick={() => setActiveTab("resources")}
        />
        <SubTabButton
          active={activeTab === "certificates"}
          label="Certificates"
          icon={Award}
          onClick={() => setActiveTab("certificates")}
        />
      </div>

      {/* Tab Content */}
      <AnimatePresence mode="wait">
        <motion.div
          key={activeTab}
          initial={{ opacity: 0, y: 6 }}
          animate={{ opacity: 1, y: 0 }}
          exit={{ opacity: 0, y: -6 }}
          transition={{ duration: 0.15 }}
        >
          {activeTab === "announcements" && <AnnouncementsTab />}
          {activeTab === "resources" && <ResourcesTab />}
          {activeTab === "certificates" && <CertificatesTab />}
        </motion.div>
      </AnimatePresence>
    </div>
  );
}
