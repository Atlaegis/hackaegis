import { useState, useEffect } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { useToast } from "@/hooks/use-toast";
import {
  Upload, Send, Github, Monitor, FileText, Lock, AlertCircle,
  CheckCircle, Clock, Activity, Edit3, History
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
}

interface Submission {
  id: number | null;
  teamId: number;
  projectTitle: string | null;
  description: string | null;
  githubUrl: string | null;
  demoUrl: string | null;
  slidesUrl: string | null;
  submittedAt: string | null;
  updatedAt: string | null;
  isLocked: boolean;
}

const container = { hidden: {}, show: { transition: { staggerChildren: 0.06 } } };
const item = { hidden: { opacity: 0, y: 12 }, show: { opacity: 1, y: 0 } };

export default function CandidateSubmissions({ token, team }: { token: string; team: Team | null }) {
  const { toast } = useToast();
  const [submission, setSubmission] = useState<Submission | null>(null);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [form, setForm] = useState({
    projectTitle: "",
    description: "",
    githubUrl: "",
    demoUrl: "",
    slidesUrl: "",
  });

  useEffect(() => {
    if (!team) {
      setLoading(false);
      return;
    }

    fetch(`/api/submissions/${team.id}`, {
      headers: { Authorization: `Bearer ${token}` },
    })
      .then((r) => r.json())
      .then((data) => {
        if (data && !data.error) {
          setSubmission(data);
          setForm({
            projectTitle: data.projectTitle ?? team.projectTitle ?? "",
            description: data.description ?? team.description ?? "",
            githubUrl: data.githubUrl ?? team.githubUrl ?? "",
            demoUrl: data.demoUrl ?? "",
            slidesUrl: data.slidesUrl ?? "",
          });
        } else {
          // No existing submission, pre-fill from team data
          setForm({
            projectTitle: team.projectTitle ?? "",
            description: team.description ?? "",
            githubUrl: team.githubUrl ?? "",
            demoUrl: "",
            slidesUrl: "",
          });
        }
      })
      .catch(() => {
        setForm({
          projectTitle: team.projectTitle ?? "",
          description: team.description ?? "",
          githubUrl: team.githubUrl ?? "",
          demoUrl: "",
          slidesUrl: "",
        });
      })
      .finally(() => setLoading(false));
  }, [team?.id, token]);

  const handleSave = async () => {
    if (!team) return;
    setSaving(true);
    try {
      const res = await fetch("/api/submissions", {
        method: "POST",
        headers: { "Content-Type": "application/json", Authorization: `Bearer ${token}` },
        body: JSON.stringify({
          teamId: team.id,
          projectTitle: form.projectTitle || null,
          description: form.description || null,
          githubUrl: form.githubUrl || null,
          demoUrl: form.demoUrl || null,
          slidesUrl: form.slidesUrl || null,
        }),
      });
      const data = await res.json();
      if (!res.ok) {
        if (res.status === 423) throw new Error("Submissions are locked for this phase.");
        throw new Error(data.message ?? "Failed to save");
      }
      setSubmission(data);
      toast({ title: "Submission saved!", description: "Your project details have been updated." });
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
        <Activity className="w-5 h-5 animate-spin mr-2" /> Loading submissions...
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
                You need to be part of a team to submit a project. Please contact the organizers.
              </p>
            </CardContent>
          </Card>
        </motion.div>
      </motion.div>
    );
  }

  const isLocked = submission?.isLocked ?? false;
  const hasSubmitted = !!submission?.submittedAt;

  return (
    <motion.div variants={container} initial="hidden" animate="show" className="space-y-6">
      {/* Header */}
      <motion.div variants={item}>
        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-2xl font-bold font-mono">Submissions</h1>
            <p className="text-muted-foreground text-sm mt-1">
              Submit your project details, source code, and demo links.
            </p>
          </div>
          <div className="flex items-center gap-2">
            {isLocked && (
              <Badge className="bg-orange-400/10 text-orange-400 border-orange-400/30">
                <Lock className="w-3 h-3 mr-1" /> Locked
              </Badge>
            )}
            {hasSubmitted && !isLocked && (
              <Badge className="bg-green-500/10 text-green-400 border-green-500/30">
                <CheckCircle className="w-3 h-3 mr-1" /> Submitted
              </Badge>
            )}
            {!hasSubmitted && !isLocked && (
              <Badge className="bg-chart-4/10 text-chart-4 border-chart-4/20">
                <Edit3 className="w-3 h-3 mr-1" /> Draft
              </Badge>
            )}
          </div>
        </div>
      </motion.div>

      {/* Lock Warning */}
      {isLocked && (
        <motion.div variants={item}>
          <div className="flex items-center gap-2 text-sm text-orange-400 bg-orange-400/10 rounded-lg p-4 border border-orange-400/20">
            <AlertCircle className="w-4 h-4 flex-shrink-0" />
            <span>Submissions are locked for the current phase. Contact an admin to make changes.</span>
          </div>
        </motion.div>
      )}

      {/* Submission Form */}
      <motion.div variants={item}>
        <Card className={isLocked ? "border-orange-400/20" : "border-chart-4/20"}>
          <CardHeader>
            <CardTitle className="flex items-center gap-2 text-base">
              <Upload className="w-4 h-4 text-chart-4" />
              Project Details
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-5">
            {/* Project Title */}
            <div>
              <label className="text-sm font-medium mb-2 block">Project Title</label>
              <Input
                value={form.projectTitle}
                onChange={(e) => setForm((p) => ({ ...p, projectTitle: e.target.value }))}
                placeholder="Enter your project name"
                disabled={isLocked}
                className="bg-background/50"
              />
            </div>

            {/* Description */}
            <div>
              <label className="text-sm font-medium mb-2 block">Description</label>
              <Textarea
                value={form.description}
                onChange={(e) => setForm((p) => ({ ...p, description: e.target.value }))}
                placeholder="Briefly describe what your project does, the problem it solves, and how it works..."
                rows={4}
                disabled={isLocked}
                className="bg-background/50 resize-none"
              />
            </div>

            {/* URLs */}
            <div className="space-y-4">
              <h3 className="text-sm font-medium">Links</h3>
              <div className="grid grid-cols-1 gap-4">
                <div>
                  <label className="text-xs text-muted-foreground mb-1.5 flex items-center gap-1.5">
                    <Github className="w-3.5 h-3.5" /> GitHub Repository URL
                  </label>
                  <Input
                    value={form.githubUrl}
                    onChange={(e) => setForm((p) => ({ ...p, githubUrl: e.target.value }))}
                    placeholder="https://github.com/your-team/project"
                    disabled={isLocked}
                    className="bg-background/50"
                  />
                </div>
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                  <div>
                    <label className="text-xs text-muted-foreground mb-1.5 flex items-center gap-1.5">
                      <Monitor className="w-3.5 h-3.5" /> Live Demo URL
                    </label>
                    <Input
                      value={form.demoUrl}
                      onChange={(e) => setForm((p) => ({ ...p, demoUrl: e.target.value }))}
                      placeholder="https://your-demo.vercel.app"
                      disabled={isLocked}
                      className="bg-background/50"
                    />
                  </div>
                  <div>
                    <label className="text-xs text-muted-foreground mb-1.5 flex items-center gap-1.5">
                      <FileText className="w-3.5 h-3.5" /> Slides / PPT URL
                    </label>
                    <Input
                      value={form.slidesUrl}
                      onChange={(e) => setForm((p) => ({ ...p, slidesUrl: e.target.value }))}
                      placeholder="https://slides.google.com/..."
                      disabled={isLocked}
                      className="bg-background/50"
                    />
                  </div>
                </div>
              </div>
            </div>

            {/* Actions */}
            {!isLocked && (
              <div className="flex items-center justify-between pt-2 border-t border-border">
                <p className="text-xs text-muted-foreground">
                  {hasSubmitted ? "You can update your submission until it is locked." : "Save your progress or submit when ready."}
                </p>
                <Button onClick={handleSave} disabled={saving} className="gap-1.5 bg-chart-4 hover:bg-chart-4/90 text-white">
                  <Send className="w-3.5 h-3.5" />
                  {saving ? "Saving..." : hasSubmitted ? "Update Submission" : "Submit Project"}
                </Button>
              </div>
            )}
          </CardContent>
        </Card>
      </motion.div>

      {/* Submission History / Status */}
      <motion.div variants={item}>
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2 text-base">
              <History className="w-4 h-4 text-chart-4" /> Submission History
            </CardTitle>
          </CardHeader>
          <CardContent>
            {submission?.submittedAt || submission?.updatedAt ? (
              <div className="space-y-3">
                {submission.submittedAt && (
                  <div className="flex items-center gap-3 p-3 rounded-lg bg-green-500/5 border border-green-500/20">
                    <CheckCircle className="w-4 h-4 text-green-400 flex-shrink-0" />
                    <div>
                      <p className="text-sm font-medium">First Submitted</p>
                      <p className="text-xs text-muted-foreground">
                        {new Date(submission.submittedAt).toLocaleString()}
                      </p>
                    </div>
                  </div>
                )}
                {submission.updatedAt && submission.updatedAt !== submission.submittedAt && (
                  <div className="flex items-center gap-3 p-3 rounded-lg bg-muted/30 border border-border">
                    <Clock className="w-4 h-4 text-muted-foreground flex-shrink-0" />
                    <div>
                      <p className="text-sm font-medium">Last Updated</p>
                      <p className="text-xs text-muted-foreground">
                        {new Date(submission.updatedAt).toLocaleString()}
                      </p>
                    </div>
                  </div>
                )}
                {isLocked && (
                  <div className="flex items-center gap-3 p-3 rounded-lg bg-orange-400/5 border border-orange-400/20">
                    <Lock className="w-4 h-4 text-orange-400 flex-shrink-0" />
                    <div>
                      <p className="text-sm font-medium text-orange-400">Submission Locked</p>
                      <p className="text-xs text-muted-foreground">
                        No further changes can be made at this time.
                      </p>
                    </div>
                  </div>
                )}
              </div>
            ) : (
              <div className="text-center py-6 text-muted-foreground">
                <History className="w-8 h-8 mx-auto mb-2 opacity-30" />
                <p className="text-sm">No submission history yet.</p>
                <p className="text-xs mt-1">Your submission timeline will appear here after you save.</p>
              </div>
            )}
          </CardContent>
        </Card>
      </motion.div>
    </motion.div>
  );
}
