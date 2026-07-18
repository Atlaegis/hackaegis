import { useState, useEffect } from "react";
import { useLocation } from "wouter";
import { useGetEventStatus } from "@workspace/api-client-react";
import { useAuthTokens } from "@/lib/auth";
import { setAuthTokenGetter } from "@workspace/api-client-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { useToast } from "@/hooks/use-toast";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { motion } from "framer-motion";
import { Terminal, Users, Trophy, Target, ArrowRight, Activity, CheckCircle2, Zap, UserPlus, KeyRound } from "lucide-react";

interface Hackathon {
  id: number; name: string; slug: string; description: string | null;
  tagline: string | null; status: string; phase: string; prizePool: string | null;
  grandPrize: string | null; totalTeams: number; winner: { teamName: string; projectTitle: string; voteCount: number } | null;
  resultsPublished: boolean;
}

export default function Home() {
  const [, setLocation] = useLocation();
  const { data: eventStatus } = useGetEventStatus();
  const { setToken, setAdminToken, setJudgeToken, getToken, getAdminToken, getJudgeToken } = useAuthTokens();
  const { toast } = useToast();
  const [code, setCode] = useState("");
  const [loading, setLoading] = useState(false);
  const [hackathons, setHackathons] = useState<Hackathon[]>([]);

  useEffect(() => {
    if (getAdminToken()) { setLocation("/admin"); return; }
    if (getJudgeToken()) { setLocation("/judges"); return; }
    if (getToken()) { setLocation("/candidate"); return; }
  }, []);

  useEffect(() => {
    fetch("/api/results/hackathons")
      .then((r) => r.json())
      .then((data) => { if (Array.isArray(data)) setHackathons(data); })
      .catch(() => {});
  }, []);

  const handleLogin = async (e: React.FormEvent) => {
    e.preventDefault();
    const trimmed = code.trim().toUpperCase();
    if (!trimmed) return;
    setLoading(true);
    try {
      const res = await fetch("/api/auth/login", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ code: trimmed }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.message ?? "Invalid code");

      if (data.role === "admin") {
        setAdminToken(data.token);
        setAuthTokenGetter(() => localStorage.getItem("hackaegis_admin_token"));
        toast({ title: "Admin Access Granted", description: "Welcome, Commander." });
        setLocation("/admin");
      } else if (data.role === "judge") {
        setJudgeToken(data.token);
        setAuthTokenGetter(() => localStorage.getItem("hackaegis_judge_token"));
        toast({ title: "Judge Access Granted", description: `Welcome, ${data.label ?? "Judge"}!` });
        setLocation("/judges");
      } else {
        setToken(data.token);
        setAuthTokenGetter(() => localStorage.getItem("hackaegis_token"));
        const teamMsg = data.team ? `Team: ${data.team.name}` : "Welcome to HackAegis!";
        toast({ title: "Access Granted", description: teamMsg });
        setLocation("/candidate");
      }
    } catch (err: unknown) {
      toast({
        title: "Access Denied",
        description: err instanceof Error ? err.message : "Invalid code. Check and try again.",
        variant: "destructive",
      });
    } finally {
      setLoading(false);
    }
  };

  const containerVariants = { hidden: { opacity: 0 }, show: { opacity: 1, transition: { staggerChildren: 0.1 } } };
  const itemVariants = { hidden: { opacity: 0, y: 20 }, show: { opacity: 1, y: 0 } };

  const activeHackathon = hackathons.find((h) => h.status === "active");
  const upcomingHackathons = hackathons.filter((h) => h.status === "upcoming");
  const pastHackathons = hackathons.filter((h) => h.status === "completed");

  return (
    <div className="min-h-[calc(100vh-4rem)] bg-background flex flex-col relative overflow-hidden">
      <div className="absolute inset-0 z-0 pointer-events-none opacity-20">
        <div className="absolute top-[-10%] left-[-10%] w-[40%] h-[40%] bg-primary/30 blur-[120px] rounded-full" />
        <div className="absolute bottom-[-10%] right-[-10%] w-[40%] h-[40%] bg-secondary/30 blur-[120px] rounded-full" />
        <div className="absolute top-[40%] left-[60%] w-[30%] h-[30%] bg-chart-3/20 blur-[100px] rounded-full" />
      </div>

      <div className="container mx-auto px-4 py-12 md:py-20 z-10 flex-1">
        <motion.div className="grid lg:grid-cols-2 gap-12 items-start" variants={containerVariants} initial="hidden" animate="show">
          <motion.div className="flex flex-col gap-8" variants={itemVariants}>
            <div>
              <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-primary/10 border border-primary/20 text-primary text-sm font-medium w-fit mb-4 lift-hover">
                <Activity className="w-4 h-4" />
                <span>System Online • {eventStatus?.phase ? eventStatus.phase.toUpperCase() : "AWAITING SIGNAL"}</span>
              </div>
              <h1 className="text-5xl md:text-6xl font-bold tracking-tight mb-3 font-display">
                {activeHackathon?.name ?? eventStatus?.eventName ?? "HACKAEGIS"}
              </h1>
              <p className="text-lg text-muted-foreground max-w-xl">
                {activeHackathon?.tagline ?? eventStatus?.tagline ?? "Where hackers come to compete and organizers command the stage."}
              </p>
              {activeHackathon && (
                <div className="flex gap-3 mt-4 flex-wrap">
                  {activeHackathon.prizePool && <div className="flex items-center gap-2 px-3 py-1.5 rounded-lg bg-card border border-border text-sm lift-hover"><Trophy className="w-4 h-4 text-chart-4" /><span className="font-semibold">{activeHackathon.prizePool} Prize Pool</span></div>}
                  {activeHackathon.grandPrize && <div className="flex items-center gap-2 px-3 py-1.5 rounded-lg bg-card border border-border text-sm lift-hover"><Target className="w-4 h-4 text-chart-1" /><span className="font-semibold">{activeHackathon.grandPrize} Grand Prize</span></div>}
                  <div className="flex items-center gap-2 px-3 py-1.5 rounded-lg bg-card border border-border text-sm lift-hover"><Users className="w-4 h-4 text-chart-3" /><span className="font-semibold">{activeHackathon.totalTeams} Teams</span></div>
                </div>
              )}
            </div>

            {upcomingHackathons.length > 0 && <div><h3 className="text-sm font-semibold text-muted-foreground uppercase tracking-wider mb-3">Upcoming</h3><div className="space-y-2">{upcomingHackathons.map((h) => (<Card key={h.id} className="border-chart-1/20 bg-chart-1/5 lift-hover"><CardContent className="py-3 px-4 flex items-center justify-between"><div><p className="font-semibold text-sm">{h.name}</p>{h.tagline && <p className="text-xs text-muted-foreground">{h.tagline}</p>}</div><Badge className="text-chart-1 border-chart-1/30 bg-chart-1/10 font-mono text-xs">UPCOMING</Badge></CardContent></Card>))}</div></div>}

            {pastHackathons.length > 0 && <div><h3 className="text-sm font-semibold text-muted-foreground uppercase tracking-wider mb-3">Past Events</h3><div className="space-y-2">{pastHackathons.map((h) => (<Card key={h.id} className="cursor-pointer lift-hover" onClick={() => setLocation(`/results/${h.slug}`)}><CardContent className="py-3 px-4"><div className="flex items-center justify-between"><div><p className="font-semibold text-sm">{h.name}</p>{h.winner && <p className="text-xs text-muted-foreground flex items-center gap-1 mt-0.5"><Trophy className="w-3 h-3 text-yellow-400" />Winner: {h.winner.teamName}</p>}</div><div className="flex items-center gap-2"><Badge variant="secondary" className="font-mono text-xs">COMPLETED</Badge>{h.resultsPublished && <ArrowRight className="w-3 h-3 text-muted-foreground" />}</div></div></CardContent></Card>))}</div></div>}
          </motion.div>

          <motion.div className="w-full max-w-md mx-auto lg:ml-auto" variants={itemVariants}>
            <Card className="border-primary/20 bg-card/50 backdrop-blur shadow-2xl shadow-primary/5 lift-hover glass-card">
              <Tabs defaultValue="login">
                <CardHeader className="pb-0">
                  <TabsList className="grid grid-cols-2 w-full">
                    <TabsTrigger value="login" className="gap-1.5"><KeyRound className="w-3.5 h-3.5" /> Login</TabsTrigger>
                    <TabsTrigger value="register" className="gap-1.5"><UserPlus className="w-3.5 h-3.5" /> Register</TabsTrigger>
                  </TabsList>
                </CardHeader>
                <TabsContent value="login">
                  <CardHeader className="text-center pb-4 pt-4">
                    <CardTitle className="text-2xl font-mono">INITIALIZE_LINK</CardTitle>
                    <CardDescription>Enter your access code to continue</CardDescription>
                  </CardHeader>
                  <CardContent>
                    <form onSubmit={handleLogin} className="space-y-4">
                      <div className="space-y-2 relative">
                        <Input placeholder="HACKAEGIS_PART_... / ADMIN / JUDGE" value={code} onChange={(e) => setCode(e.target.value.toUpperCase())} className="font-mono text-center text-sm h-14 bg-background/50 border-primary/30 focus-visible:ring-primary uppercase tracking-widest pl-12" autoComplete="off" autoFocus />
                        <Terminal className="absolute left-4 top-4 w-6 h-6 text-muted-foreground" />
                      </div>
                      <Button type="submit" className="w-full h-12 font-bold tracking-wide hover:-translate-y-0.5 transition-transform duration-300" size="lg" disabled={loading || !code.trim()}>
                        {loading ? <span className="flex items-center gap-2">CONNECTING <span className="animate-pulse">...</span></span> : <span className="flex items-center gap-2">AUTHENTICATE <ArrowRight className="w-4 h-4" /></span>}
                      </Button>
                    </form>
                    <div className="mt-5 space-y-2">
                      <p className="text-xs text-muted-foreground text-center font-mono uppercase tracking-wider mb-3">Code Format Guide</p>
                      <div className="grid grid-cols-1 gap-1.5 text-xs font-mono">
                        <div className="flex items-center gap-2 px-3 py-1.5 rounded bg-muted/40"><span className="text-muted-foreground w-20">Participant</span><span className="text-primary/80">HACKAEGIS_PART_XXXXXXXXXX</span></div>
                        <div className="flex items-center gap-2 px-3 py-1.5 rounded bg-muted/40"><span className="text-muted-foreground w-20">Judge</span><span className="text-chart-2/80">HACKAEGIS_JUDGE_XXXXXX</span></div>
                        <div className="flex items-center gap-2 px-3 py-1.5 rounded bg-muted/40"><span className="text-muted-foreground w-20">Admin</span><span className="text-chart-4/80">Ask your event admin</span></div>
                      </div>
                      <p className="text-center text-xs text-muted-foreground pt-1">No code yet? <button className="text-primary hover:underline font-medium" onClick={() => {}}>Switch to Register tab</button></p>
                    </div>
                  </CardContent>
                </TabsContent>
                <TabsContent value="register">
                  <CardHeader className="text-center pb-4 pt-4">
                    <CardTitle className="text-2xl font-mono">JOIN_HACKATHON</CardTitle>
                    <CardDescription>Register your team to participate</CardDescription>
                  </CardHeader>
                  <CardContent className="space-y-4">
                    <div className="space-y-3">
                      <div className="flex items-start gap-3 p-3 rounded-lg bg-muted/30 lift-hover"><div className="w-6 h-6 rounded-full bg-primary/20 flex items-center justify-center flex-shrink-0 mt-0.5"><span className="text-primary text-xs font-bold">1</span></div><div><p className="text-sm font-semibold">Fill Registration Form</p><p className="text-xs text-muted-foreground">Name, team info &amp; member details</p></div></div>
                      <div className="flex items-start gap-3 p-3 rounded-lg bg-muted/30 lift-hover"><div className="w-6 h-6 rounded-full bg-primary/20 flex items-center justify-center flex-shrink-0 mt-0.5"><span className="text-primary text-xs font-bold">2</span></div><div><p className="text-sm font-semibold">Admin Approval</p><p className="text-xs text-muted-foreground">Admin reviews and approves your registration</p></div></div>
                      <div className="flex items-start gap-3 p-3 rounded-lg bg-muted/30 lift-hover"><div className="w-6 h-6 rounded-full bg-primary/20 flex items-center justify-center flex-shrink-0 mt-0.5"><span className="text-primary text-xs font-bold">3</span></div><div><p className="text-sm font-semibold">Get Your Access Code</p><p className="text-xs text-muted-foreground">Receive <span className="font-mono text-primary text-[11px]">HACKAEGIS_PART_XXXXXXXXXX</span> via email</p></div></div>
                    </div>
                    {activeHackathon && <div className="p-3 rounded-lg border border-chart-3/20 bg-chart-3/5 lift-hover"><div className="flex items-center gap-2"><Zap className="w-4 h-4 text-chart-3" /><p className="text-sm font-semibold text-chart-3">{activeHackathon.name} is LIVE</p></div>{activeHackathon.prizePool && <p className="text-xs text-muted-foreground mt-1">Prize Pool: {activeHackathon.prizePool}</p>}</div>}
                    <Button className="w-full h-12 font-bold gap-2 hover:-translate-y-0.5 transition-transform duration-300" onClick={() => setLocation("/register")}>
                      <UserPlus className="w-4 h-4" /> Register Now
                      <ArrowRight className="w-4 h-4" />
                    </Button>
                    <p className="text-center text-xs text-muted-foreground">Already registered? <button className="text-primary hover:underline font-medium" onClick={() => { const el = document.querySelector('[data-value="login"]') as HTMLElement; el?.click(); }}>Login with your code</button></p>
                  </CardContent>
                </TabsContent>
              </Tabs>
            </Card>
            <div className="mt-8">
              <h3 className="text-sm font-semibold text-muted-foreground mb-4 uppercase tracking-wider text-center">Protocol Sequence</h3>
              <div className="flex items-center justify-between px-2">
                {["registration", "submission", "elimination", "finale"].map((phase, i) => {
                  const currentPhase = activeHackathon?.phase ?? eventStatus?.phase;
                  const isActive = currentPhase === phase;
                  return (
                    <div key={phase} className="flex items-center gap-0">
                      <div className="flex flex-col items-center gap-2">
                        <div className={`w-8 h-8 rounded-full flex items-center justify-center text-sm transition-all ${isActive ? "bg-primary text-primary-foreground shadow-[0_0_15px_rgba(var(--primary),0.5)]" : "bg-muted text-muted-foreground"}`}>{isActive ? <CheckCircle2 className="w-4 h-4" /> : i + 1}</div>
                        <span className="text-xs font-mono">{phase.slice(0, 3).toUpperCase()}</span>
                      </div>
                      {i < 3 && <div className="h-px bg-border w-8 mx-1 mb-5" />}
                    </div>
                  );
                })}
              </div>
            </div>
          </motion.div>
        </motion.div>
      </div>
    </div>
  );
}
