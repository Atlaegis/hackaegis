import { useState, useEffect } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Video, Tv, ExternalLink, Activity } from "lucide-react";
import { motion } from "framer-motion";

interface Props {
  token: string;
  profile: { label: string };
}

export default function JudgeStream({ token, profile }: Props) {
  const [hackathon, setHackathon] = useState<{ jitsiRoom: string | null; meetMode: string; streamUrl: string | null; streamActive: boolean; phase: string } | null>(null);
  const [joined, setJoined] = useState(false);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    fetch("/api/hackathons/active", { headers: { Authorization: `Bearer ${token}` } })
      .then((r) => r.json())
      .then((d) => { if (d.id) setHackathon(d); })
      .catch(() => {})
      .finally(() => setLoading(false));
  }, [token]);

  if (loading) return <div className="flex justify-center py-20 text-muted-foreground"><Activity className="w-5 h-5 animate-spin mr-2" /> Loading...</div>;

  const hasJitsi = !!(hackathon?.jitsiRoom) && (hackathon.meetMode === "jitsi" || hackathon.meetMode === "both");
  const isFinale = hackathon?.phase === "finale";

  if (hasJitsi && isFinale) {
    const displayName = encodeURIComponent(`Judge: ${profile.label}`);
    const config = [`userInfo.displayName=${displayName}`, "config.prejoinPageEnabled=false", "config.startWithVideoMuted=false", "config.startWithAudioMuted=false"].join("&");
    const src = `https://meet.jit.si/${hackathon!.jitsiRoom}#${config}`;

    return (
      <div className="space-y-6">
        <div className="flex items-center justify-between">
          <h1 className="text-2xl font-bold font-mono flex items-center gap-2">
            <div className="w-2 h-2 rounded-full bg-red-500 animate-pulse" />
            Finals Live Meet
          </h1>
          <Badge className="bg-red-500/20 text-red-400 border-red-400/30">JUDGE HOST</Badge>
        </div>

        {joined ? (
          <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }}>
            <Card className="overflow-hidden border-red-500/30">
              <CardContent className="p-0">
                <div className="relative w-full" style={{ paddingBottom: "56.25%" }}>
                  <iframe className="absolute inset-0 w-full h-full" src={src} allow="camera; microphone; display-capture; fullscreen; autoplay" allowFullScreen title="Judge Meet" />
                </div>
              </CardContent>
            </Card>
            <div className="flex justify-between items-center mt-3">
              <p className="text-xs text-muted-foreground">Room: {hackathon!.jitsiRoom}</p>
              <Button size="sm" variant="outline" onClick={() => window.open(`https://meet.jit.si/${hackathon!.jitsiRoom}`, "_blank")}>
                <ExternalLink className="w-3 h-3 mr-1" /> Open External
              </Button>
            </div>
          </motion.div>
        ) : (
          <Card className="border-red-500/20">
            <CardContent className="flex flex-col items-center justify-center py-16 gap-4">
              <div className="bg-red-500/10 p-5 rounded-full border border-red-500/20">
                <Video className="w-12 h-12 text-red-400" />
              </div>
              <div className="text-center">
                <p className="font-bold text-lg">Finals Meet is Live</p>
                <p className="text-sm text-muted-foreground mt-1">Join as a judge host to watch presentations.</p>
              </div>
              <Button className="gap-2 bg-red-600 hover:bg-red-700" onClick={() => setJoined(true)}>
                <Video className="w-4 h-4" /> Go Live
              </Button>
            </CardContent>
          </Card>
        )}
      </div>
    );
  }

  // YouTube fallback
  const streamUrl = hackathon?.streamUrl;
  const extractId = (url: string) => { const m = url.match(/(?:youtu\.be\/|v=|embed\/)([A-Za-z0-9_-]{11})/); return m ? m[1] : url; };

  return (
    <div className="space-y-6">
      <h1 className="text-2xl font-bold font-mono flex items-center gap-2"><Tv className="w-6 h-6" /> Livestream</h1>
      <Card className="overflow-hidden">
        <CardHeader>
          <CardTitle className="flex items-center gap-2 text-base">
            <div className={`w-2 h-2 rounded-full ${hackathon?.streamActive ? "bg-red-500 animate-pulse" : "bg-muted-foreground"}`} />
            Live Stream
            {hackathon?.streamActive && <Badge className="bg-red-500/20 text-red-400 border-red-400/30 text-xs">LIVE</Badge>}
          </CardTitle>
        </CardHeader>
        <CardContent className="p-0">
          {streamUrl ? (
            <div className="relative w-full" style={{ paddingBottom: "56.25%" }}>
              <iframe className="absolute inset-0 w-full h-full" src={`https://www.youtube.com/embed/${extractId(streamUrl)}?autoplay=1`} title="Stream" allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture" allowFullScreen />
            </div>
          ) : (
            <div className="flex flex-col items-center justify-center h-48 text-muted-foreground gap-3">
              <Tv className="w-10 h-10 opacity-20" />
              <p className="font-mono text-sm">STREAM OFFLINE</p>
              <p className="text-xs">The stream will go live when the admin starts it.</p>
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  );
}
