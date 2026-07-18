import { useState, useEffect } from "react";
import { Link } from "wouter";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import {
  Home, Upload, Tv, Trophy, Users, Clock, Megaphone, Zap,
  ArrowRight, Calendar, CheckCircle, Circle
} from "lucide-react";
import { motion } from "framer-motion";

interface Team {
  id: number;
  name: string;
  projectTitle: string;
  description: string | null;
  githubUrl: string | null;
  hackathonId: number | null;
  isFinalist: boolean;
  memberCount?: number;
}

interface ActiveHackathon {
  id: number;
  phase: string;
  submissionDeadline?: string;
  finaleDate?: string;
  name?: string;
}

interface Announcement {
  id: number;
  title: string;
  content: string;
  priority: string;
  createdAt: string;
}

const container = { hidden: {}, show: { transition: { staggerChildren: 0.06 } } };
const item = { hidden: { opacity: 0, y: 12 }, show: { opacity: 1, y: 0 } };

const PHASES = [
  { key: "registration", label: "Registration" },
  { key: "submission", label: "Submission" },
  { key: "shortlisting", label: "Review" },
  { key: "finale", label: "Finals" },
  { key: "results", label: "Results" },
];

const PHASE_ORDER = ["registration", "submission", "shortlisting", "elimination", "finale", "results", "closed"];

function CountdownTimer({ deadline }: { deadline: string }) {
  const [timeLeft, setTimeLeft] = useState("");

  useEffect(() => {
    const calc = () => {
      const now = new Date().getTime();
      const target = new Date(deadline).getTime();
      const diff = target - now;

      if (diff <= 0) {
        setTimeLeft("Deadline passed");
        return;
      }

      const days = Math.floor(diff / (1000 * 60 * 60 * 24));
      const hours = Math.floor((diff % (1000 * 60 * 60 * 24)) / (1000 * 60 * 60));
      const minutes = Math.floor((diff % (1000 * 60 * 60)) / (1000 * 60));
      const seconds = Math.floor((diff % (1000 * 60)) / 1000);

      if (days > 0) {
        setTimeLeft(`${days}d ${hours}h ${minutes}m`);
      } else {
        setTimeLeft(`${hours}h ${minutes}m ${seconds}s`);
      }
    };

    calc();
    const interval = setInterval(calc, 1000);
    return () => clearInterval(interval);
  }, [deadline]);

  return (
    <span className="font-mono text-2xl font-bold text-chart-4">{timeLeft}</span>
  );
}

export default function CandidateHome({ token, team }: { token: string; team: Team | null }) {
  const [hackathon, setHackathon] = useState<ActiveHackathon | null>(null);
  const [announcements, setAnnouncements] = useState<Announcement[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const headers = { Authorization: `Bearer ${token}` };

    Promise.all([
      fetch("/api/hackathons/active", { headers }).then((r) => r.json()).catch(() => null),
      fetch("/api/cms/announcements", { headers }).then((r) => r.json()).catch(() => []),
    ]).then(([hackData, annData]) => {
      if (hackData?.id) setHackathon(hackData);
      if (Array.isArray(annData)) setAnnouncements(annData.slice(0, 3));
    }).finally(() => setLoading(false));
  }, [token]);

  if (loading) {
    return (
      <div className="flex justify-center items-center py-20 text-muted-foreground">
        <Clock className="w-5 h-5 animate-spin mr-2" /> Loading dashboard...
      </div>
    );
  }

  const currentPhase = hackathon?.phase ?? "registration";
  const currentPhaseIdx = PHASE_ORDER.indexOf(currentPhase);

  const nextDeadline = hackathon?.submissionDeadline ?? hackathon?.finaleDate;

  return (
    <motion.div variants={container} initial="hidden" animate="show" className="space-y-8">
      {/* Welcome Banner */}
      <motion.div variants={item}>
        <Card className="border-chart-4/30 bg-gradient-to-r from-chart-4/5 to-transparent">
          <CardContent className="py-6">
            <div className="flex items-center justify-between">
              <div>
                <h1 className="text-3xl font-bold font-mono">
                  Welcome{team ? `, ${team.name}` : " back"}
                </h1>
                <p className="text-muted-foreground mt-1">
                  Your hackathon command center. Track progress, submit projects, and stay updated.
                </p>
                <div className="flex items-center gap-3 mt-3">
                  {team && (
                    <Badge className="bg-chart-4/10 text-chart-4 border-chart-4/20 text-xs">
                      Team ID: {team.id}
                    </Badge>
                  )}
                  <Badge className="bg-primary/10 text-primary border-primary/20 text-xs capitalize">
                    {currentPhase} Phase
                  </Badge>
                  {team?.isFinalist && (
                    <Badge className="bg-yellow-400/10 text-yellow-400 border-yellow-400/30 text-xs">
                      FINALIST
                    </Badge>
                  )}
                </div>
              </div>
              <div className="hidden md:block">
                <div className="bg-chart-4/10 p-4 rounded-full border border-chart-4/20">
                  <Home className="w-8 h-8 text-chart-4" />
                </div>
              </div>
            </div>
          </CardContent>
        </Card>
      </motion.div>

      {/* Stage Progress Tracker */}
      <motion.div variants={item}>
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2 text-base">
              <Zap className="w-4 h-4 text-chart-4" /> Stage Progress
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="flex items-center justify-between relative">
              {/* Progress line */}
              <div className="absolute top-4 left-0 right-0 h-0.5 bg-border" />
              <div
                className="absolute top-4 left-0 h-0.5 bg-chart-4 transition-all"
                style={{
                  width: `${Math.min(100, (Math.max(0, PHASES.findIndex(p => p.key === currentPhase)) / (PHASES.length - 1)) * 100)}%`,
                }}
              />

              {PHASES.map((phase, i) => {
                const phaseIdx = PHASE_ORDER.indexOf(phase.key);
                const isActive = phase.key === currentPhase || (currentPhase === "elimination" && phase.key === "shortlisting");
                const isPast = currentPhaseIdx >= 0 && phaseIdx >= 0 && phaseIdx < currentPhaseIdx;

                return (
                  <div key={phase.key} className="relative flex flex-col items-center z-10">
                    <div
                      className={`w-8 h-8 rounded-full flex items-center justify-center border-2 transition-colors ${
                        isActive
                          ? "bg-chart-4 border-chart-4 text-white"
                          : isPast
                          ? "bg-chart-4/20 border-chart-4 text-chart-4"
                          : "bg-background border-border text-muted-foreground"
                      }`}
                    >
                      {isPast ? (
                        <CheckCircle className="w-4 h-4" />
                      ) : isActive ? (
                        <Circle className="w-3 h-3 fill-current" />
                      ) : (
                        <span className="text-xs font-mono">{i + 1}</span>
                      )}
                    </div>
                    <span
                      className={`text-xs mt-2 font-medium text-center ${
                        isActive ? "text-chart-4" : isPast ? "text-chart-4/70" : "text-muted-foreground"
                      }`}
                    >
                      {phase.label}
                    </span>
                  </div>
                );
              })}
            </div>
          </CardContent>
        </Card>
      </motion.div>

      {/* Countdown + Quick Stats */}
      <motion.div variants={item} className="grid grid-cols-1 md:grid-cols-3 gap-4">
        {/* Countdown Timer */}
        <Card className="md:col-span-2 border-chart-4/20">
          <CardContent className="py-6">
            <div className="flex items-center gap-4">
              <div className="bg-chart-4/10 p-3 rounded-lg border border-chart-4/20">
                <Clock className="w-6 h-6 text-chart-4" />
              </div>
              <div>
                <p className="text-xs text-muted-foreground uppercase font-mono tracking-wider">Next Deadline</p>
                {nextDeadline ? (
                  <CountdownTimer deadline={nextDeadline} />
                ) : (
                  <span className="font-mono text-lg text-muted-foreground">No upcoming deadline</span>
                )}
                {nextDeadline && (
                  <p className="text-xs text-muted-foreground mt-1">
                    <Calendar className="w-3 h-3 inline mr-1" />
                    {new Date(nextDeadline).toLocaleDateString(undefined, {
                      weekday: "long",
                      year: "numeric",
                      month: "long",
                      day: "numeric",
                      hour: "2-digit",
                      minute: "2-digit",
                    })}
                  </p>
                )}
              </div>
            </div>
          </CardContent>
        </Card>

        {/* Team Summary */}
        <Card>
          <CardContent className="py-6">
            <div className="flex items-center gap-3">
              <div className="bg-chart-4/10 p-2 rounded-lg border border-chart-4/20">
                <Users className="w-5 h-5 text-chart-4" />
              </div>
              <div>
                <p className="text-xs text-muted-foreground">Team Members</p>
                <p className="text-2xl font-bold font-mono">{team?.memberCount ?? "--"}</p>
              </div>
            </div>
            {team?.projectTitle && (
              <div className="mt-3 pt-3 border-t border-border">
                <p className="text-xs text-muted-foreground">Project</p>
                <p className="text-sm font-medium truncate">{team.projectTitle}</p>
              </div>
            )}
          </CardContent>
        </Card>
      </motion.div>

      {/* Quick Actions */}
      <motion.div variants={item}>
        <h2 className="text-sm font-mono text-muted-foreground uppercase tracking-wider mb-3">Quick Actions</h2>
        <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
          <Link href="/candidate/submissions">
            <Card className="cursor-pointer hover:border-chart-4/40 transition-colors group">
              <CardContent className="py-5 flex items-center gap-3">
                <div className="bg-chart-4/10 p-2 rounded-lg border border-chart-4/20 group-hover:bg-chart-4/20 transition-colors">
                  <Upload className="w-5 h-5 text-chart-4" />
                </div>
                <div className="flex-1">
                  <p className="font-medium text-sm">Submit Project</p>
                  <p className="text-xs text-muted-foreground">Upload your work</p>
                </div>
                <ArrowRight className="w-4 h-4 text-muted-foreground group-hover:text-chart-4 transition-colors" />
              </CardContent>
            </Card>
          </Link>

          <Link href="/candidate/live">
            <Card className="cursor-pointer hover:border-chart-4/40 transition-colors group">
              <CardContent className="py-5 flex items-center gap-3">
                <div className="bg-chart-4/10 p-2 rounded-lg border border-chart-4/20 group-hover:bg-chart-4/20 transition-colors">
                  <Tv className="w-5 h-5 text-chart-4" />
                </div>
                <div className="flex-1">
                  <p className="font-medium text-sm">Join Live</p>
                  <p className="text-xs text-muted-foreground">Watch stream</p>
                </div>
                <ArrowRight className="w-4 h-4 text-muted-foreground group-hover:text-chart-4 transition-colors" />
              </CardContent>
            </Card>
          </Link>

          <Link href="/candidate/results">
            <Card className="cursor-pointer hover:border-chart-4/40 transition-colors group">
              <CardContent className="py-5 flex items-center gap-3">
                <div className="bg-chart-4/10 p-2 rounded-lg border border-chart-4/20 group-hover:bg-chart-4/20 transition-colors">
                  <Trophy className="w-5 h-5 text-chart-4" />
                </div>
                <div className="flex-1">
                  <p className="font-medium text-sm">View Results</p>
                  <p className="text-xs text-muted-foreground">Check standings</p>
                </div>
                <ArrowRight className="w-4 h-4 text-muted-foreground group-hover:text-chart-4 transition-colors" />
              </CardContent>
            </Card>
          </Link>
        </div>
      </motion.div>

      {/* Announcements */}
      <motion.div variants={item}>
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2 text-base">
              <Megaphone className="w-4 h-4 text-chart-4" /> Latest Announcements
            </CardTitle>
          </CardHeader>
          <CardContent>
            {announcements.length > 0 ? (
              <div className="space-y-3">
                {announcements.map((a) => (
                  <div key={a.id} className="p-3 rounded-lg border border-border bg-muted/30">
                    <div className="flex items-center gap-2">
                      <p className="font-medium text-sm">{a.title}</p>
                      {a.priority === "urgent" && (
                        <Badge variant="destructive" className="text-xs">URGENT</Badge>
                      )}
                    </div>
                    <p className="text-xs text-muted-foreground mt-1">{a.content}</p>
                    <p className="text-xs text-muted-foreground/50 mt-1">
                      {new Date(a.createdAt).toLocaleString()}
                    </p>
                  </div>
                ))}
              </div>
            ) : (
              <p className="text-sm text-muted-foreground text-center py-4">
                No announcements at this time.
              </p>
            )}
          </CardContent>
        </Card>
      </motion.div>
    </motion.div>
  );
}
