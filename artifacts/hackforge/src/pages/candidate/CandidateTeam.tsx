import { useState, useEffect } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Separator } from "@/components/ui/separator";
import { useToast } from "@/hooks/use-toast";
import {
  Users, Shield, Calendar, MapPin, Award, Hash, User,
  Github, Linkedin, Globe, Save, Clock, CheckCircle, AlertCircle, BookOpen
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
  leader?: string;
  college?: string;
  track?: string;
  tagline?: string;
  about?: string;
  linkedinUrl?: string;
  portfolioUrl?: string;
  verificationStatus?: string;
  registrationDate?: string;
  registrationId?: string;
  memberCount?: number;
  members?: Array<{ id: number; name: string; email?: string; role?: string }>;
}

interface TeamDetailedData {
  team: Team;
  members?: Array<{ id: number; name: string; email?: string; role?: string }>;
}

const container = { hidden: {}, show: { transition: { staggerChildren: 0.06 } } };
const item = { hidden: { opacity: 0, y: 12 }, show: { opacity: 1, y: 0 } };

export default function CandidateTeam({ token, team: initialTeam }: { token: string; team: Team | null }) {
  const { toast } = useToast();
  const [team, setTeam] = useState<Team | null>(initialTeam);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [editForm, setEditForm] = useState({
    tagline: "",
    about: "",
    githubUrl: "",
    linkedinUrl: "",
    portfolioUrl: "",
  });

  useEffect(() => {
    fetch("/api/auth/my-team", { headers: { Authorization: `Bearer ${token}` } })
      .then((r) => r.json())
      .then((data: TeamDetailedData) => {
        if (data.team) {
          const teamData = { ...data.team, members: data.members };
          setTeam(teamData);
          setEditForm({
            tagline: teamData.tagline ?? "",
            about: teamData.about ?? teamData.description ?? "",
            githubUrl: teamData.githubUrl ?? "",
            linkedinUrl: teamData.linkedinUrl ?? "",
            portfolioUrl: teamData.portfolioUrl ?? "",
          });
        }
      })
      .catch(() => {})
      .finally(() => setLoading(false));
  }, [token]);

  const handleSave = async () => {
    if (!team) return;
    setSaving(true);
    try {
      const res = await fetch(`/api/teams/${team.id}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json", Authorization: `Bearer ${token}` },
        body: JSON.stringify({
          tagline: editForm.tagline || null,
          about: editForm.about || null,
          githubUrl: editForm.githubUrl || null,
          linkedinUrl: editForm.linkedinUrl || null,
          portfolioUrl: editForm.portfolioUrl || null,
        }),
      });
      if (!res.ok) {
        const errData = await res.json().catch(() => ({}));
        throw new Error(errData.message ?? "Failed to update team info");
      }
      toast({ title: "Team info updated!", description: "Your team details have been saved." });
    } catch (err: unknown) {
      toast({
        title: "Error",
        description: err instanceof Error ? err.message : "Failed to save",
        variant: "destructive",
      });
    } finally {
      setSaving(false);
    }
  };

  if (loading) {
    return (
      <div className="flex justify-center items-center py-20 text-muted-foreground">
        <Clock className="w-5 h-5 animate-spin mr-2" /> Loading team info...
      </div>
    );
  }

  if (!team) {
    return (
      <motion.div variants={container} initial="hidden" animate="show" className="space-y-6">
        <motion.div variants={item}>
          <Card className="border-orange-400/30">
            <CardContent className="py-10 text-center">
              <AlertCircle className="w-10 h-10 text-orange-400 mx-auto mb-3" />
              <h2 className="font-bold text-lg">No Team Found</h2>
              <p className="text-muted-foreground mt-1 text-sm">
                You are not currently associated with any team.
              </p>
            </CardContent>
          </Card>
        </motion.div>
      </motion.div>
    );
  }

  const verificationColor = team.verificationStatus === "verified"
    ? "bg-green-500/10 text-green-400 border-green-500/20"
    : team.verificationStatus === "pending"
    ? "bg-yellow-400/10 text-yellow-400 border-yellow-400/20"
    : "bg-muted text-muted-foreground border-border";

  return (
    <motion.div variants={container} initial="hidden" animate="show" className="space-y-6">
      {/* Header */}
      <motion.div variants={item}>
        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-2xl font-bold font-mono">Team Information</h1>
            <p className="text-muted-foreground text-sm mt-1">
              View your team details and update your profile.
            </p>
          </div>
          {team.isFinalist && (
            <Badge className="bg-yellow-400/10 text-yellow-400 border-yellow-400/30">
              <Award className="w-3 h-3 mr-1" /> FINALIST
            </Badge>
          )}
        </div>
      </motion.div>

      {/* Read-only Team Info */}
      <motion.div variants={item}>
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2 text-base">
              <Shield className="w-4 h-4 text-chart-4" /> Team Details
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <InfoField icon={<Users className="w-4 h-4" />} label="Team Name" value={team.name} />
              <InfoField icon={<Hash className="w-4 h-4" />} label="Team ID" value={`#${team.id}`} />
              {team.registrationId && (
                <InfoField icon={<Hash className="w-4 h-4" />} label="Registration ID" value={team.registrationId} />
              )}
              {team.leader && (
                <InfoField icon={<User className="w-4 h-4" />} label="Team Leader" value={team.leader} />
              )}
              {team.college && (
                <InfoField icon={<MapPin className="w-4 h-4" />} label="College / Organization" value={team.college} />
              )}
              {team.track && (
                <InfoField icon={<BookOpen className="w-4 h-4" />} label="Track / Problem Statement" value={team.track} />
              )}
              <div className="p-3 rounded-lg bg-muted/30 border border-border">
                <div className="flex items-center gap-2 mb-1">
                  <CheckCircle className="w-4 h-4 text-muted-foreground" />
                  <span className="text-xs text-muted-foreground">Verification Status</span>
                </div>
                <Badge className={`${verificationColor} text-xs capitalize`}>
                  {team.verificationStatus ?? "pending"}
                </Badge>
              </div>
              {team.registrationDate && (
                <InfoField
                  icon={<Calendar className="w-4 h-4" />}
                  label="Registration Date"
                  value={new Date(team.registrationDate).toLocaleDateString()}
                />
              )}
              <InfoField
                icon={<Users className="w-4 h-4" />}
                label="Members"
                value={`${team.memberCount ?? team.members?.length ?? "?"} members`}
              />
            </div>

            {/* Members List */}
            {team.members && team.members.length > 0 && (
              <>
                <Separator className="my-4" />
                <h3 className="text-sm font-medium mb-3">Team Members</h3>
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
                  {team.members.map((member) => (
                    <div key={member.id} className="flex items-center gap-2 p-2 rounded-lg bg-muted/30 border border-border">
                      <div className="w-8 h-8 rounded-full bg-chart-4/10 flex items-center justify-center">
                        <User className="w-4 h-4 text-chart-4" />
                      </div>
                      <div>
                        <p className="text-sm font-medium">{member.name}</p>
                        {member.role && <p className="text-xs text-muted-foreground capitalize">{member.role}</p>}
                      </div>
                    </div>
                  ))}
                </div>
              </>
            )}
          </CardContent>
        </Card>
      </motion.div>

      {/* Editable Info */}
      <motion.div variants={item}>
        <Card className="border-chart-4/20">
          <CardHeader>
            <CardTitle className="flex items-center gap-2 text-base">
              <Users className="w-4 h-4 text-chart-4" /> Team Profile
              <Badge className="ml-auto bg-chart-4/10 text-chart-4 border-chart-4/20 text-xs">Editable</Badge>
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            <div>
              <label className="text-sm font-medium mb-2 block">Team Tagline</label>
              <Input
                value={editForm.tagline}
                onChange={(e) => setEditForm((p) => ({ ...p, tagline: e.target.value }))}
                placeholder="A short catchy phrase for your team..."
                className="bg-background/50"
                maxLength={100}
              />
              <p className="text-xs text-muted-foreground mt-1">{editForm.tagline.length}/100 characters</p>
            </div>

            <div>
              <label className="text-sm font-medium mb-2 block">About Team</label>
              <Textarea
                value={editForm.about}
                onChange={(e) => setEditForm((p) => ({ ...p, about: e.target.value }))}
                placeholder="Tell us about your team - background, expertise, motivation..."
                rows={4}
                className="bg-background/50 resize-none"
              />
            </div>

            <Separator />

            <h3 className="text-sm font-medium">Social Links</h3>
            <div className="grid grid-cols-1 gap-4">
              <div>
                <label className="text-xs text-muted-foreground mb-1.5 flex items-center gap-1.5">
                  <Github className="w-3.5 h-3.5" /> GitHub URL
                </label>
                <Input
                  value={editForm.githubUrl}
                  onChange={(e) => setEditForm((p) => ({ ...p, githubUrl: e.target.value }))}
                  placeholder="https://github.com/your-team"
                  className="bg-background/50"
                />
              </div>
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <div>
                  <label className="text-xs text-muted-foreground mb-1.5 flex items-center gap-1.5">
                    <Linkedin className="w-3.5 h-3.5" /> LinkedIn URL
                  </label>
                  <Input
                    value={editForm.linkedinUrl}
                    onChange={(e) => setEditForm((p) => ({ ...p, linkedinUrl: e.target.value }))}
                    placeholder="https://linkedin.com/company/..."
                    className="bg-background/50"
                  />
                </div>
                <div>
                  <label className="text-xs text-muted-foreground mb-1.5 flex items-center gap-1.5">
                    <Globe className="w-3.5 h-3.5" /> Portfolio / Website
                  </label>
                  <Input
                    value={editForm.portfolioUrl}
                    onChange={(e) => setEditForm((p) => ({ ...p, portfolioUrl: e.target.value }))}
                    placeholder="https://your-team-site.com"
                    className="bg-background/50"
                  />
                </div>
              </div>
            </div>

            <div className="flex justify-end pt-2">
              <Button onClick={handleSave} disabled={saving} className="gap-1.5 bg-chart-4 hover:bg-chart-4/90 text-white">
                <Save className="w-3.5 h-3.5" />
                {saving ? "Saving..." : "Save Changes"}
              </Button>
            </div>
          </CardContent>
        </Card>
      </motion.div>
    </motion.div>
  );
}

function InfoField({ icon, label, value }: { icon: React.ReactNode; label: string; value: string }) {
  return (
    <div className="p-3 rounded-lg bg-muted/30 border border-border">
      <div className="flex items-center gap-2 mb-1">
        <span className="text-muted-foreground">{icon}</span>
        <span className="text-xs text-muted-foreground">{label}</span>
      </div>
      <p className="text-sm font-medium">{value}</p>
    </div>
  );
}
