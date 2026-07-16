import { useState, useEffect } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Users, CheckCircle, Clock, Zap, BookOpen, Shield, AlertTriangle, Megaphone } from "lucide-react";
import { motion } from "framer-motion";

interface DashboardData {
  announcements: Array<{ id: number; title: string; content: string; priority: string; createdAt: string }>;
  scoringGuidelines: { criteria: Array<{ key: string; label: string; max: number; weight: number }>; totalPoints: number };
  judgeStats: { assignedTeams: number; completedEvaluations: number; pendingEvaluations: number };
}

const container = { hidden: {}, show: { transition: { staggerChildren: 0.06 } } };
const item = { hidden: { opacity: 0, y: 12 }, show: { opacity: 1, y: 0 } };

export default function JudgeHome({ token }: { token: string }) {
  const [data, setData] = useState<DashboardData | null>(null);
  const [phase, setPhase] = useState<string>("registration");
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    fetch("/api/judges/dashboard", { headers: { Authorization: `Bearer ${token}` } })
      .then((r) => r.json())
      .then(setData)
      .catch(() => {})
      .finally(() => setLoading(false));
    fetch("/api/hackathons/active", { headers: { Authorization: `Bearer ${token}` } })
      .then((r) => r.json())
      .then((d) => { if (d.phase) setPhase(d.phase); })
      .catch(() => {});
  }, [token]);

  if (loading) {
    return <div className="flex justify-center items-center py-20 text-muted-foreground"><Clock className="w-5 h-5 animate-spin mr-2" /> Loading dashboard...</div>;
  }

  const stats = data?.judgeStats ?? { assignedTeams: 0, completedEvaluations: 0, pendingEvaluations: 0 };
  const completionPct = stats.assignedTeams > 0 ? Math.round((stats.completedEvaluations / stats.assignedTeams) * 100) : 0;

  return (
    <motion.div variants={container} initial="hidden" animate="show" className="space-y-8">
      {/* Welcome */}
      <motion.div variants={item}>
        <h1 className="text-3xl font-bold font-mono">Welcome, Judge</h1>
        <p className="text-muted-foreground mt-1">Thank you for evaluating teams at HackAegis. Review the guidelines below before scoring.</p>
      </motion.div>

      {/* Stats Cards */}
      <motion.div variants={item} className="grid grid-cols-2 md:grid-cols-4 gap-4">
        <Card className="border-chart-2/20 bg-chart-2/5">
          <CardContent className="pt-4 pb-4">
            <Users className="w-5 h-5 text-chart-2 mb-2" />
            <p className="text-2xl font-bold font-mono">{stats.assignedTeams}</p>
            <p className="text-xs text-muted-foreground">Assigned Teams</p>
          </CardContent>
        </Card>
        <Card className="border-chart-3/20 bg-chart-3/5">
          <CardContent className="pt-4 pb-4">
            <CheckCircle className="w-5 h-5 text-chart-3 mb-2" />
            <p className="text-2xl font-bold font-mono">{stats.completedEvaluations}</p>
            <p className="text-xs text-muted-foreground">Completed</p>
          </CardContent>
        </Card>
        <Card className="border-chart-1/20 bg-chart-1/5">
          <CardContent className="pt-4 pb-4">
            <Clock className="w-5 h-5 text-chart-1 mb-2" />
            <p className="text-2xl font-bold font-mono">{stats.pendingEvaluations}</p>
            <p className="text-xs text-muted-foreground">Pending</p>
          </CardContent>
        </Card>
        <Card className="border-chart-4/20 bg-chart-4/5">
          <CardContent className="pt-4 pb-4">
            <Zap className="w-5 h-5 text-chart-4 mb-2" />
            <p className="text-2xl font-bold font-mono capitalize">{phase}</p>
            <p className="text-xs text-muted-foreground">Current Phase</p>
          </CardContent>
        </Card>
      </motion.div>

      {/* Scoring Guidelines */}
      <motion.div variants={item}>
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2 text-base"><BookOpen className="w-4 h-4 text-chart-2" /> Scoring Guidelines</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="overflow-x-auto">
              <table className="w-full text-sm">
                <thead>
                  <tr className="border-b border-border">
                    <th className="text-left py-2 text-muted-foreground font-medium">Criteria</th>
                    <th className="text-center py-2 text-muted-foreground font-medium">Max Points</th>
                    <th className="text-center py-2 text-muted-foreground font-medium">Weight</th>
                  </tr>
                </thead>
                <tbody>
                  {(data?.scoringGuidelines.criteria ?? []).map((c) => (
                    <tr key={c.key} className="border-b border-border/50">
                      <td className="py-2">{c.label}</td>
                      <td className="text-center font-mono font-bold">{c.max}</td>
                      <td className="text-center text-muted-foreground">{c.weight}%</td>
                    </tr>
                  ))}
                  <tr className="font-bold">
                    <td className="py-2">Total</td>
                    <td className="text-center font-mono">100</td>
                    <td className="text-center">100%</td>
                  </tr>
                </tbody>
              </table>
            </div>
          </CardContent>
        </Card>
      </motion.div>

      {/* Evaluation Workflow */}
      <motion.div variants={item}>
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2 text-base"><Zap className="w-4 h-4 text-chart-1" /> Evaluation Workflow</CardTitle>
          </CardHeader>
          <CardContent>
            <ol className="space-y-3 text-sm">
              {[
                "Navigate to the Score page from the sidebar",
                "Lock the team you are about to evaluate",
                "Review their submission — GitHub repo, demo link, and slides",
                "Score each of the 7 criteria carefully using the sliders",
                "Add optional written feedback for the team",
                "Submit your evaluation and unlock to move to the next team",
              ].map((step, i) => (
                <li key={i} className="flex gap-3 items-start">
                  <span className="flex-shrink-0 w-6 h-6 rounded-full bg-chart-2/10 text-chart-2 text-xs font-bold flex items-center justify-center">{i + 1}</span>
                  <span className="text-muted-foreground">{step}</span>
                </li>
              ))}
            </ol>
          </CardContent>
        </Card>
      </motion.div>

      {/* Responsibilities & Rules */}
      <motion.div variants={item} className="grid md:grid-cols-2 gap-4">
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2 text-base"><Shield className="w-4 h-4 text-chart-3" /> Responsibilities</CardTitle>
          </CardHeader>
          <CardContent>
            <ul className="space-y-2 text-sm text-muted-foreground">
              <li>• Evaluate all assigned teams fairly and thoroughly</li>
              <li>• Follow the scoring criteria strictly</li>
              <li>• Provide constructive feedback where possible</li>
              <li>• Maintain confidentiality of scores until results are published</li>
              <li>• Report any conflicts of interest immediately</li>
            </ul>
          </CardContent>
        </Card>
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2 text-base"><AlertTriangle className="w-4 h-4 text-chart-1" /> Competition Rules</CardTitle>
          </CardHeader>
          <CardContent>
            <ul className="space-y-2 text-sm text-muted-foreground">
              <li>• Teams are scored on a 100-point scale across 7 criteria</li>
              <li>• Judges evaluate only teams in their assigned domain</li>
              <li>• Teams arriving more than 10 minutes late may be disqualified</li>
              <li>• All scoring decisions are final once submitted</li>
              <li>• Results are revealed only when the admin publishes them</li>
            </ul>
          </CardContent>
        </Card>
      </motion.div>

      {/* Code of Conduct */}
      <motion.div variants={item}>
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2 text-base"><Shield className="w-4 h-4 text-chart-4" /> Code of Conduct</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="grid md:grid-cols-2 gap-4 text-sm text-muted-foreground">
              <div><span className="font-medium text-foreground">Impartiality:</span> Judge all teams equally regardless of personal connections.</div>
              <div><span className="font-medium text-foreground">Confidentiality:</span> Do not share scores or feedback until results are published.</div>
              <div><span className="font-medium text-foreground">Professionalism:</span> Provide fair, constructive, and respectful evaluations.</div>
              <div><span className="font-medium text-foreground">Integrity:</span> Report any conflicts of interest immediately to administrators.</div>
            </div>
          </CardContent>
        </Card>
      </motion.div>

      {/* Event Timeline */}
      <motion.div variants={item}>
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2 text-base"><Clock className="w-4 h-4 text-chart-2" /> Event Timeline</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="relative pl-6 space-y-4">
              {[
                { phase: "registration", label: "Registration", desc: "Teams register and form groups" },
                { phase: "submission", label: "Submissions Open", desc: "Teams submit projects and materials" },
                { phase: "shortlisting", label: "Shortlisting & Review", desc: "Submissions reviewed for eligibility" },
                { phase: "finale", label: "Finals & Judging", desc: "Live presentations and judge evaluations" },
                { phase: "results", label: "Results Announced", desc: "Winners declared and published" },
              ].map((step, i) => {
                const PHASE_ORDER = ["registration", "submission", "shortlisting", "elimination", "finale", "results", "closed"];
                const stepIdx = PHASE_ORDER.indexOf(step.phase);
                const currentIdx = PHASE_ORDER.indexOf(phase);
                const isActive = step.phase === phase || (phase === "elimination" && step.phase === "shortlisting");
                const isPast = currentIdx >= 0 && stepIdx >= 0 && stepIdx < currentIdx;
                return (
                  <div key={i} className="relative">
                    <div className={`absolute -left-6 top-1 w-3 h-3 rounded-full border-2 ${isActive ? "bg-chart-2 border-chart-2" : isPast ? "bg-chart-3 border-chart-3" : "bg-muted border-border"}`} />
                    {i < 4 && <div className={`absolute -left-[17px] top-4 w-0.5 h-full ${isPast || isActive ? "bg-chart-3/50" : "bg-border"}`} />}
                    <div>
                      <p className={`font-medium text-sm ${isActive ? "text-chart-2" : isPast ? "text-chart-3" : "text-muted-foreground"}`}>
                        {step.label} {isActive && <Badge className="ml-2 bg-chart-2/10 text-chart-2 border-chart-2/20 text-xs">CURRENT</Badge>}
                      </p>
                      <p className="text-xs text-muted-foreground">{step.desc}</p>
                    </div>
                  </div>
                );
              })}
            </div>
          </CardContent>
        </Card>
      </motion.div>

      {/* Announcements */}
      <motion.div variants={item}>
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2 text-base"><Megaphone className="w-4 h-4 text-chart-2" /> Announcements</CardTitle>
          </CardHeader>
          <CardContent>
            {data?.announcements && data.announcements.length > 0 ? (
              <div className="space-y-3">
                {data.announcements.map((a) => (
                  <div key={a.id} className="p-3 rounded-lg border border-border bg-muted/30">
                    <div className="flex items-center gap-2">
                      <p className="font-medium text-sm">{a.title}</p>
                      {a.priority === "urgent" && <Badge variant="destructive" className="text-xs">URGENT</Badge>}
                    </div>
                    <p className="text-xs text-muted-foreground mt-1">{a.content}</p>
                    <p className="text-xs text-muted-foreground/50 mt-1">{new Date(a.createdAt).toLocaleString()}</p>
                  </div>
                ))}
              </div>
            ) : (
              <p className="text-sm text-muted-foreground text-center py-4">No announcements at this time.</p>
            )}
          </CardContent>
        </Card>
      </motion.div>
    </motion.div>
  );
}
