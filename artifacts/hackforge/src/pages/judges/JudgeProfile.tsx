import { useState, useEffect } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { useToast } from "@/hooks/use-toast";
import { User, Users, CheckCircle, Clock, Edit3, Save, X } from "lucide-react";
import { motion } from "framer-motion";

interface ProfileData {
  id: number; label: string; domain: string | null; email: string | null;
  bio: string | null; yearsOfExperience: number | null;
  assignedTeams: number; completedEvaluations: number; pendingEvaluations: number;
}

export default function JudgeProfile({ token }: { token: string }) {
  const { toast } = useToast();
  const [profile, setProfile] = useState<ProfileData | null>(null);
  const [loading, setLoading] = useState(true);
  const [editing, setEditing] = useState(false);
  const [editForm, setEditForm] = useState({ domain: "", bio: "", yearsOfExperience: "" });
  const [saving, setSaving] = useState(false);

  const fetchProfile = () => {
    fetch("/api/judges/me", { headers: { Authorization: `Bearer ${token}` } })
      .then((r) => r.json())
      .then(setProfile)
      .catch(() => {})
      .finally(() => setLoading(false));
  };

  useEffect(() => { fetchProfile(); }, [token]);

  const startEdit = () => {
    setEditForm({
      domain: profile?.domain ?? "",
      bio: profile?.bio ?? "",
      yearsOfExperience: profile?.yearsOfExperience?.toString() ?? "",
    });
    setEditing(true);
  };

  const handleSave = async () => {
    setSaving(true);
    try {
      const res = await fetch("/api/judges/profile", {
        method: "PUT",
        headers: { "Content-Type": "application/json", Authorization: `Bearer ${token}` },
        body: JSON.stringify({
          bio: editForm.bio || null,
          yearsOfExperience: editForm.yearsOfExperience ? parseInt(editForm.yearsOfExperience, 10) : null,
        }),
      });
      if (!res.ok) { const d = await res.json(); throw new Error(d.message); }
      toast({ title: "Profile Updated" });
      setEditing(false);
      fetchProfile();
    } catch (err: unknown) {
      toast({ title: "Error", description: err instanceof Error ? err.message : "Failed to save", variant: "destructive" });
    }
    setSaving(false);
  };

  if (loading) return <div className="flex justify-center py-20 text-muted-foreground"><Clock className="w-5 h-5 animate-spin mr-2" /> Loading...</div>;
  if (!profile) return <p className="text-center text-muted-foreground py-12">Unable to load profile.</p>;

  const completionPct = profile.assignedTeams > 0 ? Math.round((profile.completedEvaluations / profile.assignedTeams) * 100) : 0;

  return (
    <motion.div initial={{ opacity: 0, y: 12 }} animate={{ opacity: 1, y: 0 }} className="space-y-6">
      <div className="flex items-center justify-between">
        <h1 className="text-2xl font-bold font-mono">Judge Profile</h1>
        {!editing && (
          <Button size="sm" variant="outline" onClick={startEdit}>
            <Edit3 className="w-3 h-3 mr-1" /> Edit Profile
          </Button>
        )}
      </div>

      <Card>
        <CardContent className="pt-6">
          <div className="flex items-center gap-4">
            <div className="bg-chart-2/10 p-4 rounded-full border border-chart-2/20">
              <User className="w-8 h-8 text-chart-2" />
            </div>
            <div>
              <h2 className="text-xl font-bold">{profile.label}</h2>
              {profile.email && <p className="text-sm text-muted-foreground">{profile.email}</p>}
              <div className="flex gap-2 mt-1 flex-wrap">
                {profile.domain && <Badge className="bg-chart-2/10 text-chart-2 border-chart-2/20">{profile.domain}</Badge>}
                {profile.yearsOfExperience != null && <Badge variant="secondary" className="text-xs">{profile.yearsOfExperience} yrs exp</Badge>}
              </div>
            </div>
          </div>
          {profile.bio && (
            <div className="mt-4 p-3 rounded-lg bg-muted/30 border border-border">
              <p className="text-sm text-muted-foreground">{profile.bio}</p>
            </div>
          )}
        </CardContent>
      </Card>

      {/* Edit Form */}
      {editing && (
        <motion.div initial={{ opacity: 0, y: -8 }} animate={{ opacity: 1, y: 0 }}>
          <Card className="border-chart-2/30">
            <CardHeader><CardTitle className="text-base flex items-center gap-2"><Edit3 className="w-4 h-4 text-chart-2" /> Edit Profile</CardTitle></CardHeader>
            <CardContent className="space-y-4">
              {profile?.domain && (
                <div>
                  <label className="text-xs text-muted-foreground mb-1 block">Domain of Expertise</label>
                  <p className="text-sm font-medium px-3 py-2 rounded-md bg-muted/50 border border-border">{profile.domain} <span className="text-xs text-muted-foreground">(assigned by admin)</span></p>
                </div>
              )}
              <div>
                <label className="text-xs text-muted-foreground mb-1 block">Years of Experience</label>
                <Input type="number" min={0} max={50} value={editForm.yearsOfExperience} onChange={(e) => setEditForm((p) => ({ ...p, yearsOfExperience: e.target.value }))} placeholder="e.g., 5" />
              </div>
              <div>
                <label className="text-xs text-muted-foreground mb-1 block">Professional Bio</label>
                <Textarea value={editForm.bio} onChange={(e) => setEditForm((p) => ({ ...p, bio: e.target.value }))} placeholder="A short bio about your expertise and background..." rows={4} className="resize-none" />
              </div>
              <div className="flex gap-2 justify-end">
                <Button variant="ghost" size="sm" onClick={() => setEditing(false)}><X className="w-3 h-3 mr-1" /> Cancel</Button>
                <Button size="sm" onClick={handleSave} disabled={saving} className="bg-chart-2 hover:bg-chart-2/90">
                  <Save className="w-3 h-3 mr-1" /> {saving ? "Saving..." : "Save Changes"}
                </Button>
              </div>
            </CardContent>
          </Card>
        </motion.div>
      )}

      {/* Stats */}
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
