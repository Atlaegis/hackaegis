import { useState, useEffect } from "react";
import { Link, useLocation } from "wouter";
import { useGetEventStatus, useVerifyParticipationCode } from "@workspace/api-client-react";
import { useAuthTokens } from "@/lib/auth";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { useToast } from "@/hooks/use-toast";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { motion } from "framer-motion";
import { Terminal, Users, Trophy, Target, ArrowRight, Activity, Clock } from "lucide-react";

export default function Home() {
  const [, setLocation] = useLocation();
  const { data: eventStatus } = useGetEventStatus();
  const verifyCode = useVerifyParticipationCode();
  const { setToken, getToken } = useAuthTokens();
  const { toast } = useToast();
  const [code, setCode] = useState("");

  useEffect(() => {
    // If already logged in, redirect to watch
    if (getToken()) {
      setLocation("/watch");
    }
  }, [getToken, setLocation]);

  const handleVerifyCode = (e: React.FormEvent) => {
    e.preventDefault();
    if (!code) return;

    verifyCode.mutate({ data: { code } }, {
      onSuccess: (data) => {
        setToken(data.token);
        toast({
          title: "Access Granted",
          description: "Welcome to HackForge. Redirecting to live feed...",
        });
        setLocation("/watch");
      },
      onError: (err) => {
        toast({
          title: "Access Denied",
          description: err.message || "Invalid participation code",
          variant: "destructive",
        });
      }
    });
  };

  const containerVariants = {
    hidden: { opacity: 0 },
    show: {
      opacity: 1,
      transition: {
        staggerChildren: 0.1
      }
    }
  };

  const itemVariants = {
    hidden: { opacity: 0, y: 20 },
    show: { opacity: 1, y: 0 }
  };

  return (
    <div className="min-h-[calc(100vh-4rem)] bg-background flex flex-col relative overflow-hidden">
      {/* Abstract Background Elements */}
      <div className="absolute inset-0 z-0 pointer-events-none opacity-20">
        <div className="absolute top-[-10%] left-[-10%] w-[40%] h-[40%] bg-primary/30 blur-[120px] rounded-full" />
        <div className="absolute bottom-[-10%] right-[-10%] w-[40%] h-[40%] bg-secondary/30 blur-[120px] rounded-full" />
        <div className="absolute top-[40%] left-[60%] w-[30%] h-[30%] bg-chart-3/20 blur-[100px] rounded-full" />
      </div>

      {/* Grid Pattern */}
      <div className="absolute inset-0 z-0 pointer-events-none bg-[url('data:image/svg+xml;base64,PHN2ZyB4bWxucz0iaHR0cDovL3d3dy53My5vcmcvMjAwMC9zdmciIHdpZHRoPSIyNCIgaGVpZ2h0PSIyNCI+CjxyZWN0IHdpZHRoPSIyNCIgaGVpZ2h0PSIyNCIgZmlsbD0ibm9uZSIvPgo8Y2lyY2xlIGN4PSIxMiIgY3k9IjEyIiByPSIxIiBmaWxsPSJyZ2JhKDI1NSwyNTUsMjU1LDAuMDUpIi8+Cjwvc3ZnPg==')] opacity-50" />

      <div className="container mx-auto px-4 py-12 md:py-24 z-10 flex-1 flex flex-col justify-center">
        <motion.div 
          className="grid lg:grid-cols-2 gap-12 items-center"
          variants={containerVariants}
          initial="hidden"
          animate="show"
        >
          
          {/* Hero Content */}
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

          {/* Login / Auth */}
          <motion.div className="w-full max-w-md mx-auto lg:ml-auto" variants={itemVariants}>
            <Card className="border-primary/20 bg-card/50 backdrop-blur shadow-2xl shadow-primary/5">
              <CardHeader className="text-center pb-4">
                <CardTitle className="text-2xl font-mono">INITIALIZE_LINK</CardTitle>
                <CardDescription>Enter your participation code to access the live dashboard</CardDescription>
              </CardHeader>
              <CardContent>
                <form onSubmit={handleVerifyCode} className="space-y-4">
                  <div className="space-y-2 relative">
                    <Input 
                      placeholder="HACK-XXXX" 
                      value={code}
                      onChange={(e) => setCode(e.target.value.toUpperCase())}
                      className="font-mono text-center text-lg h-14 bg-background/50 border-primary/30 focus-visible:ring-primary uppercase tracking-widest"
                      data-testid="input-participation-code"
                    />
                    <Terminal className="absolute left-4 top-4 w-6 h-6 text-muted-foreground" />
                  </div>
                  <Button 
                    type="submit" 
                    className="w-full h-12 font-bold tracking-wide" 
                    size="lg"
                    disabled={verifyCode.isPending || !code}
                    data-testid="button-submit-code"
                  >
                    {verifyCode.isPending ? (
                      <span className="flex items-center gap-2">CONNECTING <span className="animate-pulse">...</span></span>
                    ) : (
                      <span className="flex items-center gap-2">AUTHENTICATE <ArrowRight className="w-4 h-4" /></span>
                    )}
                  </Button>
                </form>
              </CardContent>
            </Card>

            <div className="mt-8">
              <h3 className="text-sm font-semibold text-muted-foreground mb-4 uppercase tracking-wider text-center">Protocol Sequence</h3>
              <div className="flex items-center justify-between px-2">
                <div className="flex flex-col items-center gap-2">
                  <div className={`w-8 h-8 rounded-full flex items-center justify-center ${eventStatus?.phase === 'registration' ? 'bg-primary text-primary-foreground shadow-[0_0_15px_rgba(var(--primary),0.5)]' : 'bg-muted text-muted-foreground'}`}>1</div>
                  <span className="text-xs font-mono">REG</span>
                </div>
                <div className="h-px bg-border flex-1 mx-2" />
                <div className="flex flex-col items-center gap-2">
                  <div className={`w-8 h-8 rounded-full flex items-center justify-center ${eventStatus?.phase === 'submission' ? 'bg-primary text-primary-foreground shadow-[0_0_15px_rgba(var(--primary),0.5)]' : 'bg-muted text-muted-foreground'}`}>2</div>
                  <span className="text-xs font-mono">SUB</span>
                </div>
                <div className="h-px bg-border flex-1 mx-2" />
                <div className="flex flex-col items-center gap-2">
                  <div className={`w-8 h-8 rounded-full flex items-center justify-center ${eventStatus?.phase === 'elimination' ? 'bg-primary text-primary-foreground shadow-[0_0_15px_rgba(var(--primary),0.5)]' : 'bg-muted text-muted-foreground'}`}>3</div>
                  <span className="text-xs font-mono">ELIM</span>
                </div>
                <div className="h-px bg-border flex-1 mx-2" />
                <div className="flex flex-col items-center gap-2">
                  <div className={`w-8 h-8 rounded-full flex items-center justify-center ${eventStatus?.phase === 'finale' ? 'bg-primary text-primary-foreground shadow-[0_0_15px_rgba(var(--primary),0.5)]' : 'bg-muted text-muted-foreground'}`}>4</div>
                  <span className="text-xs font-mono">FIN</span>
                </div>
              </div>
            </div>
          </motion.div>
        </motion.div>
      </div>
    </div>
  );
}