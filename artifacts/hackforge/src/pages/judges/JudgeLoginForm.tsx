import { useState } from "react";
import { useLocation } from "wouter";
import { useAuthTokens } from "@/lib/auth";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Card, CardContent } from "@/components/ui/card";
import { useToast } from "@/hooks/use-toast";
import { Scale, Terminal, ArrowRight, KeyRound } from "lucide-react";
import { motion } from "framer-motion";
import { setAuthTokenGetter } from "@workspace/api-client-react";

const JUDGE_TOKEN_KEY = "hackaegis_judge_token";

export default function JudgeLoginForm({ onLogin }: { onLogin: (token: string) => void }) {
  const { setJudgeToken } = useAuthTokens();
  const [, setLocation] = useLocation();
  const { toast } = useToast();
  const [code, setCode] = useState("");
  const [loading, setLoading] = useState(false);

  const handleSubmit = async (e: React.FormEvent) => {
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
      if (data.role !== "judge") throw new Error("This code is not a judge code.");
      setJudgeToken(data.token);
      setAuthTokenGetter(() => localStorage.getItem(JUDGE_TOKEN_KEY));
      toast({ title: "Judge Access Granted", description: `Welcome, ${data.label ?? "Judge"}!` });
      onLogin(data.token);
    } catch (err: unknown) {
      toast({ title: "Access Denied", description: err instanceof Error ? err.message : "Invalid judge code.", variant: "destructive" });
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-[calc(100vh-4rem)] flex items-center justify-center bg-background p-6">
      <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} className="w-full max-w-sm space-y-6">
        <div className="text-center space-y-4">
          <div className="flex justify-center">
            <div className="bg-chart-2/10 p-4 rounded-full border border-chart-2/20">
              <Scale className="w-10 h-10 text-chart-2" />
            </div>
          </div>
          <div>
            <h2 className="font-mono text-2xl font-bold">JUDGE PORTAL</h2>
            <p className="text-muted-foreground mt-2 text-sm">Enter your judge access code to begin evaluation.</p>
          </div>
        </div>

        <Card className="border-chart-2/20">
          <CardContent className="pt-6">
            <form onSubmit={handleSubmit} className="space-y-4">
              <div className="space-y-2">
                <label className="text-sm font-medium flex items-center gap-2"><KeyRound className="w-4 h-4 text-chart-2" /> Judge Code</label>
                <div className="relative">
                  <Input
                    value={code}
                    onChange={(e) => setCode(e.target.value.toUpperCase())}
                    placeholder="HACKAEGIS_JUDGE@01"
                    className="font-mono text-sm pl-10 uppercase tracking-wider"
                    autoFocus
                    autoComplete="off"
                  />
                  <Terminal className="absolute left-3 top-2.5 w-4 h-4 text-muted-foreground" />
                </div>
              </div>
              <Button type="submit" className="w-full bg-chart-2 hover:bg-chart-2/90 gap-2" disabled={loading || !code.trim()}>
                {loading ? <span className="flex items-center gap-2">Verifying<span className="animate-pulse">...</span></span> : <><ArrowRight className="w-4 h-4" /> Access Judge Portal</>}
              </Button>
            </form>
          </CardContent>
        </Card>

        <div className="text-center">
          <p className="text-xs text-muted-foreground">
            Wrong portal?{" "}
            <button className="text-primary hover:underline" onClick={() => setLocation("/")}>Go to Home</button>
          </p>
        </div>
      </motion.div>
    </div>
  );
}
