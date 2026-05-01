import { useGetPublicResults } from "@workspace/api-client-react";
import type { TeamResult } from "@workspace/api-client-react";
import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Trophy, Medal, Star, Users, Activity } from "lucide-react";
import { motion } from "framer-motion";

const rankColors = [
  "text-yellow-400",
  "text-slate-300",
  "text-amber-600",
];

const rankIcons = [
  <Trophy key={1} className="w-6 h-6 text-yellow-400" />,
  <Medal key={2} className="w-6 h-6 text-slate-300" />,
  <Star key={3} className="w-6 h-6 text-amber-600" />,
];

export default function Results() {
  const { data: results, isLoading } = useGetPublicResults();

  const teams: TeamResult[] = results?.rankedTeams ?? [];

  return (
    <div className="min-h-[calc(100vh-4rem)] bg-background py-10">
      <div className="container mx-auto px-4 max-w-3xl space-y-8">

        <motion.div
          className="text-center space-y-2"
          initial={{ opacity: 0, y: -20 }}
          animate={{ opacity: 1, y: 0 }}
        >
          <div className="flex items-center justify-center gap-3 mb-4">
            <Trophy className="w-8 h-8 text-primary" />
            <h1 className="text-4xl font-bold tracking-tight font-mono">RESULTS</h1>
          </div>
          <p className="text-muted-foreground">
            {results?.isPublished
              ? "Official hackathon results — congratulations to all participants!"
              : "Results will be published after the event concludes."}
          </p>
        </motion.div>

        {isLoading ? (
          <div className="flex items-center justify-center py-20 gap-2 text-muted-foreground">
            <Activity className="w-5 h-5 animate-spin" />
            <span>Loading results...</span>
          </div>
        ) : !results?.isPublished ? (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            className="flex flex-col items-center justify-center py-20 gap-4"
          >
            <div className="relative">
              <Trophy className="w-20 h-20 text-muted-foreground/20" />
              <div className="absolute inset-0 flex items-center justify-center">
                <div className="w-6 h-6 rounded-full bg-amber-500/80 animate-pulse" />
              </div>
            </div>
            <p className="font-mono text-xl text-muted-foreground">RESULTS PENDING</p>
            <p className="text-sm text-muted-foreground/60 text-center max-w-xs">
              The organizers will publish the official results when the event concludes.
            </p>
          </motion.div>
        ) : (
          <motion.div
            className="space-y-4"
            initial="hidden"
            animate="show"
            variants={{
              hidden: {},
              show: { transition: { staggerChildren: 0.1 } },
            }}
          >
            {teams.map((team) => {
              const index = team.rank - 1;
              return (
                <motion.div
                  key={team.teamId}
                  variants={{
                    hidden: { opacity: 0, y: 20 },
                    show: { opacity: 1, y: 0 },
                  }}
                >
                  <Card
                    className={`relative overflow-hidden border ${index === 0 ? "border-yellow-400/40 bg-yellow-400/5" : index === 1 ? "border-slate-300/30 bg-slate-300/5" : index === 2 ? "border-amber-600/30 bg-amber-600/5" : "border-border"}`}
                  >
                    {index < 3 && (
                      <div className="absolute top-0 right-0 w-32 h-32 opacity-5">
                        <Trophy className="w-full h-full" />
                      </div>
                    )}
                    <CardContent className="py-5 px-6">
                      <div className="flex items-center gap-5">
                        <div className="flex-shrink-0 w-12 text-center">
                          {index < 3 ? rankIcons[index] : (
                            <span className="text-2xl font-bold font-mono text-muted-foreground">
                              #{team.rank}
                            </span>
                          )}
                        </div>
                        <div className="flex-1">
                          <div className="flex items-center gap-2">
                            <span className={`font-bold text-xl ${index < 3 ? rankColors[index] : ""}`}>
                              {team.teamName}
                            </span>
                            {team.projectTitle && (
                              <Badge variant="secondary" className="text-xs font-normal hidden sm:inline-flex">
                                {team.projectTitle}
                              </Badge>
                            )}
                          </div>
                          {team.projectTitle && (
                            <span className="text-xs text-muted-foreground sm:hidden">{team.projectTitle}</span>
                          )}
                        </div>
                        <div className="text-right flex-shrink-0">
                          <p className="text-2xl font-bold font-mono text-primary">{team.voteCount}</p>
                          <p className="text-xs text-muted-foreground">votes</p>
                        </div>
                      </div>
                    </CardContent>
                  </Card>
                </motion.div>
              );
            })}
          </motion.div>
        )}
      </div>
    </div>
  );
}
