import { useState, useEffect, useCallback } from "react";
import {
  useGetAdminDashboard,
  useListCodes,
  useGenerateCodes,
  useResetCode,
  useDeleteCode,
  useListTeams,
  useCreateTeam,
  useUpdateTeam,
  useDeleteTeam,
  useListPolls,
  useCreatePoll,
  useActivatePoll,
  useDeactivatePoll,
  useGetEventStatus,
  useUpdateEventStatus,
  useGetAdminLogs,
  setAuthTokenGetter,
} from "@workspace/api-client-react";
import type { UpdateEventStatusBodyPhase } from "@workspace/api-client-react";
import { useAuthTokens } from "@/lib/auth";
import { useLocation } from "wouter";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { useToast } from "@/hooks/use-toast";
import {
  LayoutDashboard, Users, Code2, BarChart2, Settings, ScrollText,
  RefreshCw, Trash2, Play, Square, Plus, Terminal, Trophy, Activity,
  CheckCircle, Scale, Copy, LogOut, Zap, Globe, Archive, Edit3, X,
  UserCheck, ChevronDown, ChevronUp, Github, Monitor, FileText, AlertCircle,
  Video, Star, Eye, Key, Shield, ClipboardList, Tv,
} from "lucide-react";
import { motion, AnimatePresence } from "framer-motion";

// ─── Shared helpers ───────────────────────────────────────────────────────────
function useAdminFetch<T>(url: string, deps: unknown[] = []): { data: T | null; loading: boolean; refetch: () => void } {
  const [data, setData] = useState<T | null>(null);
  const [loading, setLoading] = useState(true);
  const token = localStorage.getItem("hackaegis_admin_token");
  const load = useCallback(() => {
    setLoading(true);
    fetch(url, { headers: { Authorization: `Bearer ${token}` } })
      .then((r) => r.json()).then(setData).catch(() => {}).finally(() => setLoading(false));
  }, [url, token, ...deps]);
  useEffect(() => { load(); }, [load]);
  return { data, loading, refetch: load };
}

function adminApi(method: string, path: string, body?: unknown) {
  const token = localStorage.getItem("hackaegis_admin_token");
  return fetch(path, {
    method,
    headers: { "Content-Type": "application/json", Authorization: `Bearer ${token}` },
    body: body ? JSON.stringify(body) : undefined,
  }).then(async (r) => {
    const d = await r.json();
    if (!r.ok) throw new Error(d.message ?? "Request failed");
    return d;
  });
}

// ─── Confirm Dialog ───────────────────────────────────────────────────────────
function ConfirmDelete({ onConfirm, onCancel, label }: { onConfirm: () => void; onCancel: () => void; label: string }) {
  return (
    <div className="flex items-center gap-2 p-2 rounded-lg bg-destructive/10 border border-destructive/30">
      <AlertCircle className="w-4 h-4 text-destructive flex-shrink-0" />
      <p className="text-xs text-destructive flex-1">Delete <span className="font-bold">{label}</span>?</p>
      <Button size="sm" variant="destructive" className="h-7 px-2 text-xs" onClick={onConfirm}>Delete</Button>
      <Button size="sm" variant="ghost" className="h-7 px-2 text-xs" onClick={onCancel}>Cancel</Button>
    </div>
  );
}

// ─── Score Pill ───────────────────────────────────────────────────────────────
function ScorePill({ val, label }: { val: number | null; label: string }) {
  if (val === null) return null;
  return (
    <div className="text-center">
      <p className="text-xs text-muted-foreground">{label}</p>
      <p className="text-sm font-mono font-bold text-chart-2">{val}</p>
    </div>
  );
}

// ─── Dashboard Tab ────────────────────────────────────────────────────────────
function DashboardTab() {
  const { data: dashboard, refetch } = useGetAdminDashboard();
  const d = dashboard as (typeof dashboard & {
    totalJudges?: number; totalSubmissions?: number; totalJudgeScores?: number;
    linkedCodes?: number; activeTeams?: number; totalHackathons?: number;
    activeHackathon?: { id: number; name: string; phase: string; status: string } | null;
  }) | undefined;

  const stats = [
    { label: "Participant Codes", value: d?.totalCodes ?? 0, sub: `${d?.usedCodes ?? 0} used`, color: "text-chart-1" },
    { label: "Teams Linked", value: d?.linkedCodes ?? 0, sub: `of ${d?.totalCodes ?? 0} codes`, color: "text-chart-3" },
    { label: "Teams", value: d?.totalTeams ?? 0, sub: `${d?.activeTeams ?? 0} in active event`, color: "text-chart-2" },
    { label: "Total Votes", value: d?.totalVotes ?? 0, sub: `${d?.activeParticipants ?? 0} voters`, color: "text-chart-4" },
    { label: "Judges", value: d?.totalJudges ?? 0, sub: `${d?.totalJudgeScores ?? 0} scores`, color: "text-primary" },
    { label: "Submissions", value: d?.totalSubmissions ?? 0, sub: "project submissions", color: "text-secondary-foreground" },
  ];

  return (
    <div className="space-y-6">
      {d?.activeHackathon && (
        <Card className="border-chart-3/30 bg-chart-3/5">
          <CardContent className="py-3 px-4 flex items-center gap-3">
            <div className="bg-chart-3/20 p-1.5 rounded-md"><Zap className="w-4 h-4 text-chart-3" /></div>
            <div>
              <p className="font-semibold text-sm">{d.activeHackathon.name}</p>
              <p className="text-xs text-muted-foreground">Phase: {d.activeHackathon.phase.toUpperCase()}</p>
            </div>
            <Badge className="ml-auto bg-chart-3/10 text-chart-3 border-chart-3/30 text-xs">ACTIVE EVENT</Badge>
          </CardContent>
        </Card>
      )}
      <div className="grid grid-cols-2 md:grid-cols-3 gap-4">
        {stats.map((s) => (
          <Card key={s.label}>
            <CardContent className="pt-4 pb-3">
              <p className="text-xs text-muted-foreground">{s.label}</p>
              <p className={`text-3xl font-bold font-mono mt-1 ${s.color}`}>{s.value}</p>
              <p className="text-xs text-muted-foreground mt-0.5">{s.sub}</p>
            </CardContent>
          </Card>
        ))}
      </div>
      <div className="grid grid-cols-2 gap-4">
        <Card>
          <CardHeader><CardTitle className="text-xs font-mono text-muted-foreground">CURRENT PHASE</CardTitle></CardHeader>
          <CardContent><p className="text-2xl font-bold font-mono text-primary">{d?.currentPhase?.toUpperCase() ?? "—"}</p></CardContent>
        </Card>
        <Card>
          <CardHeader><CardTitle className="text-xs font-mono text-muted-foreground">ACTIVE POLL</CardTitle></CardHeader>
          <CardContent>{d?.activePollQuestion ? <p className="font-semibold text-sm">{d.activePollQuestion}</p> : <p className="text-muted-foreground text-sm">No poll running</p>}</CardContent>
        </Card>
      </div>
      <div className="flex justify-end">
        <Button variant="ghost" size="sm" onClick={() => refetch()} className="text-muted-foreground gap-1.5 text-xs">
          <RefreshCw className="w-3 h-3" /> Refresh
        </Button>
      </div>
    </div>
  );
}

// ─── Hackathons Tab ───────────────────────────────────────────────────────────
interface Hackathon {
  id: number; name: string; slug: string; description: string | null;
  tagline: string | null; status: string; phase: string;
  streamUrl: string | null; streamActive: boolean; resultsPublished: boolean;
  judgeResultsVisible: boolean; prizePool: string | null; grandPrize: string | null;
  submissionLocked: boolean; jitsiRoom?: string | null; meetMode?: string; jitsiPassword?: string | null;
}

function HackathonsTab() {
  const { data: hackathons, loading, refetch } = useAdminFetch<Hackathon[]>("/api/hackathons");
  const { toast } = useToast();
  const [showCreate, setShowCreate] = useState(false);
  const [form, setForm] = useState({ name: "", slug: "", description: "", tagline: "", prizePool: "", grandPrize: "" });
  const [editId, setEditId] = useState<number | null>(null);
  const [editData, setEditData] = useState<Partial<Hackathon>>({});
  const [busy, setBusy] = useState(false);
  const [confirmDeleteId, setConfirmDeleteId] = useState<number | null>(null);

  const handleCreate = async () => {
    if (!form.name || !form.slug) { toast({ title: "Name and slug required", variant: "destructive" }); return; }
    setBusy(true);
    try {
      await adminApi("POST", "/api/hackathons", form);
      toast({ title: "Hackathon created" });
      setForm({ name: "", slug: "", description: "", tagline: "", prizePool: "", grandPrize: "" });
      setShowCreate(false);
      refetch();
    } catch (e: unknown) { toast({ title: "Error", description: (e as Error).message, variant: "destructive" }); }
    finally { setBusy(false); }
  };

  const handleAction = async (id: number, action: "activate" | "complete" | "delete") => {
    setBusy(true);
    try {
      if (action === "delete") await adminApi("DELETE", `/api/hackathons/${id}`);
      else await adminApi("POST", `/api/hackathons/${id}/${action}`);
      toast({ title: `Hackathon ${action}d` });
      setConfirmDeleteId(null);
      refetch();
    } catch (e: unknown) { toast({ title: "Error", description: (e as Error).message, variant: "destructive" }); }
    finally { setBusy(false); }
  };

  const handleSaveEdit = async () => {
    if (!editId) return;
    setBusy(true);
    try {
      await adminApi("PUT", `/api/hackathons/${editId}`, editData);
      toast({ title: "Hackathon updated" });
      setEditId(null);
      refetch();
    } catch (e: unknown) { toast({ title: "Error", description: (e as Error).message, variant: "destructive" }); }
    finally { setBusy(false); }
  };

  const statusBadge: Record<string, string> = {
    upcoming: "bg-chart-1/10 text-chart-1 border-chart-1/30",
    active: "bg-chart-3/10 text-chart-3 border-chart-3/30",
    completed: "bg-muted/50 text-muted-foreground",
  };

  return (
    <div className="space-y-6">
      <div className="flex justify-end">
        <Button size="sm" onClick={() => setShowCreate((p) => !p)} variant={showCreate ? "secondary" : "default"}>
          {showCreate ? <><X className="w-3 h-3 mr-1" /> Cancel</> : <><Plus className="w-3 h-3 mr-1" /> New Hackathon</>}
        </Button>
      </div>

      <AnimatePresence>
        {showCreate && (
          <motion.div initial={{ opacity: 0, height: 0 }} animate={{ opacity: 1, height: "auto" }} exit={{ opacity: 0, height: 0 }}>
            <Card className="border-primary/30 bg-primary/5">
              <CardHeader><CardTitle className="text-sm font-mono">CREATE HACKATHON</CardTitle></CardHeader>
              <CardContent className="space-y-3">
                <div className="grid grid-cols-2 gap-3">
                  <Input placeholder="Name *" value={form.name} onChange={(e) => setForm((p) => ({ ...p, name: e.target.value }))} />
                  <Input placeholder="Slug * (e.g. hackaegis-2026)" value={form.slug} onChange={(e) => setForm((p) => ({ ...p, slug: e.target.value.toLowerCase().replace(/\s+/g, "-") }))} />
                </div>
                <Input placeholder="Tagline" value={form.tagline} onChange={(e) => setForm((p) => ({ ...p, tagline: e.target.value }))} />
                <Textarea placeholder="Description" value={form.description} onChange={(e) => setForm((p) => ({ ...p, description: e.target.value }))} rows={2} className="resize-none" />
                <div className="grid grid-cols-2 gap-3">
                  <Input placeholder="Prize Pool (e.g. ₹15,000)" value={form.prizePool} onChange={(e) => setForm((p) => ({ ...p, prizePool: e.target.value }))} />
                  <Input placeholder="Grand Prize (e.g. ₹7,000)" value={form.grandPrize} onChange={(e) => setForm((p) => ({ ...p, grandPrize: e.target.value }))} />
                </div>
                <Button size="sm" onClick={handleCreate} disabled={busy || !form.name || !form.slug}>
                  <Plus className="w-3 h-3 mr-1" /> Create
                </Button>
              </CardContent>
            </Card>
          </motion.div>
        )}
      </AnimatePresence>

      {loading && <p className="text-center text-muted-foreground text-sm py-8">Loading...</p>}
      <div className="space-y-3">
        {hackathons?.map((h) => (
          <Card key={h.id} className={h.status === "active" ? "border-chart-3/30" : ""}>
            <CardContent className="py-4 px-4">
              {editId === h.id ? (
                <div className="space-y-3">
                  <div className="grid grid-cols-2 gap-3">
                    <Input placeholder="Name" value={editData.name ?? h.name} onChange={(e) => setEditData((p) => ({ ...p, name: e.target.value }))} />
                    <Input placeholder="Tagline" value={editData.tagline ?? h.tagline ?? ""} onChange={(e) => setEditData((p) => ({ ...p, tagline: e.target.value }))} />
                  </div>
                  <div className="grid grid-cols-3 gap-3">
                    <Input placeholder="Prize Pool" value={editData.prizePool ?? h.prizePool ?? ""} onChange={(e) => setEditData((p) => ({ ...p, prizePool: e.target.value }))} />
                    <Input placeholder="Grand Prize" value={editData.grandPrize ?? h.grandPrize ?? ""} onChange={(e) => setEditData((p) => ({ ...p, grandPrize: e.target.value }))} />
                    <select className="flex h-9 w-full rounded-md border border-input bg-background px-3 py-1 text-sm" value={editData.phase ?? h.phase} onChange={(e) => setEditData((p) => ({ ...p, phase: e.target.value }))}>
                      {["registration","submission","elimination","finale"].map((p) => <option key={p} value={p}>{p}</option>)}
                    </select>
                  </div>
                  <Input placeholder="Stream URL" value={editData.streamUrl ?? h.streamUrl ?? ""} onChange={(e) => setEditData((p) => ({ ...p, streamUrl: e.target.value }))} />
                  <div className="flex items-center gap-4 text-sm flex-wrap">
                    {(["streamActive","resultsPublished","judgeResultsVisible","submissionLocked"] as const).map((key) => (
                      <label key={key} className="flex items-center gap-2 cursor-pointer">
                        <input type="checkbox" checked={(editData[key] ?? h[key]) as boolean} onChange={(e) => setEditData((p) => ({ ...p, [key]: e.target.checked }))} /> {key.replace(/([A-Z])/g, " $1")}
                      </label>
                    ))}
                  </div>
                  <div className="flex gap-2">
                    <Button size="sm" onClick={handleSaveEdit} disabled={busy}>Save Changes</Button>
                    <Button size="sm" variant="ghost" onClick={() => setEditId(null)}>Cancel</Button>
                  </div>
                </div>
              ) : confirmDeleteId === h.id ? (
                <ConfirmDelete label={h.name} onConfirm={() => handleAction(h.id, "delete")} onCancel={() => setConfirmDeleteId(null)} />
              ) : (
                <div className="flex items-start justify-between gap-3">
                  <div className="flex-1">
                    <div className="flex items-center gap-2 mb-1 flex-wrap">
                      <h3 className="font-bold">{h.name}</h3>
                      <Badge className={`text-xs font-mono ${statusBadge[h.status] ?? ""}`}>{h.status.toUpperCase()}</Badge>
                      <Badge variant="outline" className="text-xs font-mono">{h.phase}</Badge>
                      {h.submissionLocked && <Badge className="text-xs bg-orange-400/10 text-orange-400 border-orange-400/30">LOCKED</Badge>}
                    </div>
                    {h.tagline && <p className="text-sm text-muted-foreground">{h.tagline}</p>}
                    <div className="flex gap-3 mt-1 text-xs text-muted-foreground flex-wrap">
                      {h.prizePool && <span>Pool: {h.prizePool}</span>}
                      {h.grandPrize && <span>Grand: {h.grandPrize}</span>}
                      {h.resultsPublished && <span className="text-chart-3">Results published</span>}
                    </div>
                  </div>
                  <div className="flex gap-1.5 flex-shrink-0 flex-wrap justify-end">
                    <Button size="sm" variant="ghost" onClick={() => { setEditId(h.id); setEditData({}); }} className="h-8 px-2"><Edit3 className="w-3 h-3" /></Button>
                    {h.status !== "active" && (
                      <Button size="sm" variant="outline" onClick={() => handleAction(h.id, "activate")} disabled={busy} className="h-8 text-xs gap-1 text-chart-3 border-chart-3/30">
                        <Zap className="w-3 h-3" /> Activate
                      </Button>
                    )}
                    {h.status === "active" && (
                      <Button size="sm" variant="outline" onClick={() => handleAction(h.id, "complete")} disabled={busy} className="h-8 text-xs gap-1">
                        <Archive className="w-3 h-3" /> Complete
                      </Button>
                    )}
                    <Button size="sm" variant="ghost" onClick={() => setConfirmDeleteId(h.id)} className="h-8 px-2 text-destructive hover:text-destructive">
                      <Trash2 className="w-3 h-3" />
                    </Button>
                  </div>
                </div>
              )}
            </CardContent>
          </Card>
        ))}
      </div>
    </div>
  );
}

// ─── Registrations Tab ────────────────────────────────────────────────────────
interface Registration {
  id: number; fullName: string; email: string; teamName: string;
  phone: string | null; memberCount: number; paymentMode: string;
  paymentStatus: string; notes: string | null; participantCode: string | null;
  createdAt: string; hackathonId: number | null;
  teamMembers: Array<{ fullName: string; email: string; phone: string }> | null;
}

function RegistrationsTab() {
  const { data: regs, loading, refetch } = useAdminFetch<Registration[]>("/api/admin/registrations");
  const { toast } = useToast();
  const [busy, setBusy] = useState<number | null>(null);
  const [filter, setFilter] = useState<"all" | "pending" | "approved" | "rejected">("all");

  const handleApprove = async (id: number) => {
    setBusy(id);
    try {
      const d = await adminApi("POST", `/api/admin/registrations/${id}/approve`);
      toast({ title: "Approved!", description: `Code: ${d.code}` });
      refetch();
    } catch (e: unknown) { toast({ title: "Error", description: (e as Error).message, variant: "destructive" }); }
    finally { setBusy(null); }
  };

  const handleReject = async (id: number) => {
    setBusy(id);
    try {
      await adminApi("POST", `/api/admin/registrations/${id}/reject`);
      toast({ title: "Rejected" });
      refetch();
    } catch (e: unknown) { toast({ title: "Error", description: (e as Error).message, variant: "destructive" }); }
    finally { setBusy(null); }
  };

  const filtered = (regs ?? []).filter((r) => filter === "all" ? true : r.paymentStatus === filter);
  const pending = (regs ?? []).filter((r) => r.paymentStatus === "pending").length;

  const statusColor: Record<string, string> = {
    pending: "bg-amber-400/10 text-amber-400 border-amber-400/30",
    approved: "bg-chart-3/10 text-chart-3 border-chart-3/30",
    rejected: "bg-destructive/10 text-destructive border-destructive/30",
  };
  const payModeLabel: Record<string, string> = { upi: "UPI", online: "Online Payment" };

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between flex-wrap gap-3">
        <div className="flex gap-2">
          {(["all","pending","approved","rejected"] as const).map((f) => (
            <Button key={f} size="sm" variant={filter === f ? "default" : "outline"} className="h-8 text-xs capitalize" onClick={() => setFilter(f)}>
              {f} {f === "pending" && pending > 0 && <Badge className="ml-1.5 bg-amber-400/20 text-amber-400 border-amber-400/30 text-xs px-1.5 py-0">{pending}</Badge>}
            </Button>
          ))}
        </div>
        <Button size="sm" variant="ghost" onClick={refetch} className="gap-1 text-xs text-muted-foreground">
          <RefreshCw className="w-3 h-3" /> Refresh
        </Button>
      </div>

      {loading && <p className="text-center text-muted-foreground text-sm py-8">Loading...</p>}
      {!loading && filtered.length === 0 && <Card><CardContent className="py-8 text-center text-muted-foreground text-sm">No registrations found.</CardContent></Card>}

      <div className="space-y-3">
        {filtered.map((reg) => (
          <Card key={reg.id} className={reg.paymentStatus === "pending" ? "border-amber-400/20" : ""}>
            <CardContent className="py-3 px-4">
              <div className="flex items-start justify-between gap-3 flex-wrap">
                <div className="flex-1 min-w-0">
                  <div className="flex items-center gap-2 flex-wrap mb-1">
                    <span className="font-bold text-sm">#{reg.id}</span>
                    <span className="font-semibold">{reg.teamName}</span>
                    <Badge className={`text-xs ${statusColor[reg.paymentStatus] ?? ""}`}>{reg.paymentStatus.toUpperCase()}</Badge>
                    <Badge variant="outline" className="text-xs">{payModeLabel[reg.paymentMode] ?? reg.paymentMode}</Badge>
                    <Badge variant="secondary" className="text-xs">{reg.memberCount} member{reg.memberCount !== 1 ? "s" : ""}</Badge>
                  </div>
                  <p className="text-xs text-muted-foreground">{reg.fullName} · {reg.email}{reg.phone && ` · ${reg.phone}`}</p>
                  {reg.notes && <p className="text-xs text-muted-foreground/70 mt-1 italic">"{reg.notes}"</p>}
                  {Array.isArray(reg.teamMembers) && reg.teamMembers.length > 0 && (
                    <div className="mt-2 space-y-0.5">
                      <p className="text-xs font-medium text-muted-foreground">Team Members:</p>
                      {(reg.teamMembers as Array<{ fullName?: string; email?: string; phone?: string }>).map((m, i) => (
                        <p key={i} className="text-xs text-muted-foreground pl-2">
                          {i + 1}. {m?.fullName || "(unknown)"} ({m?.email || "—"}){m?.phone ? ` · ${m.phone}` : ""}
                        </p>
                      ))}
                    </div>
                  )}
                  {reg.participantCode && (
                    <div className="mt-1.5 flex items-center gap-1.5">
                      <span className="text-xs font-mono text-primary bg-primary/10 px-2 py-0.5 rounded">{reg.participantCode}</span>
                      <Button variant="ghost" size="sm" className="h-6 w-6 p-0" onClick={() => { navigator.clipboard.writeText(reg.participantCode!); }}>
                        <Copy className="w-3 h-3" />
                      </Button>
                    </div>
                  )}
                  <p className="text-xs text-muted-foreground/60 mt-1">{new Date(reg.createdAt).toLocaleString()}</p>
                </div>
                {reg.paymentStatus === "pending" && (
                  <div className="flex gap-2 flex-shrink-0">
                    <Button size="sm" className="h-8 text-xs bg-chart-3 hover:bg-chart-3/90 gap-1" onClick={() => handleApprove(reg.id)} disabled={busy === reg.id}>
                      <CheckCircle className="w-3 h-3" /> Approve
                    </Button>
                    <Button size="sm" variant="outline" className="h-8 text-xs text-destructive border-destructive/30 gap-1" onClick={() => handleReject(reg.id)} disabled={busy === reg.id}>
                      <X className="w-3 h-3" /> Reject
                    </Button>
                  </div>
                )}
                {reg.paymentStatus === "approved" && !reg.participantCode && (
                  <Button size="sm" variant="outline" className="h-8 text-xs gap-1" onClick={() => handleApprove(reg.id)} disabled={busy === reg.id}>
                    <Key className="w-3 h-3" /> Generate Code
                  </Button>
                )}
              </div>
            </CardContent>
          </Card>
        ))}
      </div>
    </div>
  );
}

// ─── Codes Tab ────────────────────────────────────────────────────────────────
function CodesTab() {
  const { data: codes, refetch } = useListCodes();
  const generateCodes = useGenerateCodes();
  const resetCode = useResetCode();
  const deleteCode = useDeleteCode();
  const [count, setCount] = useState(5);
  const { toast } = useToast();
  const { data: teams } = useListTeams();
  const [confirmDeleteCode, setConfirmDeleteCode] = useState<string | null>(null);

  const copyAll = () => {
    const unused = codes?.filter((c) => !c.isUsed).map((c) => c.code).join("\n") ?? "";
    navigator.clipboard.writeText(unused);
    toast({ title: "Unused codes copied" });
  };

  const codesWithTeam = (codes ?? []) as Array<{
    id: number; code: string; isUsed: boolean; usedAt: string | null; createdAt: string;
    teamId?: number | null;
  }>;

  const teamMap = new Map(teams?.map((t) => [t.id, t.name]) ?? []);

  const assignTeam = async (code: string, teamId: number | "") => {
    const token = localStorage.getItem("hackaegis_admin_token");
    if (teamId === "") {
      await fetch("/api/teams/unassign-code", { method: "POST", headers: { "Content-Type": "application/json", Authorization: `Bearer ${token}` }, body: JSON.stringify({ code }) });
    } else {
      await fetch(`/api/teams/${teamId}/assign-code`, { method: "POST", headers: { "Content-Type": "application/json", Authorization: `Bearer ${token}` }, body: JSON.stringify({ code }) });
    }
    toast({ title: teamId === "" ? "Code unassigned" : "Code assigned to team" });
    refetch();
  };

  return (
    <div className="space-y-6">
      <Card>
        <CardHeader>
          <CardTitle className="text-sm font-mono">GENERATE PARTICIPANT CODES</CardTitle>
          <CardDescription>Format: <span className="text-primary font-mono">HACKAEGIS_PART_XXXXXXXX</span></CardDescription>
        </CardHeader>
        <CardContent>
          <div className="flex gap-3">
            <Input type="number" min={1} max={100} value={count} onChange={(e) => setCount(Number(e.target.value))} className="w-28" />
            <Button onClick={() => generateCodes.mutate({ data: { count } }, { onSuccess: () => { toast({ title: `${count} codes generated` }); refetch(); }, onError: (err) => toast({ title: "Error", description: err.message, variant: "destructive" }) })} disabled={generateCodes.isPending}>
              <Plus className="w-4 h-4 mr-2" /> Generate
            </Button>
          </div>
        </CardContent>
      </Card>
      <Card>
        <CardHeader>
          <div className="flex items-center justify-between">
            <div>
              <CardTitle className="text-sm font-mono">PARTICIPANT CODES</CardTitle>
              <CardDescription>{codesWithTeam.length} total · {codesWithTeam.filter((c) => !c.isUsed).length} unused · {codesWithTeam.filter((c) => c.teamId).length} team-linked</CardDescription>
            </div>
            {codesWithTeam.filter((c) => !c.isUsed).length > 0 && (
              <Button variant="outline" size="sm" onClick={copyAll}><Copy className="w-3 h-3 mr-1" /> Copy Unused</Button>
            )}
          </div>
        </CardHeader>
        <CardContent>
          <div className="space-y-2 max-h-[480px] overflow-y-auto pr-1">
            {codesWithTeam.map((c) => (
              <div key={c.code} className="rounded-lg bg-muted/30 hover:bg-muted/50">
                {confirmDeleteCode === c.code ? (
                  <div className="p-2">
                    <ConfirmDelete label={c.code} onConfirm={() => deleteCode.mutate({ code: c.code }, { onSuccess: () => { toast({ title: "Code deleted" }); setConfirmDeleteCode(null); refetch(); } })} onCancel={() => setConfirmDeleteCode(null)} />
                  </div>
                ) : (
                  <div className="flex items-center justify-between py-2.5 px-3 gap-3">
                    <div className="flex items-center gap-3 flex-1 min-w-0">
                      <span className="font-mono text-xs truncate">{c.code}</span>
                      <div className="flex items-center gap-1.5 flex-shrink-0">
                        {c.isUsed ? <Badge variant="secondary" className="text-xs bg-chart-3/20 text-chart-3 border-0">USED</Badge> : <Badge variant="outline" className="text-xs text-muted-foreground">AVAILABLE</Badge>}
                      </div>
                      {/* Show team name badge when assigned */}
                      {c.teamId && teamMap.get(c.teamId) && (
                        <Badge className="text-xs bg-chart-2/10 text-chart-2 border-chart-2/20 gap-1">
                          <Users className="w-2.5 h-2.5" />
                          {teamMap.get(c.teamId)}
                        </Badge>
                      )}
                    </div>
                    <div className="flex items-center gap-2 flex-shrink-0">
                      <select
                        className="h-7 text-xs rounded border border-input bg-background px-2"
                        value={c.teamId ?? ""}
                        onChange={(e) => assignTeam(c.code, e.target.value === "" ? "" : parseInt(e.target.value, 10))}
                      >
                        <option value="">No team</option>
                        {teams?.map((t) => <option key={t.id} value={t.id}>{t.name}</option>)}
                      </select>
                      <Button variant="ghost" size="sm" className="h-7 w-7 p-0" onClick={() => navigator.clipboard.writeText(c.code)}><Copy className="w-3 h-3" /></Button>
                      {c.isUsed && <Button variant="ghost" size="sm" className="h-7 w-7 p-0" onClick={() => resetCode.mutate({ code: c.code }, { onSuccess: () => { toast({ title: "Code reset" }); refetch(); } })}><RefreshCw className="w-3 h-3" /></Button>}
                      <Button variant="ghost" size="sm" className="h-7 w-7 p-0 text-destructive hover:text-destructive" onClick={() => setConfirmDeleteCode(c.code)}><Trash2 className="w-3 h-3" /></Button>
                    </div>
                  </div>
                )}
              </div>
            ))}
            {!codesWithTeam.length && <p className="text-center text-muted-foreground text-sm py-6">No participant codes yet. Generate some above.</p>}
          </div>
        </CardContent>
      </Card>
    </div>
  );
}

// ─── Teams Tab ────────────────────────────────────────────────────────────────
function TeamsTab() {
  const { data: teamsRaw, refetch } = useListTeams();
  const createTeam = useCreateTeam();
  const updateTeam = useUpdateTeam();
  const deleteTeam = useDeleteTeam();
  const { toast } = useToast();
  const [newTeam, setNewTeam] = useState({ name: "", projectTitle: "", description: "", githubUrl: "", domain: "" });
  const [editId, setEditId] = useState<number | null>(null);
  const [editData, setEditData] = useState({ name: "", projectTitle: "", description: "", githubUrl: "", domain: "" });
  const TEAM_DOMAINS = ["AI", "Machine Learning", "Blockchain", "FinTech", "Cybersecurity", "Web Development", "Mobile Development", "Cloud Computing", "IoT", "AR/VR", "Data Science", "DevOps", "Healthcare Tech", "EdTech", "Open Innovation"];
  const [expanded, setExpanded] = useState<number | null>(null);
  const [codeInput, setCodeInput] = useState<Record<number, string>>({});
  const [confirmDeleteId, setConfirmDeleteId] = useState<number | null>(null);
  const { data: hackathons } = useAdminFetch<Hackathon[]>("/api/hackathons");
  const token = localStorage.getItem("hackaegis_admin_token");

  const teams = (teamsRaw ?? []) as unknown as Array<{
    id: number; name: string; projectTitle: string; description: string | null;
    githubUrl: string | null; hackathonId: number | null; isFinalist: boolean;
    members: Array<{ id: number; code: string; label: string | null }>;
  }>;

  const hackathonMap = new Map(hackathons?.map((h) => [h.id, h.name]) ?? []);

  const assignCode = async (teamId: number) => {
    const code = codeInput[teamId]?.trim().toUpperCase();
    if (!code) return;
    const r = await fetch(`/api/teams/${teamId}/assign-code`, {
      method: "POST",
      headers: { "Content-Type": "application/json", Authorization: `Bearer ${token}` },
      body: JSON.stringify({ code }),
    });
    const d = await r.json();
    if (!r.ok) { toast({ title: "Error", description: d.message, variant: "destructive" }); return; }
    toast({ title: "Code assigned", description: `${code} → ${d.teamName}` });
    setCodeInput((p) => ({ ...p, [teamId]: "" }));
    refetch();
  };

  const handleToggleFinalist = async (teamId: number, current: boolean) => {
    try {
      await adminApi("POST", `/api/teams/${teamId}/finalist`, { isFinalist: !current });
      toast({ title: !current ? "Marked as Finalist" : "Removed from Finalists" });
      refetch();
    } catch (e: unknown) { toast({ title: "Error", description: (e as Error).message, variant: "destructive" }); }
  };

  return (
    <div className="space-y-6">
      {/* Create form */}
      <Card className="border-primary/20">
        <CardHeader><CardTitle className="text-sm font-mono">CREATE TEAM</CardTitle></CardHeader>
        <CardContent className="space-y-3">
          <div className="grid grid-cols-2 gap-3">
            <Input placeholder="Team Name *" value={newTeam.name} onChange={(e) => setNewTeam((p) => ({ ...p, name: e.target.value }))} />
            <Input placeholder="Project Title *" value={newTeam.projectTitle} onChange={(e) => setNewTeam((p) => ({ ...p, projectTitle: e.target.value }))} />
          </div>
          <div className="grid grid-cols-3 gap-3">
            <Input placeholder="GitHub URL" value={newTeam.githubUrl} onChange={(e) => setNewTeam((p) => ({ ...p, githubUrl: e.target.value }))} />
            <Input placeholder="Description" value={newTeam.description} onChange={(e) => setNewTeam((p) => ({ ...p, description: e.target.value }))} />
            <select value={newTeam.domain} onChange={(e) => setNewTeam((p) => ({ ...p, domain: e.target.value }))} className="flex h-9 rounded-md border border-input bg-background px-3 py-1 text-sm shadow-xs transition-colors focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-ring">
              <option value="">No domain</option>
              {TEAM_DOMAINS.map((d) => <option key={d} value={d}>{d}</option>)}
            </select>
          </div>
          <Button size="sm" onClick={async () => {
            if (!newTeam.name || !newTeam.projectTitle) { toast({ title: "Name and project title required", variant: "destructive" }); return; }
            try {
              const r = await fetch("/api/teams", {
                method: "POST",
                headers: { "Content-Type": "application/json", Authorization: `Bearer ${token}` },
                body: JSON.stringify({ name: newTeam.name, projectTitle: newTeam.projectTitle, description: newTeam.description || undefined, githubUrl: newTeam.githubUrl || undefined, domain: newTeam.domain || undefined }),
              });
              if (!r.ok) throw new Error((await r.json()).message ?? "Failed");
              toast({ title: "Team created" });
              setNewTeam({ name: "", projectTitle: "", description: "", githubUrl: "", domain: "" });
              refetch();
            } catch (err: unknown) { toast({ title: "Error", description: err instanceof Error ? err.message : "Failed", variant: "destructive" }); }
          }} disabled={!newTeam.name || !newTeam.projectTitle}>
            <Plus className="w-3.5 h-3.5 mr-1" /> Create Team
          </Button>
        </CardContent>
      </Card>

      {/* Teams list */}
      <div className="space-y-3">
        {teams.map((team) => (
          <Card key={team.id} className={team.isFinalist ? "border-yellow-400/30 bg-yellow-400/5" : ""}>
            <CardContent className="py-3 px-4">
              {confirmDeleteId === team.id ? (
                <ConfirmDelete label={team.name} onConfirm={() => deleteTeam.mutate({ id: team.id }, { onSuccess: () => { toast({ title: "Team deleted" }); setConfirmDeleteId(null); refetch(); }, onError: (err) => toast({ title: "Error", description: err.message, variant: "destructive" }) })} onCancel={() => setConfirmDeleteId(null)} />
              ) : editId === team.id ? (
                <div className="space-y-2">
                  <div className="grid grid-cols-2 gap-2">
                    <Input value={editData.name} onChange={(e) => setEditData((p) => ({ ...p, name: e.target.value }))} placeholder="Team name" />
                    <Input value={editData.projectTitle} onChange={(e) => setEditData((p) => ({ ...p, projectTitle: e.target.value }))} placeholder="Project title" />
                  </div>
                  <div className="grid grid-cols-3 gap-2">
                    <Input value={editData.githubUrl} onChange={(e) => setEditData((p) => ({ ...p, githubUrl: e.target.value }))} placeholder="GitHub URL" />
                    <Input value={editData.description} onChange={(e) => setEditData((p) => ({ ...p, description: e.target.value }))} placeholder="Description" />
                    <select value={editData.domain} onChange={(e) => setEditData((p) => ({ ...p, domain: e.target.value }))} className="flex h-9 rounded-md border border-input bg-background px-3 py-1 text-sm shadow-xs">
                      <option value="">No domain</option>
                      {TEAM_DOMAINS.map((d) => <option key={d} value={d}>{d}</option>)}
                    </select>
                  </div>
                  <div className="flex gap-2">
                    <Button size="sm" onClick={async () => {
                      try {
                        const r = await fetch(`/api/teams/${team.id}`, { method: "PUT", headers: { "Content-Type": "application/json", Authorization: `Bearer ${token}` }, body: JSON.stringify({ ...editData, domain: editData.domain || undefined }) });
                        if (!r.ok) throw new Error((await r.json()).message ?? "Failed");
                        toast({ title: "Team updated" }); setEditId(null); refetch();
                      } catch (err: unknown) { toast({ title: "Error", description: err instanceof Error ? err.message : "Failed", variant: "destructive" }); }
                    }}>Save</Button>
                    <Button size="sm" variant="ghost" onClick={() => setEditId(null)}>Cancel</Button>
                  </div>
                </div>
              ) : (
                <div>
                  <div className="flex items-center justify-between gap-3">
                    <div className="flex items-center gap-2 flex-wrap flex-1 min-w-0">
                      <span className="font-bold truncate">{team.name}</span>
                      {team.isFinalist && <Badge className="bg-yellow-400/10 text-yellow-400 border-yellow-400/30 text-xs gap-1"><Star className="w-2.5 h-2.5" />FINALIST</Badge>}
                      {team.hackathonId && hackathonMap.get(team.hackathonId) && (
                        <Badge variant="outline" className="text-xs">{hackathonMap.get(team.hackathonId)}</Badge>
                      )}
                      <span className="text-xs text-muted-foreground truncate">{team.projectTitle}</span>
                    </div>
                    <div className="flex gap-1.5 flex-shrink-0">
                      <Button size="sm" variant={team.isFinalist ? "default" : "outline"} className={`h-7 text-xs gap-1 ${team.isFinalist ? "bg-yellow-500 hover:bg-yellow-600 text-black" : ""}`} onClick={() => handleToggleFinalist(team.id, team.isFinalist)}>
                        <Star className="w-2.5 h-2.5" />{team.isFinalist ? "Finalist" : "Set Finalist"}
                      </Button>
                      <Button size="sm" variant="ghost" className="h-7 w-7 p-0" onClick={() => { setEditId(team.id); setEditData({ name: team.name, projectTitle: team.projectTitle, description: team.description ?? "", githubUrl: team.githubUrl ?? "", domain: (team as Record<string, unknown>).domain as string ?? "" }); }}><Edit3 className="w-3 h-3" /></Button>
                      <Button size="sm" variant="ghost" className="h-7 w-7 p-0" onClick={() => setExpanded(expanded === team.id ? null : team.id)}>
                        {expanded === team.id ? <ChevronUp className="w-3.5 h-3.5" /> : <ChevronDown className="w-3.5 h-3.5" />}
                      </Button>
                      <Button size="sm" variant="ghost" className="h-7 w-7 p-0 text-destructive hover:text-destructive" onClick={() => setConfirmDeleteId(team.id)}>
                        <Trash2 className="w-3 h-3" />
                      </Button>
                    </div>
                  </div>

                  <AnimatePresence>
                    {expanded === team.id && (
                      <motion.div initial={{ opacity: 0, height: 0 }} animate={{ opacity: 1, height: "auto" }} exit={{ opacity: 0, height: 0 }} className="overflow-hidden">
                        <div className="mt-3 pt-3 border-t border-border space-y-2">
                          {team.githubUrl && (
                            <a href={team.githubUrl} target="_blank" rel="noreferrer" className="flex items-center gap-1.5 text-xs text-muted-foreground hover:text-primary">
                              <Github className="w-3 h-3" /> {team.githubUrl}
                            </a>
                          )}
                          <div className="flex items-center gap-2">
                            <p className="text-xs text-muted-foreground">Members ({team.members?.length ?? 0}):</p>
                            <div className="flex flex-wrap gap-1">
                              {team.members?.map((m) => (
                                <div key={m.id} className="flex items-center gap-1">
                                  <span className="text-xs font-mono bg-muted/60 px-2 py-0.5 rounded">{m.code}</span>
                                  {m.label && <span className="text-xs text-muted-foreground">({m.label})</span>}
                                </div>
                              ))}
                              {!team.members?.length && <span className="text-xs text-muted-foreground">No codes linked</span>}
                            </div>
                          </div>
                          <div className="flex gap-2 items-center">
                            <Input
                              placeholder="Assign code: HACKAEGIS_PART_..."
                              value={codeInput[team.id] ?? ""}
                              onChange={(e) => setCodeInput((p) => ({ ...p, [team.id]: e.target.value.toUpperCase() }))}
                              className="h-8 text-xs font-mono"
                            />
                            <Button size="sm" variant="outline" className="h-8 text-xs" onClick={() => assignCode(team.id)}>
                              <UserCheck className="w-3 h-3 mr-1" /> Assign
                            </Button>
                          </div>
                        </div>
                      </motion.div>
                    )}
                  </AnimatePresence>
                </div>
              )}
            </CardContent>
          </Card>
        ))}
        {!teams.length && <Card><CardContent className="py-8 text-center text-muted-foreground text-sm">No teams yet.</CardContent></Card>}
      </div>
    </div>
  );
}

// ─── Judges Tab ────────────────────────────────────────────────────────────────
function JudgesTab() {
  const { data: codes, loading, refetch } = useAdminFetch<Array<{ id: number; code: string; label: string | null; domain: string | null; email: string | null; bio: string | null; yearsOfExperience: number | null; createdAt: string }>>("/api/codes/judges");
  const { toast } = useToast();
  const token = localStorage.getItem("hackaegis_admin_token");
  const [newLabel, setNewLabel] = useState("");
  const [newEmail, setNewEmail] = useState("");
  const [newDomain, setNewDomain] = useState("");
  const [creating, setCreating] = useState(false);
  const [confirmDeleteCode, setConfirmDeleteCode] = useState<string | null>(null);
  const [expandedJudge, setExpandedJudge] = useState<number | null>(null);

  const DOMAINS = ["AI", "Machine Learning", "Blockchain", "FinTech", "Cybersecurity", "Web Development", "Mobile Development", "Cloud Computing", "IoT", "AR/VR", "Data Science", "DevOps", "Healthcare Tech", "EdTech", "Open Innovation"];

  const createJudge = async () => {
    if (!newLabel) { toast({ title: "Label required", variant: "destructive" }); return; }
    setCreating(true);
    try {
      const r = await fetch("/api/codes/judges", {
        method: "POST", headers: { "Content-Type": "application/json", Authorization: `Bearer ${token}` },
        body: JSON.stringify({ label: newLabel, domain: newDomain || null, email: newEmail || null }),
      });
      if (!r.ok) throw new Error("Failed to create judge");
      const created = await r.json();
      toast({ title: "Judge created", description: `${created.code}${newDomain ? ` (${newDomain})` : ""}` });
      setNewLabel("");
      setNewEmail("");
      setNewDomain("");
      refetch();
    } catch (e: unknown) { toast({ title: "Error", description: (e as Error).message, variant: "destructive" }); }
    finally { setCreating(false); }
  };

  return (
    <div className="space-y-6">
      <Card>
        <CardHeader><CardTitle className="text-sm font-mono">ADD JUDGE</CardTitle></CardHeader>
        <CardContent className="space-y-3">
          <div className="grid grid-cols-2 gap-3">
            <Input placeholder="Judge name *" value={newLabel} onChange={(e) => setNewLabel(e.target.value)} />
            <Input placeholder="Email (optional)" type="email" value={newEmail} onChange={(e) => setNewEmail(e.target.value)} />
          </div>
          <div className="flex gap-3">
            <select value={newDomain} onChange={(e) => setNewDomain(e.target.value)} className="flex h-9 flex-1 rounded-md border border-input bg-background px-3 py-1 text-sm shadow-xs">
              <option value="">No domain</option>
              {DOMAINS.map((d) => <option key={d} value={d}>{d}</option>)}
            </select>
            <Button onClick={createJudge} disabled={creating || !newLabel}><Plus className="w-4 h-4 mr-1" /> Add Judge</Button>
          </div>
        </CardContent>
      </Card>
      <div className="space-y-2">
        {loading && <p className="text-muted-foreground text-sm text-center py-4">Loading...</p>}
        {codes?.map((c) => (
          <div key={c.code} className="rounded-lg bg-muted/30">
            {confirmDeleteCode === c.code ? (
              <div className="p-2">
                <ConfirmDelete label={`${c.label ?? c.code}`} onConfirm={async () => {
                  await adminApi("DELETE", `/api/codes/judges/${c.id}`);
                  toast({ title: "Judge code deleted" }); setConfirmDeleteCode(null); refetch();
                }} onCancel={() => setConfirmDeleteCode(null)} />
              </div>
            ) : (
              <div>
                <div className="flex items-center gap-3 px-3 py-2.5 cursor-pointer hover:bg-muted/50 transition-colors" onClick={() => setExpandedJudge(expandedJudge === c.id ? null : c.id)}>
                  <Scale className="w-4 h-4 text-chart-2 flex-shrink-0" />
                  <div className="flex-1 min-w-0">
                    <p className="font-semibold text-sm">{c.label ?? "Judge"}</p>
                    <p className="font-mono text-xs text-muted-foreground">{c.code}</p>
                  </div>
                  {c.domain && <Badge variant="secondary" className="text-xs">{c.domain}</Badge>}
                  {c.email && <span className="text-xs text-muted-foreground hidden sm:inline">{c.email}</span>}
                  <Button variant="ghost" size="sm" className="h-7 w-7 p-0" onClick={(e) => { e.stopPropagation(); navigator.clipboard.writeText(c.code); toast({ title: "Code copied" }); }}><Copy className="w-3 h-3" /></Button>
                  <Button variant="ghost" size="sm" className="h-7 w-7 p-0 text-destructive" onClick={(e) => { e.stopPropagation(); setConfirmDeleteCode(c.code); }}><Trash2 className="w-3 h-3" /></Button>
                </div>
                {expandedJudge === c.id && (
                  <div className="px-3 pb-3 pt-1 border-t border-border/50 space-y-2">
                    <div className="grid grid-cols-2 gap-x-6 gap-y-1 text-sm">
                      <div><span className="text-muted-foreground">Name:</span> <span className="font-medium">{c.label ?? "—"}</span></div>
                      <div><span className="text-muted-foreground">Email:</span> <span className="font-medium">{c.email ?? "—"}</span></div>
                      <div><span className="text-muted-foreground">Domain:</span> <span className="font-medium">{c.domain ?? "Not assigned"}</span></div>
                      <div><span className="text-muted-foreground">Experience:</span> <span className="font-medium">{c.yearsOfExperience != null ? `${c.yearsOfExperience} years` : "—"}</span></div>
                      <div className="col-span-2"><span className="text-muted-foreground">Code:</span> <span className="font-mono font-medium">{c.code}</span></div>
                      <div className="col-span-2"><span className="text-muted-foreground">Created:</span> <span className="font-medium">{new Date(c.createdAt).toLocaleDateString()}</span></div>
                      {c.bio && <div className="col-span-2 mt-1"><span className="text-muted-foreground">Bio:</span> <p className="mt-0.5 text-sm">{c.bio}</p></div>}
                    </div>
                  </div>
                )}
              </div>
            )}
          </div>
        ))}
        {!loading && !codes?.length && <p className="text-center text-muted-foreground text-sm py-6">No judge codes yet.</p>}
      </div>
    </div>
  );
}

// ─── Scores Tab ────────────────────────────────────────────────────────────────
function ScoresTab() {
  const { data: scoreData, refetch, isFetching: loading } = useGetAdminDashboard();
  const [expanded, setExpanded] = useState<number | null>(null);
  const sd = scoreData as (typeof scoreData & {
    teams?: Array<{
      teamId: number; teamName: string; projectTitle: string; rank: number;
      averageScore: number; averageInnovation: number | null;
      averageExecution: number | null; averagePresentation: number | null;
      judgesScored: number; totalJudges: number; hasSubmission: boolean;
      githubUrl: string | null; demoUrl: string | null; slidesUrl: string | null;
      judgeBreakdown: Array<{ judgeId: number; judgeName: string; score: number; innovation: number | null; execution: number | null; presentation: number | null; feedback: string | null }>;
    }>;
  }) | undefined;

  return (
    <div className="space-y-4">
      <div className="flex justify-end">
        <Button variant="ghost" size="sm" onClick={() => refetch()} className="text-muted-foreground gap-1.5 text-xs">
          <RefreshCw className="w-3 h-3" /> Refresh
        </Button>
      </div>
      {loading && <p className="text-center text-muted-foreground text-sm py-8">Loading scores...</p>}
      {!loading && !sd?.teams?.length && (
        <Card><CardContent className="py-8 text-center text-muted-foreground text-sm">No scores submitted yet.</CardContent></Card>
      )}
      <div className="space-y-3">
        {sd?.teams?.map((team) => {
          const scored = team.judgesScored > 0;
          const pct = team.totalJudges > 0 ? Math.round((team.judgesScored / team.totalJudges) * 100) : 0;
          return (
            <Card key={team.teamId} className={`overflow-hidden ${team.rank === 1 && scored ? "border-yellow-400/30" : ""}`}>
              <CardContent className="py-3 px-4">
                <div className="flex items-center gap-3">
                  <div className="text-center w-8 flex-shrink-0">
                    {scored ? <span className={`text-lg font-bold font-mono ${team.rank === 1 ? "text-yellow-400" : team.rank === 2 ? "text-slate-300" : team.rank === 3 ? "text-amber-600" : "text-muted-foreground"}`}>#{team.rank}</span> : <span className="text-xs text-muted-foreground">—</span>}
                  </div>
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-2 flex-wrap">
                      <span className="font-semibold">{team.teamName}</span>
                      <span className="text-xs text-muted-foreground truncate">{team.projectTitle}</span>
                      {!team.hasSubmission && <Badge variant="secondary" className="text-xs"><AlertCircle className="w-3 h-3 mr-0.5" /> No submission</Badge>}
                    </div>
                    <div className="flex items-center gap-3 mt-1">
                      <div className="flex-1 h-1.5 rounded-full bg-muted overflow-hidden max-w-[120px]">
                        <motion.div className="h-full bg-primary rounded-full" initial={{ width: 0 }} animate={{ width: `${pct}%` }} />
                      </div>
                      <span className="text-xs text-muted-foreground">{team.judgesScored}/{team.totalJudges} judges</span>
                      <div className="flex gap-2">
                        {team.githubUrl && <a href={team.githubUrl} target="_blank" rel="noreferrer" className="text-xs text-muted-foreground hover:text-primary"><Github className="w-3 h-3" /></a>}
                        {team.demoUrl && <a href={team.demoUrl} target="_blank" rel="noreferrer" className="text-xs text-muted-foreground hover:text-primary"><Monitor className="w-3 h-3" /></a>}
                        {team.slidesUrl && <a href={team.slidesUrl} target="_blank" rel="noreferrer" className="text-xs text-muted-foreground hover:text-primary"><FileText className="w-3 h-3" /></a>}
                      </div>
                    </div>
                  </div>
                  <div className="text-right flex-shrink-0 flex items-center gap-4">
                    {scored && (
                      <div className="flex gap-4">
                        <ScorePill val={team.averageInnovation} label="Innovation" />
                        <ScorePill val={team.averageExecution} label="Execution" />
                        <ScorePill val={team.averagePresentation} label="Presentation" />
                        <div className="text-center">
                          <p className="text-xs text-muted-foreground">Overall</p>
                          <p className="text-2xl font-bold font-mono text-primary">{team.averageScore}</p>
                        </div>
                      </div>
                    )}
                    {!scored && <span className="text-xs text-muted-foreground font-mono">UNSCORED</span>}
                    <Button variant="ghost" size="sm" className="h-7 w-7 p-0" onClick={() => setExpanded(expanded === team.teamId ? null : team.teamId)}>
                      {expanded === team.teamId ? <ChevronUp className="w-3.5 h-3.5" /> : <ChevronDown className="w-3.5 h-3.5" />}
                    </Button>
                  </div>
                </div>
                <AnimatePresence>
                  {expanded === team.teamId && (
                    <motion.div initial={{ opacity: 0, height: 0 }} animate={{ opacity: 1, height: "auto" }} exit={{ opacity: 0, height: 0 }} className="mt-3 pt-3 border-t border-border">
                      {team.judgeBreakdown.length === 0 ? (
                        <p className="text-xs text-muted-foreground">No scores yet.</p>
                      ) : (
                        <div className="space-y-2">
                          {team.judgeBreakdown.map((jb) => (
                            <div key={jb.judgeId} className="flex items-start justify-between py-2 px-3 rounded-lg bg-muted/20 text-xs">
                              <div>
                                <p className="font-semibold">{jb.judgeName}</p>
                                {jb.feedback && <p className="text-muted-foreground mt-0.5 italic">"{jb.feedback}"</p>}
                              </div>
                              <div className="flex gap-3 text-right flex-shrink-0">
                                {jb.innovation !== null && <div><p className="text-muted-foreground">Innov.</p><p className="font-mono font-bold">{jb.innovation}</p></div>}
                                {jb.execution !== null && <div><p className="text-muted-foreground">Exec.</p><p className="font-mono font-bold">{jb.execution}</p></div>}
                                {jb.presentation !== null && <div><p className="text-muted-foreground">Pres.</p><p className="font-mono font-bold">{jb.presentation}</p></div>}
                                <div><p className="text-muted-foreground">Overall</p><p className="font-mono font-bold text-primary text-sm">{jb.score}</p></div>
                              </div>
                            </div>
                          ))}
                        </div>
                      )}
                    </motion.div>
                  )}
                </AnimatePresence>
              </CardContent>
            </Card>
          );
        })}
      </div>
    </div>
  );
}

// ─── Polls Tab ────────────────────────────────────────────────────────────────
function PollsTab() {
  const { data: polls, refetch } = useListPolls();
  const createPoll = useCreatePoll();
  const activatePoll = useActivatePoll();
  const deactivatePoll = useDeactivatePoll();
  const { toast } = useToast();
  const [question, setQuestion] = useState("");

  return (
    <div className="space-y-6">
      <Card>
        <CardHeader>
          <CardTitle className="text-sm font-mono">CREATE POLL</CardTitle>
          <CardDescription>Teams in the active hackathon are voting options</CardDescription>
        </CardHeader>
        <CardContent className="space-y-3">
          <Input placeholder="e.g. Which team had the best innovation?" value={question} onChange={(e) => setQuestion(e.target.value)} />
          <Button size="sm" onClick={() => {
            if (!question) { toast({ title: "Question required", variant: "destructive" }); return; }
            createPoll.mutate({ data: { question } }, { onSuccess: () => { toast({ title: "Poll created" }); refetch(); setQuestion(""); }, onError: (err) => toast({ title: "Error", description: err.message, variant: "destructive" }) });
          }} disabled={createPoll.isPending}>
            <CheckCircle className="w-4 h-4 mr-1" /> Create Poll
          </Button>
        </CardContent>
      </Card>
      <div className="space-y-3">
        {polls?.map((poll) => (
          <Card key={poll.id} className={poll.isActive ? "border-chart-3/30 bg-chart-3/5" : ""}>
            <CardContent className="py-4">
              <div className="flex items-start justify-between gap-4">
                <div className="flex-1">
                  <div className="flex items-center gap-2 mb-1 flex-wrap">
                    <p className="font-semibold">{poll.question}</p>
                    {poll.isActive && <Badge className="text-xs bg-chart-3/20 text-chart-3 border-chart-3/30">ACTIVE</Badge>}
                    {poll.isFrozen && <Badge variant="secondary" className="text-xs">FROZEN</Badge>}
                  </div>
                  <p className="text-sm text-muted-foreground font-mono">{poll.totalVotes} votes</p>
                </div>
                <div className="flex gap-2 flex-shrink-0">
                  {poll.isActive ? (
                    <Button variant="outline" size="sm" onClick={() => deactivatePoll.mutate({ id: poll.id }, { onSuccess: () => { toast({ title: "Poll stopped" }); refetch(); } })}>
                      <Square className="w-3 h-3 mr-1" /> Stop
                    </Button>
                  ) : (
                    <Button size="sm" variant="outline" onClick={() => activatePoll.mutate({ id: poll.id }, { onSuccess: () => { toast({ title: "Poll activated" }); refetch(); } })}>
                      <Play className="w-3 h-3 mr-1" /> Start
                    </Button>
                  )}
                </div>
              </div>
            </CardContent>
          </Card>
        ))}
        {!polls?.length && <p className="text-center text-muted-foreground text-sm py-6">No polls yet.</p>}
      </div>
    </div>
  );
}

// ─── Live Meet Tab ────────────────────────────────────────────────────────────
function LiveTab() {
  const { data: hackathons, refetch } = useAdminFetch<Hackathon[]>("/api/hackathons");
  const { data: teamsRaw } = useListTeams();
  const { toast } = useToast();
  const [busy, setBusy] = useState(false);

  const activeHackathon = hackathons?.find((h) => h.status === "active");
  const teams = (teamsRaw ?? []) as Array<{ id: number; name: string; isFinalist: boolean }>;

  const [meetForm, setMeetForm] = useState({ jitsiRoom: "", meetMode: "youtube", jitsiPassword: "" });

  useEffect(() => {
    if (activeHackathon) {
      setMeetForm({
        jitsiRoom: activeHackathon.jitsiRoom ?? "",
        meetMode: activeHackathon.meetMode ?? "youtube",
        jitsiPassword: activeHackathon.jitsiPassword ?? "",
      });
    }
  }, [activeHackathon?.id]);

  const handleUpdateMeet = async () => {
    if (!activeHackathon) { toast({ title: "No active hackathon", variant: "destructive" }); return; }
    setBusy(true);
    try {
      await adminApi("PUT", `/api/hackathons/${activeHackathon.id}`, {
        jitsiRoom: meetForm.jitsiRoom || null,
        meetMode: meetForm.meetMode,
        jitsiPassword: meetForm.jitsiPassword || null,
      });
      toast({ title: "Meet config updated" });
      refetch();
    } catch (e: unknown) { toast({ title: "Error", description: (e as Error).message, variant: "destructive" }); }
    finally { setBusy(false); }
  };

  const handleLaunchMeet = async () => {
    if (!activeHackathon) { toast({ title: "No active hackathon", variant: "destructive" }); return; }
    const roomName = meetForm.jitsiRoom || `HackAegis-${Date.now()}`;
    setBusy(true);
    try {
      await adminApi("PUT", `/api/hackathons/${activeHackathon.id}`, {
        jitsiRoom: roomName,
        meetMode: "jitsi",
        phase: "finale",
        streamActive: true,
      });
      setMeetForm((p) => ({ ...p, jitsiRoom: roomName, meetMode: "jitsi" }));
      toast({ title: "Meet Launched!", description: `Room: ${roomName}` });
      refetch();
    } catch (e: unknown) { toast({ title: "Error", description: (e as Error).message, variant: "destructive" }); }
    finally { setBusy(false); }
  };

  const handleToggleFinalist = async (teamId: number, current: boolean) => {
    try {
      await adminApi("POST", `/api/teams/${teamId}/finalist`, { isFinalist: !current });
      toast({ title: !current ? "Marked as Finalist" : "Removed" });
      refetch();
    } catch (e: unknown) { toast({ title: "Error", description: (e as Error).message, variant: "destructive" }); }
  };

  const isJitsiActive = activeHackathon?.meetMode === "jitsi" || activeHackathon?.meetMode === "both";

  return (
    <div className="space-y-6">
      {!activeHackathon && (
        <Card className="border-amber-400/20">
          <CardContent className="py-6 text-center text-muted-foreground text-sm">
            <AlertCircle className="w-6 h-6 mx-auto mb-2 text-amber-400" />
            No active hackathon. Activate one first from the Events tab.
          </CardContent>
        </Card>
      )}

      {activeHackathon && (
        <>
          {/* Status card */}
          <Card className={isJitsiActive ? "border-red-500/30 bg-red-500/5" : "border-border"}>
            <CardContent className="py-3 px-4 flex items-center gap-3">
              <div className={`w-2 h-2 rounded-full ${isJitsiActive ? "bg-red-500 animate-pulse" : "bg-muted-foreground"}`} />
              <div className="flex-1">
                <p className="font-semibold text-sm">{isJitsiActive ? "Meet is LIVE" : "Meet is Offline"}</p>
                {activeHackathon.jitsiRoom && (
                  <p className="text-xs text-muted-foreground font-mono">Room: {activeHackathon.jitsiRoom}</p>
                )}
              </div>
              {isJitsiActive && (
                <div className="flex gap-2">
                  <Button size="sm" variant="outline" className="h-8 text-xs gap-1" onClick={() => window.open(`https://meet.jit.si/${activeHackathon.jitsiRoom}`, "_blank")}>
                    <Tv className="w-3 h-3" /> Open Room
                  </Button>
                </div>
              )}
            </CardContent>
          </Card>

          {/* Launch button */}
          <Card className="border-primary/20">
            <CardHeader><CardTitle className="text-sm font-mono">LAUNCH LIVE MEET</CardTitle><CardDescription>One-click to launch the finale meet for judges and finalists</CardDescription></CardHeader>
            <CardContent className="space-y-3">
              <Button className="w-full h-12 gap-2 bg-red-600 hover:bg-red-700 text-white font-bold" onClick={handleLaunchMeet} disabled={busy}>
                <Video className="w-5 h-5" /> Launch Finals Meet
              </Button>
              <p className="text-xs text-muted-foreground text-center">This will set phase to "finale", create a Jitsi room, and enable Jitsi meet mode</p>
            </CardContent>
          </Card>

          {/* Meet config */}
          <Card>
            <CardHeader><CardTitle className="text-sm font-mono">MEET CONFIGURATION</CardTitle></CardHeader>
            <CardContent className="space-y-3">
              <div>
                <label className="text-xs text-muted-foreground">Jitsi Room Name</label>
                <Input value={meetForm.jitsiRoom} onChange={(e) => setMeetForm((p) => ({ ...p, jitsiRoom: e.target.value }))} placeholder="HackAegis-2026-Finals" className="mt-1 font-mono" />
              </div>
              <div>
                <label className="text-xs text-muted-foreground">Meet Mode</label>
                <select className="flex h-9 w-full rounded-md border border-input bg-background px-3 py-1 text-sm mt-1" value={meetForm.meetMode} onChange={(e) => setMeetForm((p) => ({ ...p, meetMode: e.target.value }))}>
                  <option value="youtube">YouTube Only</option>
                  <option value="jitsi">Jitsi Meet Only</option>
                  <option value="both">Both (Jitsi + YouTube)</option>
                </select>
              </div>
              <div>
                <label className="text-xs text-muted-foreground">Jitsi Password (optional)</label>
                <Input value={meetForm.jitsiPassword} onChange={(e) => setMeetForm((p) => ({ ...p, jitsiPassword: e.target.value }))} placeholder="Optional room password" className="mt-1" />
              </div>
              <Button size="sm" onClick={handleUpdateMeet} disabled={busy}><Globe className="w-3.5 h-3.5 mr-1" /> Update Config</Button>
            </CardContent>
          </Card>

          {/* Finalist selection */}
          <Card>
            <CardHeader>
              <CardTitle className="text-sm font-mono">FINALIST TEAMS</CardTitle>
              <CardDescription>Finalists can join the meet with camera, mic, and screen share</CardDescription>
            </CardHeader>
            <CardContent>
              <div className="space-y-2">
                {teams.map((team) => (
                  <div key={team.id} className={`flex items-center justify-between px-3 py-2 rounded-lg ${team.isFinalist ? "bg-yellow-400/10 border border-yellow-400/20" : "bg-muted/30"}`}>
                    <div className="flex items-center gap-2">
                      {team.isFinalist && <Star className="w-3.5 h-3.5 text-yellow-400" />}
                      <span className="text-sm font-medium">{team.name}</span>
                    </div>
                    <Button
                      size="sm"
                      variant={team.isFinalist ? "default" : "outline"}
                      className={`h-7 text-xs ${team.isFinalist ? "bg-yellow-500 hover:bg-yellow-600 text-black" : ""}`}
                      onClick={() => handleToggleFinalist(team.id, team.isFinalist)}
                    >
                      {team.isFinalist ? "Finalist ✓" : "Set Finalist"}
                    </Button>
                  </div>
                ))}
                {!teams.length && <p className="text-muted-foreground text-sm text-center py-3">No teams found.</p>}
              </div>
            </CardContent>
          </Card>
        </>
      )}
    </div>
  );
}

// ─── Event Config Tab ─────────────────────────────────────────────────────────
function EventTab() {
  const { data: eventStatus, refetch } = useGetEventStatus();
  const updateEvent = useUpdateEventStatus();
  const { toast } = useToast();
  const [form, setForm] = useState({ eventName: "", tagline: "", streamUrl: "", phase: "" as string, streamActive: false, resultsPublished: false, judgeResultsVisible: false });
  const eventStatusExt = eventStatus as (typeof eventStatus & { judgeResultsVisible?: boolean }) | undefined;

  useEffect(() => {
    if (eventStatus) {
      setForm({
        eventName: eventStatus.eventName ?? "",
        tagline: eventStatus.tagline ?? "",
        streamUrl: eventStatus.streamUrl ?? "",
        phase: eventStatus.phase ?? "",
        streamActive: eventStatus.streamActive ?? false,
        resultsPublished: eventStatus.resultsPublished ?? false,
        judgeResultsVisible: eventStatusExt?.judgeResultsVisible ?? false,
      });
    }
  }, [eventStatus?.eventName]);

  const handleUpdate = () => {
    const updateData: Record<string, unknown> = {
      streamActive: form.streamActive,
      resultsPublished: form.resultsPublished,
      judgeResultsVisible: form.judgeResultsVisible,
    };
    if (form.eventName) updateData.eventName = form.eventName;
    if (form.tagline) updateData.tagline = form.tagline;
    if (form.streamUrl !== undefined) updateData.streamUrl = form.streamUrl;
    if (form.phase) updateData.phase = form.phase as UpdateEventStatusBodyPhase;
    updateEvent.mutate({ data: updateData as Parameters<typeof updateEvent.mutate>[0]["data"] }, {
      onSuccess: () => { toast({ title: "Event config updated" }); refetch(); },
      onError: (err) => toast({ title: "Error", description: err.message, variant: "destructive" }),
    });
  };

  return (
    <div className="space-y-6">
      <Card>
        <CardHeader><CardTitle className="text-sm font-mono">CURRENT STATUS</CardTitle></CardHeader>
        <CardContent className="grid grid-cols-2 md:grid-cols-3 gap-4">
          {[
            { label: "Event Name", value: eventStatus?.eventName ?? "—" },
            { label: "Phase", value: eventStatus?.phase?.toUpperCase() ?? "—" },
            { label: "Stream", value: eventStatus?.streamActive ? "Live" : "Offline" },
            { label: "Results", value: eventStatus?.resultsPublished ? "Published" : "Hidden" },
            { label: "Judge Results", value: eventStatusExt?.judgeResultsVisible ? "Visible" : "Hidden" },
          ].map(({ label, value }) => (
            <div key={label} className="bg-muted/30 rounded-lg p-3">
              <p className="text-xs text-muted-foreground">{label}</p>
              <p className="font-mono font-semibold text-sm mt-0.5">{value}</p>
            </div>
          ))}
        </CardContent>
      </Card>
      <Card>
        <CardHeader><CardTitle className="text-sm font-mono">UPDATE CONFIG</CardTitle><CardDescription>Updates the active hackathon settings</CardDescription></CardHeader>
        <CardContent className="space-y-4">
          <div className="grid grid-cols-2 gap-3">
            <div><label className="text-xs text-muted-foreground">Event Name</label><Input value={form.eventName} onChange={(e) => setForm((p) => ({ ...p, eventName: e.target.value }))} className="mt-1" /></div>
            <div><label className="text-xs text-muted-foreground">Phase</label>
              <select className="flex h-9 w-full rounded-md border border-input bg-background px-3 py-1 text-sm mt-1" value={form.phase} onChange={(e) => setForm((p) => ({ ...p, phase: e.target.value }))}>
                {["registration", "submission", "elimination", "finale"].map((p) => <option key={p} value={p}>{p}</option>)}
              </select>
            </div>
          </div>
          <div><label className="text-xs text-muted-foreground">Tagline</label><Input value={form.tagline} onChange={(e) => setForm((p) => ({ ...p, tagline: e.target.value }))} className="mt-1" /></div>
          <div><label className="text-xs text-muted-foreground">Stream URL</label><Input value={form.streamUrl} onChange={(e) => setForm((p) => ({ ...p, streamUrl: e.target.value }))} placeholder="https://youtube.com/..." className="mt-1" /></div>
          <div className="flex gap-6 flex-wrap">
            {[
              { key: "streamActive" as const, label: "Stream Active" },
              { key: "resultsPublished" as const, label: "Results Published" },
              { key: "judgeResultsVisible" as const, label: "Judge Results Visible" },
            ].map(({ key, label }) => (
              <label key={key} className="flex items-center gap-2 cursor-pointer text-sm">
                <input type="checkbox" checked={form[key]} onChange={(e) => setForm((p) => ({ ...p, [key]: e.target.checked }))} className="rounded" />
                {label}
              </label>
            ))}
          </div>
          <Button onClick={handleUpdate} disabled={updateEvent.isPending}><Globe className="w-4 h-4 mr-2" /> Update Config</Button>
        </CardContent>
      </Card>
    </div>
  );
}

// ─── Access Portal Tab ─────────────────────────────────────────────────────────
interface AccessPortalData {
  adminCodes: Array<{ id: number; code: string; label: string; isReusable: boolean }>;
  judgeCodes: Array<{ id: number; code: string; label: string; isReusable: boolean }>;
  participantCodes: Array<{ id: number; code: string; label: string | null; isUsed: boolean; teamId: number | null }>;
  registrations: Array<{ id: number; fullName: string; email: string; teamName: string; paymentStatus: string; participantCode: string | null }>;
  summary: { totalAdmin: number; totalJudges: number; totalParticipants: number; totalRegistrations: number; pendingRegistrations: number; approvedRegistrations: number };
}

function AccessPortalTab() {
  const { data: portal, loading, refetch } = useAdminFetch<AccessPortalData>("/api/admin/access-portal");
  const { toast } = useToast();

  const copy = (text: string, label: string) => {
    navigator.clipboard.writeText(text);
    toast({ title: `Copied: ${label}` });
  };

  const copyAll = (codes: string[]) => {
    navigator.clipboard.writeText(codes.join("\n"));
    toast({ title: `${codes.length} codes copied` });
  };

  if (loading) return <p className="text-center text-muted-foreground py-8">Loading access portal...</p>;

  return (
    <div className="space-y-6">
      {/* Summary */}
      {portal?.summary && (
        <div className="grid grid-cols-3 md:grid-cols-6 gap-3">
          {[
            { label: "Admin", value: portal.summary.totalAdmin, color: "text-chart-4" },
            { label: "Judges", value: portal.summary.totalJudges, color: "text-chart-2" },
            { label: "Participants", value: portal.summary.totalParticipants, color: "text-primary" },
            { label: "Registrations", value: portal.summary.totalRegistrations, color: "text-chart-1" },
            { label: "Pending", value: portal.summary.pendingRegistrations, color: "text-amber-400" },
            { label: "Approved", value: portal.summary.approvedRegistrations, color: "text-chart-3" },
          ].map((s) => (
            <div key={s.label} className="bg-muted/30 rounded-lg p-3">
              <p className="text-xs text-muted-foreground">{s.label}</p>
              <p className={`text-2xl font-bold font-mono ${s.color}`}>{s.value}</p>
            </div>
          ))}
        </div>
      )}

      {/* Admin Codes */}
      <Card>
        <CardHeader className="pb-3">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-2">
              <Shield className="w-4 h-4 text-chart-4" />
              <CardTitle className="text-sm font-mono">ADMIN CODES</CardTitle>
            </div>
            {portal?.adminCodes.length && (
              <Button size="sm" variant="outline" className="h-7 text-xs gap-1" onClick={() => copyAll(portal.adminCodes.map((c) => c.code))}>
                <Copy className="w-3 h-3" /> Copy All
              </Button>
            )}
          </div>
        </CardHeader>
        <CardContent className="space-y-2 pt-0">
          {portal?.adminCodes.map((c) => (
            <div key={c.id} className="flex items-center gap-3 px-3 py-2 rounded-lg bg-chart-4/5 border border-chart-4/20">
              <Shield className="w-3.5 h-3.5 text-chart-4 flex-shrink-0" />
              <div className="flex-1 min-w-0">
                <p className="text-xs text-muted-foreground">{c.label}</p>
                <p className="font-mono text-sm text-chart-4 font-bold">{c.code}</p>
              </div>
              <Badge className="text-xs bg-chart-4/10 text-chart-4 border-chart-4/20">ADMIN</Badge>
              <Button variant="ghost" size="sm" className="h-7 w-7 p-0" onClick={() => copy(c.code, c.code)}><Copy className="w-3 h-3" /></Button>
            </div>
          ))}
        </CardContent>
      </Card>

      {/* Judge Codes */}
      <Card>
        <CardHeader className="pb-3">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-2">
              <Scale className="w-4 h-4 text-chart-2" />
              <CardTitle className="text-sm font-mono">JUDGE CODES ({portal?.judgeCodes.length ?? 0})</CardTitle>
            </div>
            {portal?.judgeCodes.length ? (
              <Button size="sm" variant="outline" className="h-7 text-xs gap-1" onClick={() => copyAll(portal.judgeCodes.map((c) => c.code))}>
                <Copy className="w-3 h-3" /> Copy All
              </Button>
            ) : null}
          </div>
        </CardHeader>
        <CardContent className="space-y-2 pt-0">
          {portal?.judgeCodes.map((c) => (
            <div key={c.id} className="flex items-center gap-3 px-3 py-2 rounded-lg bg-chart-2/5 border border-chart-2/20">
              <Scale className="w-3.5 h-3.5 text-chart-2 flex-shrink-0" />
              <div className="flex-1 min-w-0">
                <p className="text-xs text-muted-foreground">{c.label}</p>
                <p className="font-mono text-sm text-chart-2 font-bold">{c.code}</p>
              </div>
              <Badge className="text-xs bg-chart-2/10 text-chart-2 border-chart-2/20">JUDGE</Badge>
              <Button variant="ghost" size="sm" className="h-7 w-7 p-0" onClick={() => copy(c.code, c.code)}><Copy className="w-3 h-3" /></Button>
            </div>
          ))}
          {!portal?.judgeCodes.length && <p className="text-muted-foreground text-sm text-center py-3">No judge codes yet.</p>}
        </CardContent>
      </Card>

      {/* Participant Codes */}
      <Card>
        <CardHeader className="pb-3">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-2">
              <Users className="w-4 h-4 text-primary" />
              <CardTitle className="text-sm font-mono">PARTICIPANT CODES ({portal?.participantCodes.length ?? 0})</CardTitle>
            </div>
            {portal?.participantCodes.length ? (
              <Button size="sm" variant="outline" className="h-7 text-xs gap-1" onClick={() => copyAll(portal.participantCodes.map((c) => c.code))}>
                <Copy className="w-3 h-3" /> Copy All
              </Button>
            ) : null}
          </div>
        </CardHeader>
        <CardContent className="pt-0">
          <div className="space-y-1.5 max-h-64 overflow-y-auto pr-1">
            {portal?.participantCodes.map((c) => (
              <div key={c.id} className="flex items-center gap-2 px-3 py-2 rounded-lg bg-primary/5 border border-primary/10">
                <Key className="w-3 h-3 text-primary flex-shrink-0" />
                <span className="font-mono text-xs text-primary flex-1 truncate">{c.code}</span>
                {c.label && <span className="text-xs text-muted-foreground truncate max-w-[120px]">{c.label}</span>}
                <Badge variant={c.isUsed ? "secondary" : "outline"} className={`text-xs flex-shrink-0 ${c.isUsed ? "text-chart-3" : ""}`}>{c.isUsed ? "USED" : "AVAIL"}</Badge>
                <Button variant="ghost" size="sm" className="h-6 w-6 p-0 flex-shrink-0" onClick={() => copy(c.code, c.code)}><Copy className="w-2.5 h-2.5" /></Button>
              </div>
            ))}
            {!portal?.participantCodes.length && <p className="text-muted-foreground text-sm text-center py-3">No participant codes yet.</p>}
          </div>
        </CardContent>
      </Card>

      {/* Registrations list */}
      {(portal?.registrations.length ?? 0) > 0 && (
        <Card>
          <CardHeader className="pb-3">
            <div className="flex items-center gap-2">
              <ClipboardList className="w-4 h-4 text-chart-1" />
              <CardTitle className="text-sm font-mono">REGISTERED TEAMS ({portal?.registrations.length})</CardTitle>
            </div>
          </CardHeader>
          <CardContent className="pt-0">
            <div className="space-y-1.5 max-h-64 overflow-y-auto pr-1">
              {portal?.registrations.map((r) => (
                <div key={r.id} className="flex items-center gap-2 px-3 py-2 rounded-lg bg-muted/30">
                  <span className="text-xs font-mono text-muted-foreground w-6">#{r.id}</span>
                  <div className="flex-1 min-w-0">
                    <p className="text-xs font-semibold truncate">{r.teamName}</p>
                    <p className="text-xs text-muted-foreground truncate">{r.fullName} · {r.email}</p>
                  </div>
                  <Badge className={`text-xs flex-shrink-0 ${r.paymentStatus === "approved" ? "bg-chart-3/10 text-chart-3 border-chart-3/30" : r.paymentStatus === "rejected" ? "bg-destructive/10 text-destructive" : "bg-amber-400/10 text-amber-400 border-amber-400/30"}`}>
                    {r.paymentStatus.toUpperCase()}
                  </Badge>
                  {r.participantCode && (
                    <div className="flex items-center gap-1">
                      <span className="font-mono text-xs text-primary">{r.participantCode}</span>
                      <Button variant="ghost" size="sm" className="h-5 w-5 p-0" onClick={() => copy(r.participantCode!, r.participantCode!)}><Copy className="w-2.5 h-2.5" /></Button>
                    </div>
                  )}
                </div>
              ))}
            </div>
          </CardContent>
        </Card>
      )}

      <div className="flex justify-end">
        <Button variant="ghost" size="sm" onClick={refetch} className="gap-1 text-xs text-muted-foreground">
          <RefreshCw className="w-3 h-3" /> Refresh
        </Button>
      </div>
    </div>
  );
}

// ─── Logs Tab ─────────────────────────────────────────────────────────────────
function LogsTab() {
  const { data: logs } = useGetAdminLogs();
  return (
    <Card>
      <CardHeader><CardTitle className="text-sm font-mono">ADMIN ACTION LOG</CardTitle></CardHeader>
      <CardContent>
        <div className="space-y-2 max-h-[500px] overflow-y-auto pr-1">
          {logs?.length ? logs.map((log) => (
            <div key={log.id} className="flex items-start gap-3 py-2 px-3 rounded-lg bg-muted/20 hover:bg-muted/40 text-sm">
              <div className="w-1.5 h-1.5 rounded-full bg-primary mt-2 flex-shrink-0" />
              <div className="flex-1">
                <span className="font-mono text-xs text-muted-foreground mr-3">{new Date(log.createdAt).toLocaleString()}</span>
                <span className="font-medium">{log.action}</span>
                {log.details && <span className="text-muted-foreground ml-2 text-xs">— {log.details}</span>}
              </div>
            </div>
          )) : <p className="text-muted-foreground text-sm py-4 text-center">No logs yet.</p>}
        </div>
      </CardContent>
    </Card>
  );
}

// ─── Main Admin Component ─────────────────────────────────────────────────────
export default function Admin() {
  const [, setLocation] = useLocation();
  const { getAdminToken, adminLogout } = useAuthTokens();
  const adminToken = getAdminToken();

  useEffect(() => {
    if (adminToken) setAuthTokenGetter(() => localStorage.getItem("hackaegis_admin_token"));
  }, [adminToken]);

  if (!adminToken) {
    return (
      <div className="min-h-[calc(100vh-4rem)] flex items-center justify-center bg-background">
        <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} className="w-full max-w-sm text-center space-y-6">
          <div className="flex justify-center"><div className="bg-primary/10 p-4 rounded-full border border-primary/20"><Terminal className="w-10 h-10 text-primary" /></div></div>
          <div><h2 className="font-mono text-2xl font-bold">ADMIN ACCESS</h2><p className="text-muted-foreground mt-2 text-sm">Enter your admin code on the home page to access this panel.</p></div>
          <Button className="w-full" onClick={() => setLocation("/")}>Go to Home Page</Button>
        </motion.div>
      </div>
    );
  }

  const handleLogout = () => { adminLogout(); setAuthTokenGetter(() => null); setLocation("/"); };

  const tabs = [
    { value: "dashboard", label: "Dashboard", icon: LayoutDashboard },
    { value: "hackathons", label: "Events", icon: Globe },
    { value: "registrations", label: "Registrations", icon: ClipboardList },
    { value: "codes", label: "Codes", icon: Code2 },
    { value: "teams", label: "Teams", icon: Users },
    { value: "judges", label: "Judges", icon: Scale },
    { value: "scores", label: "Scores", icon: Trophy },
    { value: "polls", label: "Polls", icon: BarChart2 },
    { value: "live", label: "Live", icon: Video },
    { value: "event", label: "Config", icon: Settings },
    { value: "portal", label: "Access Portal", icon: Eye },
    { value: "logs", label: "Logs", icon: ScrollText },
  ] as const;

  return (
    <div className="min-h-[calc(100vh-4rem)] bg-background py-6">
      <div className="container mx-auto px-4 max-w-5xl space-y-6">
        <motion.div initial={{ opacity: 0, y: -10 }} animate={{ opacity: 1, y: 0 }} className="flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className="bg-primary/10 p-2 rounded-lg border border-primary/20"><Terminal className="w-5 h-5 text-primary" /></div>
            <div>
              <h1 className="font-bold font-mono text-xl">ADMIN PANEL</h1>
              <p className="text-sm text-muted-foreground">HackAegis Command Centre</p>
            </div>
          </div>
          <Button variant="outline" size="sm" onClick={handleLogout} className="text-muted-foreground gap-2">
            <LogOut className="w-4 h-4" /> Logout
          </Button>
        </motion.div>

        <Tabs defaultValue="dashboard">
          <TabsList className="grid grid-cols-6 md:grid-cols-12 h-auto gap-0.5 p-1">
            {tabs.map(({ value, label, icon: Icon }) => (
              <TabsTrigger key={value} value={value} className="flex-col gap-0.5 h-auto py-2 text-[10px]">
                <Icon className="w-3.5 h-3.5" />{label}
              </TabsTrigger>
            ))}
          </TabsList>
          <div className="mt-6">
            <TabsContent value="dashboard"><DashboardTab /></TabsContent>
            <TabsContent value="hackathons"><HackathonsTab /></TabsContent>
            <TabsContent value="registrations"><RegistrationsTab /></TabsContent>
            <TabsContent value="codes"><CodesTab /></TabsContent>
            <TabsContent value="teams"><TeamsTab /></TabsContent>
            <TabsContent value="judges"><JudgesTab /></TabsContent>
            <TabsContent value="scores"><ScoresTab /></TabsContent>
            <TabsContent value="polls"><PollsTab /></TabsContent>
            <TabsContent value="live"><LiveTab /></TabsContent>
            <TabsContent value="event"><EventTab /></TabsContent>
            <TabsContent value="portal"><AccessPortalTab /></TabsContent>
            <TabsContent value="logs"><LogsTab /></TabsContent>
          </div>
        </Tabs>
      </div>
    </div>
  );
}
