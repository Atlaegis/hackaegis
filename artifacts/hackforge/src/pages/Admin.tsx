import { useState, useEffect } from "react";
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
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { useToast } from "@/hooks/use-toast";
import {
  LayoutDashboard, Users, Code2, BarChart2, Settings, ScrollText,
  RefreshCw, Trash2, Play, Square, Plus, Terminal, Trophy,
  Activity, CheckCircle, Scale, Github, Monitor, FileText, Copy, LogOut,
} from "lucide-react";
import { motion } from "framer-motion";

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
          <CardContent><p className="text-2xl font-bold font-mono text-primary">{dashboard?.currentPhase?.toUpperCase() ?? "—"}</p></CardContent>
        </Card>
        <Card>
          <CardHeader><CardTitle className="text-sm font-mono text-muted-foreground">ACTIVE POLL</CardTitle></CardHeader>
          <CardContent>
            {dashboard?.activePollQuestion
              ? <p className="font-semibold text-sm">{dashboard.activePollQuestion}</p>
              : <p className="text-muted-foreground text-sm">No poll active</p>}
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

  const copyAll = () => {
    const unused = codes?.filter((c) => !c.isUsed).map((c) => c.code).join("\n") ?? "";
    navigator.clipboard.writeText(unused);
    toast({ title: "Unused codes copied to clipboard" });
  };

  return (
    <div className="space-y-6">
      <Card>
        <CardHeader><CardTitle className="text-sm font-mono">GENERATE PARTICIPANT CODES</CardTitle>
          <CardDescription>Codes will be in <span className="text-primary font-mono">HACKFORGE_PART_XXXXXXXX</span> format</CardDescription>
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
              <CardTitle className="text-sm font-mono">PARTICIPATION CODES</CardTitle>
              <CardDescription>{codes?.length ?? 0} total · {codes?.filter((c) => !c.isUsed).length ?? 0} unused</CardDescription>
            </div>
            {(codes?.filter((c) => !c.isUsed).length ?? 0) > 0 && (
              <Button variant="outline" size="sm" onClick={copyAll}><Copy className="w-3 h-3 mr-1" /> Copy Unused</Button>
            )}
          </div>
        </CardHeader>
        <CardContent>
          <div className="space-y-2 max-h-96 overflow-y-auto pr-1">
            {codes?.map((c) => (
              <div key={c.code} className="flex items-center justify-between py-2 px-3 rounded-lg bg-muted/30 hover:bg-muted/50">
                <div className="flex items-center gap-3">
                  <span className="font-mono text-sm">{c.code}</span>
                  {c.isUsed
                    ? <Badge variant="secondary" className="text-xs bg-chart-3/20 text-chart-3">USED</Badge>
                    : <Badge variant="outline" className="text-xs text-muted-foreground">AVAILABLE</Badge>}
                </div>
                <div className="flex gap-2">
                  {c.isUsed && (
                    <Button variant="ghost" size="sm" onClick={() => resetCode.mutate({ code: c.code }, { onSuccess: () => { toast({ title: "Code reset" }); refetch(); } })} title="Reset code">
                      <RefreshCw className="w-3 h-3" />
                    </Button>
                  )}
                  <Button variant="ghost" size="sm" onClick={() => deleteCode.mutate({ code: c.code }, { onSuccess: () => { toast({ title: "Code deleted" }); refetch(); } })} className="text-destructive hover:text-destructive">
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

  return (
    <div className="space-y-6">
      <Card>
        <CardHeader><CardTitle className="text-sm font-mono">ADD TEAM</CardTitle></CardHeader>
        <CardContent>
          <div className="space-y-3">
            <Input placeholder="Team name *" value={newTeam.name} onChange={(e) => setNewTeam((p) => ({ ...p, name: e.target.value }))} />
            <Input placeholder="Project title *" value={newTeam.projectTitle} onChange={(e) => setNewTeam((p) => ({ ...p, projectTitle: e.target.value }))} />
            <Input placeholder="Description" value={newTeam.description} onChange={(e) => setNewTeam((p) => ({ ...p, description: e.target.value }))} />
            <Button
              onClick={() => {
                if (!newTeam.name || !newTeam.projectTitle) { toast({ title: "Name and project title required", variant: "destructive" }); return; }
                createTeam.mutate({ data: { name: newTeam.name, projectTitle: newTeam.projectTitle, description: newTeam.description || null } }, {
                  onSuccess: () => { toast({ title: "Team created" }); refetch(); setNewTeam({ name: "", projectTitle: "", description: "" }); },
                  onError: (err) => toast({ title: "Error", description: err.message, variant: "destructive" }),
                });
              }}
              disabled={!newTeam.name || !newTeam.projectTitle || createTeam.isPending}
            ><Plus className="w-4 h-4 mr-2" /> Add Team</Button>
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
                    <Button size="sm" onClick={() => updateTeam.mutate({ id: team.id, data: { name: editData.name, projectTitle: editData.projectTitle } }, { onSuccess: () => { toast({ title: "Team updated" }); refetch(); setEditId(null); } })}>Save</Button>
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
                    <Button variant="ghost" size="sm" onClick={() => { setEditId(team.id); setEditData({ name: team.name, projectTitle: team.projectTitle ?? "" }); }}>Edit</Button>
                    <Button variant="ghost" size="sm" onClick={() => deleteTeam.mutate({ id: team.id }, { onSuccess: () => { toast({ title: "Team deleted" }); refetch(); } })} className="text-destructive hover:text-destructive"><Trash2 className="w-4 h-4" /></Button>
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

  return (
    <div className="space-y-6">
      <Card>
        <CardHeader>
          <CardTitle className="text-sm font-mono">CREATE POLL</CardTitle>
          <CardDescription>Teams are automatically added as voting options</CardDescription>
        </CardHeader>
        <CardContent className="space-y-3">
          <Input placeholder="e.g. Which team had the best innovation?" value={question} onChange={(e) => setQuestion(e.target.value)} />
          <Button size="sm" onClick={() => {
            if (!question) { toast({ title: "A question is required", variant: "destructive" }); return; }
            createPoll.mutate({ data: { question } }, {
              onSuccess: () => { toast({ title: "Poll created" }); refetch(); setQuestion(""); },
              onError: (err) => toast({ title: "Error", description: err.message, variant: "destructive" }),
            });
          }} disabled={createPoll.isPending}>
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

// ─── Judge Codes Tab ──────────────────────────────────────────────────────────
interface JudgeCodeEntry { id: number; code: string; label: string | null; createdAt: string; }

function JudgesTab({ adminToken }: { adminToken: string }) {
  const [judgeCodes, setJudgeCodes] = useState<JudgeCodeEntry[]>([]);
  const [loading, setLoading] = useState(true);
  const [label, setLabel] = useState("");
  const [creating, setCreating] = useState(false);
  const { toast } = useToast();

  const fetchCodes = () => {
    setLoading(true);
    fetch("/api/codes/judges", { headers: { Authorization: `Bearer ${adminToken}` } })
      .then((r) => r.json())
      .then(setJudgeCodes)
      .catch(() => {})
      .finally(() => setLoading(false));
  };

  useEffect(() => { fetchCodes(); }, []);

  const handleCreate = async () => {
    setCreating(true);
    try {
      const res = await fetch("/api/codes/judges", {
        method: "POST",
        headers: { "Content-Type": "application/json", Authorization: `Bearer ${adminToken}` },
        body: JSON.stringify({ label: label || undefined }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.message ?? "Failed");
      toast({ title: "Judge code created", description: `Code: ${data.code}` });
      setLabel("");
      fetchCodes();
    } catch (err: unknown) {
      toast({ title: "Error", description: err instanceof Error ? err.message : "Failed", variant: "destructive" });
    }
    setCreating(false);
  };

  const handleDelete = async (id: number, code: string) => {
    if (!confirm(`Remove judge code "${code}"?`)) return;
    await fetch(`/api/codes/judges/${id}`, { method: "DELETE", headers: { Authorization: `Bearer ${adminToken}` } });
    toast({ title: "Judge code removed" });
    fetchCodes();
  };

  const copyCode = (code: string) => {
    navigator.clipboard.writeText(code);
    toast({ title: "Copied!", description: code });
  };

  return (
    <div className="space-y-6">
      <Card>
        <CardHeader>
          <CardTitle className="text-sm font-mono">CREATE JUDGE CODE</CardTitle>
          <CardDescription>
            Judge codes are in <span className="font-mono text-chart-2">HACKFORGE_JUDGE@NN</span> format. Give the code to the judge — they enter it on the home page.
          </CardDescription>
        </CardHeader>
        <CardContent>
          <div className="flex gap-3">
            <Input placeholder="Judge name / label (optional)" value={label} onChange={(e) => setLabel(e.target.value)} className="flex-1" />
            <Button onClick={handleCreate} disabled={creating}>
              <Plus className="w-4 h-4 mr-2" /> {creating ? "Creating..." : "Add Judge"}
            </Button>
          </div>
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle className="text-sm font-mono">JUDGE CODES</CardTitle>
          <CardDescription>{judgeCodes.length} judge{judgeCodes.length !== 1 ? "s" : ""}</CardDescription>
        </CardHeader>
        <CardContent>
          {loading ? (
            <div className="text-center text-muted-foreground py-6 text-sm">Loading...</div>
          ) : judgeCodes.length === 0 ? (
            <div className="text-center text-muted-foreground py-6 text-sm">No judge codes yet. Add one above.</div>
          ) : (
            <div className="space-y-3">
              {judgeCodes.map((jc) => (
                <div key={jc.id} className="flex items-center justify-between p-3 rounded-lg bg-muted/30 hover:bg-muted/50">
                  <div>
                    <p className="font-semibold text-sm">{jc.label ?? jc.code}</p>
                    <p className="font-mono text-xs text-chart-2">{jc.code}</p>
                  </div>
                  <div className="flex items-center gap-2">
                    <Button variant="ghost" size="sm" onClick={() => copyCode(jc.code)} title="Copy code">
                      <Copy className="w-3 h-3" />
                    </Button>
                    <Button variant="ghost" size="sm" className="text-destructive hover:text-destructive" onClick={() => handleDelete(jc.id, jc.code)}>
                      <Trash2 className="w-3 h-3" />
                    </Button>
                  </div>
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
        <Card key={team.teamId} className={`${rankColor(team.rank)} transition-all cursor-pointer`} onClick={() => setExpanded(expanded === team.teamId ? null : team.teamId)}>
          <CardContent className="pt-4 pb-4">
            <div className="flex items-start gap-4">
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
                <p className={`text-2xl font-bold font-mono ${scoreColor(team.averageScore)}`}>{team.averageScore !== null ? team.averageScore.toFixed(1) : "—"}</p>
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

// ─── Event Config Tab ──────────────────────────────────────────────────────────
function EventTab() {
  const { data: eventStatus } = useGetEventStatus();
  const updateEvent = useUpdateEventStatus();
  const { toast } = useToast();
  const [form, setForm] = useState({ eventName: "", tagline: "", streamUrl: "", phase: "" as string, streamActive: false, resultsPublished: false, judgeResultsVisible: false });

  const handleUpdate = () => {
    const updateData: { eventName?: string; tagline?: string; streamUrl?: string | null; phase?: UpdateEventStatusBodyPhase; streamActive?: boolean; resultsPublished?: boolean; } & Record<string, unknown> = {
      streamActive: form.streamActive, resultsPublished: form.resultsPublished, judgeResultsVisible: form.judgeResultsVisible,
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
                  {log.details && <span className="text-muted-foreground ml-2 text-xs">— {log.details}</span>}
                </div>
              </div>
            )) : <p className="text-muted-foreground text-sm py-4 text-center">No logs yet.</p>}
          </div>
        </CardContent>
      </Card>
    </div>
  );
}

// ─── Main Admin Panel ─────────────────────────────────────────────────────────
export default function Admin() {
  const [, setLocation] = useLocation();
  const { getAdminToken, adminLogout } = useAuthTokens();
  const adminToken = getAdminToken();

  useEffect(() => {
    if (adminToken) {
      setAuthTokenGetter(() => localStorage.getItem("hackforge_admin_token"));
    }
  }, [adminToken]);

  // Not authenticated → redirect home
  if (!adminToken) {
    return (
      <div className="min-h-[calc(100vh-4rem)] flex items-center justify-center bg-background">
        <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} className="w-full max-w-sm text-center space-y-6">
          <div className="flex justify-center">
            <div className="bg-primary/10 p-4 rounded-full border border-primary/20">
              <Terminal className="w-10 h-10 text-primary" />
            </div>
          </div>
          <div>
            <h2 className="font-mono text-2xl font-bold">ADMIN ACCESS</h2>
            <p className="text-muted-foreground mt-2 text-sm">Enter your admin code on the home page to access this panel.</p>
          </div>
          <div className="bg-muted/40 rounded-lg p-3 font-mono text-sm text-chart-4">
            HACKFORGE_ADMIN@01
          </div>
          <Button className="w-full" onClick={() => setLocation("/")}>
            Go to Home Page
          </Button>
        </motion.div>
      </div>
    );
  }

  const handleLogout = () => {
    adminLogout();
    setAuthTokenGetter(() => null);
    setLocation("/");
  };

  const tabs = [
    { value: "dashboard", label: "Dashboard", icon: LayoutDashboard },
    { value: "codes", label: "Codes", icon: Code2 },
    { value: "teams", label: "Teams", icon: Users },
    { value: "polls", label: "Polls", icon: BarChart2 },
    { value: "judges", label: "Judges", icon: Scale },
    { value: "scores", label: "Scores", icon: Trophy },
    { value: "event", label: "Config", icon: Settings },
    { value: "logs", label: "Logs", icon: ScrollText },
  ] as const;

  return (
    <div className="min-h-[calc(100vh-4rem)] bg-background py-6">
      <div className="container mx-auto px-4 max-w-5xl space-y-6">

        {/* Header */}
        <motion.div initial={{ opacity: 0, y: -10 }} animate={{ opacity: 1, y: 0 }} className="flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className="bg-primary/10 p-2 rounded-lg border border-primary/20">
              <Terminal className="w-5 h-5 text-primary" />
            </div>
            <div>
              <h1 className="font-bold font-mono text-xl">ADMIN PANEL</h1>
              <p className="text-sm text-muted-foreground">HackForge Command Centre</p>
            </div>
          </div>
          <Button variant="outline" size="sm" onClick={handleLogout} className="text-muted-foreground gap-2">
            <LogOut className="w-4 h-4" /> Logout
          </Button>
        </motion.div>

        {/* Tabs */}
        <Tabs defaultValue="dashboard">
          <TabsList className="grid grid-cols-4 md:grid-cols-8 h-auto gap-1 p-1">
            {tabs.map(({ value, label, icon: Icon }) => (
              <TabsTrigger key={value} value={value} className="flex-col gap-0.5 h-auto py-2 text-xs">
                <Icon className="w-3.5 h-3.5" />
                {label}
              </TabsTrigger>
            ))}
          </TabsList>

          <div className="mt-6">
            <TabsContent value="dashboard"><DashboardTab /></TabsContent>
            <TabsContent value="codes"><CodesTab /></TabsContent>
            <TabsContent value="teams"><TeamsTab /></TabsContent>
            <TabsContent value="polls"><PollsTab /></TabsContent>
            <TabsContent value="judges"><JudgesTab adminToken={adminToken} /></TabsContent>
            <TabsContent value="scores"><ScoresTab adminToken={adminToken} /></TabsContent>
            <TabsContent value="event"><EventTab /></TabsContent>
            <TabsContent value="logs"><LogsTab /></TabsContent>
          </div>
        </Tabs>
      </div>
    </div>
  );
}
