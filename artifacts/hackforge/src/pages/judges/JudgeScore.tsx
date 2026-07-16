import { useState, useEffect } from "react";
import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import { useToast } from "@/hooks/use-toast";
import { Lock, Unlock, Star, CheckCircle, Github, Monitor, FileText, Activity, AlertTriangle, XCircle } from "lucide-react";
import { motion, AnimatePresence } from "framer-motion";

interface TeamData {
  id: number; name: string; projectTitle: string; description: string | null;
  domain: string | null; githubUrl: string | null; demoUrl: string | null; slidesUrl: string | null;
  hasSubmission: boolean; isDisqualified: boolean; isLate: boolean; minutesLate: number;
  judgeScore: {
    totalScore: number | null; innovationProblemSolving: number | null;
    technicalExcellence: number | null; realWorldImpact: number | null;
    uiUxExperience: number | null; presentationCommunication: number | null;
    completionFunctionality: number | null; teamworkManagement: number | null;
    feedback: string | null;
  } | null;
}

const CRITERIA = [
  { key: "innovationProblemSolving", label: "Innovation & Problem Solving", max: 20, color: "text-purple-400" },
  { key: "technicalExcellence", label: "Technical Excellence", max: 25, color: "text-blue-400" },
  { key: "realWorldImpact", label: "Real-World Impact & Scalability", max: 20, color: "text-green-400" },
  { key: "uiUxExperience", label: "UI/UX & Product Experience", max: 10, color: "text-pink-400" },
  { key: "presentationCommunication", label: "Presentation & Communication", max: 10, color: "text-amber-400" },
  { key: "completionFunctionality", label: "Completion & Functionality", max: 10, color: "text-cyan-400" },
  { key: "teamworkManagement", label: "Teamwork & Project Management", max: 5, color: "text-indigo-400" },
];

function CriterionSlider({ label, value, max, color, onChange }: { label: string; value: number; max: number; color: string; onChange: (v: number) => void }) {
  const pct = (value / max) * 100;
  return (
    <div className="space-y-1">
      <div className="flex justify-between text-xs">
        <span className="text-muted-foreground">{label}</span>
        <span className={`font-mono font-bold ${color}`}>{value}/{max}</span>
      </div>
      <input type="range" min={0} max={max} step={1} value={value} onChange={(e) => onChange(parseInt(e.target.value, 10))} className="w-full h-2 accent-chart-2" />
      <div className="h-1.5 rounded-full bg-muted overflow-hidden">
        <div className="h-full rounded-full transition-all" style={{ width: `${pct}%`, backgroundColor: `hsl(var(--chart-2))` }} />
      </div>
    </div>
  );
}

export default function JudgeScore({ token }: { token: string }) {
  const { toast } = useToast();
  const [teams, setTeams] = useState<TeamData[]>([]);
  const [lockedTeamId, setLockedTeamId] = useState<number | null>(null);
  const [loading, setLoading] = useState(true);
  const [expandedTeamId, setExpandedTeamId] = useState<number | null>(null);
  const [scores, setScores] = useState<Record<string, number>>({});
  const [feedback, setFeedback] = useState("");
  const [saving, setSaving] = useState(false);
  const [locking, setLocking] = useState(false);
  const [disqualifying, setDisqualifying] = useState<number | null>(null);

  const fetchTeams = async (signal?: AbortSignal) => {
    try {
      const res = await fetch("/api/judges/teams", { headers: { Authorization: `Bearer ${token}` }, signal });
      const data = await res.json();
      if (res.ok) {
        setTeams(data.teams ?? []);
        setLockedTeamId(data.lockedTeamId ?? null);
      }
    } catch (e: unknown) {
      if (e instanceof DOMException && e.name === "AbortError") return;
    }
    setLoading(false);
  };

  useEffect(() => {
    const controller = new AbortController();
    fetchTeams(controller.signal);
    return () => controller.abort();
  }, [token]);

  const handleLock = async (teamId: number) => {
    setLocking(true);
    try {
      const res = await fetch(`/api/judges/teams/${teamId}/lock`, { method: "POST", headers: { Authorization: `Bearer ${token}` } });
      const data = await res.json();
      if (!res.ok) throw new Error(data.message);
      setLockedTeamId(teamId);
      toast({ title: "Team Locked", description: "You can now evaluate this team." });
    } catch (err: unknown) {
      toast({ title: "Error", description: err instanceof Error ? err.message : "Failed to lock", variant: "destructive" });
    }
    setLocking(false);
  };

  const handleUnlock = async (teamId: number) => {
    setLocking(true);
    try {
      const res = await fetch(`/api/judges/teams/${teamId}/unlock`, { method: "POST", headers: { Authorization: `Bearer ${token}` } });
      if (!res.ok) { const d = await res.json(); throw new Error(d.message); }
      setLockedTeamId(null);
      setExpandedTeamId(null);
      toast({ title: "Team Unlocked" });
    } catch (err: unknown) {
      toast({ title: "Error", description: err instanceof Error ? err.message : "Failed to unlock", variant: "destructive" });
    }
    setLocking(false);
  };

  const handleDisqualify = async (teamId: number) => {
    setDisqualifying(teamId);
    try {
      const res = await fetch(`/api/judges/teams/${teamId}/disqualify`, { method: "POST", headers: { Authorization: `Bearer ${token}`, "Content-Type": "application/json" } });
      const data = await res.json();
      if (!res.ok) throw new Error(data.message);
      toast({ title: "Team Disqualified", description: "The team has been marked as disqualified." });
      fetchTeams();
    } catch (err: unknown) {
      toast({ title: "Error", description: err instanceof Error ? err.message : "Failed to disqualify", variant: "destructive" });
    }
    setDisqualifying(null);
  };

  const expandTeam = (team: TeamData) => {
    setExpandedTeamId(team.id);
    const init: Record<string, number> = {};
    for (const c of CRITERIA) {
      init[c.key] = (team.judgeScore as Record<string, number | null> | null)?.[c.key] ?? 0;
    }
    setScores(init);
    setFeedback(team.judgeScore?.feedback ?? "");
  };

  const totalScore = CRITERIA.reduce((sum, c) => sum + (scores[c.key] ?? 0), 0);

  const handleSubmit = async (teamId: number) => {
    setSaving(true);
    try {
      const res = await fetch("/api/judges/scores", {
        method: "POST",
        headers: { "Content-Type": "application/json", Authorization: `Bearer ${token}` },
        body: JSON.stringify({ teamId, ...scores, feedback }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.message ?? "Failed to save");
      toast({ title: "Score Submitted!", description: `Total: ${totalScore}/100` });
      setExpandedTeamId(null);
      fetchTeams();
    } catch (err: unknown) {
      toast({ title: "Error", description: err instanceof Error ? err.message : "Failed", variant: "destructive" });
    }
    setSaving(false);
  };

  if (loading) {
    return <div className="flex justify-center py-20 text-muted-foreground"><Activity className="w-5 h-5 animate-spin mr-2" /> Loading teams...</div>;
  }

  const scored = teams.filter((t) => t.judgeScore !== null).length;

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-bold font-mono">Team Scoring</h1>
        <p className="text-sm text-muted-foreground mt-1">{scored}/{teams.length} teams evaluated</p>
      </div>

      {/* Progress */}
      {teams.length > 0 && (
        <div className="h-2 rounded-full bg-muted overflow-hidden">
          <motion.div className="h-full bg-chart-2 rounded-full" initial={{ width: 0 }} animate={{ width: `${(scored / teams.length) * 100}%` }} transition={{ duration: 0.6 }} />
        </div>
      )}

      {/* Lock Banner */}
      {lockedTeamId && (
        <motion.div initial={{ opacity: 0, y: -8 }} animate={{ opacity: 1, y: 0 }}>
          <Card className="border-chart-2/30 bg-chart-2/5">
            <CardContent className="py-3 px-4 flex items-center gap-3">
              <Lock className="w-4 h-4 text-chart-2" />
              <span className="text-sm font-medium flex-1">Currently Evaluating: <strong>{teams.find((t) => t.id === lockedTeamId)?.name}</strong></span>
              <Button size="sm" variant="outline" onClick={() => handleUnlock(lockedTeamId)} disabled={locking}>
                <Unlock className="w-3 h-3 mr-1" /> Unlock
              </Button>
            </CardContent>
          </Card>
        </motion.div>
      )}

      {/* Teams List */}
      <motion.div className="space-y-3" initial="hidden" animate="show" variants={{ hidden: {}, show: { transition: { staggerChildren: 0.04 } } }}>
        {teams.map((team) => {
          const isLocked = lockedTeamId === team.id;
          const isOtherLocked = lockedTeamId !== null && lockedTeamId !== team.id;
          const isExpanded = expandedTeamId === team.id;
          const hasScored = !!team.judgeScore;

          return (
            <motion.div key={team.id} variants={{ hidden: { opacity: 0, y: 10 }, show: { opacity: 1, y: 0 } }}>
              <Card className={`transition-all ${team.isDisqualified ? "border-red-500/30 bg-red-500/5 opacity-60" : hasScored ? "border-chart-3/30 bg-chart-3/5" : isLocked ? "border-chart-2/30" : "border-border"} ${isOtherLocked ? "opacity-50 pointer-events-none" : ""}`}>
                <CardContent className="pt-4 pb-4">
                  <div className="flex items-start justify-between gap-4">
                    <div className="flex-1">
                      <div className="flex items-center gap-2 flex-wrap">
                        <h3 className="font-bold text-lg">{team.name}</h3>
                        {team.isDisqualified && <Badge variant="destructive" className="text-xs"><XCircle className="w-3 h-3 mr-1" /> DISQUALIFIED</Badge>}
                        {hasScored && !team.isDisqualified && (
                          <Badge className="bg-chart-3/20 text-chart-3 border-chart-3/30 font-mono text-xs">
                            <CheckCircle className="w-3 h-3 mr-1" /> {team.judgeScore!.totalScore ?? "—"}/100
                          </Badge>
                        )}
                        {team.domain && <Badge variant="secondary" className="text-xs">{team.domain}</Badge>}
                        {team.isLate && team.minutesLate > 10 && !team.isDisqualified && (
                          <Badge className="bg-amber-500/20 text-amber-400 border-amber-400/30 text-xs">
                            <AlertTriangle className="w-3 h-3 mr-1" /> {team.minutesLate}min late
                          </Badge>
                        )}
                      </div>
                      <p className="text-sm text-muted-foreground mt-0.5">{team.projectTitle}</p>
                      <div className="flex gap-3 mt-2 flex-wrap">
                        {team.githubUrl && <a href={team.githubUrl} target="_blank" rel="noreferrer" className="flex items-center gap-1 text-xs text-muted-foreground hover:text-primary"><Github className="w-3 h-3" /> Repo</a>}
                        {team.demoUrl && <a href={team.demoUrl} target="_blank" rel="noreferrer" className="flex items-center gap-1 text-xs text-muted-foreground hover:text-primary"><Monitor className="w-3 h-3" /> Demo</a>}
                        {team.slidesUrl && <a href={team.slidesUrl} target="_blank" rel="noreferrer" className="flex items-center gap-1 text-xs text-muted-foreground hover:text-primary"><FileText className="w-3 h-3" /> Slides</a>}
                      </div>
                    </div>
                    <div className="flex flex-col gap-2 items-end">
                      {!team.isDisqualified && (
                        <>
                          {!lockedTeamId && (
                            <Button size="sm" variant="outline" onClick={() => handleLock(team.id)} disabled={locking}>
                              <Lock className="w-3 h-3 mr-1" /> Lock
                            </Button>
                          )}
                          {isLocked && (
                            <Button size="sm" onClick={() => expandTeam(team)}>
                              <Star className="w-3 h-3 mr-1" /> {hasScored ? "Re-evaluate" : "Score"}
                            </Button>
                          )}
                        </>
                      )}
                      {team.isLate && team.minutesLate > 10 && !team.isDisqualified && (
                        <Button size="sm" variant="destructive" onClick={() => handleDisqualify(team.id)} disabled={disqualifying === team.id}>
                          <XCircle className="w-3 h-3 mr-1" /> Disqualify
                        </Button>
                      )}
                    </div>
                  </div>

                  {/* Scoring Form */}
                  <AnimatePresence>
                    {isExpanded && isLocked && !team.isDisqualified && (
                      <motion.div initial={{ opacity: 0, height: 0 }} animate={{ opacity: 1, height: "auto" }} exit={{ opacity: 0, height: 0 }} className="overflow-hidden">
                        <div className="pt-4 mt-4 border-t border-border space-y-4">
                          <div className="grid md:grid-cols-2 gap-4">
                            {CRITERIA.map((c) => (
                              <CriterionSlider key={c.key} label={c.label} value={scores[c.key] ?? 0} max={c.max} color={c.color} onChange={(v) => setScores((prev) => ({ ...prev, [c.key]: v }))} />
                            ))}
                          </div>

                          {/* Total Score */}
                          <div className="flex items-center justify-center gap-4 py-3">
                            <div className="text-center">
                              <p className="text-xs text-muted-foreground mb-1">Total Score</p>
                              <p className={`text-4xl font-bold font-mono ${totalScore >= 80 ? "text-chart-3" : totalScore >= 50 ? "text-chart-1" : "text-chart-4"}`}>{totalScore}<span className="text-lg text-muted-foreground">/100</span></p>
                            </div>
                            <div className="w-20 h-20">
                              <svg viewBox="0 0 36 36" className="w-full h-full -rotate-90">
                                <circle cx="18" cy="18" r="15.9" fill="none" stroke="currentColor" strokeWidth="2" className="text-muted" />
                                <circle cx="18" cy="18" r="15.9" fill="none" stroke="currentColor" strokeWidth="2" strokeDasharray={`${totalScore} ${100 - totalScore}`} className="text-chart-2 transition-all duration-300" />
                              </svg>
                            </div>
                          </div>

                          <div>
                            <label className="text-xs text-muted-foreground mb-1 block">Feedback (optional)</label>
                            <Textarea value={feedback} onChange={(e) => setFeedback(e.target.value)} placeholder="Notes for this team..." rows={3} className="bg-background/50 text-sm resize-none" />
                          </div>

                          <div className="flex gap-2 justify-end">
                            <Button variant="ghost" size="sm" onClick={() => setExpandedTeamId(null)}>Cancel</Button>
                            <Button size="sm" onClick={() => handleSubmit(team.id)} disabled={saving} className="bg-chart-2 hover:bg-chart-2/90">
                              <CheckCircle className="w-3 h-3 mr-1" /> {saving ? "Saving..." : "Submit Evaluation"}
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
        })}
      </motion.div>
    </div>
  );
}
