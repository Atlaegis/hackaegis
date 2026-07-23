import { useState, useEffect, useCallback } from "react";
import { motion } from "framer-motion";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
import { Switch } from "@/components/ui/switch";
import { Label } from "@/components/ui/label";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import {
  Settings,
  Globe,
  UserPlus,
  Calendar,
  Shield,
  Bell,
  Plug,
  History,
  Loader2,
  Save,
  Database,
  Video,
  Youtube,
  Clock,
  Users,
  Info,
  Ban,
} from "lucide-react";
import { useAdminFetch, adminApi } from "../lib/api";
import { useToast } from "@/hooks/use-toast";
import type { Hackathon, AdminLog } from "../lib/types";

// ---------------------------------------------------------------------------
// Types
// ---------------------------------------------------------------------------

interface EventStatus {
  phase: string;
  streamUrl: string | null;
  streamActive: boolean;
  resultsPublished: boolean;
  judgeResultsVisible: boolean;
  eventName: string | null;
  tagline: string | null;
  updatedAt: string | null;
}

interface RegistrationConfig {
  maxTeamSize: number;
  minTeamSize: number;
  registrationFee: string;
  registrationOpen: boolean;
}

interface NotificationConfig {
  emailOnApproval: boolean;
  emailOnRejection: boolean;
  inAppAnnouncements: boolean;
}

const PHASES = ["registration", "submission", "elimination", "finale"];

const CONFIG_TABS = [
  { id: "general", label: "General", icon: Globe },
  { id: "registration", label: "Registration", icon: UserPlus },
  { id: "event", label: "Event", icon: Calendar },
  { id: "security", label: "Security", icon: Shield },
  { id: "notifications", label: "Notifications", icon: Bell },
  { id: "integrations", label: "Integrations", icon: Plug },
  { id: "history", label: "History", icon: History },
] as const;

type ConfigTab = (typeof CONFIG_TABS)[number]["id"];

const STORAGE_KEY_REGISTRATION = "hackaegis_config_registration";
const STORAGE_KEY_NOTIFICATIONS = "hackaegis_config_notifications";

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------

function loadRegistrationConfig(): RegistrationConfig {
  try {
    const stored = localStorage.getItem(STORAGE_KEY_REGISTRATION);
    if (stored) return JSON.parse(stored);
  } catch {}
  return { maxTeamSize: 4, minTeamSize: 2, registrationFee: "Free", registrationOpen: true };
}

function saveRegistrationConfig(config: RegistrationConfig) {
  localStorage.setItem(STORAGE_KEY_REGISTRATION, JSON.stringify(config));
}

function loadNotificationConfig(): NotificationConfig {
  try {
    const stored = localStorage.getItem(STORAGE_KEY_NOTIFICATIONS);
    if (stored) return JSON.parse(stored);
  } catch {}
  return { emailOnApproval: true, emailOnRejection: true, inAppAnnouncements: true };
}

function saveNotificationConfig(config: NotificationConfig) {
  localStorage.setItem(STORAGE_KEY_NOTIFICATIONS, JSON.stringify(config));
}

function capitalize(str: string): string {
  return str.charAt(0).toUpperCase() + str.slice(1);
}

function formatTimestamp(ts: string): string {
  const d = new Date(ts);
  return d.toLocaleString("en-IN", {
    day: "2-digit",
    month: "short",
    year: "numeric",
    hour: "2-digit",
    minute: "2-digit",
  });
}

// ---------------------------------------------------------------------------
// Component
// ---------------------------------------------------------------------------

export default function ConfigSection() {
  const { toast } = useToast();
  const [activeTab, setActiveTab] = useState<ConfigTab>("general");

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center gap-3">
        <Settings className="w-5 h-5 text-primary" />
        <h2 className="text-lg font-semibold">Configuration</h2>
      </div>

      {/* Tab Navigation */}
      <div className="flex flex-wrap gap-1 p-1 bg-muted/50 rounded-lg">
        {CONFIG_TABS.map(({ id, label, icon: Icon }) => (
          <Button
            key={id}
            variant={activeTab === id ? "default" : "ghost"}
            size="sm"
            className="h-8 text-xs gap-1.5"
            onClick={() => setActiveTab(id)}
          >
            <Icon className="w-3.5 h-3.5" />
            <span className="hidden sm:inline">{label}</span>
          </Button>
        ))}
      </div>

      {/* Tab Content */}
      <motion.div
        key={activeTab}
        initial={{ opacity: 0, y: 8 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.2 }}
      >
        {activeTab === "general" && <GeneralSettings toast={toast} />}
        {activeTab === "registration" && <RegistrationSettings toast={toast} />}
        {activeTab === "event" && <EventSettings toast={toast} />}
        {activeTab === "security" && <SecuritySettings toast={toast} />}
        {activeTab === "notifications" && <NotificationSettings toast={toast} />}
        {activeTab === "integrations" && <IntegrationStatus />}
        {activeTab === "history" && <ConfigHistory />}
      </motion.div>
    </div>
  );
}

// ---------------------------------------------------------------------------
// 1. General Settings
// ---------------------------------------------------------------------------

function GeneralSettings({ toast }: { toast: ReturnType<typeof useToast>["toast"] }) {
  const { data: eventStatus, loading } = useAdminFetch<EventStatus>("/api/event/status");
  const [form, setForm] = useState({
    eventName: "",
    tagline: "",
    phase: "registration",
    streamUrl: "",
    streamActive: false,
    resultsPublished: false,
    judgeResultsVisible: false,
  });
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    if (eventStatus) {
      setForm({
        eventName: eventStatus.eventName ?? "",
        tagline: eventStatus.tagline ?? "",
        phase: eventStatus.phase ?? "registration",
        streamUrl: eventStatus.streamUrl ?? "",
        streamActive: eventStatus.streamActive ?? false,
        resultsPublished: eventStatus.resultsPublished ?? false,
        judgeResultsVisible: eventStatus.judgeResultsVisible ?? false,
      });
    }
  }, [eventStatus]);

  const handleSave = async () => {
    setSaving(true);
    try {
      await adminApi("PUT", "/api/event/status", {
        eventName: form.eventName || null,
        tagline: form.tagline || null,
        phase: form.phase,
        streamUrl: form.streamUrl || null,
        streamActive: form.streamActive,
        resultsPublished: form.resultsPublished,
        judgeResultsVisible: form.judgeResultsVisible,
      });
      toast({ title: "General settings saved", description: "Platform configuration updated successfully." });
    } catch (err: unknown) {
      toast({
        title: "Failed to save",
        description: err instanceof Error ? err.message : "Unknown error",
        variant: "destructive",
      });
    } finally {
      setSaving(false);
    }
  };

  if (loading) {
    return (
      <Card>
        <CardContent className="py-12 flex justify-center">
          <Loader2 className="w-5 h-5 animate-spin text-muted-foreground" />
        </CardContent>
      </Card>
    );
  }

  return (
    <Card>
      <CardHeader className="pb-4">
        <CardTitle className="text-sm flex items-center gap-2">
          <Globe className="w-4 h-4 text-primary" />
          General Settings
        </CardTitle>
      </CardHeader>
      <CardContent className="space-y-5">
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          <div className="space-y-2">
            <Label>Platform Name</Label>
            <Input
              value={form.eventName}
              onChange={(e) => setForm({ ...form, eventName: e.target.value })}
              placeholder="HackAegis"
            />
          </div>
          <div className="space-y-2">
            <Label>Tagline</Label>
            <Input
              value={form.tagline}
              onChange={(e) => setForm({ ...form, tagline: e.target.value })}
              placeholder="Build. Innovate. Disrupt."
            />
          </div>
        </div>

        <div className="space-y-2">
          <Label>Current Phase</Label>
          <Select value={form.phase} onValueChange={(v) => setForm({ ...form, phase: v })}>
            <SelectTrigger className="w-56">
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              {PHASES.map((p) => (
                <SelectItem key={p} value={p}>
                  {capitalize(p)}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>

        <div className="space-y-2">
          <Label>Stream URL</Label>
          <Input
            value={form.streamUrl}
            onChange={(e) => setForm({ ...form, streamUrl: e.target.value })}
            placeholder="https://youtube.com/live/..."
          />
        </div>

        <div className="space-y-4 pt-2">
          <div className="flex items-center justify-between">
            <div className="space-y-0.5">
              <Label>Stream Active</Label>
              <p className="text-xs text-muted-foreground">Enable live stream for participants</p>
            </div>
            <Switch
              checked={form.streamActive}
              onCheckedChange={(v) => setForm({ ...form, streamActive: v })}
            />
          </div>

          <div className="flex items-center justify-between">
            <div className="space-y-0.5">
              <Label>Results Published</Label>
              <p className="text-xs text-muted-foreground">Make final results visible to participants</p>
            </div>
            <Switch
              checked={form.resultsPublished}
              onCheckedChange={(v) => setForm({ ...form, resultsPublished: v })}
            />
          </div>

          <div className="flex items-center justify-between">
            <div className="space-y-0.5">
              <Label>Judge Results Visible</Label>
              <p className="text-xs text-muted-foreground">Allow judges to see each other's scores</p>
            </div>
            <Switch
              checked={form.judgeResultsVisible}
              onCheckedChange={(v) => setForm({ ...form, judgeResultsVisible: v })}
            />
          </div>
        </div>

        <div className="flex justify-end pt-4 border-t">
          <Button onClick={handleSave} disabled={saving}>
            {saving ? <Loader2 className="w-4 h-4 mr-2 animate-spin" /> : <Save className="w-4 h-4 mr-2" />}
            Save General Settings
          </Button>
        </div>
      </CardContent>
    </Card>
  );
}

// ---------------------------------------------------------------------------
// 2. Registration Settings
// ---------------------------------------------------------------------------

function RegistrationSettings({ toast }: { toast: ReturnType<typeof useToast>["toast"] }) {
  const [config, setConfig] = useState<RegistrationConfig>(loadRegistrationConfig);

  const handleSave = () => {
    saveRegistrationConfig(config);
    toast({ title: "Registration settings saved", description: "Settings stored locally." });
  };

  return (
    <Card>
      <CardHeader className="pb-4">
        <CardTitle className="text-sm flex items-center gap-2">
          <UserPlus className="w-4 h-4 text-primary" />
          Registration Settings
        </CardTitle>
      </CardHeader>
      <CardContent className="space-y-5">
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          <div className="space-y-2">
            <Label>Maximum Team Size</Label>
            <Input
              type="number"
              min={1}
              max={10}
              value={config.maxTeamSize}
              onChange={(e) => setConfig({ ...config, maxTeamSize: parseInt(e.target.value) || 4 })}
            />
          </div>
          <div className="space-y-2">
            <Label>Minimum Team Size</Label>
            <Input
              type="number"
              min={1}
              max={10}
              value={config.minTeamSize}
              onChange={(e) => setConfig({ ...config, minTeamSize: parseInt(e.target.value) || 2 })}
            />
          </div>
        </div>

        <div className="space-y-2">
          <Label>Registration Fee</Label>
          <Input
            value={config.registrationFee}
            onChange={(e) => setConfig({ ...config, registrationFee: e.target.value })}
            placeholder="Free"
          />
          <p className="text-xs text-muted-foreground">Display text for the registration fee (e.g. "Free", "₹200")</p>
        </div>

        <div className="flex items-center justify-between">
          <div className="space-y-0.5">
            <Label>Registration Status</Label>
            <p className="text-xs text-muted-foreground">
              {config.registrationOpen ? "Registrations are currently open" : "Registrations are closed"}
            </p>
          </div>
          <Switch
            checked={config.registrationOpen}
            onCheckedChange={(v) => setConfig({ ...config, registrationOpen: v })}
          />
        </div>

        <div className="bg-muted/50 rounded-lg p-3 text-xs text-muted-foreground">
          <Info className="w-3.5 h-3.5 inline mr-1.5" />
          These settings are stored locally and control display values on the registration form.
        </div>

        <div className="flex justify-end pt-4 border-t">
          <Button onClick={handleSave}>
            <Save className="w-4 h-4 mr-2" />
            Save Registration Settings
          </Button>
        </div>
      </CardContent>
    </Card>
  );
}

// ---------------------------------------------------------------------------
// 3. Event Settings
// ---------------------------------------------------------------------------

function EventSettings({ toast }: { toast: ReturnType<typeof useToast>["toast"] }) {
  const { data: hackathons, loading } = useAdminFetch<Hackathon[]>("/api/hackathons");
  const [saving, setSaving] = useState(false);

  const activeHackathon = hackathons?.find((h) => h.status === "active") ?? null;

  const [form, setForm] = useState({
    submissionLocked: false,
    phase: "registration",
    prizePool: "",
    grandPrize: "",
  });

  useEffect(() => {
    if (activeHackathon) {
      setForm({
        submissionLocked: activeHackathon.submissionLocked,
        phase: activeHackathon.phase,
        prizePool: activeHackathon.prizePool ?? "",
        grandPrize: activeHackathon.grandPrize ?? "",
      });
    }
  }, [hackathons]);

  const handleSave = async () => {
    if (!activeHackathon) return;
    setSaving(true);
    try {
      await adminApi("PUT", `/api/hackathons/${activeHackathon.id}`, {
        submissionLocked: form.submissionLocked,
        phase: form.phase,
        prizePool: form.prizePool || null,
        grandPrize: form.grandPrize || null,
      });
      toast({ title: "Event settings saved", description: `Updated ${activeHackathon.name}.` });
    } catch (err: unknown) {
      toast({
        title: "Failed to save",
        description: err instanceof Error ? err.message : "Unknown error",
        variant: "destructive",
      });
    } finally {
      setSaving(false);
    }
  };

  if (loading) {
    return (
      <Card>
        <CardContent className="py-12 flex justify-center">
          <Loader2 className="w-5 h-5 animate-spin text-muted-foreground" />
        </CardContent>
      </Card>
    );
  }

  return (
    <Card>
      <CardHeader className="pb-4">
        <CardTitle className="text-sm flex items-center gap-2">
          <Calendar className="w-4 h-4 text-primary" />
          Event Settings
        </CardTitle>
      </CardHeader>
      <CardContent className="space-y-5">
        {/* Active Hackathon Display */}
        <div className="flex items-center gap-3 p-3 bg-muted/50 rounded-lg">
          <Calendar className="w-4 h-4 text-muted-foreground" />
          <div className="flex-1">
            <p className="text-sm font-medium">
              {activeHackathon ? activeHackathon.name : "No active hackathon"}
            </p>
            {activeHackathon && (
              <p className="text-xs text-muted-foreground">
                Status: <Badge variant="default" className="text-[10px] ml-1">{activeHackathon.status}</Badge>
              </p>
            )}
          </div>
        </div>

        {activeHackathon ? (
          <>
            <div className="flex items-center justify-between">
              <div className="space-y-0.5">
                <Label>Submission Locked</Label>
                <p className="text-xs text-muted-foreground">Prevent teams from submitting or editing projects</p>
              </div>
              <Switch
                checked={form.submissionLocked}
                onCheckedChange={(v) => setForm({ ...form, submissionLocked: v })}
              />
            </div>

            <div className="space-y-2">
              <Label>Phase</Label>
              <Select value={form.phase} onValueChange={(v) => setForm({ ...form, phase: v })}>
                <SelectTrigger className="w-56">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  {PHASES.map((p) => (
                    <SelectItem key={p} value={p}>
                      {capitalize(p)}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label>Prize Pool</Label>
                <Input
                  value={form.prizePool}
                  onChange={(e) => setForm({ ...form, prizePool: e.target.value })}
                  placeholder="e.g. ₹50,000"
                />
              </div>
              <div className="space-y-2">
                <Label>Grand Prize</Label>
                <Input
                  value={form.grandPrize}
                  onChange={(e) => setForm({ ...form, grandPrize: e.target.value })}
                  placeholder="e.g. ₹25,000"
                />
              </div>
            </div>

            <div className="flex justify-end pt-4 border-t">
              <Button onClick={handleSave} disabled={saving}>
                {saving ? <Loader2 className="w-4 h-4 mr-2 animate-spin" /> : <Save className="w-4 h-4 mr-2" />}
                Save Event Settings
              </Button>
            </div>
          </>
        ) : (
          <div className="text-center py-6 text-sm text-muted-foreground">
            <Calendar className="w-8 h-8 mx-auto mb-2 opacity-40" />
            No active hackathon. Activate one from the Events section to configure it here.
          </div>
        )}
      </CardContent>
    </Card>
  );
}

// ---------------------------------------------------------------------------
// 4. Authentication & Security
// ---------------------------------------------------------------------------

function SecuritySettings({ toast }: { toast: ReturnType<typeof useToast>["toast"] }) {
  const handleTerminateSessions = () => {
    toast({ title: "Coming soon", description: "Session termination is not yet implemented." });
  };

  return (
    <Card>
      <CardHeader className="pb-4">
        <CardTitle className="text-sm flex items-center gap-2">
          <Shield className="w-4 h-4 text-primary" />
          Authentication & Security
        </CardTitle>
      </CardHeader>
      <CardContent className="space-y-5">
        {/* Session Info */}
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          <div className="p-4 bg-muted/50 rounded-lg space-y-1">
            <div className="flex items-center gap-2">
              <Clock className="w-4 h-4 text-muted-foreground" />
              <span className="text-xs text-muted-foreground">Session Timeout</span>
            </div>
            <p className="text-lg font-semibold">24 hours</p>
            <p className="text-xs text-muted-foreground">Tokens expire after this duration</p>
          </div>
          <div className="p-4 bg-muted/50 rounded-lg space-y-1">
            <div className="flex items-center gap-2">
              <Users className="w-4 h-4 text-muted-foreground" />
              <span className="text-xs text-muted-foreground">Active Sessions</span>
            </div>
            <p className="text-lg font-semibold">N/A</p>
            <p className="text-xs text-muted-foreground">Session tracking not yet implemented</p>
          </div>
        </div>

        {/* Auth Model Info */}
        <div className="p-4 border rounded-lg space-y-2">
          <div className="flex items-center gap-2">
            <Info className="w-4 h-4 text-blue-500" />
            <span className="text-sm font-medium">Authentication Model</span>
          </div>
          <p className="text-xs text-muted-foreground leading-relaxed">
            HackAegis uses a code-based authentication system with no traditional passwords.
            Three role types exist: Participant codes (single-use, format HACKAEGIS_PART_XXXXXXXXXX),
            Admin codes (reusable, format HACKAEGIS_ADMIN@XX), and Judge codes (reusable, format HACKAEGIS_JUDGE_XXXXXX).
            Each code grants access to the corresponding portal upon successful login.
          </p>
        </div>

        {/* Terminate Sessions */}
        <div className="flex items-center justify-between pt-4 border-t">
          <div className="space-y-0.5">
            <Label>Terminate All Sessions</Label>
            <p className="text-xs text-muted-foreground">Force all users to re-authenticate</p>
          </div>
          <Button variant="destructive" size="sm" onClick={handleTerminateSessions}>
            <Ban className="w-4 h-4 mr-2" />
            Terminate All
          </Button>
        </div>
      </CardContent>
    </Card>
  );
}

// ---------------------------------------------------------------------------
// 5. Notification Settings
// ---------------------------------------------------------------------------

function NotificationSettings({ toast }: { toast: ReturnType<typeof useToast>["toast"] }) {
  const [config, setConfig] = useState<NotificationConfig>(loadNotificationConfig);

  const handleSave = () => {
    saveNotificationConfig(config);
    toast({ title: "Notification preferences saved", description: "Settings stored locally." });
  };

  return (
    <Card>
      <CardHeader className="pb-4">
        <CardTitle className="text-sm flex items-center gap-2">
          <Bell className="w-4 h-4 text-primary" />
          Notification Settings
        </CardTitle>
      </CardHeader>
      <CardContent className="space-y-5">
        <div className="flex items-center justify-between">
          <div className="space-y-0.5">
            <Label>Email on Registration Approval</Label>
            <p className="text-xs text-muted-foreground">Send email when a registration is approved</p>
          </div>
          <Switch
            checked={config.emailOnApproval}
            onCheckedChange={(v) => setConfig({ ...config, emailOnApproval: v })}
          />
        </div>

        <div className="flex items-center justify-between">
          <div className="space-y-0.5">
            <Label>Email on Rejection</Label>
            <p className="text-xs text-muted-foreground">Send email when a registration is rejected</p>
          </div>
          <Switch
            checked={config.emailOnRejection}
            onCheckedChange={(v) => setConfig({ ...config, emailOnRejection: v })}
          />
        </div>

        <div className="flex items-center justify-between">
          <div className="space-y-0.5">
            <Label>In-App Announcements</Label>
            <p className="text-xs text-muted-foreground">Show announcements as in-app notifications</p>
          </div>
          <Switch
            checked={config.inAppAnnouncements}
            onCheckedChange={(v) => setConfig({ ...config, inAppAnnouncements: v })}
          />
        </div>

        <div className="bg-muted/50 rounded-lg p-3 text-xs text-muted-foreground">
          <Info className="w-3.5 h-3.5 inline mr-1.5" />
          These are UI preferences stored locally. Email delivery requires a configured email service.
        </div>

        <div className="flex justify-end pt-4 border-t">
          <Button onClick={handleSave}>
            <Save className="w-4 h-4 mr-2" />
            Save Notification Settings
          </Button>
        </div>
      </CardContent>
    </Card>
  );
}

// ---------------------------------------------------------------------------
// 6. Integration Status
// ---------------------------------------------------------------------------

function IntegrationStatus() {
  const { data: eventStatus } = useAdminFetch<EventStatus>("/api/event/status");
  const { data: hackathons } = useAdminFetch<Hackathon[]>("/api/hackathons");

  const activeHackathon = hackathons?.find((h) => h.status === "active") ?? null;
  const jitsiRoom = activeHackathon?.jitsiRoom ?? null;
  const streamUrl = eventStatus?.streamUrl ?? activeHackathon?.streamUrl ?? null;

  const integrations = [
    {
      name: "Neon PostgreSQL",
      icon: Database,
      status: "connected" as const,
      detail: "Primary database",
    },
    {
      name: "Jitsi Meet",
      icon: Video,
      status: jitsiRoom ? ("connected" as const) : ("not_configured" as const),
      detail: jitsiRoom ? `Room: ${jitsiRoom}` : "No room configured",
    },
    {
      name: "YouTube / Stream",
      icon: Youtube,
      status: streamUrl ? ("connected" as const) : ("not_configured" as const),
      detail: streamUrl ? streamUrl : "No stream URL set",
    },
  ];

  return (
    <Card>
      <CardHeader className="pb-4">
        <CardTitle className="text-sm flex items-center gap-2">
          <Plug className="w-4 h-4 text-primary" />
          Integration Status
        </CardTitle>
      </CardHeader>
      <CardContent>
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
          {integrations.map((integration) => (
            <div
              key={integration.name}
              className="p-4 border rounded-lg space-y-2"
            >
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-2">
                  <integration.icon className="w-4 h-4 text-muted-foreground" />
                  <span className="text-sm font-medium">{integration.name}</span>
                </div>
                <Badge
                  variant={integration.status === "connected" ? "default" : "secondary"}
                  className={
                    integration.status === "connected"
                      ? "bg-green-500/10 text-green-600 border-green-500/30 text-[10px]"
                      : "text-[10px]"
                  }
                >
                  {integration.status === "connected" ? "Connected" : "Not Configured"}
                </Badge>
              </div>
              <p className="text-xs text-muted-foreground truncate">{integration.detail}</p>
            </div>
          ))}
        </div>
      </CardContent>
    </Card>
  );
}

// ---------------------------------------------------------------------------
// 7. Configuration History
// ---------------------------------------------------------------------------

function ConfigHistory() {
  const { data: logs, loading } = useAdminFetch<AdminLog[]>("/api/admin/logs");

  const configLogs = (logs ?? []).filter((log) => {
    const lower = log.action.toLowerCase();
    return (
      lower.includes("update_event_status") ||
      lower.includes("update_hackathon") ||
      lower.includes("event_status") ||
      lower.includes("config")
    );
  });

  if (loading) {
    return (
      <Card>
        <CardContent className="py-12 flex justify-center">
          <Loader2 className="w-5 h-5 animate-spin text-muted-foreground" />
        </CardContent>
      </Card>
    );
  }

  return (
    <Card>
      <CardHeader className="pb-4">
        <CardTitle className="text-sm flex items-center gap-2">
          <History className="w-4 h-4 text-primary" />
          Configuration History
        </CardTitle>
      </CardHeader>
      <CardContent>
        {configLogs.length === 0 ? (
          <div className="text-center py-8 text-sm text-muted-foreground">
            <History className="w-8 h-8 mx-auto mb-2 opacity-40" />
            No configuration changes recorded yet.
          </div>
        ) : (
          <div className="space-y-2 max-h-96 overflow-y-auto">
            {configLogs.slice(0, 50).map((log) => (
              <div
                key={log.id}
                className="flex items-start gap-3 p-3 rounded-lg hover:bg-muted/50 transition-colors"
              >
                <div className="w-2 h-2 rounded-full bg-primary mt-1.5 shrink-0" />
                <div className="flex-1 min-w-0">
                  <div className="flex items-center gap-2">
                    <span className="text-sm font-medium">{log.action}</span>
                  </div>
                  {log.details && (
                    <p className="text-xs text-muted-foreground mt-0.5 truncate">{log.details}</p>
                  )}
                  <p className="text-[10px] text-muted-foreground mt-1">
                    {formatTimestamp(log.createdAt)}
                  </p>
                </div>
              </div>
            ))}
          </div>
        )}
      </CardContent>
    </Card>
  );
}
