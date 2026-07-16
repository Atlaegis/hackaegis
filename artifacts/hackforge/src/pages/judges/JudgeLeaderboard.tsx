import { useState, useEffect, useRef } from "react";
import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Trophy, Activity, XCircle } from "lucide-react";
import { motion } from "framer-motion";

interface LeaderboardEntry {
  rank: number; teamId: number; teamName: string; projectTitle: string;
  domain: string | null; averageScore: number | null; judgesScored: number;
  totalJudges: number; isDisqualified: boolean;
}

export default function JudgeLeaderboard({ token }: { token: string }) {
  const [data, setData] = useState<{ isVisible: boolean; judgeCount: number; leaderboard: LeaderboardEntry[] } | null>(null);
  const [loading, setLoading] = useState(true);
  const intervalRef = useRef<ReturnType<typeof setInterval>>();

  useEffect(() => {
    let cancelled = false;
    const doFetch = () => {
      fetch("/api/judges/leaderboard", { headers: { Authorization: `Bearer ${token}` } })
        .then((r) => r.json())
        .then((d) => { if (!cancelled) setData(d); })
        .catch(() => {})
        .finally(() => { if (!cancelled) setLoading(false); });
    };
    doFetch();
    intervalRef.current = setInterval(doFetch, 10000);
    return () => { cancelled = true; clearInterval(intervalRef.current); };
  }, [token]);

  if (loading) return <div className="flex justify-center py-20 text-muted-foreground"><Activity className="w-5 h-5 animate-spin mr-2" /> Loading...</div>;
  if (!data) return <p className="text-center text-muted-foreground py-12">Unable to load leaderboard.</p>;

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold font-mono flex items-center gap-2"><Trophy className="w-6 h-6 text-chart-1" /> Leaderboard</h1>
          <p className="text-sm text-muted-foreground mt-1">{data.judgeCount} judges · Scores out of 100 · Auto-refreshes every 10s</p>
        </div>
      </div>

      <motion.div className="space-y-3" initial="hidden" animate="show" variants={{ hidden: {}, show: { transition: { staggerChildren: 0.04 } } }}>
        {data.leaderboard.map((entry) => (
          <motion.div key={entry.teamId} variants={{ hidden: { opacity: 0, y: 8 }, show: { opacity: 1, y: 0 } }}>
            <Card className={`${entry.isDisqualified ? "border-red-500/30 bg-red-500/5 opacity-60" : entry.rank === 1 ? "border-yellow-400/30 bg-yellow-400/5" : entry.rank === 2 ? "border-slate-300/20 bg-slate-300/5" : entry.rank === 3 ? "border-amber-600/20 bg-amber-600/5" : "border-border"}`}>
              <CardContent className="py-4 px-4 flex items-center gap-4">
                <div className={`w-10 h-10 rounded-full flex items-center justify-center font-mono font-bold text-sm ${entry.rank === 1 ? "bg-yellow-400/20 text-yellow-400" : entry.rank === 2 ? "bg-slate-300/20 text-slate-300" : entry.rank === 3 ? "bg-amber-600/20 text-amber-500" : "bg-muted text-muted-foreground"}`}>
                  {entry.isDisqualified ? <XCircle className="w-4 h-4 text-red-400" /> : `#${entry.rank}`}
                </div>
                <div className="flex-1 min-w-0">
                  <div className="flex items-center gap-2 flex-wrap">
                    <p className={`font-semibold ${entry.isDisqualified ? "line-through" : ""}`}>{entry.teamName}</p>
                    {entry.isDisqualified && <Badge variant="destructive" className="text-xs">DISQUALIFIED</Badge>}
                    {entry.domain && <Badge variant="secondary" className="text-xs">{entry.domain}</Badge>}
                  </div>
                  <p className="text-xs text-muted-foreground truncate">{entry.projectTitle}</p>
                </div>
                <div className="text-right">
                  <p className={`text-2xl font-bold font-mono ${entry.isDisqualified ? "text-red-400 line-through" : entry.averageScore !== null && entry.averageScore >= 80 ? "text-chart-3" : entry.averageScore !== null && entry.averageScore >= 50 ? "text-chart-1" : "text-muted-foreground"}`}>
                    {entry.averageScore !== null ? entry.averageScore.toFixed(1) : "—"}
                  </p>
                  <p className="text-xs text-muted-foreground">{entry.judgesScored}/{entry.totalJudges} judges</p>
                </div>
              </CardContent>
            </Card>
          </motion.div>
        ))}
      </motion.div>
    </div>
  );
}
