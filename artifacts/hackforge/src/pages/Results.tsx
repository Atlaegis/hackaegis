import { useEffect, useState } from "react";
import { useRoute, useLocation } from "wouter";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Trophy, Medal, Star, Activity, Clock, Zap, CheckCircle2, ExternalLink, Github, Monitor, FileText, ArrowLeft, ChevronRight } from "lucide-react";
import { motion } from "framer-motion";

interface RankedTeam {
  rank: number; teamId: number; teamName: string; projectTitle: string;
  voteCount: number; percentage: number; averageJudgeScore: number | null;
  githubUrl: string | null; demoUrl: string | null; slidesUrl: string | null;
}

interface HackathonSummary {
  id: number; name: string; slug: string; description: string | null;
  tagline: string | null; status: string; phase: string; prizePool: string | null;
  grandPrize: string | null; totalTeams: number; resultsPublished: boolean;
  winner: { teamName: string; projectTitle: string; voteCount: number } | null;
}

interface HackathonDetail {
  hackathon: { id: number; name: string; slug: string; status: string; phase: string; prizePool: string | null; grandPrize: string | null; tagline: string | null };
  isPublished: boolean;
  winner: RankedTeam | null;
  rankedTeams: RankedTeam[];
  totalTeams: number;
  totalJudges: number;
}

const rankIcons = [
  <Trophy key={1} className="w-6 h-6 text-yellow-400" />,
  <Medal key={2} className="w-6 h-6 text-slate-300" />,
  <Star key={3} className="w-6 h-6 text-amber-600" />,
];
const rankColors = ["text-yellow-400", "text-slate-300", "text-amber-600"];

function StatusBadge({ status }: { status: string }) {
  const cfg: Record<string, { label: string; className: string }> = {
    upcoming: { label: "UPCOMING", className: "bg-chart-1/10 text-chart-1 border-chart-1/30" },
    active: { label: "LIVE", className: "bg-chart-3/10 text-chart-3 border-chart-3/30" },
    completed: { label: "COMPLETED", className: "bg-muted/50 text-muted-foreground border-border" },
  };
  const c = cfg[status] ?? cfg.upcoming;
  return <Badge className={`font-mono text-xs ${c.className}`}>{c.label}</Badge>;
}

// ─── All Hackathons List ──────────────────────────────────────────────────────
function HackathonList({ hackathons, onSelect }: { hackathons: HackathonSummary[]; onSelect: (slug: string) => void }) {
  const active = hackathons.filter((h) => h.status === "active");
  const upcoming = hackathons.filter((h) => h.status === "upcoming");
  const completed = hackathons.filter((h) => h.status === "completed");

  const Section = ({ title, items }: { title: string; items: HackathonSummary[] }) => (
    items.length > 0 ? (
      <div className="space-y-3">
        <h2 className="text-sm font-mono text-muted-foreground uppercase tracking-wider">{title}</h2>
        {items.map((h) => (
          <motion.div key={h.id} variants={{ hidden: { opacity: 0, y: 10 }, show: { opacity: 1, y: 0 } }}>
            <Card
              className={`cursor-pointer transition-all hover:border-primary/40 ${h.status === "active" ? "border-chart-3/30 bg-chart-3/5" : ""}`}
              onClick={() => onSelect(h.slug)}
            >
              <CardContent className="py-4 px-5">
                <div className="flex items-start justify-between gap-3">
                  <div className="flex-1">
                    <div className="flex items-center gap-2 mb-1">
                      <h3 className="font-bold">{h.name}</h3>
                      <StatusBadge status={h.status} />
                    </div>
                    {h.tagline && <p className="text-sm text-muted-foreground">{h.tagline}</p>}
                    <div className="flex gap-3 mt-2 text-xs text-muted-foreground flex-wrap">
                      {h.totalTeams > 0 && <span>{h.totalTeams} teams</span>}
                      {h.prizePool && <span>Prize: {h.prizePool}</span>}
                      {h.status === "completed" && h.winner && (
                        <span className="flex items-center gap-1 text-yellow-400">
                          <Trophy className="w-3 h-3" /> {h.winner.teamName}
                        </span>
                      )}
                    </div>
                  </div>
                  <ChevronRight className="w-5 h-5 text-muted-foreground mt-1 flex-shrink-0" />
                </div>
              </CardContent>
            </Card>
          </motion.div>
        ))}
      </div>
    ) : null
  );

  return (
    <motion.div className="space-y-8" initial="hidden" animate="show" variants={{ hidden: {}, show: { transition: { staggerChildren: 0.08 } } }}>
      <Section title="Live Now" items={active} />
      <Section title="Upcoming" items={upcoming} />
      <Section title="Past Events" items={completed} />
    </motion.div>
  );
}

// ─── Single Hackathon Results ─────────────────────────────────────────────────
function HackathonResults({ slug, onBack }: { slug: string; onBack: () => void }) {
  const [data, setData] = useState<HackathonDetail | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    setLoading(true);
    fetch(`/api/results/hackathon/${slug}`)
      .then((r) => r.json())
      .then(setData)
      .catch(() => {})
      .finally(() => setLoading(false));
  }, [slug]);

  if (loading) return (
    <div className="flex items-center justify-center py-20 gap-2 text-muted-foreground">
      <Activity className="w-5 h-5 animate-spin" /><span>Loading results...</span>
    </div>
  );

  if (!data) return <p className="text-center text-muted-foreground py-20">Failed to load results.</p>;

  const { hackathon, isPublished, rankedTeams } = data;

  return (
    <div className="space-y-8">
      <div className="flex items-start gap-4">
        <Button variant="ghost" size="sm" onClick={onBack} className="mt-1 gap-1 text-muted-foreground">
          <ArrowLeft className="w-4 h-4" /> All Events
        </Button>
        <div className="flex-1">
          <div className="flex items-center gap-3 mb-1">
            <h1 className="text-3xl font-bold font-mono">{hackathon.name}</h1>
            <StatusBadge status={hackathon.status} />
          </div>
          {hackathon.tagline && <p className="text-muted-foreground">{hackathon.tagline}</p>}
          <div className="flex gap-3 mt-2 text-sm flex-wrap">
            {hackathon.prizePool && <span className="text-muted-foreground">Pool: <strong>{hackathon.prizePool}</strong></span>}
            {hackathon.grandPrize && <span className="text-muted-foreground">Grand: <strong>{hackathon.grandPrize}</strong></span>}
            <span className="text-muted-foreground">{data.totalTeams} teams • {data.totalJudges} judges</span>
          </div>
        </div>
      </div>

      {!isPublished ? (
        <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} className="flex flex-col items-center justify-center py-20 gap-4">
          <div className="relative">
            <Trophy className="w-20 h-20 text-muted-foreground/20" />
            <div className="absolute inset-0 flex items-center justify-center">
              <div className="w-6 h-6 rounded-full bg-amber-500/80 animate-pulse" />
            </div>
          </div>
          <p className="font-mono text-xl text-muted-foreground">RESULTS PENDING</p>
          <p className="text-sm text-muted-foreground/60 text-center max-w-xs">
            {hackathon.status === "active" ? "The event is in progress. Results will be published when complete." : "Results will be announced soon."}
          </p>
        </motion.div>
      ) : (
        <motion.div className="space-y-4" initial="hidden" animate="show" variants={{ hidden: {}, show: { transition: { staggerChildren: 0.1 } } }}>
          {rankedTeams.map((team) => {
            const idx = team.rank - 1;
            return (
              <motion.div key={team.teamId} variants={{ hidden: { opacity: 0, y: 20 }, show: { opacity: 1, y: 0 } }}>
                <Card className={`relative overflow-hidden border ${idx === 0 ? "border-yellow-400/40 bg-yellow-400/5" : idx === 1 ? "border-slate-300/30 bg-slate-300/5" : idx === 2 ? "border-amber-600/30 bg-amber-600/5" : "border-border"}`}>
                  <CardContent className="py-4 px-5">
                    <div className="flex items-center gap-4">
                      <div className="flex-shrink-0 w-10 text-center">
                        {idx < 3 ? rankIcons[idx] : <span className="text-xl font-bold font-mono text-muted-foreground">#{team.rank}</span>}
                      </div>
                      <div className="flex-1 min-w-0">
                        <div className="flex items-center gap-2 flex-wrap">
                          <span className={`font-bold text-lg ${idx < 3 ? rankColors[idx] : ""}`}>{team.teamName}</span>
                          <Badge variant="secondary" className="text-xs font-normal">{team.projectTitle}</Badge>
                        </div>
                        <div className="flex gap-3 mt-1">
                          {team.githubUrl && <a href={team.githubUrl} target="_blank" rel="noreferrer" className="flex items-center gap-1 text-xs text-muted-foreground hover:text-primary"><Github className="w-3 h-3" /> Repo</a>}
                          {team.demoUrl && <a href={team.demoUrl} target="_blank" rel="noreferrer" className="flex items-center gap-1 text-xs text-muted-foreground hover:text-primary"><Monitor className="w-3 h-3" /> Demo</a>}
                          {team.slidesUrl && <a href={team.slidesUrl} target="_blank" rel="noreferrer" className="flex items-center gap-1 text-xs text-muted-foreground hover:text-primary"><FileText className="w-3 h-3" /> Slides</a>}
                        </div>
                      </div>
                      <div className="text-right flex-shrink-0 space-y-1">
                        <p className="text-2xl font-bold font-mono text-primary">{team.voteCount}</p>
                        <p className="text-xs text-muted-foreground">votes ({team.percentage}%)</p>
                        {team.averageJudgeScore !== null && (
                          <p className="text-xs text-chart-2 font-mono">⚖ {team.averageJudgeScore}/10</p>
                        )}
                      </div>
                    </div>
                  </CardContent>
                </Card>
              </motion.div>
            );
          })}
        </motion.div>
      )}
    </div>
  );
}

// ─── Main Results Page ────────────────────────────────────────────────────────
export default function Results() {
  const [, setLocation] = useLocation();
  const [matchSlug, params] = useRoute("/results/:slug");
  const [hackathons, setHackathons] = useState<HackathonSummary[]>([]);
  const [loading, setLoading] = useState(true);

  const slug = matchSlug ? (params as { slug: string }).slug : null;

  useEffect(() => {
    fetch("/api/results/hackathons")
      .then((r) => r.json())
      .then((data) => { if (Array.isArray(data)) setHackathons(data); })
      .catch(() => {})
      .finally(() => setLoading(false));
  }, []);

  return (
    <div className="min-h-[calc(100vh-4rem)] bg-background py-10">
      <div className="container mx-auto px-4 max-w-3xl space-y-8">
        {!slug && (
          <motion.div className="text-center space-y-2" initial={{ opacity: 0, y: -20 }} animate={{ opacity: 1, y: 0 }}>
            <div className="flex items-center justify-center gap-3 mb-4">
              <Trophy className="w-8 h-8 text-primary" />
              <h1 className="text-4xl font-bold tracking-tight font-mono">HACKATHONS</h1>
            </div>
            <p className="text-muted-foreground">All HackAegis events — past, present, and future.</p>
          </motion.div>
        )}

        {loading ? (
          <div className="flex items-center justify-center py-20 gap-2 text-muted-foreground">
            <Activity className="w-5 h-5 animate-spin" /><span>Loading...</span>
          </div>
        ) : slug ? (
          <HackathonResults slug={slug} onBack={() => setLocation("/results")} />
        ) : (
          <HackathonList hackathons={hackathons} onSelect={(s) => setLocation(`/results/${s}`)} />
        )}
      </div>
    </div>
  );
}
