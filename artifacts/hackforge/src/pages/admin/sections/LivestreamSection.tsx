import { useState, useEffect, useRef, useCallback, useMemo } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Switch } from "@/components/ui/switch";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import {
  Radio,
  Play,
  Pause,
  Square,
  RotateCcw,
  Timer,
  Video,
  ExternalLink,
  ChevronUp,
  ChevronDown,
  Users,
  Trophy,
  Rocket,
  Tv,
  Loader2,
  Check,
  Clock,
  SkipForward,
  Presentation,
  Plus,
  Layers,
  Activity,
  Shield,
} from "lucide-react";
import { useAdminFetch, adminApi } from "../lib/api";
import type { Hackathon, Team } from "../lib/types";
import StatCard from "../components/shared/StatCard";

// ─── Types ──────────────────────────────────────────────────────────────────

type StreamMode = "youtube" | "jitsi" | "both";

type PresentationStatus = "waiting" | "presenting" | "completed" | "skipped";

interface QueueItem {
  teamId: number;
  teamName: string;
  projectTitle: string;
  status: PresentationStatus;
}

// ─── Constants ──────────────────────────────────────────────────────────────

const JITSI_BASE_URL = "https://meet.jit.si";
const TIMER_PRESETS = [5, 7, 10, 15];
const REFRESH_INTERVAL = 15_000;

// ─── Helpers ────────────────────────────────────────────────────────────────

function generateRoomName(): string {
  const chars = "abcdefghijklmnopqrstuvwxyz0123456789";
  let result = "hackaegis-finals-";
  for (let i = 0; i < 8; i++) {
    result += chars.charAt(Math.floor(Math.random() * chars.length));
  }
  return result;
}

function formatTime(seconds: number): string {
  const m = Math.floor(seconds / 60);
  const s = seconds % 60;
  return `${m.toString().padStart(2, "0")}:${s.toString().padStart(2, "0")}`;
}

function getTimerColor(remaining: number, total: number): string {
  if (total === 0) return "text-muted-foreground";
  const ratio = remaining / total;
  if (ratio > 0.5) return "text-green-500";
  if (ratio > 0.25) return "text-amber-500";
  return "text-red-500";
}

function getTimerBg(remaining: number, total: number): string {
  if (total === 0) return "bg-muted/30";
  const ratio = remaining / total;
  if (ratio > 0.5) return "bg-green-500/10 border-green-500/30";
  if (ratio > 0.25) return "bg-amber-500/10 border-amber-500/30";
  return "bg-red-500/10 border-red-500/30";
}

// ─── Main Component ─────────────────────────────────────────────────────────

export default function LivestreamSection() {
  // API data
  const { data: hackathons, refetch: refetchHackathons } = useAdminFetch<Hackathon[]>("/api/hackathons");
  const { data: teams, refetch: refetchTeams } = useAdminFetch<Team[]>("/api/teams");

  // Stream control state
  const [streamUrl, setStreamUrl] = useState("");
  const [streamMode, setStreamMode] = useState<StreamMode>("jitsi");
  const [jitsiRoom, setJitsiRoom] = useState("");
  const [jitsiPassword, setJitsiPassword] = useState("");
  const [streamActive, setStreamActive] = useState(false);
  const [saving, setSaving] = useState(false);
  const [launching, setLaunching] = useState(false);

  // Presentation queue (client-side state)
  const [queue, setQueue] = useState<QueueItem[]>([]);

  // Timer state
  const [timerDuration, setTimerDuration] = useState(7); // minutes
  const [timerRemaining, setTimerRemaining] = useState(0); // seconds
  const [timerTotal, setTimerTotal] = useState(0); // seconds
  const [timerRunning, setTimerRunning] = useState(false);
  const timerRef = useRef<ReturnType<typeof setInterval> | null>(null);

  // Refresh interval
  const refreshRef = useRef<ReturnType<typeof setInterval> | null>(null);

  // ─── Derived data ───────────────────────────────────────────────────────────

  const activeHackathon = useMemo(() => {
    return hackathons?.find((h) => h.status === "active") ?? null;
  }, [hackathons]);

  const finalistTeams = useMemo(() => {
    return (teams ?? []).filter((t) => t.isFinalist);
  }, [teams]);

  const currentPresenting = useMemo(() => {
    return queue.find((q) => q.status === "presenting") ?? null;
  }, [queue]);

  const waitingCount = useMemo(() => queue.filter((q) => q.status === "waiting").length, [queue]);
  const completedCount = useMemo(() => queue.filter((q) => q.status === "completed").length, [queue]);

  // ─── Sync state from active hackathon ───────────────────────────────────────

  useEffect(() => {
    if (activeHackathon) {
      setStreamUrl(activeHackathon.streamUrl ?? "");
      setStreamActive(activeHackathon.streamActive);
      setJitsiRoom(activeHackathon.jitsiRoom ?? "");
      setJitsiPassword(activeHackathon.jitsiPassword ?? "");
      const mode = activeHackathon.meetMode ?? "jitsi";
      if (mode === "stream") setStreamMode("youtube");
      else if (mode === "hybrid") setStreamMode("both");
      else setStreamMode("jitsi");
    }
  }, [activeHackathon]);

  // Initialize queue from finalist teams when they load
  useEffect(() => {
    if (finalistTeams.length > 0 && queue.length === 0) {
      setQueue(
        finalistTeams.map((t) => ({
          teamId: t.id,
          teamName: t.name,
          projectTitle: t.projectTitle,
          status: "waiting" as PresentationStatus,
        }))
      );
    }
  }, [finalistTeams, queue.length]);

  // ─── Auto-refresh ───────────────────────────────────────────────────────────

  useEffect(() => {
    refreshRef.current = setInterval(() => {
      refetchHackathons();
      refetchTeams();
    }, REFRESH_INTERVAL);
    return () => {
      if (refreshRef.current) clearInterval(refreshRef.current);
    };
  }, [refetchHackathons, refetchTeams]);

  // ─── Timer logic ────────────────────────────────────────────────────────────

  useEffect(() => {
    if (timerRunning && timerRemaining > 0) {
      timerRef.current = setInterval(() => {
        setTimerRemaining((prev) => {
          if (prev <= 1) {
            setTimerRunning(false);
            return 0;
          }
          return prev - 1;
        });
      }, 1000);
    }
    return () => {
      if (timerRef.current) clearInterval(timerRef.current);
    };
  }, [timerRunning, timerRemaining]);

  const startTimer = useCallback(() => {
    const totalSeconds = timerDuration * 60;
    setTimerTotal(totalSeconds);
    setTimerRemaining(totalSeconds);
    setTimerRunning(true);
  }, [timerDuration]);

  const pauseTimer = useCallback(() => {
    setTimerRunning(false);
  }, []);

  const resumeTimer = useCallback(() => {
    if (timerRemaining > 0) setTimerRunning(true);
  }, [timerRemaining]);

  const resetTimer = useCallback(() => {
    setTimerRunning(false);
    setTimerRemaining(0);
    setTimerTotal(0);
  }, []);

  const addExtraTime = useCallback(() => {
    setTimerRemaining((prev) => prev + 120);
    setTimerTotal((prev) => prev + 120);
  }, []);

  // ─── Stream actions ─────────────────────────────────────────────────────────

  const saveStreamConfig = useCallback(async () => {
    if (!activeHackathon) return;
    setSaving(true);
    try {
      const meetMode = streamMode === "youtube" ? "stream" : streamMode === "both" ? "hybrid" : "jitsi";
      await adminApi("PUT", `/api/hackathons/${activeHackathon.id}`, {
        streamUrl: streamUrl || null,
        streamActive,
        jitsiRoom: jitsiRoom || null,
        jitsiPassword: jitsiPassword || null,
        meetMode,
      });
      refetchHackathons();
    } catch (err) {
      console.error("Save stream config failed:", err);
    } finally {
      setSaving(false);
    }
  }, [activeHackathon, streamUrl, streamActive, jitsiRoom, jitsiPassword, streamMode, refetchHackathons]);

  const toggleStream = useCallback(async () => {
    if (!activeHackathon) return;
    const newActive = !streamActive;
    setStreamActive(newActive);
    try {
      await adminApi("PUT", `/api/hackathons/${activeHackathon.id}`, {
        streamActive: newActive,
      });
      refetchHackathons();
    } catch (err) {
      console.error("Toggle stream failed:", err);
      setStreamActive(!newActive); // revert on failure
    }
  }, [activeHackathon, streamActive, refetchHackathons]);

  const launchFinalsMeet = useCallback(async () => {
    if (!activeHackathon) return;
    setLaunching(true);
    try {
      const room = jitsiRoom || generateRoomName();
      setJitsiRoom(room);
      await adminApi("PUT", `/api/hackathons/${activeHackathon.id}`, {
        phase: "finale",
        jitsiRoom: room,
        meetMode: "jitsi",
        streamActive: true,
      });
      setStreamActive(true);
      setStreamMode("jitsi");
      refetchHackathons();
    } catch (err) {
      console.error("Launch finals meet failed:", err);
    } finally {
      setLaunching(false);
    }
  }, [activeHackathon, jitsiRoom, refetchHackathons]);

  const updateJitsiConfig = useCallback(async () => {
    if (!activeHackathon) return;
    setSaving(true);
    try {
      const room = jitsiRoom || generateRoomName();
      setJitsiRoom(room);
      await adminApi("PUT", `/api/hackathons/${activeHackathon.id}`, {
        jitsiRoom: room,
        jitsiPassword: jitsiPassword || null,
      });
      refetchHackathons();
    } catch (err) {
      console.error("Update Jitsi config failed:", err);
    } finally {
      setSaving(false);
    }
  }, [activeHackathon, jitsiRoom, jitsiPassword, refetchHackathons]);

  // ─── Finalist management ────────────────────────────────────────────────────

  const toggleFinalist = useCallback(
    async (teamId: number) => {
      try {
        await adminApi("POST", `/api/teams/${teamId}/finalist`);
        refetchTeams();
      } catch (err) {
        console.error("Toggle finalist failed:", err);
      }
    },
    [refetchTeams]
  );

  // ─── Queue management ──────────────────────────────────────────────────────

  const moveUp = useCallback((index: number) => {
    if (index <= 0) return;
    setQueue((prev) => {
      const next = [...prev];
      [next[index - 1], next[index]] = [next[index], next[index - 1]];
      return next;
    });
  }, []);

  const moveDown = useCallback((index: number) => {
    setQueue((prev) => {
      if (index >= prev.length - 1) return prev;
      const next = [...prev];
      [next[index], next[index + 1]] = [next[index + 1], next[index]];
      return next;
    });
  }, []);

  const setPresenting = useCallback((index: number) => {
    setQueue((prev) =>
      prev.map((item, i) => ({
        ...item,
        status: i === index ? "presenting" : item.status === "presenting" ? "waiting" : item.status,
      }))
    );
  }, []);

  const markCompleted = useCallback((index: number) => {
    setQueue((prev) =>
      prev.map((item, i) => ({
        ...item,
        status: i === index ? "completed" : item.status,
      }))
    );
  }, []);

  const markSkipped = useCallback((index: number) => {
    setQueue((prev) =>
      prev.map((item, i) => ({
        ...item,
        status: i === index ? "skipped" : item.status,
      }))
    );
  }, []);

  // ─── Render ─────────────────────────────────────────────────────────────────

  return (
    <div className="space-y-6">
      {/* ─── STREAM STATUS BANNER ──────────────────────────────────────────── */}
      <motion.div
        initial={{ opacity: 0, y: -8 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.3 }}
      >
        <Card className={streamActive ? "border-red-500/40 bg-red-500/5" : "border-border"}>
          <CardContent className="pt-4 pb-4">
            <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3">
              <div className="flex items-center gap-4">
                {/* Status Indicator */}
                <div className="flex items-center gap-2">
                  {streamActive ? (
                    <motion.div
                      className="flex items-center gap-2"
                      initial={{ scale: 0.9 }}
                      animate={{ scale: 1 }}
                    >
                      <div className="relative">
                        <div className="w-4 h-4 rounded-full bg-red-500" />
                        <motion.div
                          className="absolute inset-0 w-4 h-4 rounded-full bg-red-500"
                          animate={{ scale: [1, 1.8], opacity: [0.6, 0] }}
                          transition={{ duration: 1.5, repeat: Infinity }}
                        />
                      </div>
                      <span className="text-lg font-bold text-red-500 tracking-wider">LIVE</span>
                    </motion.div>
                  ) : (
                    <div className="flex items-center gap-2">
                      <div className="w-4 h-4 rounded-full bg-muted-foreground/40" />
                      <span className="text-lg font-bold text-muted-foreground tracking-wider">OFFLINE</span>
                    </div>
                  )}
                </div>

                {/* Mode & Room Info */}
                <div className="flex items-center gap-2 flex-wrap">
                  <Badge variant="outline" className="text-xs">
                    {streamMode === "youtube" ? "YouTube" : streamMode === "jitsi" ? "Jitsi Meet" : "YouTube + Jitsi"}
                  </Badge>
                  {jitsiRoom && (streamMode === "jitsi" || streamMode === "both") && (
                    <Badge variant="secondary" className="text-xs font-mono">
                      {jitsiRoom}
                    </Badge>
                  )}
                  {activeHackathon && (
                    <Badge variant="outline" className="text-xs">
                      Phase: {activeHackathon.phase}
                    </Badge>
                  )}
                </div>
              </div>

              {/* Quick Open Room */}
              {jitsiRoom && (streamMode === "jitsi" || streamMode === "both") && (
                <Button
                  size="sm"
                  variant="outline"
                  onClick={() => window.open(`${JITSI_BASE_URL}/${jitsiRoom}`, "_blank")}
                >
                  <ExternalLink className="w-3.5 h-3.5 mr-1.5" />
                  Open Room
                </Button>
              )}
            </div>
          </CardContent>
        </Card>
      </motion.div>

      {/* ─── LIVE MONITORING DASHBOARD ─────────────────────────────────────── */}
      <motion.div
        className="grid grid-cols-2 md:grid-cols-4 gap-3"
        initial={{ opacity: 0, y: 12 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.3, delay: 0.1 }}
      >
        <StatCard
          label="Stream Status"
          value={streamActive ? "Live" : "Offline"}
          icon={Radio}
          color={streamActive ? "text-red-500" : "text-muted-foreground"}
        />
        <StatCard
          label="Finalist Teams"
          value={finalistTeams.length}
          icon={Trophy}
          color="text-amber-500"
        />
        <StatCard
          label="Current Phase"
          value={activeHackathon?.phase ? activeHackathon.phase.charAt(0).toUpperCase() + activeHackathon.phase.slice(1) : "---"}
          icon={Layers}
          color="text-primary"
        />
        <StatCard
          label="Meet Mode"
          value={streamMode === "youtube" ? "YouTube" : streamMode === "jitsi" ? "Jitsi" : "Both"}
          icon={Video}
          color="text-chart-2"
        />
      </motion.div>

      {/* ─── MAIN CONTROLS GRID ────────────────────────────────────────────── */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Left Column: Stream Control + Jitsi Config */}
        <div className="space-y-6">
          {/* STREAM CONTROL */}
          <motion.div
            initial={{ opacity: 0, x: -12 }}
            animate={{ opacity: 1, x: 0 }}
            transition={{ duration: 0.3, delay: 0.15 }}
          >
            <Card>
              <CardHeader className="pb-3 pt-4 px-4">
                <CardTitle className="text-sm flex items-center gap-2">
                  <Tv className="w-4 h-4 text-primary" />
                  Stream Control
                </CardTitle>
              </CardHeader>
              <CardContent className="px-4 pb-4 space-y-4">
                {/* Launch Finals Meet */}
                <Button
                  className="w-full h-12 text-base font-semibold bg-gradient-to-r from-red-600 to-orange-600 hover:from-red-700 hover:to-orange-700 text-white"
                  onClick={launchFinalsMeet}
                  disabled={launching || !activeHackathon}
                >
                  {launching ? (
                    <Loader2 className="w-5 h-5 mr-2 animate-spin" />
                  ) : (
                    <Rocket className="w-5 h-5 mr-2" />
                  )}
                  Launch Finals Meet
                </Button>

                {/* Start/Stop Stream */}
                <div className="flex items-center gap-3">
                  <Button
                    className={`flex-1 ${
                      streamActive
                        ? "bg-red-600 hover:bg-red-700 text-white"
                        : "bg-green-600 hover:bg-green-700 text-white"
                    }`}
                    onClick={toggleStream}
                    disabled={!activeHackathon}
                  >
                    {streamActive ? (
                      <>
                        <Square className="w-4 h-4 mr-2" />
                        Stop Stream
                      </>
                    ) : (
                      <>
                        <Play className="w-4 h-4 mr-2" />
                        Start Stream
                      </>
                    )}
                  </Button>
                </div>

                {/* Stream URL */}
                <div className="space-y-2">
                  <Label className="text-xs">YouTube Embed URL</Label>
                  <Input
                    value={streamUrl}
                    onChange={(e) => setStreamUrl(e.target.value)}
                    placeholder="https://www.youtube.com/embed/..."
                    className="font-mono text-xs"
                  />
                </div>

                {/* Mode Selector */}
                <div className="space-y-2">
                  <Label className="text-xs">Stream Mode</Label>
                  <Select value={streamMode} onValueChange={(v) => setStreamMode(v as StreamMode)}>
                    <SelectTrigger>
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="youtube">YouTube Only</SelectItem>
                      <SelectItem value="jitsi">Jitsi Meet Only</SelectItem>
                      <SelectItem value="both">Both (YouTube + Jitsi)</SelectItem>
                    </SelectContent>
                  </Select>
                </div>

                {/* Save */}
                <Button
                  size="sm"
                  variant="outline"
                  className="w-full"
                  onClick={saveStreamConfig}
                  disabled={saving || !activeHackathon}
                >
                  {saving ? <Loader2 className="w-3.5 h-3.5 mr-1.5 animate-spin" /> : <Check className="w-3.5 h-3.5 mr-1.5" />}
                  Save Stream Config
                </Button>
              </CardContent>
            </Card>
          </motion.div>

          {/* JITSI CONFIGURATION */}
          <motion.div
            initial={{ opacity: 0, x: -12 }}
            animate={{ opacity: 1, x: 0 }}
            transition={{ duration: 0.3, delay: 0.2 }}
          >
            <Card>
              <CardHeader className="pb-3 pt-4 px-4">
                <CardTitle className="text-sm flex items-center gap-2">
                  <Video className="w-4 h-4 text-primary" />
                  Jitsi Configuration
                </CardTitle>
              </CardHeader>
              <CardContent className="px-4 pb-4 space-y-4">
                <div className="space-y-2">
                  <Label className="text-xs">Room Name</Label>
                  <Input
                    value={jitsiRoom}
                    onChange={(e) => setJitsiRoom(e.target.value)}
                    placeholder="Auto-generates if empty"
                    className="font-mono text-xs"
                  />
                  <p className="text-[10px] text-muted-foreground">
                    Leave empty to auto-generate. Room URL: {JITSI_BASE_URL}/{jitsiRoom || "<room-name>"}
                  </p>
                </div>

                <div className="space-y-2">
                  <Label className="text-xs">Password (optional)</Label>
                  <Input
                    type="password"
                    value={jitsiPassword}
                    onChange={(e) => setJitsiPassword(e.target.value)}
                    placeholder="Optional room password"
                  />
                </div>

                <Button
                  size="sm"
                  variant="outline"
                  className="w-full"
                  onClick={updateJitsiConfig}
                  disabled={saving || !activeHackathon}
                >
                  {saving ? <Loader2 className="w-3.5 h-3.5 mr-1.5 animate-spin" /> : <Check className="w-3.5 h-3.5 mr-1.5" />}
                  Update Config
                </Button>
              </CardContent>
            </Card>
          </motion.div>
        </div>

        {/* Right Column: Timer + Queue */}
        <div className="space-y-6">
          {/* PRESENTATION TIMER */}
          <motion.div
            initial={{ opacity: 0, x: 12 }}
            animate={{ opacity: 1, x: 0 }}
            transition={{ duration: 0.3, delay: 0.15 }}
          >
            <Card className={`border ${getTimerBg(timerRemaining, timerTotal)}`}>
              <CardHeader className="pb-3 pt-4 px-4">
                <CardTitle className="text-sm flex items-center gap-2">
                  <Timer className="w-4 h-4 text-primary" />
                  Presentation Timer
                  {currentPresenting && (
                    <Badge variant="secondary" className="text-[10px] ml-auto">
                      {currentPresenting.teamName}
                    </Badge>
                  )}
                </CardTitle>
              </CardHeader>
              <CardContent className="px-4 pb-4 space-y-4">
                {/* Timer Display */}
                <div className="text-center py-4">
                  <motion.div
                    className={`text-6xl font-mono font-bold tabular-nums ${getTimerColor(timerRemaining, timerTotal)}`}
                    key={timerRemaining}
                    initial={{ scale: timerRunning ? 1.02 : 1 }}
                    animate={{ scale: 1 }}
                    transition={{ duration: 0.15 }}
                  >
                    {formatTime(timerRemaining)}
                  </motion.div>
                  {timerTotal > 0 && (
                    <p className="text-xs text-muted-foreground mt-1">
                      of {formatTime(timerTotal)} total
                    </p>
                  )}
                </div>

                {/* Duration Selector */}
                <div className="space-y-2">
                  <Label className="text-xs">Duration (minutes)</Label>
                  <div className="flex gap-2">
                    {TIMER_PRESETS.map((m) => (
                      <Button
                        key={m}
                        size="sm"
                        variant={timerDuration === m ? "default" : "outline"}
                        className="flex-1 h-8 text-xs"
                        onClick={() => setTimerDuration(m)}
                        disabled={timerRunning}
                      >
                        {m}m
                      </Button>
                    ))}
                  </div>
                </div>

                {/* Timer Controls */}
                <div className="flex gap-2">
                  {!timerRunning && timerRemaining === 0 && (
                    <Button className="flex-1 bg-green-600 hover:bg-green-700 text-white" onClick={startTimer}>
                      <Play className="w-4 h-4 mr-1.5" />
                      Start
                    </Button>
                  )}
                  {timerRunning && (
                    <Button className="flex-1 bg-amber-600 hover:bg-amber-700 text-white" onClick={pauseTimer}>
                      <Pause className="w-4 h-4 mr-1.5" />
                      Pause
                    </Button>
                  )}
                  {!timerRunning && timerRemaining > 0 && (
                    <Button className="flex-1 bg-green-600 hover:bg-green-700 text-white" onClick={resumeTimer}>
                      <Play className="w-4 h-4 mr-1.5" />
                      Resume
                    </Button>
                  )}
                  <Button
                    variant="outline"
                    onClick={resetTimer}
                    disabled={timerRemaining === 0 && !timerRunning}
                  >
                    <RotateCcw className="w-4 h-4" />
                  </Button>
                  <Button
                    variant="outline"
                    onClick={addExtraTime}
                    disabled={timerRemaining === 0}
                    title="+2 minutes"
                  >
                    <Plus className="w-3 h-3" />
                    2m
                  </Button>
                </div>
              </CardContent>
            </Card>
          </motion.div>

          {/* PRESENTATION QUEUE */}
          <motion.div
            initial={{ opacity: 0, x: 12 }}
            animate={{ opacity: 1, x: 0 }}
            transition={{ duration: 0.3, delay: 0.2 }}
          >
            <Card>
              <CardHeader className="pb-3 pt-4 px-4">
                <CardTitle className="text-sm flex items-center justify-between">
                  <div className="flex items-center gap-2">
                    <Presentation className="w-4 h-4 text-primary" />
                    Presentation Queue
                  </div>
                  <div className="flex items-center gap-2 text-xs font-normal text-muted-foreground">
                    <span>{completedCount}/{queue.length} done</span>
                    <span>{waitingCount} waiting</span>
                  </div>
                </CardTitle>
              </CardHeader>
              <CardContent className="px-4 pb-4">
                {queue.length === 0 ? (
                  <div className="text-center py-8 text-muted-foreground">
                    <Trophy className="w-8 h-8 mx-auto mb-2 opacity-40" />
                    <p className="text-sm">No finalist teams in queue</p>
                    <p className="text-xs mt-1">Mark teams as finalists to add them here</p>
                  </div>
                ) : (
                  <div className="space-y-2 max-h-[400px] overflow-y-auto pr-1">
                    <AnimatePresence mode="popLayout">
                      {queue.map((item, index) => (
                        <motion.div
                          key={item.teamId}
                          layout
                          initial={{ opacity: 0, y: 8 }}
                          animate={{ opacity: 1, y: 0 }}
                          exit={{ opacity: 0, scale: 0.95 }}
                          transition={{ duration: 0.2 }}
                          className={`flex items-center gap-2 p-2.5 rounded-lg border transition-colors ${
                            item.status === "presenting"
                              ? "border-green-500/50 bg-green-500/10"
                              : item.status === "completed"
                              ? "border-muted bg-muted/30 opacity-60"
                              : item.status === "skipped"
                              ? "border-muted bg-muted/20 opacity-50"
                              : "border-border"
                          }`}
                        >
                          {/* Order number */}
                          <span className="text-xs font-mono text-muted-foreground w-5 text-center flex-shrink-0">
                            {index + 1}
                          </span>

                          {/* Team info */}
                          <div className="flex-1 min-w-0">
                            <p className="text-sm font-medium truncate">{item.teamName}</p>
                            <p className="text-[10px] text-muted-foreground truncate">{item.projectTitle}</p>
                          </div>

                          {/* Status badge */}
                          <QueueStatusBadge status={item.status} />

                          {/* Actions */}
                          <div className="flex items-center gap-0.5 flex-shrink-0">
                            {item.status === "waiting" && (
                              <Button
                                size="sm"
                                variant="ghost"
                                className="h-6 w-6 p-0 text-green-600 hover:text-green-700 hover:bg-green-500/10"
                                onClick={() => setPresenting(index)}
                                title="Set as presenting"
                              >
                                <Play className="w-3 h-3" />
                              </Button>
                            )}
                            {item.status === "presenting" && (
                              <Button
                                size="sm"
                                variant="ghost"
                                className="h-6 w-6 p-0 text-green-600 hover:text-green-700 hover:bg-green-500/10"
                                onClick={() => markCompleted(index)}
                                title="Mark completed"
                              >
                                <Check className="w-3 h-3" />
                              </Button>
                            )}
                            {(item.status === "waiting" || item.status === "presenting") && (
                              <Button
                                size="sm"
                                variant="ghost"
                                className="h-6 w-6 p-0 text-muted-foreground hover:text-foreground"
                                onClick={() => markSkipped(index)}
                                title="Skip"
                              >
                                <SkipForward className="w-3 h-3" />
                              </Button>
                            )}
                            <Button
                              size="sm"
                              variant="ghost"
                              className="h-6 w-6 p-0 text-muted-foreground hover:text-foreground"
                              onClick={() => moveUp(index)}
                              disabled={index === 0}
                              title="Move up"
                            >
                              <ChevronUp className="w-3 h-3" />
                            </Button>
                            <Button
                              size="sm"
                              variant="ghost"
                              className="h-6 w-6 p-0 text-muted-foreground hover:text-foreground"
                              onClick={() => moveDown(index)}
                              disabled={index === queue.length - 1}
                              title="Move down"
                            >
                              <ChevronDown className="w-3 h-3" />
                            </Button>
                          </div>
                        </motion.div>
                      ))}
                    </AnimatePresence>
                  </div>
                )}
              </CardContent>
            </Card>
          </motion.div>
        </div>
      </div>

      {/* ─── FINALIST MANAGEMENT ───────────────────────────────────────────── */}
      <motion.div
        initial={{ opacity: 0, y: 12 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.3, delay: 0.25 }}
      >
        <Card>
          <CardHeader className="pb-3 pt-4 px-4">
            <CardTitle className="text-sm flex items-center justify-between">
              <div className="flex items-center gap-2">
                <Shield className="w-4 h-4 text-primary" />
                Finalist Management
              </div>
              <Badge variant="secondary" className="text-xs">
                {finalistTeams.length} finalist(s)
              </Badge>
            </CardTitle>
          </CardHeader>
          <CardContent className="px-4 pb-4">
            {(teams ?? []).length === 0 ? (
              <div className="text-center py-8 text-muted-foreground">
                <Users className="w-8 h-8 mx-auto mb-2 opacity-40" />
                <p className="text-sm">No teams loaded</p>
              </div>
            ) : (
              <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-2 max-h-[360px] overflow-y-auto pr-1">
                {(teams ?? []).map((team) => (
                  <div
                    key={team.id}
                    className={`flex items-center gap-3 p-3 rounded-lg border transition-colors ${
                      team.isFinalist
                        ? "border-amber-500/40 bg-amber-500/5"
                        : "border-border"
                    }`}
                  >
                    <div className="flex-1 min-w-0">
                      <p className="text-sm font-medium truncate">{team.name}</p>
                      <p className="text-[10px] text-muted-foreground truncate">{team.projectTitle}</p>
                    </div>
                    <div className="flex items-center gap-2 flex-shrink-0">
                      {team.isFinalist && (
                        <Trophy className="w-3.5 h-3.5 text-amber-500" />
                      )}
                      <Switch
                        checked={team.isFinalist}
                        onCheckedChange={() => toggleFinalist(team.id)}
                      />
                    </div>
                  </div>
                ))}
              </div>
            )}
          </CardContent>
        </Card>
      </motion.div>
    </div>
  );
}

// ─── Queue Status Badge ──────────────────────────────────────────────────────

function QueueStatusBadge({ status }: { status: PresentationStatus }) {
  switch (status) {
    case "presenting":
      return (
        <Badge className="bg-green-500/15 text-green-600 border-green-500/30 text-[10px] gap-1">
          <Activity className="w-2.5 h-2.5" />
          Presenting
        </Badge>
      );
    case "completed":
      return (
        <Badge className="bg-muted text-muted-foreground border-muted text-[10px] gap-1">
          <Check className="w-2.5 h-2.5" />
          Done
        </Badge>
      );
    case "skipped":
      return (
        <Badge className="bg-muted text-muted-foreground border-muted text-[10px] gap-1">
          <SkipForward className="w-2.5 h-2.5" />
          Skipped
        </Badge>
      );
    default:
      return (
        <Badge variant="outline" className="text-[10px] gap-1">
          <Clock className="w-2.5 h-2.5" />
          Waiting
        </Badge>
      );
  }
}
