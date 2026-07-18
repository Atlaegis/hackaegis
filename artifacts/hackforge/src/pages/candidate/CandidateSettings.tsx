import { useState } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Separator } from "@/components/ui/separator";
import { Settings, LogOut, Bell, Shield, User, Eye, EyeOff, Globe } from "lucide-react";
import { useAuthTokens } from "@/lib/auth";
import { setAuthTokenGetter } from "@workspace/api-client-react";
import { useLocation } from "wouter";
import { motion } from "framer-motion";

interface Props {
  token: string;
  profile: { id: number; label: string; teamId: number | null };
  team: { id: number; name: string; projectTitle: string; isFinalist?: boolean } | null;
}

const container = { hidden: {}, show: { transition: { staggerChildren: 0.06 } } };
const item = { hidden: { opacity: 0, y: 12 }, show: { opacity: 1, y: 0 } };

export default function CandidateSettings({ token, profile, team }: Props) {
  const [, setLocation] = useLocation();
  const { logout } = useAuthTokens();
  const [notifications, setNotifications] = useState(() => {
    try {
      return JSON.parse(localStorage.getItem("hackaegis_notifications") ?? "{}");
    } catch {
      return {};
    }
  });
  const [privacy, setPrivacy] = useState(() => {
    try {
      return JSON.parse(localStorage.getItem("hackaegis_privacy") ?? "{}");
    } catch {
      return {};
    }
  });

  const handleLogout = async () => {
    try {
      await fetch("/api/auth/logout", {
        method: "POST",
        headers: { Authorization: `Bearer ${token}` },
      });
    } catch {}
    logout();
    setAuthTokenGetter(() => null);
    setLocation("/");
  };

  const toggleNotification = (key: string) => {
    const updated = { ...notifications, [key]: !notifications[key] };
    setNotifications(updated);
    localStorage.setItem("hackaegis_notifications", JSON.stringify(updated));
  };

  const togglePrivacy = (key: string) => {
    const updated = { ...privacy, [key]: !privacy[key] };
    setPrivacy(updated);
    localStorage.setItem("hackaegis_privacy", JSON.stringify(updated));
  };

  return (
    <motion.div variants={container} initial="hidden" animate="show" className="space-y-6">
      {/* Header */}
      <motion.div variants={item}>
        <div>
          <h1 className="text-2xl font-bold font-mono">Settings</h1>
          <p className="text-sm text-muted-foreground mt-1">Manage your account and preferences.</p>
        </div>
      </motion.div>

      {/* Profile Info */}
      <motion.div variants={item}>
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2 text-base">
              <User className="w-4 h-4 text-chart-4" /> Profile
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <div className="p-3 rounded-lg bg-muted/30 border border-border">
                <p className="text-xs text-muted-foreground mb-1">Code ID</p>
                <p className="text-sm font-mono font-medium">{profile.id}</p>
              </div>
              <div className="p-3 rounded-lg bg-muted/30 border border-border">
                <p className="text-xs text-muted-foreground mb-1">Display Name</p>
                <p className="text-sm font-medium">{profile.label || "Participant"}</p>
              </div>
              {team && (
                <>
                  <div className="p-3 rounded-lg bg-muted/30 border border-border">
                    <p className="text-xs text-muted-foreground mb-1">Team</p>
                    <p className="text-sm font-medium">{team.name}</p>
                  </div>
                  <div className="p-3 rounded-lg bg-muted/30 border border-border">
                    <p className="text-xs text-muted-foreground mb-1">Project</p>
                    <p className="text-sm font-medium truncate">{team.projectTitle}</p>
                  </div>
                </>
              )}
            </div>
            <div className="flex items-center gap-2 pt-1">
              <Badge className="bg-green-500/10 text-green-400 border-green-500/20 text-xs">
                Session Active
              </Badge>
              {team?.isFinalist && (
                <Badge className="bg-yellow-400/10 text-yellow-400 border-yellow-400/30 text-xs">
                  Finalist
                </Badge>
              )}
            </div>
          </CardContent>
        </Card>
      </motion.div>

      {/* Notification Preferences */}
      <motion.div variants={item}>
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2 text-base">
              <Bell className="w-4 h-4 text-chart-4" /> Notification Preferences
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-1">
            {[
              { key: "announcements", label: "Announcements", desc: "Receive hackathon announcements and updates" },
              { key: "results", label: "Results Notifications", desc: "Get notified when results are published" },
              { key: "deadlines", label: "Deadline Reminders", desc: "Reminders before submission deadlines" },
              { key: "live", label: "Live Event Alerts", desc: "Notifications when live sessions begin" },
            ].map((notif, idx) => (
              <div key={notif.key}>
                <div className="flex items-center justify-between py-3">
                  <div>
                    <p className="text-sm font-medium">{notif.label}</p>
                    <p className="text-xs text-muted-foreground">{notif.desc}</p>
                  </div>
                  <button
                    onClick={() => toggleNotification(notif.key)}
                    className={`w-11 h-6 rounded-full transition-colors relative flex-shrink-0 ${
                      notifications[notif.key] ? "bg-chart-4" : "bg-muted-foreground/30"
                    }`}
                    aria-label={`Toggle ${notif.label}`}
                  >
                    <div
                      className={`absolute top-1 w-4 h-4 rounded-full bg-white shadow-sm transition-transform ${
                        notifications[notif.key] ? "translate-x-6" : "translate-x-1"
                      }`}
                    />
                  </button>
                </div>
                {idx < 3 && <Separator />}
              </div>
            ))}
          </CardContent>
        </Card>
      </motion.div>

      {/* Privacy Settings */}
      <motion.div variants={item}>
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2 text-base">
              <Shield className="w-4 h-4 text-chart-4" /> Privacy
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-1">
            {[
              {
                key: "showOnLeaderboard",
                label: "Show on Leaderboard",
                desc: "Display your team on the public leaderboard",
                icon: Globe,
              },
              {
                key: "publicProfile",
                label: "Public Profile",
                desc: "Allow other participants to see your team profile",
                icon: Eye,
              },
            ].map((priv, idx) => (
              <div key={priv.key}>
                <div className="flex items-center justify-between py-3">
                  <div className="flex items-center gap-3">
                    <div className="bg-muted p-1.5 rounded-md">
                      <priv.icon className="w-3.5 h-3.5 text-muted-foreground" />
                    </div>
                    <div>
                      <p className="text-sm font-medium">{priv.label}</p>
                      <p className="text-xs text-muted-foreground">{priv.desc}</p>
                    </div>
                  </div>
                  <button
                    onClick={() => togglePrivacy(priv.key)}
                    className={`w-11 h-6 rounded-full transition-colors relative flex-shrink-0 ${
                      privacy[priv.key] ? "bg-chart-4" : "bg-muted-foreground/30"
                    }`}
                    aria-label={`Toggle ${priv.label}`}
                  >
                    <div
                      className={`absolute top-1 w-4 h-4 rounded-full bg-white shadow-sm transition-transform ${
                        privacy[priv.key] ? "translate-x-6" : "translate-x-1"
                      }`}
                    />
                  </button>
                </div>
                {idx < 1 && <Separator />}
              </div>
            ))}
            <div className="pt-3 mt-2 border-t border-border">
              <p className="text-xs text-muted-foreground">
                Your data is only visible to the hackathon organizers and assigned judges. Team information
                is shared within your team members. Session tokens expire after 24 hours of inactivity.
              </p>
            </div>
          </CardContent>
        </Card>
      </motion.div>

      {/* Logout / Danger Zone */}
      <motion.div variants={item}>
        <Card className="border-destructive/20">
          <CardHeader>
            <CardTitle className="flex items-center gap-2 text-base text-destructive">
              <LogOut className="w-4 h-4" /> Session
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm font-medium">End Session</p>
                <p className="text-xs text-muted-foreground">
                  Log out and clear your session. This frees up the login code for reuse.
                </p>
              </div>
              <Button variant="destructive" size="sm" onClick={handleLogout} className="gap-1.5">
                <LogOut className="w-3.5 h-3.5" /> Logout
              </Button>
            </div>
          </CardContent>
        </Card>
      </motion.div>
    </motion.div>
  );
}
