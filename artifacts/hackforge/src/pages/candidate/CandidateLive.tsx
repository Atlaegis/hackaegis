import { useState, useEffect } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { useToast } from "@/hooks/use-toast";
import {
  useGetEventStatus,
  useGetActivePoll,
  useGetMyVote,
  useCastVote,
  useGetLeaderboard,
} from "@workspace/api-client-react";
import type { PollResult } from "@workspace/api-client-react";
import {
  Tv, Video, Eye, Mic, MicOff, Activity, CheckCircle, Clock,
  Users, Star, Trophy, ArrowUp, Wifi, WifiOff
} from "lucide-react";
import { motion, AnimatePresence } from "framer-motion";

interface Team {
  id: number;
  name: string;
  projectTitle: string;
  description: string | null;
  githubUrl: string | null;
  hackathonId: number | null;
  isFinalist: boolean;
}

interface ActiveHackathon {
  id: number;
  jitsiRoom: string | null;
  meetMode: string;
  jitsiPassword: string | null;
  streamUrl: string | null;
  streamActive: boolean;
  phase: string;
}

const container = { hidden: {}, show: { transition: { staggerChildren: 0.06 } } };
const item = { hidden: { opacity: 0, y: 12 }, show: { opacity: 1, y: 0 } };

function extractYouTubeId(url: string): string {
  const match = url.match(/(?:youtu\.be\/|v=|embed\/)([A-Za-z0-9_-]{11})/);
  return match ? match[1] : url;
}

function JitsiMeet({ roomName, displayName }: { roomName: string; displayName: string }) {
  const encoded = encodeURIComponent(displayName);
  const config = [
    `userInfo.displayName=${encoded}`,
    "config.prejoinPageEnabled=false",
    "config.startWithVideoMuted=false",
    "config.startWithAudioMuted=false",
  ].join("&");
  const src = `https://meet.jit.si/${roomName}#${config}`;
  return (
    <div className="relative w-full rounded-lg overflow-hidden" style={{ paddingBottom: "56.25%" }}>
      <iframe
        className="absolute inset-0 w-full h-full"
        src={src}
        allow="camera; microphone; display-capture; fullscreen; autoplay"
        allowFullScreen
        title="HackAegis Live Meet"
      />
    </div>
  );
}

export default function CandidateLive({ token, team }: { token: string; team: Team | null }) {
  const { toast } = useToast();
  const [activeHackathon, setActiveHackathon] = useState<ActiveHackathon | null>(null);
  const [joinedMeet, setJoinedMeet] = useState(false);
  const [hackLoading, setHackLoading] = useState(true);

  const { data: eventStatus } = useGetEventStatus();
  const { data: activePoll, refetch: refetchPoll } = useGetActivePoll();
  const { data: myVote, refetch: refetchMyVote } = useGetMyVote();
  const { data: leaderboard } = useGetLeaderboard();
  const castVote = useCastVote();

  useEffect(() => {
    fetch("/api/hackathons/active", { headers: { Authorization: `Bearer ${token}` } })
      .then((r) => r.json())
      .then((d) => { if (d.id) setActiveHackathon(d); })
      .catch(() => {})
      .finally(() => setHackLoading(false));
  }, [token]);

  // Poll for live updates
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
        onError: (err: any) => {
          toast({ title: "Vote Failed", description: err.message, variant: "destructive" });
        },
      }
    );
  };

  const isVotingOpen = activePoll?.isActive && !activePoll?.isFrozen;
  const totalVotes = activePoll?.results?.reduce((s: number, r: PollResult) => s + r.voteCount, 0) ?? 0;

  const isFinale = activeHackathon?.phase === "finale" || eventStatus?.phase === "finale";
  const hasJitsi = !!(activeHackathon?.jitsiRoom) && (activeHackathon?.meetMode === "jitsi" || activeHackathon?.meetMode === "both");
  const hasYoutube = !!(activeHackathon?.streamUrl ?? eventStatus?.streamUrl) && (activeHackathon?.meetMode === "youtube" || activeHackathon?.meetMode === "both" || !activeHackathon);
  const isFinalist = team?.isFinalist === true;

  if (hackLoading) {
    return (
      <div className="flex justify-center items-center py-20 text-muted-foreground">
        <Clock className="w-5 h-5 animate-spin mr-2" /> Loading live feed...
      </div>
    );
  }

  return (
    <motion.div variants={container} initial="hidden" animate="show" className="space-y-6">
      {/* Header */}
      <motion.div variants={item} className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold font-mono">Live Hub</h1>
          <p className="text-muted-foreground text-sm mt-1">Watch the stream, vote in polls, and track the leaderboard.</p>
        </div>
        <div className="flex items-center gap-2">
          {(activeHackathon?.streamActive || hasJitsi) ? (
            <Badge className="bg-red-500/10 text-red-400 border-red-500/30 gap-1">
              <Wifi className="w-3 h-3" /> LIVE
            </Badge>
          ) : (
            <Badge variant="secondary" className="gap-1">
              <WifiOff className="w-3 h-3" /> OFFLINE
            </Badge>
          )}
          {isFinale && (
            <Badge className="bg-yellow-400/10 text-yellow-400 border-yellow-400/30 text-xs">FINALE</Badge>
          )}
        </div>
      </motion.div>

      {/* Live Stream / Meet */}
      <motion.div variants={item}>
        {isFinale && hasJitsi ? (
          isFinalist ? (
            <Card className="overflow-hidden border-yellow-400/30 bg-yellow-400/5">
              <CardHeader className="pb-2">
                <CardTitle className="flex items-center gap-2 text-base">
                  <div className="w-2 h-2 rounded-full bg-red-500 animate-pulse" />
                  Finals Live Meet
                  <Badge className="bg-yellow-400/20 text-yellow-400 border-yellow-400/30 text-xs ml-1">FINALIST</Badge>
                  <div className="ml-auto flex gap-2">
                    <Badge className="bg-green-500/10 text-green-400 border-green-500/30 text-xs gap-1"><Mic className="w-3 h-3" /> Mic</Badge>
                    <Badge className="bg-blue-500/10 text-blue-400 border-blue-500/30 text-xs gap-1"><Video className="w-3 h-3" /> Camera</Badge>
                  </div>
                </CardTitle>
                <p className="text-xs text-muted-foreground">You are a finalist - camera, mic, and screen share are enabled.</p>
              </CardHeader>
              <CardContent className="p-0 pb-3 px-3">
                {joinedMeet ? (
                  <JitsiMeet roomName={activeHackathon!.jitsiRoom!} displayName={team?.name ?? "Finalist"} />
                ) : (
                  <div className="flex flex-col items-center justify-center py-10 gap-4">
                    <div className="bg-yellow-400/10 p-4 rounded-full border border-yellow-400/20">
                      <Video className="w-10 h-10 text-yellow-400" />
                    </div>
                    <div className="text-center">
                      <p className="font-semibold">Finals Meet is Live!</p>
                      <p className="text-sm text-muted-foreground mt-1">Join as a finalist with full camera, mic, and screen share access.</p>
                    </div>
                    <Button className="gap-2 bg-yellow-500 hover:bg-yellow-600 text-black font-bold" onClick={() => setJoinedMeet(true)}>
                      <Video className="w-4 h-4" /> Join Finals Meet
                    </Button>
                  </div>
                )}
              </CardContent>
            </Card>
          ) : (
            <Card className="overflow-hidden border-chart-4/20">
              <CardContent className="py-10 flex flex-col items-center gap-4 text-center">
                <div className="bg-chart-4/10 p-4 rounded-full border border-chart-4/20">
                  <Eye className="w-10 h-10 text-chart-4" />
                </div>
                <div>
                  <div className="flex items-center gap-2 justify-center mb-2">
                    <div className="w-2 h-2 rounded-full bg-red-500 animate-pulse" />
                    <span className="font-mono font-bold text-sm">FINALS IN PROGRESS</span>
                  </div>
                  <p className="text-muted-foreground text-sm max-w-sm">
                    The finalists are presenting live. Use the polls below to participate and cheer on your favorite teams!
                  </p>
                </div>
                <div className="flex gap-2">
                  <Badge className="bg-chart-4/10 text-chart-4 border-chart-4/20 text-xs"><Mic className="w-3 h-3 mr-1" /> Finalists presenting</Badge>
                  <Badge variant="secondary" className="text-xs"><MicOff className="w-3 h-3 mr-1" /> View-only</Badge>
                </div>
              </CardContent>
            </Card>
          )
        ) : hasYoutube ? (
          <Card className="overflow-hidden border-chart-4/20">
            <CardContent className="p-0">
              <div className="relative w-full" style={{ paddingBottom: "56.25%" }}>
                <iframe
                  className="absolute inset-0 w-full h-full"
                  src={`https://www.youtube.com/embed/${extractYouTubeId(activeHackathon?.streamUrl ?? eventStatus?.streamUrl ?? "")}?autoplay=1`}
                  title="HackAegis Live Stream"
                  allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture"
                  allowFullScreen
                />
              </div>
            </CardContent>
          </Card>
        ) : (
          <Card className="overflow-hidden border-border">
            <CardContent className="p-0">
              <div className="flex flex-col items-center justify-center h-52 bg-card text-muted-foreground gap-4">
                <Tv className="w-12 h-12 opacity-30" />
                <div className="text-center">
                  <p className="font-mono font-semibold">STREAM OFFLINE</p>
                  <p className="text-sm mt-1">The live stream will appear here when it goes live.</p>
                </div>
              </div>
            </CardContent>
          </Card>
        )}
      </motion.div>

      {/* Voting + Leaderboard */}
      <div className="grid md:grid-cols-2 gap-6">
        {/* Voting Panel */}
        <motion.div variants={item}>
          <Card className="h-full border-chart-4/20">
            <CardHeader>
              <CardTitle className="flex items-center gap-2 text-base">
                <Activity className="w-4 h-4 text-chart-4" />
                {activePoll ? activePoll.question : "Live Voting"}
              </CardTitle>
            </CardHeader>
            <CardContent>
              <AnimatePresence mode="wait">
                {activePoll ? (
                  <motion.div key="poll" initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }} className="space-y-3">
                    {myVote?.hasVoted ? (
                      <div className="space-y-3">
                        <div className="flex items-center gap-2 text-green-400 text-sm mb-1">
                          <CheckCircle className="w-4 h-4" />
                          Vote recorded for <strong>{myVote.votedForTeamName}</strong>!
                        </div>
                        {activePoll.results?.map((result: PollResult) => {
                          const pct = result.percentage;
                          const isMyVote = result.teamId === myVote.votedForTeamId;
                          return (
                            <div key={result.teamId} className="space-y-1">
                              <div className="flex justify-between text-sm">
                                <span className={`flex items-center gap-1 ${isMyVote ? "text-chart-4 font-semibold" : ""}`}>
                                  {isMyVote && <CheckCircle className="w-3 h-3" />}{result.teamName}
                                </span>
                                <span className="text-muted-foreground font-mono">{pct}%</span>
                              </div>
                              <div className="h-2 rounded-full bg-muted overflow-hidden">
                                <motion.div
                                  className={`h-full rounded-full ${isMyVote ? "bg-chart-4" : "bg-muted-foreground/40"}`}
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
                      <div className="space-y-2">
                        {!isVotingOpen && <p className="text-amber-400 text-sm mb-2">Voting is currently closed.</p>}
                        {activePoll.results?.map((result: PollResult) => (
                          <Button
                            key={result.teamId}
                            variant="outline"
                            className="w-full justify-start h-12 text-left hover:border-chart-4 hover:text-chart-4 transition-colors"
                            disabled={!isVotingOpen || castVote.isPending}
                            onClick={() => handleVote(result.teamId)}
                          >
                            <div>
                              <div className="font-medium">{result.teamName}</div>
                              {result.projectTitle && <div className="text-xs text-muted-foreground">{result.projectTitle}</div>}
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
                    <p className="text-xs">Polls will appear here when the host activates one.</p>
                  </motion.div>
                )}
              </AnimatePresence>
            </CardContent>
          </Card>
        </motion.div>

        {/* Leaderboard */}
        <motion.div variants={item}>
          <Card className="h-full">
            <CardHeader>
              <CardTitle className="flex items-center gap-2 text-base">
                <Trophy className="w-4 h-4 text-chart-4" /> Live Leaderboard
              </CardTitle>
            </CardHeader>
            <CardContent>
              {leaderboard && Array.isArray(leaderboard) && leaderboard.length > 0 ? (
                <div className="space-y-2">
                  {leaderboard.slice(0, 10).map((entry: any, idx: number) => {
                    const isMyTeam = team && entry.teamId === team.id;
                    return (
                      <div
                        key={entry.teamId ?? idx}
                        className={`flex items-center gap-3 p-2 rounded-lg text-sm ${
                          isMyTeam ? "bg-chart-4/10 border border-chart-4/20" : "hover:bg-muted/50"
                        }`}
                      >
                        <span className={`w-6 h-6 rounded-full flex items-center justify-center text-xs font-bold ${
                          idx === 0 ? "bg-yellow-400/20 text-yellow-400" :
                          idx === 1 ? "bg-gray-300/20 text-gray-300" :
                          idx === 2 ? "bg-amber-600/20 text-amber-600" :
                          "bg-muted text-muted-foreground"
                        }`}>
                          {idx + 1}
                        </span>
                        <div className="flex-1 truncate">
                          <span className={`font-medium ${isMyTeam ? "text-chart-4" : ""}`}>
                            {entry.teamName ?? entry.name ?? `Team ${entry.teamId}`}
                          </span>
                          {isMyTeam && <Badge className="ml-2 bg-chart-4/10 text-chart-4 border-chart-4/20 text-[10px]">YOU</Badge>}
                        </div>
                        <span className="font-mono text-xs text-muted-foreground">
                          {entry.score ?? entry.totalScore ?? 0}pts
                        </span>
                      </div>
                    );
                  })}
                </div>
              ) : (
                <div className="flex flex-col items-center justify-center py-8 gap-3 text-muted-foreground">
                  <Trophy className="w-8 h-8 opacity-30" />
                  <p className="text-sm font-mono">NO DATA YET</p>
                  <p className="text-xs">Leaderboard will update as scores come in.</p>
                </div>
              )}
            </CardContent>
          </Card>
        </motion.div>
      </div>

      {/* Event Status */}
      <motion.div variants={item}>
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2 text-base">
              <Activity className="w-4 h-4 text-chart-4" /> Event Status
            </CardTitle>
          </CardHeader>
          <CardContent>
            {eventStatus ? (
              <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
                <div className="bg-muted/50 rounded-lg p-3">
                  <p className="text-xs text-muted-foreground mb-1">Event</p>
                  <p className="font-semibold text-sm truncate">{eventStatus.eventName}</p>
                </div>
                <div className="bg-muted/50 rounded-lg p-3">
                  <p className="text-xs text-muted-foreground mb-1">Phase</p>
                  <p className="font-mono font-semibold text-chart-4 text-sm capitalize">{eventStatus.phase}</p>
                </div>
                <div className="bg-muted/50 rounded-lg p-3">
                  <p className="text-xs text-muted-foreground mb-1">Stream</p>
                  <p className={`font-mono font-semibold text-sm ${eventStatus.streamActive ? "text-green-400" : "text-muted-foreground"}`}>
                    {eventStatus.streamActive ? "LIVE" : "OFFLINE"}
                  </p>
                </div>
                <div className="bg-muted/50 rounded-lg p-3">
                  <p className="text-xs text-muted-foreground mb-1">Your Team</p>
                  <p className="font-semibold text-sm truncate">{team?.name ?? "N/A"}</p>
                </div>
              </div>
            ) : (
              <div className="flex items-center gap-2 text-muted-foreground">
                <Clock className="w-4 h-4 animate-spin" />
                <span className="text-sm">Loading event data...</span>
              </div>
            )}
          </CardContent>
        </Card>
      </motion.div>
    </motion.div>
  );
}
