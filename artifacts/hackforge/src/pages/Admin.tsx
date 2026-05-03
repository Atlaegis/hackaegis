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
import { UpdateEventStatusBodyPhase as PhaseValues } from "@workspace/api-client-react";
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
} from "lucide-react";
import { motion, AnimatePresence } from "framer-motion";

// ─── Shared helpers ───────────────────────────────────────────────────────────
function useAdminFetch<T>(url: string, deps: unknown[] = []): { data: T | null; loading: boolean; refetch: () => void } {
  const [data, setData] = useState<T | null>(null);
  const [loading, setLoading] = useState(true);
  const token = localStorage.getItem("hackforge_admin_token");
  const load = useCallback(() => {
    setLoading(true);
    fetch(url, { headers: { Authorization: `Bearer ${token}` } })
      .then((r) => r.json()).then(setData).catch(() => {}).finally(() => setLoading(false));
  }, [url, token, ...deps]);
  useEffect(() => { load(); }, [load]);
  return { data, loading, refetch: load };
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
  submissionLocked: boolean;
}

function HackathonsTab() {
  const { data: hackathons, loading, refetch } = useAdminFetch<Hackathon[]>("/api/hackathons");
  const { toast } = useToast();
  const token = localStorage.getItem("hackforge_admin_token");
  const [showCreate, setShowCreate] = useState(false);
  const [form, setForm] = useState({ name: "", slug: "", description: "", tagline: "", prizePool: "", grandPrize: "" });
  const [editId, setEditId] = useState<number | null>(null);
  const [editData, setEditData] = useState<Partial<Hackathon>>({});
  const [busy, setBusy] = useState(false);

  const api = async (method: string, path: string, body?: unknown) => {
    const r = await fetch(path, {
      method, headers: { "Content-Type": "application/json", Authorization: `Bearer ${token}` },
      body: body ? JSON.stringify(body) : undefined,
    });
    const d = await r.json();
    if (!r.ok) throw new Error(d.message ?? "Request failed");
    return d;
  };

  const handleCreate = async () => {
    if (!form.name || !form.slug) { toast({ title: "Name and slug required", variant: "destructive" }); return; }
    setBusy(true);
    try {
      await api("POST", "/api/hackathons", form);
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
      if (action === "delete") await api("DELETE", `/api/hackathons/${id}`);
      else await api("POST", `/api/hackathons/${id}/${action}`);
      toast({ title: `Hackathon ${action}d` });
      refetch();
    } catch (e: unknown) { toast({ title: "Error", description: (e as Error).message, variant: "destructive" }); }
    finally { setBusy(false); }
  };

  const handleSaveEdit = async () => {
    if (!editId) return;
    setBusy(true);
    try {
      await api("PUT", `/api/hackathons/${editId}`, editData);
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
                  <Input placeholder="Slug * (e.g. hackforge-2026)" value={form.slug} onChange={(e) => setForm((p) => ({ ...p, slug: e.target.value.toLowerCase().replace(/\s+/g, "-") }))} />
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
                  <div className="flex items-center gap-4 text-sm">
                    <label className="flex items-center gap-2 cursor-pointer"><input type="checkbox" checked={editData.streamActive ?? h.streamActive} onChange={(e) => setEditData((p) => ({ ...p, streamActive: e.target.checked }))} /> Stream Active</label>
                    <label className="flex items-center gap-2 cursor-pointer"><input type="checkbox" checked={editData.resultsPublished ?? h.resultsPublished} onChange={(e) => setEditData((p) => ({ ...p, resultsPublished: e.target.checked }))} /> Results Published</label>
                    <label className="flex items-center gap-2 cursor-pointer"><input type="checkbox" checked={editData.judgeResultsVisible ?? h.judgeResultsVisible} onChange={(e) => setEditData((p) => ({ ...p, judgeResultsVisible: e.target.checked }))} /> Judge Results Visible</label>
                    <label className="flex items-center gap-2 cursor-pointer"><input type="checkbox" checked={editData.submissionLocked ?? h.submissionLocked} onChange={(e) => setEditData((p) => ({ ...p, submissionLocked: e.target.checked }))} /> Lock Submissions</label>
                  </div>
                  <div className="flex gap-2">
                    <Button size="sm" onClick={handleSaveEdit} disabled={busy}>Save Changes</Button>
                    <Button size="sm" variant="ghost" onClick={() => setEditId(null)}>Cancel</Button>
                  </div>
                </div>
              ) : (
                <div className="flex items-start justify-between gap-3">
                  <div className="flex-1">
                    <div className="flex items-center gap-2 mb-1 flex-wrap">
                      <h3 className="font-bold">{h.name}</h3>
                      <Badge className={`text-xs font-mono ${statusBadge[h.status] ?? ""}`}>{h.status.toUpperCase()}</Badge>
                      <Badge variant="outline" className="text-xs font-mono">{h.phase}</Badge>
                      {h.submissionLocked && <Badge className="text-xs bg-orange-400/10 text-orange-400 border-orange-400/30">SUBMISSIONS LOCKED</Badge>}
                    </div>
                    {h.tagline && <p className="text-sm text-muted-foreground">{h.tagline}</p>}
                    <div className="flex gap-3 mt-1 text-xs text-muted-foreground flex-wrap">
                      {h.prizePool && <span>Pool: {h.prizePool}</span>}
                      {h.grandPrize && <span>Grand: {h.grandPrize}</span>}
                      {h.resultsPublished && <span className="text-chart-3">Results published</span>}
                    </div>
                  </div>
                  <div className="flex gap-1.5 flex-shrink-0 flex-wrap justify-end">
                    <Button size="sm" variant="ghost" onClick={() => { setEditId(h.id); setEditData({}); }} className="h-8 px-2">
                      <Edit3 className="w-3 h-3" />
                    </Button>
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
                    <Button size="sm" variant="ghost" onClick={() => handleAction(h.id, "delete")} disabled={busy} className="h-8 px-2 text-destructive hover:text-destructive">
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

// ─── Codes Tab ────────────────────────────────────────────────────────────────
function CodesTab() {
  const { data: codes, refetch } = useListCodes();
  const generateCodes = useGenerateCodes();
  const resetCode = useResetCode();
  const deleteCode = useDeleteCode();
  const [count, setCount] = useState(5);
  const { toast } = useToast();
  const { data: teams } = useListTeams();
  const token = localStorage.getItem("hackforge_admin_token");

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
          <CardDescription>Format: <span className="text-primary font-mono">HACKFORGE_PART_XXXXXXXX</span></CardDescription>
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
              <div key={c.code} className="flex items-center justify-between py-2.5 px-3 rounded-lg bg-muted/30 hover:bg-muted/50 gap-3">
                <div className="flex items-center gap-3 flex-1 min-w-0">
                  <span className="font-mono text-xs truncate">{c.code}</span>
                  <div className="flex items-center gap-1.5 flex-shrink-0">
                    {c.isUsed ? <Badge variant="secondary" className="text-xs bg-chart-3/20 text-chart-3 border-0">USED</Badge> : <Badge variant="outline" className="text-xs text-muted-foreground">AVAILABLE</Badge>}
                  </div>
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
                  <Button variant="ghost" size="sm" className="h-7 w-7 p-0 text-destructive hover:text-destructive" onClick={() => deleteCode.mutate({ code: c.code }, { onSuccess: () => { toast({ title: "Code deleted" }); refetch(); } })}><Trash2 className="w-3 h-3" /></Button>
                </div>
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
  const token = localStorage.getItem("hackforge_admin_token");
  const [newTeam, setNewTeam] = useState({ name: "", projectTitle: "", description: "", githubUrl: "" });
  const [editId, setEditId] = useState<number | null>(null);
  const [editData, setEditData] = useState({ name: "", projectTitle: "", description: "", githubUrl: "" });
  const [expanded, setExpanded] = useState<number | null>(null);
  const [codeInput, setCodeInput] = useState<Record<number, string>>({});
  const { data: hackathons } = useAdminFetch<Hackathon[]>("/api/hackathons");

  // teams come with members from updated API
  const teams = (teamsRaw ?? []) as unknown as Array<{
    id: number; name: string; projectTitle: string; description: string | null;
    githubUrl: string | null; hackathonId: number | null;
    members: Array<{ id: number; code: string; label: string | null }>;
  }>;

  const activeHackathon = hackathons?.find((h) => h.status === "active");
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
    toast({ title: "Code assigned", description: `${code} → ${teams.find((t) => t.id === teamId)?.name}` });
    setCodeInput((p) => ({ ...p, [teamId]: "" }));
    refetch();
  };

  const unassignCode = async (code: string) => {
    await fetch("/api/teams/unassign-code", {
      method: "POST",
      headers: { "Content-Type": "application/json", Authorization: `Bearer ${token}` },
      body: JSON.stringify({ code }),
    });
    toast({ title: "Code unassigned" });
    refetch();
  };

  return (
    <div className="space-y-6">
      <Card>
        <CardHeader>
          <CardTitle className="text-sm font-mono">ADD TEAM</CardTitle>
          {activeHackathon && <CardDescription>Will be added to active event: <strong>{activeHackathon.name}</strong></CardDescription>}
        </CardHeader>
        <CardContent>
          <div className="space-y-3">
            <div className="grid grid-cols-2 gap-3">
              <Input placeholder="Team name *" value={newTeam.name} onChange={(e) => setNewTeam((p) => ({ ...p, name: e.target.value }))} />
              <Input placeholder="Project title *" value={newTeam.projectTitle} onChange={(e) => setNewTeam((p) => ({ ...p, projectTitle: e.target.value }))} />
            </div>
            <div className="grid grid-cols-2 gap-3">
              <Input placeholder="Description" value={newTeam.description} onChange={(e) => setNewTeam((p) => ({ ...p, description: e.target.value }))} />
              <Input placeholder="GitHub URL" value={newTeam.githubUrl} onChange={(e) => setNewTeam((p) => ({ ...p, githubUrl: e.target.value }))} />
            </div>
            <Button
              size="sm"
              onClick={() => {
                if (!newTeam.name || !newTeam.projectTitle) { toast({ title: "Name and project title required", variant: "destructive" }); return; }
                createTeam.mutate(
                  { data: { name: newTeam.name, projectTitle: newTeam.projectTitle, description: newTeam.description || null, githubUrl: newTeam.githubUrl || null } },
                  { onSuccess: () => { toast({ title: "Team created" }); refetch(); setNewTeam({ name: "", projectTitle: "", description: "", githubUrl: "" }); }, onError: (err) => toast({ title: "Error", description: err.message, variant: "destructive" }) }
                );
              }}
              disabled={!newTeam.name || !newTeam.projectTitle || createTeam.isPending}
            >
              <Plus className="w-4 h-4 mr-2" /> Add Team
            </Button>
          </div>
        </CardContent>
      </Card>

      <div className="space-y-3">
        {teams.map((team) => (
          <Card key={team.id} className="overflow-hidden">
            <CardContent className="py-3 px-4">
              {editId === team.id ? (
                <div className="space-y-2">
                  <div className="grid grid-cols-2 gap-2">
                    <Input value={editData.name} onChange={(e) => setEditData((p) => ({ ...p, name: e.target.value }))} placeholder="Team name" />
                    <Input value={editData.projectTitle} onChange={(e) => setEditData((p) => ({ ...p, projectTitle: e.target.value }))} placeholder="Project title" />
                    <Input value={editData.description} onChange={(e) => setEditData((p) => ({ ...p, description: e.target.value }))} placeholder="Description" />
                    <Input value={editData.githubUrl} onChange={(e) => setEditData((p) => ({ ...p, githubUrl: e.target.value }))} placeholder="GitHub URL" />
                  </div>
                  <div className="flex gap-2">
                    <Button size="sm" onClick={() => updateTeam.mutate({ id: team.id, data: { name: editData.name, projectTitle: editData.projectTitle, description: editData.description || null, githubUrl: editData.githubUrl || null } }, { onSuccess: () => { toast({ title: "Updated" }); refetch(); setEditId(null); } })}>Save</Button>
                    <Button size="sm" variant="ghost" onClick={() => setEditId(null)}>Cancel</Button>
                  </div>
                </div>
              ) : (
                <div>
                  <div className="flex items-center justify-between">
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center gap-2">
                        <p className="font-semibold">{team.name}</p>
                        {team.hackathonId && <Badge variant="outline" className="text-xs">{hackathonMap.get(team.hackathonId) ?? `#${team.hackathonId}`}</Badge>}
                        <Badge variant="secondary" className="text-xs"><UserCheck className="w-3 h-3 mr-1" />{team.members.length} member{team.members.length !== 1 ? "s" : ""}</Badge>
                      </div>
                      <p className="text-sm text-muted-foreground truncate">{team.projectTitle}</p>
                    </div>
                    <div className="flex gap-1.5 flex-shrink-0">
                      <Button variant="ghost" size="sm" className="h-7 w-7 p-0" onClick={() => setExpanded(expanded === team.id ? null : team.id)}>
                        {expanded === team.id ? <ChevronUp className="w-3.5 h-3.5" /> : <ChevronDown className="w-3.5 h-3.5" />}
                      </Button>
                      <Button variant="ghost" size="sm" className="h-7 w-7 p-0" onClick={() => { setEditId(team.id); setEditData({ name: team.name, projectTitle: team.projectTitle ?? "", description: team.description ?? "", githubUrl: team.githubUrl ?? "" }); }}>
                        <Edit3 className="w-3.5 h-3.5" />
                      </Button>
                      <Button variant="ghost" size="sm" className="h-7 w-7 p-0 text-destructive hover:text-destructive" onClick={() => deleteTeam.mutate({ id: team.id }, { onSuccess: () => { toast({ title: "Team deleted" }); refetch(); } })}>
                        <Trash2 className="w-3.5 h-3.5" />
                      </Button>
                    </div>
                  </div>
                  <AnimatePresence>
                    {expanded === team.id && (
                      <motion.div initial={{ opacity: 0, height: 0 }} animate={{ opacity: 1, height: "auto" }} exit={{ opacity: 0, height: 0 }} className="mt-3 pt-3 border-t border-border space-y-3">
                        <div>
                          <p className="text-xs font-mono text-muted-foreground mb-2">TEAM MEMBERS (LINKED CODES)</p>
                          {team.members.length === 0 ? (
                            <p className="text-xs text-muted-foreground">No participant codes assigned yet.</p>
                          ) : (
                            <div className="space-y-1">
                              {team.members.map((m) => (
                                <div key={m.id} className="flex items-center justify-between py-1 px-2 rounded bg-muted/30 text-xs">
                                  <span className="font-mono">{m.code}</span>
                                  <Button variant="ghost" size="sm" className="h-6 px-2 text-xs text-destructive" onClick={() => unassignCode(m.code)}>Remove</Button>
                                </div>
                              ))}
                            </div>
                          )}
                        </div>
                        <div className="flex gap-2">
                          <Input
                            placeholder="HACKFORGE_PART_XXXXXXXX"
                            value={codeInput[team.id] ?? ""}
                            onChange={(e) => setCodeInput((p) => ({ ...p, [team.id]: e.target.value.toUpperCase() }))}
                            className="h-8 text-xs font-mono"
                            onKeyDown={(e) => e.key === "Enter" && assignCode(team.id)}
                          />
                          <Button size="sm" className="h-8 px-3 text-xs" onClick={() => assignCode(team.id)}>
                            <UserCheck className="w-3 h-3 mr-1" /> Assign
                          </Button>
                        </div>
                      </motion.div>
                    )}
                  </AnimatePresence>
                </div>
              )}
            </CardContent>
          </Card>
        ))}
        {!teams.length && <p className="text-center text-muted-foreground text-sm py-8">No teams yet. Add the first team above.</p>}
      </div>
    </div>
  );
}

// ─── Judges Tab ───────────────────────────────────────────────────────────────
interface JudgeCode { id: number; code: string; label: string | null; createdAt: string; }

function JudgesTab() {
  const { data: judgeCodes, loading, refetch } = useAdminFetch<JudgeCode[]>("/api/codes/judges");
  const { toast } = useToast();
  const token = localStorage.getItem("hackforge_admin_token");
  const [label, setLabel] = useState("");
  const [busy, setBusy] = useState(false);

  const createJudge = async () => {
    setBusy(true);
    try {
      const r = await fetch("/api/codes/judges", {
        method: "POST",
        headers: { "Content-Type": "application/json", Authorization: `Bearer ${token}` },
        body: JSON.stringify({ label: label.trim() || undefined }),
      });
      const d = await r.json();
      if (!r.ok) throw new Error(d.message);
      toast({ title: "Judge code created", description: d.code });
      setLabel("");
      refetch();
    } catch (e: unknown) { toast({ title: "Error", description: (e as Error).message, variant: "destructive" }); }
    finally { setBusy(false); }
  };

  const deleteJudge = async (id: number, code: string) => {
    await fetch(`/api/codes/judges/${id}`, { method: "DELETE", headers: { Authorization: `Bearer ${token}` } });
    toast({ title: "Judge code deleted", description: code });
    refetch();
  };

  const copyAll = () => {
    const text = (judgeCodes ?? []).map((j) => `${j.label ?? "Judge"}: ${j.code}`).join("\n");
    navigator.clipboard.writeText(text);
    toast({ title: "Judge codes copied" });
  };

  return (
    <div className="space-y-6">
      <Card>
        <CardHeader>
          <CardTitle className="text-sm font-mono">CREATE JUDGE CODE</CardTitle>
          <CardDescription>Judge codes are reusable and grant access to the scoring interface.</CardDescription>
        </CardHeader>
        <CardContent>
          <div className="flex gap-3">
            <Input placeholder="Judge name / label (optional)" value={label} onChange={(e) => setLabel(e.target.value)} onKeyDown={(e) => e.key === "Enter" && createJudge()} />
            <Button onClick={createJudge} disabled={busy}><Plus className="w-4 h-4 mr-2" /> Add Judge</Button>
          </div>
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <div className="flex items-center justify-between">
            <div>
              <CardTitle className="text-sm font-mono">JUDGE CODES</CardTitle>
              <CardDescription>{judgeCodes?.length ?? 0} judges configured</CardDescription>
            </div>
            {(judgeCodes?.length ?? 0) > 0 && (
              <Button variant="outline" size="sm" onClick={copyAll}><Copy className="w-3 h-3 mr-1" /> Copy All</Button>
            )}
          </div>
        </CardHeader>
        <CardContent>
          {loading && <p className="text-sm text-muted-foreground text-center py-4">Loading...</p>}
          <div className="space-y-2">
            {judgeCodes?.map((j) => (
              <div key={j.id} className="flex items-center justify-between py-2.5 px-3 rounded-lg bg-muted/30 hover:bg-muted/50">
                <div className="flex items-center gap-3">
                  <div>
                    <p className="font-mono text-sm">{j.code}</p>
                    {j.label && <p className="text-xs text-muted-foreground">{j.label}</p>}
                  </div>
                  <Badge className="text-xs bg-chart-2/10 text-chart-2 border-chart-2/30">JUDGE</Badge>
                </div>
                <div className="flex gap-2">
                  <Button variant="ghost" size="sm" className="h-7 w-7 p-0" onClick={() => { navigator.clipboard.writeText(j.code); toast({ title: "Code copied" }); }}><Copy className="w-3 h-3" /></Button>
                  <Button variant="ghost" size="sm" className="h-7 w-7 p-0 text-destructive hover:text-destructive" onClick={() => deleteJudge(j.id, j.code)}><Trash2 className="w-3 h-3" /></Button>
                </div>
              </div>
            ))}
            {!loading && !judgeCodes?.length && <p className="text-center text-muted-foreground text-sm py-4">No judge codes yet.</p>}
          </div>
        </CardContent>
      </Card>
    </div>
  );
}

// ─── Scores Tab ───────────────────────────────────────────────────────────────
interface TeamScore {
  rank: number; teamId: number; hackathonId: number | null; teamName: string; projectTitle: string;
  demoUrl: string | null; githubUrl: string | null; slidesUrl: string | null; hasSubmission: boolean;
  averageScore: number | null; averageInnovation: number | null; averageExecution: number | null;
  averagePresentation: number | null; judgesScored: number; totalJudges: number;
  judgeBreakdown: Array<{ judgeId: number; judgeName: string; score: number; innovation: number | null; execution: number | null; presentation: number | null; feedback: string | null; updatedAt: string }>;
}

interface ScoreData { judgeCount: number; teams: TeamScore[]; }

function ScoresTab() {
  const { data: scoreData, loading, refetch } = useAdminFetch<ScoreData>("/api/admin/scores");
  const { toast } = useToast();
  const [expanded, setExpanded] = useState<number | null>(null);

  const ScorePill = ({ val, label }: { val: number | null; label: string }) =>
    val !== null ? (
      <div className="text-center">
        <p className="text-xs text-muted-foreground">{label}</p>
        <p className="font-mono font-semibold text-sm">{val}</p>
      </div>
    ) : null;

  return (
    <div className="space-y-5">
      <div className="flex items-center justify-between">
        <div>
          <p className="text-sm font-mono text-muted-foreground">JUDGE SCORES — AGGREGATE VIEW</p>
          {scoreData && <p className="text-xs text-muted-foreground mt-0.5">{scoreData.judgeCount} judges · {scoreData.teams.length} teams</p>}
        </div>
        <Button variant="ghost" size="sm" onClick={() => refetch()} className="text-muted-foreground gap-1.5 text-xs">
          <RefreshCw className="w-3 h-3" /> Refresh
        </Button>
      </div>

      {loading && <p className="text-center text-muted-foreground text-sm py-8">Loading scores...</p>}
      {!loading && !scoreData?.teams.length && (
        <Card><CardContent className="py-8 text-center text-muted-foreground text-sm">No scores submitted yet.</CardContent></Card>
      )}

      <div className="space-y-3">
        {scoreData?.teams.map((team) => {
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
                                {jb.innovation !== null && <div><p className="text-muted-foreground">Innovation</p><p className="font-mono font-bold">{jb.innovation}</p></div>}
                                {jb.execution !== null && <div><p className="text-muted-foreground">Execution</p><p className="font-mono font-bold">{jb.execution}</p></div>}
                                {jb.presentation !== null && <div><p className="text-muted-foreground">Presentation</p><p className="font-mono font-bold">{jb.presentation}</p></div>}
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
    if (adminToken) setAuthTokenGetter(() => localStorage.getItem("hackforge_admin_token"));
  }, [adminToken]);

  if (!adminToken) {
    return (
      <div className="min-h-[calc(100vh-4rem)] flex items-center justify-center bg-background">
        <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} className="w-full max-w-sm text-center space-y-6">
          <div className="flex justify-center"><div className="bg-primary/10 p-4 rounded-full border border-primary/20"><Terminal className="w-10 h-10 text-primary" /></div></div>
          <div><h2 className="font-mono text-2xl font-bold">ADMIN ACCESS</h2><p className="text-muted-foreground mt-2 text-sm">Enter your admin code on the home page to access this panel.</p></div>
          <div className="bg-muted/40 rounded-lg p-3 font-mono text-sm text-chart-4">HACKFORGE_ADMIN@01</div>
          <Button className="w-full" onClick={() => setLocation("/")}>Go to Home Page</Button>
        </motion.div>
      </div>
    );
  }

  const handleLogout = () => { adminLogout(); setAuthTokenGetter(() => null); setLocation("/"); };

  const tabs = [
    { value: "dashboard", label: "Dashboard", icon: LayoutDashboard },
    { value: "hackathons", label: "Events", icon: Globe },
    { value: "codes", label: "Codes", icon: Code2 },
    { value: "teams", label: "Teams", icon: Users },
    { value: "judges", label: "Judges", icon: Scale },
    { value: "scores", label: "Scores", icon: Trophy },
    { value: "polls", label: "Polls", icon: BarChart2 },
    { value: "event", label: "Config", icon: Settings },
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
              <p className="text-sm text-muted-foreground">HackForge Command Centre</p>
            </div>
          </div>
          <Button variant="outline" size="sm" onClick={handleLogout} className="text-muted-foreground gap-2">
            <LogOut className="w-4 h-4" /> Logout
          </Button>
        </motion.div>

        <Tabs defaultValue="dashboard">
          <TabsList className="grid grid-cols-5 md:grid-cols-9 h-auto gap-0.5 p-1">
            {tabs.map(({ value, label, icon: Icon }) => (
              <TabsTrigger key={value} value={value} className="flex-col gap-0.5 h-auto py-2 text-xs">
                <Icon className="w-3.5 h-3.5" />{label}
              </TabsTrigger>
            ))}
          </TabsList>
          <div className="mt-6">
            <TabsContent value="dashboard"><DashboardTab /></TabsContent>
            <TabsContent value="hackathons"><HackathonsTab /></TabsContent>
            <TabsContent value="codes"><CodesTab /></TabsContent>
            <TabsContent value="teams"><TeamsTab /></TabsContent>
            <TabsContent value="judges"><JudgesTab /></TabsContent>
            <TabsContent value="scores"><ScoresTab /></TabsContent>
            <TabsContent value="polls"><PollsTab /></TabsContent>
            <TabsContent value="event"><EventTab /></TabsContent>
            <TabsContent value="logs"><LogsTab /></TabsContent>
          </div>
        </Tabs>
      </div>
    </div>
  );
}
