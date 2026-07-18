import { useState, useEffect } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Progress } from "@/components/ui/progress";
import {
  Trophy, Award, Star, Clock, Download, MessageSquare,
  TrendingUp, Target, BarChart2, CheckCircle, XCircle
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

interface ScoreData {
  totalScore: number | null;
  innovation: number | null;
  execution: number | null;
  presentation: number | null;
  feedback: string | null;
  judgeLabel?: string;
}

interface Certificate {
  id: number;
  teamId: number;
  type: string;
  url: string | null;
  issuedAt: string;
  title?: string;
}

interface StageResult {
  stage: string;
  status: string;
  score?: number;
  maxScore?: number;
  rank?: number;
  totalTeams?: number;
}

interface Props {
  token: string;
  team: Team | null;
}

const container = { hidden: {}, show: { transition: { staggerChildren: 0.06 } } };
const item = { hidden: { opacity: 0, y: 12 }, show: { opacity: 1, y: 0 } };

export default function CandidateResults({ token, team }: Props) {
  const [scores, setScores] = useState<ScoreData[]>([]);
  const [stages, setStages] = useState<StageResult[]>([]);
  const [certificates, setCertificates] = useState<Certificate[]>([]);
  const [loading, setLoading] = useState(true);
  const [resultsPublished, setResultsPublished] = useState(false);
  const [overallRank, setOverallRank] = useState<number | null>(null);
  const [totalTeams, setTotalTeams] = useState<number | null>(null);

  useEffect(() => {
    const loadData = async () => {
      try {
        // Fetch hackathon status
        const eventRes = await fetch("/api/hackathons/active", {
          headers: { Authorization: `Bearer ${token}` },
        });
        const eventData = await eventRes.json();
        setResultsPublished(eventData?.resultsPublished ?? false);

        if (team) {
          // Fetch team results
          try {
            const resultsRes = await fetch(`/api/results/team/${team.id}`, {
              headers: { Authorization: `Bearer ${token}` },
            });
            if (resultsRes.ok) {
              const resultsData = await resultsRes.json();
              if (resultsData.scores) setScores(resultsData.scores);
              if (resultsData.stages) setStages(resultsData.stages);
              if (resultsData.rank) setOverallRank(resultsData.rank);
              if (resultsData.totalTeams) setTotalTeams(resultsData.totalTeams);
              if (resultsData.published) setResultsPublished(true);
            }
          } catch {
            // Team results endpoint may not exist
          }

          // Fetch certificates
          try {
            const certRes = await fetch(`/api/cms/certificates?teamId=${team.id}`, {
              headers: { Authorization: `Bearer ${token}` },
            });
            if (certRes.ok) {
              const certData = await certRes.json();
              if (Array.isArray(certData)) setCertificates(certData);
            }
          } catch {
            // Certificates endpoint may not exist
          }
        }
      } catch {
        // Non-critical errors
      }
      setLoading(false);
    };
    loadData();
  }, [token, team]);

  if (loading) {
    return (
      <div className="flex items-center justify-center py-20 text-muted-foreground">
        <Clock className="w-5 h-5 animate-spin mr-2" /> Loading results...
      </div>
    );
  }

  if (!team) {
    return (
      <motion.div variants={container} initial="hidden" animate="show" className="space-y-6">
        <motion.div variants={item}>
          <Card>
            <CardContent className="py-10 text-center">
              <Trophy className="w-10 h-10 text-muted-foreground/30 mx-auto mb-3" />
              <h2 className="font-bold text-lg">No Team Found</h2>
              <p className="text-muted-foreground text-sm mt-1">Join a team to view results.</p>
            </CardContent>
          </Card>
        </motion.div>
      </motion.div>
    );
  }

  if (!resultsPublished) {
    return (
      <motion.div variants={container} initial="hidden" animate="show" className="space-y-6">
        <motion.div variants={item}>
          <div>
            <h1 className="text-2xl font-bold font-mono">Results</h1>
            <p className="text-sm text-muted-foreground mt-1">Your scores and evaluation feedback.</p>
          </div>
        </motion.div>
        <motion.div variants={item}>
          <Card className="border-border">
            <CardContent className="py-16 text-center">
              <div className="bg-muted/50 p-6 rounded-full w-fit mx-auto mb-4">
                <Trophy className="w-16 h-16 text-muted-foreground/30" />
              </div>
              <h2 className="font-bold text-xl">Results Not Yet Published</h2>
              <p className="text-muted-foreground mt-2 max-w-md mx-auto text-sm">
                The results for this hackathon have not been published yet. Please check back later once the evaluation is complete.
              </p>
              <div className="flex items-center justify-center gap-2 mt-6 text-muted-foreground">
                <Clock className="w-4 h-4" />
                <span className="text-sm font-mono">PENDING ANNOUNCEMENT</span>
              </div>
            </CardContent>
          </Card>
        </motion.div>
      </motion.div>
    );
  }

  const avgScore = scores.length > 0
    ? scores.reduce((sum, s) => sum + (s.totalScore ?? 0), 0) / scores.length
    : null;

  return (
    <motion.div variants={container} initial="hidden" animate="show" className="space-y-6">
      {/* Header */}
      <motion.div variants={item}>
        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-2xl font-bold font-mono">Results</h1>
            <p className="text-sm text-muted-foreground mt-1">Your scores and evaluation feedback.</p>
          </div>
          {team.isFinalist && (
            <Badge className="bg-yellow-400/10 text-yellow-400 border-yellow-400/30">
              <Star className="w-3 h-3 mr-1" /> FINALIST
            </Badge>
          )}
        </div>
      </motion.div>

      {/* Qualification Status */}
      <motion.div variants={item}>
        <Card className={team.isFinalist ? "border-chart-4/40 bg-chart-4/5" : "border-border"}>
          <CardContent className="py-5 flex items-center gap-4">
            {team.isFinalist ? (
              <>
                <div className="bg-chart-4/10 p-3 rounded-full border border-chart-4/20">
                  <CheckCircle className="w-6 h-6 text-chart-4" />
                </div>
                <div className="flex-1">
                  <p className="font-bold text-chart-4">Qualified - Finalist</p>
                  <p className="text-xs text-muted-foreground">Congratulations! Your team has qualified for the finals.</p>
                </div>
              </>
            ) : (
              <>
                <div className="bg-muted p-3 rounded-full border border-border">
                  <XCircle className="w-6 h-6 text-muted-foreground" />
                </div>
                <div className="flex-1">
                  <p className="font-bold">Evaluation Complete</p>
                  <p className="text-xs text-muted-foreground">Review your scores and feedback below.</p>
                </div>
              </>
            )}
            {overallRank && (
              <div className="text-right">
                <p className="text-xs text-muted-foreground">Rank</p>
                <p className="text-2xl font-bold font-mono text-chart-4">
                  #{overallRank}
                  {totalTeams && <span className="text-sm text-muted-foreground font-normal">/{totalTeams}</span>}
                </p>
              </div>
            )}
          </CardContent>
        </Card>
      </motion.div>

      {/* Overall Score Summary */}
      {avgScore !== null && (
        <motion.div variants={item}>
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2 text-base">
                <TrendingUp className="w-4 h-4 text-chart-4" /> Overall Score
              </CardTitle>
            </CardHeader>
            <CardContent>
              <div className="flex items-end gap-3 mb-4">
                <span className="text-4xl font-bold font-mono text-chart-4">{avgScore.toFixed(1)}</span>
                <span className="text-lg text-muted-foreground font-mono">/100</span>
              </div>
              <Progress value={avgScore} className="h-3" />
              <p className="text-xs text-muted-foreground mt-2">
                Average across {scores.length} evaluation{scores.length > 1 ? "s" : ""}
              </p>
            </CardContent>
          </Card>
        </motion.div>
      )}

      {/* Stage-wise Results */}
      {stages.length > 0 && (
        <motion.div variants={item}>
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2 text-base">
                <Target className="w-4 h-4 text-chart-4" /> Stage Results
              </CardTitle>
            </CardHeader>
            <CardContent>
              <div className="space-y-3">
                {stages.map((stage, idx) => (
                  <div key={idx} className="p-3 rounded-lg border border-border bg-muted/20">
                    <div className="flex items-center justify-between mb-2">
                      <div className="flex items-center gap-2">
                        <span className="font-medium text-sm capitalize">{stage.stage.replace(/_/g, " ")}</span>
                        <Badge className={`text-xs ${
                          stage.status === "passed" ? "bg-green-500/10 text-green-400 border-green-500/20" :
                          stage.status === "failed" ? "bg-red-500/10 text-red-400 border-red-500/20" :
                          "bg-muted text-muted-foreground border-border"
                        }`}>
                          {stage.status}
                        </Badge>
                      </div>
                      {stage.rank && (
                        <span className="text-xs text-muted-foreground font-mono">
                          Rank #{stage.rank}{stage.totalTeams ? `/${stage.totalTeams}` : ""}
                        </span>
                      )}
                    </div>
                    {stage.score !== undefined && stage.maxScore && (
                      <div className="flex items-center gap-3">
                        <Progress value={(stage.score / stage.maxScore) * 100} className="h-2 flex-1" />
                        <span className="text-xs font-mono text-muted-foreground">
                          {stage.score}/{stage.maxScore}
                        </span>
                      </div>
                    )}
                  </div>
                ))}
              </div>
            </CardContent>
          </Card>
        </motion.div>
      )}

      {/* Score Breakdown */}
      {scores.length > 0 && (
        <motion.div variants={item}>
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2 text-base">
                <BarChart2 className="w-4 h-4 text-chart-4" /> Score Breakdown
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              {scores.map((score, i) => (
                <div key={i} className="p-4 rounded-lg border border-border bg-muted/10">
                  <div className="flex items-center justify-between mb-3">
                    <span className="text-sm font-medium">{score.judgeLabel ?? `Evaluation ${i + 1}`}</span>
                    {score.totalScore !== null && (
                      <Badge className="bg-chart-4/10 text-chart-4 border-chart-4/20 font-mono">
                        {score.totalScore.toFixed(1)} pts
                      </Badge>
                    )}
                  </div>
                  <div className="grid grid-cols-3 gap-3">
                    {score.innovation !== null && (
                      <div className="text-center p-2.5 rounded-lg bg-muted/30">
                        <p className="text-xs text-muted-foreground mb-1">Innovation</p>
                        <p className="font-bold font-mono text-lg">{score.innovation.toFixed(1)}</p>
                      </div>
                    )}
                    {score.execution !== null && (
                      <div className="text-center p-2.5 rounded-lg bg-muted/30">
                        <p className="text-xs text-muted-foreground mb-1">Execution</p>
                        <p className="font-bold font-mono text-lg">{score.execution.toFixed(1)}</p>
                      </div>
                    )}
                    {score.presentation !== null && (
                      <div className="text-center p-2.5 rounded-lg bg-muted/30">
                        <p className="text-xs text-muted-foreground mb-1">Presentation</p>
                        <p className="font-bold font-mono text-lg">{score.presentation.toFixed(1)}</p>
                      </div>
                    )}
                  </div>
                  {score.feedback && (
                    <div className="mt-3 p-3 rounded-lg bg-muted/20 border border-border">
                      <div className="flex items-center gap-2 mb-1">
                        <MessageSquare className="w-3 h-3 text-muted-foreground" />
                        <span className="text-xs font-medium text-muted-foreground">Feedback</span>
                      </div>
                      <p className="text-sm italic text-muted-foreground">"{score.feedback}"</p>
                    </div>
                  )}
                </div>
              ))}
            </CardContent>
          </Card>
        </motion.div>
      )}

      {scores.length === 0 && (
        <motion.div variants={item}>
          <Card>
            <CardContent className="py-8 text-center">
              <BarChart2 className="w-8 h-8 text-muted-foreground/30 mx-auto mb-2" />
              <p className="text-sm text-muted-foreground">
                Detailed scores will appear once judges complete their evaluation.
              </p>
            </CardContent>
          </Card>
        </motion.div>
      )}

      {/* Certificates */}
      <motion.div variants={item}>
        <Card className={certificates.length > 0 ? "border-chart-4/20" : ""}>
          <CardHeader>
            <CardTitle className="flex items-center gap-2 text-base">
              <Award className="w-4 h-4 text-chart-4" /> Certificates
            </CardTitle>
          </CardHeader>
          <CardContent>
            {certificates.length > 0 ? (
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                {certificates.map((cert) => (
                  <div key={cert.id} className="p-4 rounded-lg border border-chart-4/20 bg-chart-4/5 flex items-center gap-3">
                    <div className="bg-chart-4/10 p-2 rounded-lg">
                      <Award className="w-5 h-5 text-chart-4" />
                    </div>
                    <div className="flex-1 min-w-0">
                      <p className="font-medium text-sm truncate">
                        {cert.title ?? `${cert.type.replace(/_/g, " ")} Certificate`}
                      </p>
                      <p className="text-xs text-muted-foreground">
                        Issued: {new Date(cert.issuedAt).toLocaleDateString()}
                      </p>
                    </div>
                    {cert.url && (
                      <Button variant="outline" size="sm" className="gap-1.5 flex-shrink-0" asChild>
                        <a href={cert.url} target="_blank" rel="noopener noreferrer">
                          <Download className="w-3.5 h-3.5" /> Download
                        </a>
                      </Button>
                    )}
                  </div>
                ))}
              </div>
            ) : (
              <p className="text-sm text-muted-foreground text-center py-4">
                Certificates will be available here once issued by the organizers.
              </p>
            )}
          </CardContent>
        </Card>
      </motion.div>
    </motion.div>
  );
}
