import { useState, useEffect } from "react";
import { useLocation } from "wouter";
import { useAuthTokens } from "@/lib/auth";
import { setAuthTokenGetter } from "@workspace/api-client-react";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { Terminal } from "lucide-react";
import {
  LayoutDashboard, Globe, ClipboardList, Users,
  Scale, Trophy, BarChart2, Video,
  Settings, FileText, Eye, ScrollText,
} from "lucide-react";
import { motion } from "framer-motion";
import AdminLayout from "./components/AdminLayout";
import type { NavItem } from "./lib/types";

// Section components (core - fully built)
import DashboardSection from "./sections/DashboardSection";
import EventsSection from "./sections/EventsSection";
import RegistrationsSection from "./sections/RegistrationsSection";
import TeamsSection from "./sections/TeamsSection";
import JudgesSection from "./sections/JudgesSection";
import ScoresSection from "./sections/ScoresSection";
import PollsSection from "./sections/PollsSection";
import LivestreamSection from "./sections/LivestreamSection";
import AnnouncementsSection from "./sections/AnnouncementsSection";

const NAV_ITEMS: NavItem[] = [
  { id: "dashboard", label: "Dashboard", icon: LayoutDashboard, group: "core" },
  { id: "events", label: "Events", icon: Globe, group: "core" },
  { id: "registrations", label: "Registrations", icon: ClipboardList, group: "core" },
  { id: "teams", label: "Teams", icon: Users, group: "core" },
  { id: "judges", label: "Judges", icon: Scale, group: "operations" },
  { id: "scores", label: "Scores", icon: Trophy, group: "operations" },
  { id: "polls", label: "Polls", icon: BarChart2, group: "operations" },
  { id: "live", label: "Live", icon: Video, group: "operations" },
  { id: "config", label: "Config", icon: Settings, group: "operations" },
  { id: "content", label: "Content", icon: FileText, group: "operations" },
  { id: "portal", label: "Access Portal", icon: Eye, group: "operations" },
  { id: "logs", label: "Logs", icon: ScrollText, group: "operations" },
];

export default function AdminPanel() {
  const [, setLocation] = useLocation();
  const { getAdminToken, adminLogout } = useAuthTokens();
  const adminToken = getAdminToken();
  const [activeSection, setActiveSection] = useState("dashboard");

  useEffect(() => {
    if (adminToken) {
      setAuthTokenGetter(() => localStorage.getItem("hackaegis_admin_token"));
    }
  }, [adminToken]);

  if (!adminToken) {
    return (
      <div className="min-h-[calc(100vh-4rem)] flex items-center justify-center bg-background">
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          className="w-full max-w-sm text-center space-y-6"
        >
          <div className="flex justify-center">
            <div className="bg-primary/10 p-4 rounded-full border border-primary/20">
              <Terminal className="w-10 h-10 text-primary" />
            </div>
          </div>
          <div>
            <h2 className="font-mono text-2xl font-bold">ADMIN ACCESS</h2>
            <p className="text-muted-foreground mt-2 text-sm">
              Enter your admin code on the home page to access this panel.
            </p>
          </div>
          <Button className="w-full" onClick={() => setLocation("/")}>
            Go to Home Page
          </Button>
        </motion.div>
      </div>
    );
  }

  const handleLogout = () => {
    adminLogout();
    setAuthTokenGetter(() => null);
    setLocation("/");
  };

  const handleNavigate = (id: string) => {
    setActiveSection(id);
  };

  const renderSection = () => {
    switch (activeSection) {
      case "dashboard":
        return <DashboardSection onNavigate={handleNavigate} />;
      case "events":
        return <EventsSection />;
      case "registrations":
        return <RegistrationsSection />;
      case "teams":
        return <TeamsSection />;
      case "judges":
        return <JudgesSection />;
      case "scores":
        return <ScoresSection />;
      case "polls":
        return <PollsSection />;
      case "live":
        return <LivestreamSection />;
      case "content":
        return <AnnouncementsSection />;
      default:
        // Minor utility tabs - placeholder
        return (
          <div className="space-y-4">
            <p className="text-sm text-muted-foreground font-mono uppercase tracking-wider">
              {NAV_ITEMS.find((i) => i.id === activeSection)?.label ?? activeSection}
            </p>
            <Card>
              <CardContent className="py-12 text-center text-muted-foreground">
                <p className="text-sm font-mono">[ {activeSection.toUpperCase()} MODULE ]</p>
                <p className="mt-2 text-xs">Utility module — coming soon</p>
              </CardContent>
            </Card>
          </div>
        );
    }
  };

  return (
    <AdminLayout
      items={NAV_ITEMS}
      activeSection={activeSection}
      onNavigate={handleNavigate}
      onLogout={handleLogout}
    >
      {renderSection()}
    </AdminLayout>
  );
}
