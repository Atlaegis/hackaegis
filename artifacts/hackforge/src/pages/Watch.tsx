import { useEffect, useState } from "react";
import { useLocation } from "wouter";
import {
  useGetEventStatus,
  useGetActivePoll,
  useGetMyVote,
  useCastVote,
} from "@workspace/api-client-react";
import type { PollResult } from "@workspace/api-client-react";
import { useAuthTokens } from "@/lib/auth";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { useToast } from "@/hooks/use-toast";
import { Tv, CheckCircle, Clock, Activity } from "lucide-react";
import { motion, AnimatePresence } from "framer-motion";

export default function Watch() {
  const [, setLocation] = useLocation();
  const { getToken } = useAuthTokens();
  const { toast } = useToast();

  const { data: eventStatus } = useGetEventStatus();
  const { data: activePoll, refetch: refetchPoll } = useGetActivePoll();
  const { data: myVote, refetch: refetchMyVote } = useGetMyVote();
  const castVote = useCastVote();

  useEffect(() => {
    if (!getToken()) {
      setLocation("/");
    }
  }, [getToken, setLocation]);

  useEffect(() => {
    const interval = setInterval(() => {
      refetchPoll();
      refetchMyVote();
    }, 5000);
    return () => clearInterval(interval);
  }, [refetchPoll, refetchMyVote]);

  const handleVote = (teamId: number) => {
    castVote.mutate(
      { data: { teamId } },
      {
        onSuccess: () => {
          toast({ title: "Vote Cast!", description: "Your vote has been recorded." });
          refetchMyVote();
          refetchPoll();
        },
        onError: (err) => {
          toast({ title: "Vote Failed", description: err.message, variant: "destructive" });
        },
      }
    );
  };

  const isVotingOpen = activePoll?.isActive && !activePoll?.isFrozen;
  const totalVotes = activePoll?.results?.reduce((s, r: PollResult) => s + r.voteCount, 0) ?? 0;

  return (
    <div className="min-h-[calc(100vh-4rem)] bg-background py-8">
      <div className="container mx-auto px-4 max-w-6xl space-y-8">

        {/* Header */}
        <motion.div
          className="flex items-center justify-between"
          initial={{ opacity: 0, y: -10 }}
          animate={{ opacity: 1, y: 0 }}
        >
          <div className="flex items-center gap-3">
            <div className="w-2 h-2 rounded-full bg-red-500 animate-pulse" />
            <span className="font-mono text-sm text-muted-foreground">LIVE FEED</span>
          </div>
          {eventStatus?.phase && (
            <span className="text-xs font-mono px-3 py-1 rounded-full border bg-primary/10 text-primary border-primary/30">
              {eventStatus.phase.toUpperCase()}
            </span>
          )}
        </motion.div>

        {/* YouTube Embed */}
        <motion.div
          initial={{ opacity: 0, scale: 0.98 }}
          animate={{ opacity: 1, scale: 1 }}
          transition={{ delay: 0.1 }}
        >
          <Card className="overflow-hidden border-primary/20">
            <CardContent className="p-0">
              {eventStatus?.streamUrl ? (
                <div className="relative w-full" style={{ paddingBottom: "56.25%" }}>
                  <iframe
                    className="absolute inset-0 w-full h-full"
                    src={`https://www.youtube.com/embed/${extractYouTubeId(eventStatus.streamUrl)}?autoplay=1`}
                    title="HackForge Live Stream"
                    allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture"
                    allowFullScreen
                  />
                </div>
              ) : (
                <div className="flex flex-col items-center justify-center h-64 bg-card text-muted-foreground gap-4">
                  <Tv className="w-12 h-12 opacity-30" />
                  <div className="text-center">
                    <p className="font-mono font-semibold">STREAM OFFLINE</p>
                    <p className="text-sm mt-1">The live stream will appear here when it goes live.</p>
                  </div>
                </div>
              )}
            </CardContent>
          </Card>
        </motion.div>

        {/* Event Info + Voting */}
        <div className="grid md:grid-cols-2 gap-6">
          {/* Event Details */}
          <motion.div initial={{ opacity: 0, x: -20 }} animate={{ opacity: 1, x: 0 }} transition={{ delay: 0.2 }}>
            <Card className="h-full">
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <Activity className="w-5 h-5 text-primary" />
                  Event Status
                </CardTitle>
              </CardHeader>
              <CardContent className="space-y-4">
                {eventStatus ? (
                  <>
                    <div>
                      <p className="text-sm text-muted-foreground">Event</p>
                      <p className="font-semibold text-lg">{eventStatus.eventName}</p>
                    </div>
                    {eventStatus.tagline && (
                      <div>
                        <p className="text-sm text-muted-foreground">Tagline</p>
                        <p className="text-sm">{eventStatus.tagline}</p>
                      </div>
                    )}
                    <div className="grid grid-cols-2 gap-4 pt-2">
                      <div className="bg-muted/50 rounded-lg p-3">
                        <p className="text-xs text-muted-foreground mb-1">Phase</p>
                        <p className="font-mono font-semibold text-primary">{eventStatus.phase?.toUpperCase()}</p>
                      </div>
                      <div className="bg-muted/50 rounded-lg p-3">
                        <p className="text-xs text-muted-foreground mb-1">Stream</p>
                        <p className="font-mono font-semibold">{eventStatus.streamActive ? "LIVE" : "OFFLINE"}</p>
                      </div>
                    </div>
                  </>
                ) : (
                  <div className="flex items-center gap-2 text-muted-foreground">
                    <Clock className="w-4 h-4 animate-spin" />
                    <span className="text-sm">Loading event data...</span>
                  </div>
                )}
              </CardContent>
            </Card>
          </motion.div>

          {/* Voting Panel */}
          <motion.div initial={{ opacity: 0, x: 20 }} animate={{ opacity: 1, x: 0 }} transition={{ delay: 0.3 }}>
            <Card className="h-full border-primary/20">
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <Activity className="w-5 h-5 text-chart-2" />
                  {activePoll ? activePoll.question : "Live Voting"}
                </CardTitle>
              </CardHeader>
              <CardContent>
                <AnimatePresence mode="wait">
                  {activePoll ? (
                    <motion.div key="poll" initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }} className="space-y-3">
                      {myVote?.hasVoted ? (
                        // Show results if voted
                        <div className="space-y-3">
                          <div className="flex items-center gap-2 text-chart-3 text-sm mb-1">
                            <CheckCircle className="w-4 h-4" />
                            Vote recorded for <strong>{myVote.votedForTeamName}</strong>!
                          </div>
                          {activePoll.results?.map((result: PollResult) => {
                            const pct = result.percentage;
                            const isMyVote = result.teamId === myVote.votedForTeamId;
                            return (
                              <div key={result.teamId} className="space-y-1">
                                <div className="flex justify-between text-sm">
                                  <span className={`flex items-center gap-1 ${isMyVote ? "text-primary font-semibold" : ""}`}>
                                    {isMyVote && <CheckCircle className="w-3 h-3" />}
                                    {result.teamName}
                                  </span>
                                  <span className="text-muted-foreground font-mono">{pct}%</span>
                                </div>
                                <div className="h-2 rounded-full bg-muted overflow-hidden">
                                  <motion.div
                                    className={`h-full rounded-full ${isMyVote ? "bg-primary" : "bg-muted-foreground/40"}`}
                                    initial={{ width: 0 }}
                                    animate={{ width: `${pct}%` }}
                                    transition={{ duration: 0.6, ease: "easeOut" }}
                                  />
                                </div>
                              </div>
                            );
                          })}
                          <p className="text-xs text-muted-foreground text-right font-mono">{totalVotes} total votes</p>
                        </div>
                      ) : (
                        // Show vote buttons
                        <div className="space-y-2">
                          {!isVotingOpen && (
                            <p className="text-amber-400 text-sm mb-2">Voting is currently closed.</p>
                          )}
                          {activePoll.results?.map((result: PollResult) => (
                            <Button
                              key={result.teamId}
                              variant="outline"
                              className="w-full justify-start h-12 text-left hover:border-primary hover:text-primary transition-colors"
                              disabled={!isVotingOpen || castVote.isPending}
                              onClick={() => handleVote(result.teamId)}
                            >
                              <div>
                                <div className="font-medium">{result.teamName}</div>
                                {result.projectTitle && (
                                  <div className="text-xs text-muted-foreground">{result.projectTitle}</div>
                                )}
                              </div>
                            </Button>
                          ))}
                        </div>
                      )}
                    </motion.div>
                  ) : (
                    <motion.div key="nopoll" initial={{ opacity: 0 }} animate={{ opacity: 1 }} className="flex flex-col items-center justify-center py-8 gap-3 text-muted-foreground">
                      <Clock className="w-8 h-8 opacity-30" />
                      <p className="text-sm font-mono">AWAITING POLL</p>
                    </motion.div>
                  )}
                </AnimatePresence>
              </CardContent>
            </Card>
          </motion.div>
        </div>
      </div>
    </div>
  );
}

function extractYouTubeId(url: string): string {
  const match = url.match(/(?:youtu\.be\/|v=|embed\/)([A-Za-z0-9_-]{11})/);
  return match ? match[1] : url;
}
