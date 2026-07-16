import { useState, useEffect } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { User, Users, CheckCircle, Clock } from "lucide-react";
import { motion } from "framer-motion";

interface ProfileData {
  id: number; label: string; domain: string | null;
  assignedTeams: number; completedEvaluations: number; pendingEvaluations: number;
}

export default function JudgeProfile({ token }: { token: string }) {
  const [profile, setProfile] = useState<ProfileData | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    fetch("/api/judges/me", { headers: { Authorization: `Bearer ${token}` } })
      .then((r) => r.json())
      .then(setProfile)
      .catch(() => {})
      .finally(() => setLoading(false));
  }, [token]);

  if (loading) return <div className="flex justify-center py-20 text-muted-foreground"><Clock className="w-5 h-5 animate-spin mr-2" /> Loading...</div>;
  if (!profile) return <p className="text-center text-muted-foreground py-12">Unable to load profile.</p>;

  const completionPct = profile.assignedTeams > 0 ? Math.round((profile.completedEvaluations / profile.assignedTeams) * 100) : 0;

  return (
    <motion.div initial={{ opacity: 0, y: 12 }} animate={{ opacity: 1, y: 0 }} className="space-y-6">
      <h1 className="text-2xl font-bold font-mono">Judge Profile</h1>

      <Card>
        <CardContent className="pt-6">
          <div className="flex items-center gap-4">
            <div className="bg-chart-2/10 p-4 rounded-full border border-chart-2/20">
              <User className="w-8 h-8 text-chart-2" />
            </div>
            <div>
              <h2 className="text-xl font-bold">{profile.label}</h2>
              {profile.domain && <Badge className="mt-1 bg-chart-2/10 text-chart-2 border-chart-2/20">{profile.domain}</Badge>}
            </div>
          </div>
        </CardContent>
      </Card>

      <div className="grid grid-cols-3 gap-4">
        <Card className="border-chart-2/20">
          <CardContent className="pt-4 pb-4 text-center">
            <Users className="w-5 h-5 text-chart-2 mx-auto mb-1" />
            <p className="text-2xl font-bold font-mono">{profile.assignedTeams}</p>
            <p className="text-xs text-muted-foreground">Assigned</p>
          </CardContent>
        </Card>
        <Card className="border-chart-3/20">
          <CardContent className="pt-4 pb-4 text-center">
            <CheckCircle className="w-5 h-5 text-chart-3 mx-auto mb-1" />
            <p className="text-2xl font-bold font-mono">{profile.completedEvaluations}</p>
            <p className="text-xs text-muted-foreground">Completed</p>
          </CardContent>
        </Card>
        <Card className="border-chart-1/20">
          <CardContent className="pt-4 pb-4 text-center">
            <Clock className="w-5 h-5 text-chart-1 mx-auto mb-1" />
            <p className="text-2xl font-bold font-mono">{profile.pendingEvaluations}</p>
            <p className="text-xs text-muted-foreground">Pending</p>
          </CardContent>
        </Card>
      </div>

      <Card>
        <CardHeader><CardTitle className="text-base">Progress</CardTitle></CardHeader>
        <CardContent>
          <div className="space-y-2">
            <div className="flex justify-between text-sm">
              <span className="text-muted-foreground">Completion</span>
              <span className="font-mono font-bold text-chart-2">{completionPct}%</span>
            </div>
            <div className="h-3 rounded-full bg-muted overflow-hidden">
              <motion.div className="h-full bg-chart-2 rounded-full" initial={{ width: 0 }} animate={{ width: `${completionPct}%` }} transition={{ duration: 0.8 }} />
            </div>
          </div>
        </CardContent>
      </Card>

      {profile.domain && (
        <Card>
          <CardHeader><CardTitle className="text-base">Your Domain</CardTitle></CardHeader>
          <CardContent>
            <p className="text-sm text-muted-foreground">You are assigned to evaluate teams in the <span className="font-medium text-foreground">{profile.domain}</span> domain. Only teams whose project falls under this domain will appear in your scoring queue.</p>
          </CardContent>
        </Card>
      )}
    </motion.div>
  );
}
