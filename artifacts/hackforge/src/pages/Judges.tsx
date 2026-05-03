import { useState, useEffect } from "react";
import { useLocation } from "wouter";
import { useGetEventStatus } from "@workspace/api-client-react";
import { useAuthTokens } from "@/lib/auth";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { useToast } from "@/hooks/use-toast";
import {
  Scale, Terminal, Star, ExternalLink,
  Github, Monitor, FileText, CheckCircle, Tv, Activity,
  BarChart2, Users, LogOut
} from "lucide-react";
import { motion, AnimatePresence } from "framer-motion";
import { setAuthTokenGetter } from "@workspace/api-client-react";

const JUDGE_TOKEN_KEY = "hackforge_judge_token";

interface JudgeTeam {
  id: number; name: string; projectTitle: string; description: string | null;
  githubUrl: string | null; demoUrl: string | null; slidesUrl: string | null;
  submissionDescription: string | null; hasSubmission: boolean;
  judgeScore: { score: number; innovation: number | null; execution: number | null; presentation: number | null; feedback: string | null; } | null;
}

interface JudgeProfile {
  id: number; code: string; label: string; isJudge: boolean;
}

interface LeaderboardEntry {
  rank: number; teamId: number; teamName: string; projectTitle: string;
  averageScore: number | null; judgesScored: number; totalJudges: number;
}

// ─── Score Slider ─────────────────────────────────────────────────────────────
function ScoreInput({ label, value, onChange }: { label: string; value: number; onChange: (v: number) => void }) {
  const color = value >= 8 ? "text-chart-3" : value >= 5 ? "text-chart-1" : "text-chart-4";
  return (
    <div className="space-y-1">
      <div className="flex justify-between text-xs">
        <span className="text-muted-foreground">{label}</span>
        <span className={`font-mono font-bold ${color}`}>{value.toFixed(1)}</span>
      </div>
      <input type="range" min={0} max={10} step={0.5} value={value} onChange={(e) => onChange(parseFloat(e.target.value))} className="w-full accent-chart-2 h-2" />
      <div className="flex justify-between text-xs text-muted-foreground/50"><span>0</span><span>5</span><span>10</span></div>
    </div>
  );
}

// ─── Team Card ────────────────────────────────────────────────────────────────
function TeamCard({ team, token, onScored }: { team: JudgeTeam; token: string; onScored: () => void }) {
  const { toast } = useToast();
  const [expanded, setExpanded] = useState(false);
  const [score, setScore] = useState(team.judgeScore?.score ?? 7);
  const [innovation, setInnovation] = useState(team.judgeScore?.innovation ?? 7);
  const [execution, setExecution] = useState(team.judgeScore?.execution ?? 7);
  const [presentation, setPresentation] = useState(team.judgeScore?.presentation ?? 7);
  const [feedback, setFeedback] = useState(team.judgeScore?.feedback ?? "");
  const [saving, setSaving] = useState(false);
  const hasScored = !!team.judgeScore;

  const handleSave = async () => {
    setSaving(true);
    try {
      const res = await fetch("/api/judges/scores", {
        method: "POST",
        headers: { "Content-Type": "application/json", Authorization: `Bearer ${token}` },
        body: JSON.stringify({ teamId: team.id, score, innovation, execution, presentation, feedback }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.message ?? "Failed to save score");
      toast({ title: "Score Saved!", description: `${team.name}: ${score}/10` });
      onScored();
      setExpanded(false);
    } catch (err: unknown) {
      toast({ title: "Error", description: err instanceof Error ? err.message : "Failed", variant: "destructive" });
    } finally { setSaving(false); }
  };

  const scoreColor = (s: number) => s >= 8 ? "text-chart-3" : s >= 5 ? "text-chart-1" : "text-chart-4";

  return (
    <Card className={`transition-all border ${hasScored ? "border-chart-3/30 bg-chart-3/5" : "border-border"}`}>
      <CardContent className="pt-4 pb-4">
        <div className="flex items-start justify-between gap-4">
          <div className="flex-1">
            <div className="flex items-center gap-2 flex-wrap">
              <h3 className="font-bold text-lg">{team.name}</h3>
              {hasScored && (
                <Badge className="bg-chart-3/20 text-chart-3 border-chart-3/30 font-mono text-xs">
                  <CheckCircle className="w-3 h-3 mr-1" /> {team.judgeScore!.score}/10
                </Badge>
              )}
              {team.hasSubmission && <Badge variant="secondary" className="text-xs">SUBMITTED</Badge>}
            </div>
            <p className="text-sm text-muted-foreground mt-0.5">{team.projectTitle}</p>
            {team.description && <p className="text-xs text-muted-foreground/70 mt-1 line-clamp-2">{team.description}</p>}
            <div className="flex gap-3 mt-2 flex-wrap">
              {team.githubUrl && <a href={team.githubUrl} target="_blank" rel="noreferrer" className="flex items-center gap-1 text-xs text-muted-foreground hover:text-primary transition-colors"><Github className="w-3 h-3" /> Repo</a>}
              {team.demoUrl && <a href={team.demoUrl} target="_blank" rel="noreferrer" className="flex items-center gap-1 text-xs text-muted-foreground hover:text-primary transition-colors"><Monitor className="w-3 h-3" /> Demo</a>}
              {team.slidesUrl && <a href={team.slidesUrl} target="_blank" rel="noreferrer" className="flex items-center gap-1 text-xs text-muted-foreground hover:text-primary transition-colors"><FileText className="w-3 h-3" /> Slides</a>}
            </div>
          </div>
          <Button variant={expanded ? "default" : "outline"} size="sm" onClick={() => setExpanded(!expanded)}>
            <Star className="w-3 h-3 mr-1" /> {hasScored ? "Edit Score" : "Score Team"}
          </Button>
        </div>

        <AnimatePresence>
          {expanded && (
            <motion.div initial={{ opacity: 0, height: 0 }} animate={{ opacity: 1, height: "auto" }} exit={{ opacity: 0, height: 0 }} className="overflow-hidden">
              <div className="pt-4 mt-4 border-t border-border space-y-4">
                <div className="grid md:grid-cols-2 gap-4">
                  <ScoreInput label="Overall Score" value={score} onChange={setScore} />
                  <ScoreInput label="Innovation" value={innovation} onChange={setInnovation} />
                  <ScoreInput label="Execution & Completeness" value={execution} onChange={setExecution} />
                  <ScoreInput label="Presentation & Communication" value={presentation} onChange={setPresentation} />
                </div>
                <div>
                  <label className="text-xs text-muted-foreground mb-1 block">Feedback / Comments (optional)</label>
                  <Textarea value={feedback} onChange={(e) => setFeedback(e.target.value)} placeholder="Notes for this team..." rows={3} className="bg-background/50 text-sm resize-none" />
                </div>
                <div className="flex gap-2 justify-end">
                  <Button variant="ghost" size="sm" onClick={() => setExpanded(false)}>Cancel</Button>
                  <Button size="sm" onClick={handleSave} disabled={saving} className="bg-chart-2 hover:bg-chart-2/90">
                    <CheckCircle className="w-3 h-3 mr-1" /> {saving ? "Saving..." : "Submit Score"}
                  </Button>
                </div>
              </div>
            </motion.div>
          )}
        </AnimatePresence>
      </CardContent>
    </Card>
  );
}

// ─── Leaderboard ─────────────────────────────────────────────────────────────
function JudgeLeaderboard({ token }: { token: string }) {
  const [leaderboard, setLeaderboard] = useState<{ isVisible: boolean; judgeCount: number; leaderboard: LeaderboardEntry[] } | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    fetch("/api/judges/leaderboard", { headers: { Authorization: `Bearer ${token}` } })
      .then((r) => r.json())
      .then(setLeaderboard)
      .catch(() => {})
      .finally(() => setLoading(false));
  }, [token]);

  if (loading) return <div className="flex justify-center py-12 text-muted-foreground"><Activity className="w-5 h-5 animate-spin mr-2" /> Loading...</div>;
  if (!leaderboard) return <p className="text-center text-muted-foreground py-12">Unable to load leaderboard.</p>;

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <p className="text-sm text-muted-foreground">{leaderboard.judgeCount} judges · Scores averaged across all judges</p>
      </div>
      {leaderboard.leaderboard.map((entry) => (
        <div key={entry.teamId} className={`flex items-center gap-4 p-4 rounded-lg border ${entry.rank === 1 ? "border-yellow-400/30 bg-yellow-400/5" : entry.rank === 2 ? "border-slate-300/20" : entry.rank === 3 ? "border-amber-600/20" : "border-border"}`}>
          <div className="w-8 text-center font-mono font-bold text-muted-foreground">#{entry.rank}</div>
          <div className="flex-1">
            <p className="font-semibold">{entry.teamName}</p>
            <p className="text-xs text-muted-foreground">{entry.projectTitle}</p>
          </div>
          <div className="text-right">
            <p className={`text-2xl font-bold font-mono ${entry.averageScore !== null && entry.averageScore >= 8 ? "text-chart-3" : entry.averageScore !== null && entry.averageScore >= 5 ? "text-chart-1" : "text-muted-foreground"}`}>
              {entry.averageScore !== null ? entry.averageScore.toFixed(1) : "—"}
            </p>
            <p className="text-xs text-muted-foreground">{entry.judgesScored}/{entry.totalJudges} judges</p>
          </div>
        </div>
      ))}
    </div>
  );
}

// ─── Main Judges Portal ───────────────────────────────────────────────────────
export default function Judges() {
  const [, setLocation] = useLocation();
  const { getJudgeToken, judgeLogout } = useAuthTokens();
  const [judgeToken, setJudgeTokenState] = useState(() => localStorage.getItem(JUDGE_TOKEN_KEY) ?? "");
  const [profile, setProfile] = useState<JudgeProfile | null>(null);
  const [teams, setTeams] = useState<JudgeTeam[]>([]);
  const [loadingTeams, setLoadingTeams] = useState(false);
  const { data: eventStatus } = useGetEventStatus();

  const fetchTeams = async (token: string) => {
    setLoadingTeams(true);
    try {
      const res = await fetch("/api/judges/teams", { headers: { Authorization: `Bearer ${token}` } });
      const data = await res.json();
      if (res.ok) setTeams(data);
    } catch {}
    setLoadingTeams(false);
  };

  const fetchProfile = async (token: string) => {
    try {
      const res = await fetch("/api/judges/me", { headers: { Authorization: `Bearer ${token}` } });
      const data = await res.json();
      if (res.ok) {
        setProfile(data);
        setAuthTokenGetter(() => localStorage.getItem(JUDGE_TOKEN_KEY));
      } else {
        localStorage.removeItem(JUDGE_TOKEN_KEY);
        setJudgeTokenState("");
      }
    } catch {}
  };

  useEffect(() => {
    if (judgeToken) {
      fetchProfile(judgeToken);
      fetchTeams(judgeToken);
    }
  }, [judgeToken]);

  // Not authenticated → show redirect prompt
  if (!judgeToken || !profile) {
    return (
      <div className="min-h-[calc(100vh-4rem)] flex items-center justify-center bg-background">
        <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} className="w-full max-w-sm text-center space-y-6">
          <div className="flex justify-center">
            <div className="bg-chart-2/10 p-4 rounded-full border border-chart-2/20">
              <Scale className="w-10 h-10 text-chart-2" />
            </div>
          </div>
          <div>
            <h2 className="font-mono text-2xl font-bold">JUDGE PORTAL</h2>
            <p className="text-muted-foreground mt-2 text-sm">Enter your judge code on the home page to access this portal.</p>
          </div>
          <div className="bg-muted/40 rounded-lg p-3 font-mono text-sm text-chart-2">
            HACKFORGE_JUDGE@01
          </div>
          <Button className="w-full bg-chart-2 hover:bg-chart-2/90" onClick={() => setLocation("/")}>
            Go to Home Page
          </Button>
        </motion.div>
      </div>
    );
  }

  const handleLogout = () => {
    judgeLogout();
    setJudgeTokenState("");
    setProfile(null);
    setTeams([]);
    setAuthTokenGetter(() => null);
    setLocation("/");
  };

  const scored = teams.filter((t) => t.judgeScore !== null).length;

  return (
    <div className="min-h-[calc(100vh-4rem)] bg-background py-8">
      <div className="container mx-auto px-4 max-w-4xl space-y-6">

        {/* Header */}
        <motion.div initial={{ opacity: 0, y: -10 }} animate={{ opacity: 1, y: 0 }} className="flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className="bg-chart-2/10 p-2 rounded-lg border border-chart-2/20">
              <Scale className="w-5 h-5 text-chart-2" />
            </div>
            <div>
              <h1 className="font-bold font-mono text-xl">JUDGE PORTAL</h1>
              <p className="text-sm text-muted-foreground">Welcome, {profile.label}</p>
            </div>
          </div>
          <div className="flex items-center gap-3">
            <div className="text-right hidden sm:block">
              <p className="text-xs text-muted-foreground">Progress</p>
              <p className="font-mono text-sm font-bold text-chart-2">{scored}/{teams.length} scored</p>
            </div>
            <Button variant="outline" size="sm" onClick={handleLogout} className="text-muted-foreground gap-2">
              <LogOut className="w-4 h-4" /> Logout
            </Button>
          </div>
        </motion.div>

        {/* Progress bar */}
        {teams.length > 0 && (
          <div className="space-y-1">
            <div className="h-2 rounded-full bg-muted overflow-hidden">
              <motion.div className="h-full bg-chart-2 rounded-full" initial={{ width: 0 }} animate={{ width: `${(scored / teams.length) * 100}%` }} transition={{ duration: 0.8, ease: "easeOut" }} />
            </div>
            <p className="text-xs text-muted-foreground text-right">{scored} of {teams.length} teams scored</p>
          </div>
        )}

        <Tabs defaultValue="teams">
          <TabsList className="grid grid-cols-3">
            <TabsTrigger value="teams" className="gap-1.5"><Users className="w-3.5 h-3.5" /> Teams & Scoring</TabsTrigger>
            <TabsTrigger value="stream" className="gap-1.5"><Tv className="w-3.5 h-3.5" /> Live Stream</TabsTrigger>
            <TabsTrigger value="leaderboard" className="gap-1.5"><BarChart2 className="w-3.5 h-3.5" /> Leaderboard</TabsTrigger>
          </TabsList>

          <TabsContent value="teams" className="space-y-4 mt-4">
            {loadingTeams ? (
              <div className="flex justify-center py-12 text-muted-foreground"><Activity className="w-5 h-5 animate-spin mr-2" /> Loading teams...</div>
            ) : (
              <motion.div className="space-y-3" initial="hidden" animate="show" variants={{ hidden: {}, show: { transition: { staggerChildren: 0.05 } } }}>
                {teams.map((team) => (
                  <motion.div key={team.id} variants={{ hidden: { opacity: 0, y: 10 }, show: { opacity: 1, y: 0 } }}>
                    <TeamCard team={team} token={judgeToken} onScored={() => fetchTeams(judgeToken)} />
                  </motion.div>
                ))}
              </motion.div>
            )}
          </TabsContent>

          <TabsContent value="stream" className="mt-4">
            <Card className="overflow-hidden border-primary/20">
              <CardHeader>
                <CardTitle className="flex items-center gap-2 text-base">
                  <div className="w-2 h-2 rounded-full bg-red-500 animate-pulse" />
                  Live Stream
                  {eventStatus?.streamActive && <Badge className="bg-red-500/20 text-red-400 border-red-400/30 text-xs">LIVE</Badge>}
                </CardTitle>
              </CardHeader>
              <CardContent className="p-0">
                {eventStatus?.streamUrl ? (
                  <div className="relative w-full" style={{ paddingBottom: "56.25%" }}>
                    <iframe className="absolute inset-0 w-full h-full" src={`https://www.youtube.com/embed/${extractYouTubeId(eventStatus.streamUrl)}?autoplay=1`} title="HackForge Live Stream" allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture" allowFullScreen />
                  </div>
                ) : (
                  <div className="flex flex-col items-center justify-center h-48 text-muted-foreground gap-3">
                    <Tv className="w-10 h-10 opacity-20" />
                    <p className="font-mono text-sm">STREAM OFFLINE</p>
                  </div>
                )}
              </CardContent>
            </Card>
          </TabsContent>

          <TabsContent value="leaderboard" className="mt-4">
            <JudgeLeaderboard token={judgeToken} />
          </TabsContent>
        </Tabs>
      </div>
    </div>
  );
}

function extractYouTubeId(url: string): string {
  const match = url.match(/(?:youtu\.be\/|v=|embed\/)([A-Za-z0-9_-]{11})/);
  return match ? match[1] : url;
}
