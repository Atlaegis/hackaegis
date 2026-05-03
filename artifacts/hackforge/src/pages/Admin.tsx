import { useState, useEffect } from "react";
import {
  useAdminLogin,
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
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { useToast } from "@/hooks/use-toast";
import {
  LayoutDashboard, Users, Code2, BarChart2, Settings, ScrollText,
  RefreshCw, Trash2, Play, Square, Plus, LogIn, Terminal,
  Activity, CheckCircle, Scale, Trophy, ExternalLink, Github, Monitor, FileText,
} from "lucide-react";
import { motion } from "framer-motion";

// ─── Admin Login Form ──────────────────────────────────────────────────────────
function AdminLogin({ onLogin }: { onLogin: (token: string) => void }) {
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const adminLogin = useAdminLogin();
  const { toast } = useToast();

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    adminLogin.mutate(
      { data: { email, password } },
      {
        onSuccess: (data) => {
          onLogin(data.token);
          toast({ title: "Admin Access Granted", description: "Welcome back, commander." });
        },
        onError: (err) => {
          toast({ title: "Authentication Failed", description: err.message, variant: "destructive" });
        },
      }
    );
  };

  return (
    <div className="min-h-[calc(100vh-4rem)] flex items-center justify-center bg-background">
      <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} className="w-full max-w-sm">
        <Card className="border-primary/20 bg-card/50 backdrop-blur">
          <CardHeader className="text-center">
            <div className="flex justify-center mb-4">
              <div className="bg-primary/10 p-3 rounded-full">
                <Terminal className="w-8 h-8 text-primary" />
              </div>
            </div>
            <CardTitle className="font-mono text-xl">ADMIN_LOGIN</CardTitle>
            <CardDescription>Command-level authentication required</CardDescription>
          </CardHeader>
          <CardContent>
            <form onSubmit={handleSubmit} className="space-y-4">
              <Input
                type="email"
                placeholder="admin@hackforge.in"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                className="bg-background/50 border-border"
              />
              <Input
                type="password"
                placeholder="Password"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                className="bg-background/50 border-border"
              />
              <Button type="submit" className="w-full" disabled={adminLogin.isPending}>
                <LogIn className="w-4 h-4 mr-2" />
                {adminLogin.isPending ? "AUTHENTICATING..." : "AUTHENTICATE"}
              </Button>
            </form>
          </CardContent>
        </Card>
      </motion.div>
    </div>
  );
}

// ─── Dashboard Tab ─────────────────────────────────────────────────────────────
function DashboardTab() {
  const { data: dashboard } = useGetAdminDashboard();
  const stats = [
    { label: "Total Codes", value: dashboard?.totalCodes ?? 0, color: "text-chart-1" },
    { label: "Used Codes", value: dashboard?.usedCodes ?? 0, color: "text-chart-3" },
    { label: "Teams", value: dashboard?.totalTeams ?? 0, color: "text-chart-2" },
    { label: "Total Votes", value: dashboard?.totalVotes ?? 0, color: "text-chart-4" },
    { label: "Judges", value: (dashboard as unknown as Record<string, number>)?.totalJudges ?? 0, color: "text-chart-2" },
    { label: "Submissions", value: (dashboard as unknown as Record<string, number>)?.totalSubmissions ?? 0, color: "text-primary" },
  ];

  return (
    <div className="space-y-6">
      <div className="grid grid-cols-2 md:grid-cols-3 gap-4">
        {stats.map((s) => (
          <Card key={s.label}>
            <CardContent className="pt-4">
              <p className="text-sm text-muted-foreground">{s.label}</p>
              <p className={`text-3xl font-bold font-mono mt-1 ${s.color}`}>{s.value}</p>
            </CardContent>
          </Card>
        ))}
      </div>
      <div className="grid grid-cols-2 gap-4">
        <Card>
          <CardHeader><CardTitle className="text-sm font-mono text-muted-foreground">CURRENT PHASE</CardTitle></CardHeader>
          <CardContent>
            <p className="text-2xl font-bold font-mono text-primary">{dashboard?.currentPhase?.toUpperCase() ?? "—"}</p>
          </CardContent>
        </Card>
        <Card>
          <CardHeader><CardTitle className="text-sm font-mono text-muted-foreground">ACTIVE POLL</CardTitle></CardHeader>
          <CardContent>
            {dashboard?.activePollQuestion ? (
              <p className="font-semibold text-sm">{dashboard.activePollQuestion}</p>
            ) : (
              <p className="text-muted-foreground text-sm">No poll active</p>
            )}
          </CardContent>
        </Card>
      </div>
    </div>
  );
}

// ─── Codes Tab ─────────────────────────────────────────────────────────────────
function CodesTab() {
  const { data: codes, refetch } = useListCodes();
  const generateCodes = useGenerateCodes();
  const resetCode = useResetCode();
  const deleteCode = useDeleteCode();
  const [count, setCount] = useState(5);
  const { toast } = useToast();

  const handleGenerate = () => {
    generateCodes.mutate(
      { data: { count } },
      {
        onSuccess: (data) => {
          toast({ title: `${(data as { codes?: unknown[] }).codes?.length ?? data.length} codes generated` });
          refetch();
        },
        onError: (err) => toast({ title: "Error", description: err.message, variant: "destructive" }),
      }
    );
  };

  const handleReset = (code: string) => {
    resetCode.mutate({ code }, {
      onSuccess: () => { toast({ title: "Code reset" }); refetch(); },
      onError: (err) => toast({ title: "Error", description: err.message, variant: "destructive" }),
    });
  };

  const handleDelete = (code: string) => {
    deleteCode.mutate({ code }, {
      onSuccess: () => { toast({ title: "Code deleted" }); refetch(); },
      onError: (err) => toast({ title: "Error", description: err.message, variant: "destructive" }),
    });
  };

  return (
    <div className="space-y-6">
      <Card>
        <CardHeader><CardTitle className="text-sm font-mono">GENERATE CODES</CardTitle></CardHeader>
        <CardContent>
          <div className="flex gap-3">
            <Input type="number" min={1} max={100} value={count} onChange={(e) => setCount(Number(e.target.value))} className="w-28" />
            <Button onClick={handleGenerate} disabled={generateCodes.isPending}>
              <Plus className="w-4 h-4 mr-2" /> Generate
            </Button>
          </div>
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle className="text-sm font-mono">PARTICIPATION CODES</CardTitle>
          <CardDescription>{codes?.length ?? 0} total</CardDescription>
        </CardHeader>
        <CardContent>
          <div className="space-y-2 max-h-96 overflow-y-auto pr-1">
            {codes?.map((c) => (
              <div key={c.code} className="flex items-center justify-between py-2 px-3 rounded-lg bg-muted/30 hover:bg-muted/50">
                <div className="flex items-center gap-3">
                  <span className="font-mono text-sm">{c.code}</span>
                  {c.isUsed ? (
                    <Badge variant="secondary" className="text-xs bg-chart-3/20 text-chart-3">USED</Badge>
                  ) : (
                    <Badge variant="outline" className="text-xs text-muted-foreground">AVAILABLE</Badge>
                  )}
                </div>
                <div className="flex gap-2">
                  {c.isUsed && (
                    <Button variant="ghost" size="sm" onClick={() => handleReset(c.code)} title="Reset code">
                      <RefreshCw className="w-3 h-3" />
                    </Button>
                  )}
                  <Button variant="ghost" size="sm" onClick={() => handleDelete(c.code)} title="Delete code" className="text-destructive hover:text-destructive">
                    <Trash2 className="w-3 h-3" />
                  </Button>
                </div>
              </div>
            ))}
          </div>
        </CardContent>
      </Card>
    </div>
  );
}

// ─── Teams Tab ─────────────────────────────────────────────────────────────────
function TeamsTab() {
  const { data: teams, refetch } = useListTeams();
  const createTeam = useCreateTeam();
  const updateTeam = useUpdateTeam();
  const deleteTeam = useDeleteTeam();
  const { toast } = useToast();
  const [newTeam, setNewTeam] = useState({ name: "", projectTitle: "", description: "" });
  const [editId, setEditId] = useState<number | null>(null);
  const [editData, setEditData] = useState({ name: "", projectTitle: "" });

  const handleCreate = () => {
    if (!newTeam.name || !newTeam.projectTitle) {
      toast({ title: "Name and project title are required", variant: "destructive" });
      return;
    }
    createTeam.mutate(
      { data: { name: newTeam.name, projectTitle: newTeam.projectTitle, description: newTeam.description || null } },
      {
        onSuccess: () => { toast({ title: "Team created" }); refetch(); setNewTeam({ name: "", projectTitle: "", description: "" }); },
        onError: (err) => toast({ title: "Error", description: err.message, variant: "destructive" }),
      }
    );
  };

  const handleUpdate = (id: number) => {
    updateTeam.mutate(
      { id, data: { name: editData.name, projectTitle: editData.projectTitle } },
      {
        onSuccess: () => { toast({ title: "Team updated" }); refetch(); setEditId(null); },
        onError: (err) => toast({ title: "Error", description: err.message, variant: "destructive" }),
      }
    );
  };

  const handleDelete = (id: number) => {
    deleteTeam.mutate({ id }, {
      onSuccess: () => { toast({ title: "Team deleted" }); refetch(); },
      onError: (err) => toast({ title: "Error", description: err.message, variant: "destructive" }),
    });
  };

  return (
    <div className="space-y-6">
      <Card>
        <CardHeader><CardTitle className="text-sm font-mono">ADD TEAM</CardTitle></CardHeader>
        <CardContent>
          <div className="space-y-3">
            <Input placeholder="Team name *" value={newTeam.name} onChange={(e) => setNewTeam((p) => ({ ...p, name: e.target.value }))} />
            <Input placeholder="Project title *" value={newTeam.projectTitle} onChange={(e) => setNewTeam((p) => ({ ...p, projectTitle: e.target.value }))} />
            <Input placeholder="Description" value={newTeam.description} onChange={(e) => setNewTeam((p) => ({ ...p, description: e.target.value }))} />
            <Button onClick={handleCreate} disabled={!newTeam.name || !newTeam.projectTitle || createTeam.isPending}>
              <Plus className="w-4 h-4 mr-2" /> Add Team
            </Button>
          </div>
        </CardContent>
      </Card>

      <div className="space-y-3">
        {teams?.map((team) => (
          <Card key={team.id}>
            <CardContent className="py-4">
              {editId === team.id ? (
                <div className="space-y-2">
                  <Input value={editData.name} onChange={(e) => setEditData((p) => ({ ...p, name: e.target.value }))} placeholder="Team name" />
                  <Input value={editData.projectTitle} onChange={(e) => setEditData((p) => ({ ...p, projectTitle: e.target.value }))} placeholder="Project title" />
                  <div className="flex gap-2">
                    <Button size="sm" onClick={() => handleUpdate(team.id)}>Save</Button>
                    <Button size="sm" variant="ghost" onClick={() => setEditId(null)}>Cancel</Button>
                  </div>
                </div>
              ) : (
                <div className="flex items-center justify-between">
                  <div>
                    <p className="font-semibold">{team.name}</p>
                    {team.projectTitle && <p className="text-sm text-muted-foreground">{team.projectTitle}</p>}
                  </div>
                  <div className="flex gap-2">
                    <Button variant="ghost" size="sm" onClick={() => { setEditId(team.id); setEditData({ name: team.name, projectTitle: team.projectTitle ?? "" }); }}>
                      Edit
                    </Button>
                    <Button variant="ghost" size="sm" onClick={() => handleDelete(team.id)} className="text-destructive hover:text-destructive">
                      <Trash2 className="w-4 h-4" />
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

// ─── Polls Tab ─────────────────────────────────────────────────────────────────
function PollsTab() {
  const { data: polls, refetch } = useListPolls();
  const createPoll = useCreatePoll();
  const activatePoll = useActivatePoll();
  const deactivatePoll = useDeactivatePoll();
  const { toast } = useToast();
  const [question, setQuestion] = useState("");

  const handleCreate = () => {
    if (!question) { toast({ title: "A question is required", variant: "destructive" }); return; }
    createPoll.mutate(
      { data: { question } },
      {
        onSuccess: () => { toast({ title: "Poll created" }); refetch(); setQuestion(""); },
        onError: (err) => toast({ title: "Error", description: err.message, variant: "destructive" }),
      }
    );
  };

  return (
    <div className="space-y-6">
      <Card>
        <CardHeader>
          <CardTitle className="text-sm font-mono">CREATE POLL</CardTitle>
          <CardDescription>Teams are automatically added as voting options</CardDescription>
        </CardHeader>
        <CardContent className="space-y-3">
          <Input placeholder="e.g. Which team had the best innovation?" value={question} onChange={(e) => setQuestion(e.target.value)} />
          <Button size="sm" onClick={handleCreate} disabled={createPoll.isPending}>
            <CheckCircle className="w-4 h-4 mr-1" /> Create Poll
          </Button>
        </CardContent>
      </Card>

      <div className="space-y-3">
        {polls?.map((poll) => (
          <Card key={poll.id} className={poll.isActive ? "border-primary/40" : ""}>
            <CardContent className="py-4">
              <div className="flex items-start justify-between gap-4">
                <div className="flex-1">
                  <div className="flex items-center gap-2 mb-1">
                    <p className="font-semibold">{poll.question}</p>
                    {poll.isActive && <Badge className="text-xs bg-chart-3/20 text-chart-3 border-chart-3/30">ACTIVE</Badge>}
                    {poll.isFrozen && <Badge variant="secondary" className="text-xs">FROZEN</Badge>}
                  </div>
                  <p className="text-sm text-muted-foreground">{poll.totalVotes} votes</p>
                </div>
                <div className="flex gap-2 flex-shrink-0">
                  {poll.isActive ? (
                    <Button variant="outline" size="sm" onClick={() => deactivatePoll.mutate({ id: poll.id }, { onSuccess: () => { toast({ title: "Poll deactivated" }); refetch(); } })}>
                      <Square className="w-3 h-3 mr-1" /> Stop
                    </Button>
                  ) : (
                    <Button size="sm" onClick={() => activatePoll.mutate({ id: poll.id }, { onSuccess: () => { toast({ title: "Poll activated" }); refetch(); } })}>
                      <Play className="w-3 h-3 mr-1" /> Activate
                    </Button>
                  )}
                </div>
              </div>
            </CardContent>
          </Card>
        ))}
      </div>
    </div>
  );
}

// ─── Event Config Tab ──────────────────────────────────────────────────────────
function EventTab() {
  const { data: eventStatus } = useGetEventStatus();
  const updateEvent = useUpdateEventStatus();
  const { toast } = useToast();
  const [form, setForm] = useState({
    eventName: "", tagline: "", streamUrl: "",
    phase: "" as string,
    streamActive: false,
    resultsPublished: false,
    judgeResultsVisible: false,
  });

  const handleUpdate = () => {
    const updateData: {
      eventName?: string; tagline?: string; streamUrl?: string | null;
      phase?: UpdateEventStatusBodyPhase; streamActive?: boolean; resultsPublished?: boolean;
    } & Record<string, unknown> = {
      streamActive: form.streamActive,
      resultsPublished: form.resultsPublished,
      judgeResultsVisible: form.judgeResultsVisible,
    };

    if (form.eventName) updateData.eventName = form.eventName;
    if (form.tagline) updateData.tagline = form.tagline;
    if (form.streamUrl) updateData.streamUrl = form.streamUrl;
    if (form.phase) updateData.phase = form.phase as UpdateEventStatusBodyPhase;

    updateEvent.mutate({ data: updateData }, {
      onSuccess: () => toast({ title: "Event updated" }),
      onError: (err) => toast({ title: "Error", description: err.message, variant: "destructive" }),
    });
  };

  const phases = Object.values(PhaseValues);
  const eventStatusExt = eventStatus as (typeof eventStatus & { judgeResultsVisible?: boolean }) | undefined;

  return (
    <div className="space-y-6">
      <Card>
        <CardHeader><CardTitle className="text-sm font-mono">CURRENT STATUS</CardTitle></CardHeader>
        <CardContent className="grid grid-cols-2 md:grid-cols-3 gap-4">
          {[
            { label: "Event Name", value: eventStatus?.eventName ?? "—" },
            { label: "Phase", value: eventStatus?.phase?.toUpperCase() ?? "—", mono: true },
            { label: "Stream", value: eventStatus?.streamActive ? "Live" : "Offline" },
            { label: "Results", value: eventStatus?.resultsPublished ? "Published" : "Hidden" },
            { label: "Judge Results", value: eventStatusExt?.judgeResultsVisible ? "Visible" : "Hidden" },
          ].map(({ label, value, mono }) => (
            <div key={label} className="bg-muted/30 rounded-lg p-3">
              <p className="text-xs text-muted-foreground">{label}</p>
              <p className={`font-semibold mt-1 ${mono ? "font-mono text-primary" : ""}`}>{value}</p>
            </div>
          ))}
        </CardContent>
      </Card>

      <Card>
        <CardHeader><CardTitle className="text-sm font-mono">UPDATE EVENT</CardTitle></CardHeader>
        <CardContent className="space-y-4">
          <Input placeholder={`Event name (current: ${eventStatus?.eventName ?? "—"})`} value={form.eventName} onChange={(e) => setForm((p) => ({ ...p, eventName: e.target.value }))} />
          <Input placeholder={`Tagline (current: ${eventStatus?.tagline ?? "—"})`} value={form.tagline} onChange={(e) => setForm((p) => ({ ...p, tagline: e.target.value }))} />
          <Input placeholder="YouTube stream URL" value={form.streamUrl} onChange={(e) => setForm((p) => ({ ...p, streamUrl: e.target.value }))} />
          <div className="space-y-2">
            <p className="text-sm text-muted-foreground font-medium">Phase</p>
            <div className="flex flex-wrap gap-2">
              {phases.map((ph) => (
                <Button key={ph} variant={form.phase === ph ? "default" : "outline"} size="sm" onClick={() => setForm((p) => ({ ...p, phase: ph }))} className="font-mono text-xs">
                  {ph.toUpperCase()}
                </Button>
              ))}
            </div>
          </div>
          <div className="flex flex-wrap gap-3">
            <Button variant={form.streamActive ? "default" : "outline"} size="sm" onClick={() => setForm((p) => ({ ...p, streamActive: !p.streamActive }))}>
              <Activity className="w-4 h-4 mr-2" /> Stream {form.streamActive ? "Live" : "Offline"}
            </Button>
            <Button variant={form.resultsPublished ? "default" : "outline"} size="sm" onClick={() => setForm((p) => ({ ...p, resultsPublished: !p.resultsPublished }))}>
              <CheckCircle className="w-4 h-4 mr-2" /> Results {form.resultsPublished ? "Published" : "Hidden"}
            </Button>
            <Button variant={form.judgeResultsVisible ? "default" : "outline"} size="sm" onClick={() => setForm((p) => ({ ...p, judgeResultsVisible: !p.judgeResultsVisible }))}>
              <Scale className="w-4 h-4 mr-2" /> Judge Scores {form.judgeResultsVisible ? "Visible" : "Hidden"}
            </Button>
          </div>
          <Button onClick={handleUpdate} disabled={updateEvent.isPending} className="w-full">
            {updateEvent.isPending ? "Updating..." : "Apply Changes"}
          </Button>
        </CardContent>
      </Card>
    </div>
  );
}

// ─── Judges Tab ─────────────────────────────────────────────────────────────────
interface JudgeEntry { id: number; name: string; email: string; scoresSubmitted: number; createdAt: string; }

function JudgesTab({ adminToken }: { adminToken: string }) {
  const [judges, setJudges] = useState<JudgeEntry[]>([]);
  const [loading, setLoading] = useState(true);
  const [form, setForm] = useState({ name: "", email: "", password: "" });
  const [creating, setCreating] = useState(false);
  const [resetId, setResetId] = useState<number | null>(null);
  const [resetPassword, setResetPassword] = useState("");
  const { toast } = useToast();

  const fetchJudges = () => {
    setLoading(true);
    fetch("/api/admin/judges", { headers: { Authorization: `Bearer ${adminToken}` } })
      .then((r) => r.json())
      .then(setJudges)
      .catch(() => {})
      .finally(() => setLoading(false));
  };

  useEffect(() => { fetchJudges(); }, []);

  const handleCreate = async () => {
    if (!form.name || !form.email || !form.password) {
      toast({ title: "Name, email, and password are required", variant: "destructive" });
      return;
    }
    setCreating(true);
    try {
      const res = await fetch("/api/admin/judges", {
        method: "POST",
        headers: { "Content-Type": "application/json", Authorization: `Bearer ${adminToken}` },
        body: JSON.stringify(form),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.message ?? "Failed to create judge");
      toast({ title: "Judge created", description: `${form.name} can now log in at /judges` });
      setForm({ name: "", email: "", password: "" });
      fetchJudges();
    } catch (err: unknown) {
      toast({ title: "Error", description: err instanceof Error ? err.message : "Failed", variant: "destructive" });
    }
    setCreating(false);
  };

  const handleDelete = async (id: number, name: string) => {
    if (!confirm(`Remove judge "${name}"?`)) return;
    await fetch(`/api/admin/judges/${id}`, { method: "DELETE", headers: { Authorization: `Bearer ${adminToken}` } });
    toast({ title: "Judge removed" });
    fetchJudges();
  };

  const handleResetPassword = async (id: number) => {
    if (!resetPassword) { toast({ title: "Enter a new password", variant: "destructive" }); return; }
    const res = await fetch(`/api/admin/judges/${id}/reset-password`, {
      method: "POST",
      headers: { "Content-Type": "application/json", Authorization: `Bearer ${adminToken}` },
      body: JSON.stringify({ password: resetPassword }),
    });
    if (res.ok) {
      toast({ title: "Password reset successfully" });
      setResetId(null);
      setResetPassword("");
    } else {
      toast({ title: "Failed to reset password", variant: "destructive" });
    }
  };

  return (
    <div className="space-y-6">
      <Card>
        <CardHeader>
          <CardTitle className="text-sm font-mono">ADD JUDGE</CardTitle>
          <CardDescription>Judges access the scoring portal at <code className="text-primary">/judges</code></CardDescription>
        </CardHeader>
        <CardContent>
          <div className="space-y-3">
            <div className="grid grid-cols-1 md:grid-cols-3 gap-3">
              <Input placeholder="Full name *" value={form.name} onChange={(e) => setForm((p) => ({ ...p, name: e.target.value }))} />
              <Input type="email" placeholder="Email *" value={form.email} onChange={(e) => setForm((p) => ({ ...p, email: e.target.value }))} />
              <Input type="password" placeholder="Password *" value={form.password} onChange={(e) => setForm((p) => ({ ...p, password: e.target.value }))} />
            </div>
            <Button onClick={handleCreate} disabled={creating}>
              <Plus className="w-4 h-4 mr-2" /> {creating ? "Creating..." : "Add Judge"}
            </Button>
          </div>
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle className="text-sm font-mono">JUDGES</CardTitle>
          <CardDescription>{judges.length} judge{judges.length !== 1 ? "s" : ""} registered</CardDescription>
        </CardHeader>
        <CardContent>
          {loading ? (
            <div className="text-center text-muted-foreground py-6 text-sm">Loading...</div>
          ) : judges.length === 0 ? (
            <div className="text-center text-muted-foreground py-6 text-sm">No judges yet. Add one above.</div>
          ) : (
            <div className="space-y-3">
              {judges.map((judge) => (
                <div key={judge.id} className="p-3 rounded-lg bg-muted/30 hover:bg-muted/50 space-y-2">
                  <div className="flex items-center justify-between">
                    <div>
                      <p className="font-semibold">{judge.name}</p>
                      <p className="text-sm text-muted-foreground">{judge.email}</p>
                    </div>
                    <div className="flex items-center gap-3">
                      <Badge variant="secondary" className="text-xs font-mono">
                        {judge.scoresSubmitted} scores
                      </Badge>
                      <Button variant="ghost" size="sm" onClick={() => { setResetId(resetId === judge.id ? null : judge.id); setResetPassword(""); }}>
                        <RefreshCw className="w-3 h-3 mr-1" /> Reset PW
                      </Button>
                      <Button variant="ghost" size="sm" className="text-destructive hover:text-destructive" onClick={() => handleDelete(judge.id, judge.name)}>
                        <Trash2 className="w-3 h-3" />
                      </Button>
                    </div>
                  </div>
                  {resetId === judge.id && (
                    <div className="flex gap-2 pt-1">
                      <Input type="password" placeholder="New password" value={resetPassword} onChange={(e) => setResetPassword(e.target.value)} className="h-8 text-sm" />
                      <Button size="sm" onClick={() => handleResetPassword(judge.id)}>Save</Button>
                      <Button size="sm" variant="ghost" onClick={() => setResetId(null)}>Cancel</Button>
                    </div>
                  )}
                </div>
              ))}
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  );
}

// ─── Scores Tab ────────────────────────────────────────────────────────────────
interface TeamScore {
  rank: number; teamId: number; teamName: string; projectTitle: string;
  demoUrl: string | null; githubUrl: string | null; slidesUrl: string | null;
  averageScore: number | null; judgesScored: number; totalJudges: number;
  judgeBreakdown: { judgeId: number; judgeName: string; score: number; innovation: number | null; execution: number | null; presentation: number | null; feedback: string | null; }[];
}

function ScoresTab({ adminToken }: { adminToken: string }) {
  const [data, setData] = useState<{ judgeCount: number; teams: TeamScore[] } | null>(null);
  const [loading, setLoading] = useState(true);
  const [expanded, setExpanded] = useState<number | null>(null);

  useEffect(() => {
    fetch("/api/admin/scores", { headers: { Authorization: `Bearer ${adminToken}` } })
      .then((r) => r.json())
      .then(setData)
      .catch(() => {})
      .finally(() => setLoading(false));
  }, []);

  if (loading) return <div className="text-center text-muted-foreground py-12 text-sm">Loading scores...</div>;
  if (!data) return <div className="text-center text-muted-foreground py-12 text-sm">Failed to load.</div>;

  const rankColor = (rank: number) => rank === 1 ? "border-yellow-400/40 bg-yellow-400/5" : rank === 2 ? "border-slate-300/20" : rank === 3 ? "border-amber-600/20" : "border-border";
  const scoreColor = (s: number | null) => !s ? "text-muted-foreground" : s >= 8 ? "text-chart-3" : s >= 5 ? "text-chart-1" : "text-chart-4";

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <p className="text-sm text-muted-foreground">{data.judgeCount} judge{data.judgeCount !== 1 ? "s" : ""} · Scores 0–10</p>
        <Badge variant="secondary" className="font-mono">{data.teams.filter((t) => t.judgesScored > 0).length} teams scored</Badge>
      </div>

      {data.teams.map((team) => (
        <Card key={team.teamId} className={`${rankColor(team.rank)} transition-all`}>
          <CardContent className="pt-4 pb-4">
            <div className="flex items-start gap-4 cursor-pointer" onClick={() => setExpanded(expanded === team.teamId ? null : team.teamId)}>
              <div className="w-8 text-center font-mono font-bold text-muted-foreground text-sm pt-0.5">#{team.rank}</div>
              <div className="flex-1">
                <div className="flex items-center gap-2 flex-wrap">
                  <p className="font-bold">{team.teamName}</p>
                  {team.judgesScored === 0 && <Badge variant="outline" className="text-xs text-muted-foreground">NOT SCORED</Badge>}
                </div>
                <p className="text-xs text-muted-foreground mt-0.5">{team.projectTitle}</p>
                <div className="flex gap-3 mt-1">
                  {team.githubUrl && <a href={team.githubUrl} target="_blank" rel="noreferrer" onClick={(e) => e.stopPropagation()} className="flex items-center gap-1 text-xs text-muted-foreground hover:text-primary"><Github className="w-3 h-3" /> Repo</a>}
                  {team.demoUrl && <a href={team.demoUrl} target="_blank" rel="noreferrer" onClick={(e) => e.stopPropagation()} className="flex items-center gap-1 text-xs text-muted-foreground hover:text-primary"><Monitor className="w-3 h-3" /> Demo</a>}
                  {team.slidesUrl && <a href={team.slidesUrl} target="_blank" rel="noreferrer" onClick={(e) => e.stopPropagation()} className="flex items-center gap-1 text-xs text-muted-foreground hover:text-primary"><FileText className="w-3 h-3" /> Slides</a>}
                </div>
              </div>
              <div className="text-right flex-shrink-0">
                <p className={`text-2xl font-bold font-mono ${scoreColor(team.averageScore)}`}>
                  {team.averageScore !== null ? team.averageScore.toFixed(1) : "—"}
                </p>
                <p className="text-xs text-muted-foreground">{team.judgesScored}/{team.totalJudges} judges</p>
              </div>
            </div>

            {expanded === team.teamId && team.judgeBreakdown.length > 0 && (
              <div className="mt-4 pt-4 border-t border-border space-y-3">
                {team.judgeBreakdown.map((jb) => (
                  <div key={jb.judgeId} className="p-3 rounded-lg bg-muted/30 space-y-2">
                    <div className="flex items-center justify-between">
                      <p className="font-medium text-sm">{jb.judgeName}</p>
                      <span className={`font-mono font-bold ${scoreColor(jb.score)}`}>{jb.score}/10</span>
                    </div>
                    {(jb.innovation !== null || jb.execution !== null || jb.presentation !== null) && (
                      <div className="flex gap-4 text-xs text-muted-foreground">
                        {jb.innovation !== null && <span>Innovation: <span className="text-foreground font-mono">{jb.innovation}</span></span>}
                        {jb.execution !== null && <span>Execution: <span className="text-foreground font-mono">{jb.execution}</span></span>}
                        {jb.presentation !== null && <span>Presentation: <span className="text-foreground font-mono">{jb.presentation}</span></span>}
                      </div>
                    )}
                    {jb.feedback && <p className="text-xs text-muted-foreground italic">"{jb.feedback}"</p>}
                  </div>
                ))}
              </div>
            )}
          </CardContent>
        </Card>
      ))}
    </div>
  );
}

// ─── Logs Tab ──────────────────────────────────────────────────────────────────
function LogsTab() {
  const { data: logs } = useGetAdminLogs();

  return (
    <div className="space-y-4">
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
                  {log.details && <span className="text-muted-foreground ml-2">— {log.details}</span>}
                </div>
              </div>
            )) : (
              <p className="text-sm text-muted-foreground text-center py-8">No logs yet.</p>
            )}
          </div>
        </CardContent>
      </Card>
    </div>
  );
}

// ─── Main Admin Component ──────────────────────────────────────────────────────
export default function Admin() {
  const { getAdminToken, setAdminToken } = useAuthTokens();

  const handleLogin = (token: string) => {
    setAdminToken(token);
    setAuthTokenGetter(() => localStorage.getItem("hackforge_admin_token"));
    window.location.reload();
  };

  const adminToken = getAdminToken();

  if (!adminToken) {
    return <AdminLogin onLogin={handleLogin} />;
  }

  return (
    <div className="min-h-[calc(100vh-4rem)] bg-background py-8">
      <div className="container mx-auto px-4 max-w-5xl space-y-6">
        <motion.div initial={{ opacity: 0, y: -10 }} animate={{ opacity: 1, y: 0 }} className="flex items-center gap-3">
          <LayoutDashboard className="w-6 h-6 text-primary" />
          <h1 className="text-2xl font-bold font-mono">COMMAND CENTRE</h1>
        </motion.div>

        <Tabs defaultValue="dashboard">
          <TabsList className="grid grid-cols-4 md:grid-cols-8 mb-6">
            <TabsTrigger value="dashboard" className="gap-1 text-xs">
              <BarChart2 className="w-3.5 h-3.5" /><span className="hidden sm:inline"> Stats</span>
            </TabsTrigger>
            <TabsTrigger value="codes" className="gap-1 text-xs">
              <Code2 className="w-3.5 h-3.5" /><span className="hidden sm:inline"> Codes</span>
            </TabsTrigger>
            <TabsTrigger value="teams" className="gap-1 text-xs">
              <Users className="w-3.5 h-3.5" /><span className="hidden sm:inline"> Teams</span>
            </TabsTrigger>
            <TabsTrigger value="polls" className="gap-1 text-xs">
              <Activity className="w-3.5 h-3.5" /><span className="hidden sm:inline"> Polls</span>
            </TabsTrigger>
            <TabsTrigger value="judges" className="gap-1 text-xs">
              <Scale className="w-3.5 h-3.5" /><span className="hidden sm:inline"> Judges</span>
            </TabsTrigger>
            <TabsTrigger value="scores" className="gap-1 text-xs">
              <Trophy className="w-3.5 h-3.5" /><span className="hidden sm:inline"> Scores</span>
            </TabsTrigger>
            <TabsTrigger value="event" className="gap-1 text-xs">
              <Settings className="w-3.5 h-3.5" /><span className="hidden sm:inline"> Event</span>
            </TabsTrigger>
            <TabsTrigger value="logs" className="gap-1 text-xs">
              <ScrollText className="w-3.5 h-3.5" /><span className="hidden sm:inline"> Logs</span>
            </TabsTrigger>
          </TabsList>

          <TabsContent value="dashboard"><DashboardTab /></TabsContent>
          <TabsContent value="codes"><CodesTab /></TabsContent>
          <TabsContent value="teams"><TeamsTab /></TabsContent>
          <TabsContent value="polls"><PollsTab /></TabsContent>
          <TabsContent value="judges"><JudgesTab adminToken={adminToken} /></TabsContent>
          <TabsContent value="scores"><ScoresTab adminToken={adminToken} /></TabsContent>
          <TabsContent value="event"><EventTab /></TabsContent>
          <TabsContent value="logs"><LogsTab /></TabsContent>
        </Tabs>
      </div>
    </div>
  );
}
