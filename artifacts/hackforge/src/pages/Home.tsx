import { useState, useEffect } from "react";
import { useLocation } from "wouter";
import { useGetEventStatus } from "@workspace/api-client-react";
import { useAuthTokens } from "@/lib/auth";
import { setAuthTokenGetter } from "@workspace/api-client-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { useToast } from "@/hooks/use-toast";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { motion } from "framer-motion";
import { Terminal, Users, Trophy, Target, ArrowRight, Activity, CheckCircle2 } from "lucide-react";

const PENDING_ITEMS = [
  "Team registration auth flow",
  "Participant code issuance during registration",
  "Team dashboard binding to logged-in participant",
  "Public registration status screen",
  "Submission lock/unlock state",
];

export default function Home() {
  const [, setLocation] = useLocation();
  const { data: eventStatus } = useGetEventStatus();
  const { setToken, setAdminToken, setJudgeToken, getToken, getAdminToken, getJudgeToken } = useAuthTokens();
  const { toast } = useToast();
  const [code, setCode] = useState("");
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    if (getAdminToken()) { setLocation("/admin"); return; }
    if (getJudgeToken()) { setLocation("/judges"); return; }
    if (getToken()) { setLocation("/watch"); return; }
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
        setAuthTokenGetter(() => localStorage.getItem("hackforge_admin_token"));
        toast({ title: "Admin Access Granted", description: "Welcome, Commander." });
        setLocation("/admin");
      } else if (data.role === "judge") {
        setJudgeToken(data.token);
        setAuthTokenGetter(() => localStorage.getItem("hackforge_judge_token"));
        toast({ title: "Judge Access Granted", description: `Welcome, ${data.label ?? "Judge"}!` });
        setLocation("/judges");
      } else {
        setToken(data.token);
        setAuthTokenGetter(() => localStorage.getItem("hackforge_token"));
        toast({ title: "Access Granted", description: "Welcome to HackForge!" });
        setLocation("/watch");
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

  return (
    <div className="min-h-[calc(100vh-4rem)] bg-background flex flex-col relative overflow-hidden">
      <div className="absolute inset-0 z-0 pointer-events-none opacity-20">
        <div className="absolute top-[-10%] left-[-10%] w-[40%] h-[40%] bg-primary/30 blur-[120px] rounded-full" />
        <div className="absolute bottom-[-10%] right-[-10%] w-[40%] h-[40%] bg-secondary/30 blur-[120px] rounded-full" />
        <div className="absolute top-[40%] left-[60%] w-[30%] h-[30%] bg-chart-3/20 blur-[100px] rounded-full" />
      </div>
      <div className="absolute inset-0 z-0 pointer-events-none bg-[url('data:image/svg+xml;base64,PHN2ZyB4bWxucz0iaHR0cDovL3d3dy53My5vcmcvMjAwMC9zdmciIHdpZHRoPSIyNCIgaGVpZ2h0PSIyNCI+CjxyZWN0IHdpZHRoPSIyNCIgaGVpZ2h0PSIyNCIgZmlsbD0ibm9uZSIvPgo8Y2lyY2xlIGN4PSIxMiIgY3k9IjEyIiByPSIxIiBmaWxsPSJyZ2JhKDI1NSwyNTUsMjU1LDAuMDUpIi8+Cjwvc3ZnPg==')] opacity-50" />

      <div className="container mx-auto px-4 py-12 md:py-24 z-10 flex-1 flex flex-col justify-center">
        <motion.div className="grid lg:grid-cols-2 gap-12 items-center" variants={containerVariants} initial="hidden" animate="show">
          <motion.div className="flex flex-col gap-6" variants={itemVariants}>
            <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-primary/10 border border-primary/20 text-primary text-sm font-medium w-fit">
              <Activity className="w-4 h-4" />
              <span>System Online • {eventStatus?.phase ? eventStatus.phase.toUpperCase() : "AWAITING SIGNAL"}</span>
            </div>
            <h1 className="text-5xl md:text-7xl font-bold tracking-tight">
              {eventStatus?.eventName || "HACKFORGE"}
            </h1>
            <p className="text-xl md:text-2xl text-muted-foreground max-w-xl">
              {eventStatus?.tagline || "Where hackers come to compete and organizers command the stage."}
            </p>
            <div className="grid grid-cols-2 sm:grid-cols-3 gap-4 mt-8">
              <div className="flex flex-col p-4 rounded-lg bg-card border border-border">
                <span className="text-muted-foreground text-sm mb-1 flex items-center gap-2"><Trophy className="w-4 h-4 text-chart-4" /> Prize Pool</span>
                <span className="text-2xl font-bold">₹15,000+</span>
              </div>
              <div className="flex flex-col p-4 rounded-lg bg-card border border-border">
                <span className="text-muted-foreground text-sm mb-1 flex items-center gap-2"><Target className="w-4 h-4 text-chart-1" /> Grand Prize</span>
                <span className="text-xl font-bold">₹7,000</span>
              </div>
              <div className="flex flex-col p-4 rounded-lg bg-card border border-border">
                <span className="text-muted-foreground text-sm mb-1 flex items-center gap-2"><Users className="w-4 h-4 text-chart-3" /> Format</span>
                <span className="text-xl font-bold">Teams</span>
              </div>
            </div>
          </motion.div>

          <motion.div className="w-full max-w-md mx-auto lg:ml-auto" variants={itemVariants}>
            <Card className="border-primary/20 bg-card/50 backdrop-blur shadow-2xl shadow-primary/5">
              <CardHeader className="text-center pb-4">
                <CardTitle className="text-2xl font-mono">INITIALIZE_LINK</CardTitle>
                <CardDescription>Enter your access code to continue</CardDescription>
              </CardHeader>
              <CardContent>
                <form onSubmit={handleLogin} className="space-y-4">
                  <div className="space-y-2 relative">
                    <Input
                      placeholder="HACKFORGE_PART_... / ADMIN / JUDGE"
                      value={code}
                      onChange={(e) => setCode(e.target.value.toUpperCase())}
                      className="font-mono text-center text-base h-14 bg-background/50 border-primary/30 focus-visible:ring-primary uppercase tracking-widest pl-12"
                      autoComplete="off"
                      autoFocus
                    />
                    <Terminal className="absolute left-4 top-4 w-6 h-6 text-muted-foreground" />
                  </div>
                  <Button type="submit" className="w-full h-12 font-bold tracking-wide" size="lg" disabled={loading || !code.trim()}>
                    {loading ? <span className="flex items-center gap-2">CONNECTING <span className="animate-pulse">...</span></span> : <span className="flex items-center gap-2">AUTHENTICATE <ArrowRight className="w-4 h-4" /></span>}
                  </Button>
                </form>
                <div className="mt-6 space-y-2">
                  <p className="text-xs text-muted-foreground text-center font-mono uppercase tracking-wider mb-3">Code Format Guide</p>
                  <div className="grid grid-cols-1 gap-1.5 text-xs font-mono">
                    <div className="flex items-center gap-2 px-3 py-1.5 rounded bg-muted/40"><span className="text-muted-foreground w-20">Participant</span><span className="text-primary/80">HACKFORGE_PART_XXXXXXXX</span></div>
                    <div className="flex items-center gap-2 px-3 py-1.5 rounded bg-muted/40"><span className="text-muted-foreground w-20">Judge</span><span className="text-chart-2/80">HACKFORGE_JUDGE@01</span></div>
                    <div className="flex items-center gap-2 px-3 py-1.5 rounded bg-muted/40"><span className="text-muted-foreground w-20">Admin</span><span className="text-chart-4/80">HACKFORGE_ADMIN@01</span></div>
                  </div>
                </div>
              </CardContent>
            </Card>

            <Card className="mt-6 border-dashed border-primary/20 bg-card/30">
              <CardHeader className="pb-3">
                <CardTitle className="text-sm font-mono flex items-center gap-2"><CheckCircle2 className="w-4 h-4" /> Pending Work</CardTitle>
                <CardDescription>Things still left to finish</CardDescription>
              </CardHeader>
              <CardContent className="space-y-2">
                {PENDING_ITEMS.map((item) => (
                  <div key={item} className="text-sm flex items-center gap-2 text-muted-foreground">
                    <span className="w-1.5 h-1.5 rounded-full bg-primary/70" /> {item}
                  </div>
                ))}
              </CardContent>
            </Card>

            <div className="mt-8">
              <h3 className="text-sm font-semibold text-muted-foreground mb-4 uppercase tracking-wider text-center">Protocol Sequence</h3>
              <div className="flex items-center justify-between px-2">
                {["registration", "submission", "elimination", "finale"].map((phase, i) => (
                  <div key={phase} className="flex items-center gap-0">
                    <div className="flex flex-col items-center gap-2">
                      <div className={`w-8 h-8 rounded-full flex items-center justify-center text-sm ${eventStatus?.phase === phase ? "bg-primary text-primary-foreground shadow-[0_0_15px_rgba(var(--primary),0.5)]" : "bg-muted text-muted-foreground"}`}>
                        {i + 1}
                      </div>
                      <span className="text-xs font-mono">{phase.slice(0, 3).toUpperCase()}</span>
                    </div>
                    {i < 3 && <div className="h-px bg-border w-8 mx-1 mb-5" />}
                  </div>
                ))}
              </div>
            </div>
          </motion.div>
        </motion.div>
      </div>
    </div>
  );
}
