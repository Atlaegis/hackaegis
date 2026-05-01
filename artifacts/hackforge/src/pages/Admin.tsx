import { useState } from "react";
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
  Activity, CheckCircle, XCircle,
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
  ];

  return (
    <div className="space-y-6">
      <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
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
    resetCode.mutate(
      { code },
      {
        onSuccess: () => { toast({ title: "Code reset" }); refetch(); },
        onError: (err) => toast({ title: "Error", description: err.message, variant: "destructive" }),
      }
    );
  };

  const handleDelete = (code: string) => {
    deleteCode.mutate(
      { code },
      {
        onSuccess: () => { toast({ title: "Code deleted" }); refetch(); },
        onError: (err) => toast({ title: "Error", description: err.message, variant: "destructive" }),
      }
    );
  };

  return (
    <div className="space-y-6">
      <Card>
        <CardHeader><CardTitle className="text-sm font-mono">GENERATE CODES</CardTitle></CardHeader>
        <CardContent>
          <div className="flex gap-3">
            <Input
              type="number"
              min={1}
              max={100}
              value={count}
              onChange={(e) => setCount(Number(e.target.value))}
              className="w-28"
            />
            <Button onClick={handleGenerate} disabled={generateCodes.isPending}>
              <Plus className="w-4 h-4 mr-2" />
              Generate
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
    deleteTeam.mutate(
      { id },
      {
        onSuccess: () => { toast({ title: "Team deleted" }); refetch(); },
        onError: (err) => toast({ title: "Error", description: err.message, variant: "destructive" }),
      }
    );
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
                    <Button
                      variant="ghost" size="sm"
                      onClick={() => { setEditId(team.id); setEditData({ name: team.name, projectTitle: team.projectTitle ?? "" }); }}
                    >
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
    if (!question) {
      toast({ title: "A question is required", variant: "destructive" });
      return;
    }
    createPoll.mutate(
      { data: { question } },
      {
        onSuccess: () => { toast({ title: "Poll created" }); refetch(); setQuestion(""); },
        onError: (err) => toast({ title: "Error", description: err.message, variant: "destructive" }),
      }
    );
  };

  const handleActivate = (id: number) => {
    activatePoll.mutate({ id }, {
      onSuccess: () => { toast({ title: "Poll activated" }); refetch(); },
      onError: (err) => toast({ title: "Error", description: err.message, variant: "destructive" }),
    });
  };

  const handleDeactivate = (id: number) => {
    deactivatePoll.mutate({ id }, {
      onSuccess: () => { toast({ title: "Poll deactivated" }); refetch(); },
      onError: (err) => toast({ title: "Error", description: err.message, variant: "destructive" }),
    });
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
                    <Button variant="outline" size="sm" onClick={() => handleDeactivate(poll.id)}>
                      <Square className="w-3 h-3 mr-1" /> Stop
                    </Button>
                  ) : (
                    <Button size="sm" onClick={() => handleActivate(poll.id)}>
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
    eventName: "",
    tagline: "",
    streamUrl: "",
    phase: "" as string,
    streamActive: false,
    resultsPublished: false,
  });

  const handleUpdate = () => {
    const updateData: {
      eventName?: string;
      tagline?: string;
      streamUrl?: string | null;
      phase?: UpdateEventStatusBodyPhase;
      streamActive?: boolean;
      resultsPublished?: boolean;
    } = {
      streamActive: form.streamActive,
      resultsPublished: form.resultsPublished,
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

  return (
    <div className="space-y-6">
      <Card>
        <CardHeader><CardTitle className="text-sm font-mono">CURRENT STATUS</CardTitle></CardHeader>
        <CardContent className="grid grid-cols-2 md:grid-cols-3 gap-4">
          <div className="bg-muted/30 rounded-lg p-3">
            <p className="text-xs text-muted-foreground">Event Name</p>
            <p className="font-semibold mt-1">{eventStatus?.eventName ?? "—"}</p>
          </div>
          <div className="bg-muted/30 rounded-lg p-3">
            <p className="text-xs text-muted-foreground">Phase</p>
            <p className="font-mono font-semibold mt-1 text-primary">{eventStatus?.phase?.toUpperCase() ?? "—"}</p>
          </div>
          <div className="bg-muted/30 rounded-lg p-3">
            <p className="text-xs text-muted-foreground">Stream</p>
            <p className="font-semibold mt-1">{eventStatus?.streamActive ? "Live" : "Offline"}</p>
          </div>
          <div className="bg-muted/30 rounded-lg p-3">
            <p className="text-xs text-muted-foreground">Results</p>
            <p className="font-semibold mt-1">{eventStatus?.resultsPublished ? "Published" : "Hidden"}</p>
          </div>
        </CardContent>
      </Card>

      <Card>
        <CardHeader><CardTitle className="text-sm font-mono">UPDATE EVENT</CardTitle></CardHeader>
        <CardContent className="space-y-4">
          <Input
            placeholder={`Event name (current: ${eventStatus?.eventName ?? "—"})`}
            value={form.eventName}
            onChange={(e) => setForm((p) => ({ ...p, eventName: e.target.value }))}
          />
          <Input
            placeholder={`Tagline (current: ${eventStatus?.tagline ?? "—"})`}
            value={form.tagline}
            onChange={(e) => setForm((p) => ({ ...p, tagline: e.target.value }))}
          />
          <Input
            placeholder="YouTube stream URL"
            value={form.streamUrl}
            onChange={(e) => setForm((p) => ({ ...p, streamUrl: e.target.value }))}
          />
          <div className="space-y-2">
            <p className="text-sm text-muted-foreground font-medium">Phase</p>
            <div className="flex flex-wrap gap-2">
              {phases.map((ph) => (
                <Button
                  key={ph}
                  variant={form.phase === ph ? "default" : "outline"}
                  size="sm"
                  onClick={() => setForm((p) => ({ ...p, phase: ph }))}
                  className="font-mono text-xs"
                >
                  {ph.toUpperCase()}
                </Button>
              ))}
            </div>
          </div>
          <div className="flex gap-4">
            <Button
              variant={form.streamActive ? "default" : "outline"}
              size="sm"
              onClick={() => setForm((p) => ({ ...p, streamActive: !p.streamActive }))}
            >
              <Activity className="w-4 h-4 mr-2" />
              Stream {form.streamActive ? "Live" : "Offline"}
            </Button>
            <Button
              variant={form.resultsPublished ? "default" : "outline"}
              size="sm"
              onClick={() => setForm((p) => ({ ...p, resultsPublished: !p.resultsPublished }))}
            >
              <CheckCircle className="w-4 h-4 mr-2" />
              Results {form.resultsPublished ? "Published" : "Hidden"}
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
                  <span className="font-mono text-xs text-muted-foreground mr-3">
                    {new Date(log.createdAt).toLocaleString()}
                  </span>
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

  if (!getAdminToken()) {
    return <AdminLogin onLogin={handleLogin} />;
  }

  return (
    <div className="min-h-[calc(100vh-4rem)] bg-background py-8">
      <div className="container mx-auto px-4 max-w-4xl space-y-6">
        <motion.div initial={{ opacity: 0, y: -10 }} animate={{ opacity: 1, y: 0 }} className="flex items-center gap-3">
          <LayoutDashboard className="w-6 h-6 text-primary" />
          <h1 className="text-2xl font-bold font-mono">COMMAND CENTRE</h1>
        </motion.div>

        <Tabs defaultValue="dashboard">
          <TabsList className="grid grid-cols-3 md:grid-cols-6 mb-6">
            <TabsTrigger value="dashboard" className="gap-1.5 text-xs">
              <BarChart2 className="w-3.5 h-3.5" /> Stats
            </TabsTrigger>
            <TabsTrigger value="codes" className="gap-1.5 text-xs">
              <Code2 className="w-3.5 h-3.5" /> Codes
            </TabsTrigger>
            <TabsTrigger value="teams" className="gap-1.5 text-xs">
              <Users className="w-3.5 h-3.5" /> Teams
            </TabsTrigger>
            <TabsTrigger value="polls" className="gap-1.5 text-xs">
              <Activity className="w-3.5 h-3.5" /> Polls
            </TabsTrigger>
            <TabsTrigger value="event" className="gap-1.5 text-xs">
              <Settings className="w-3.5 h-3.5" /> Event
            </TabsTrigger>
            <TabsTrigger value="logs" className="gap-1.5 text-xs">
              <ScrollText className="w-3.5 h-3.5" /> Logs
            </TabsTrigger>
          </TabsList>

          <TabsContent value="dashboard"><DashboardTab /></TabsContent>
          <TabsContent value="codes"><CodesTab /></TabsContent>
          <TabsContent value="teams"><TeamsTab /></TabsContent>
          <TabsContent value="polls"><PollsTab /></TabsContent>
          <TabsContent value="event"><EventTab /></TabsContent>
          <TabsContent value="logs"><LogsTab /></TabsContent>
        </Tabs>
      </div>
    </div>
  );
}
