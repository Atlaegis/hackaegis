import { useState } from "react";
import { useLocation, Link } from "wouter";
import { useAuthTokens } from "@/lib/auth";
import { setAuthTokenGetter } from "@workspace/api-client-react";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Shield, Home, Upload, Tv, Users, BookOpen, Trophy, Settings, LogOut, Menu, X } from "lucide-react";
import CandidateHome from "./CandidateHome";
import CandidateSubmissions from "./CandidateSubmissions";
import CandidateLive from "./CandidateLive";
import CandidateTeam from "./CandidateTeam";
import CandidateResources from "./CandidateResources";
import CandidateResults from "./CandidateResults";
import CandidateSettings from "./CandidateSettings";

interface CandidateProfile {
  id: number;
  label: string;
  teamId: number | null;
}

interface Team {
  id: number;
  name: string;
  projectTitle: string;
  description: string | null;
  githubUrl: string | null;
  hackathonId: number | null;
  isFinalist: boolean;
  leader?: string;
  college?: string;
  track?: string;
  tagline?: string;
  about?: string;
  linkedinUrl?: string;
  portfolioUrl?: string;
  verificationStatus?: string;
  registrationDate?: string;
  registrationId?: string;
  memberCount?: number;
}

interface Props {
  token: string;
  profile: CandidateProfile;
  team: Team | null;
}

const NAV_ITEMS = [
  { path: "/candidate", label: "Home", icon: Home },
  { path: "/candidate/submissions", label: "Submissions", icon: Upload, section: "PARTICIPATE" },
  { path: "/candidate/live", label: "Live", icon: Tv },
  { path: "/candidate/team", label: "Team", icon: Users, section: "INFO" },
  { path: "/candidate/resources", label: "Resources", icon: BookOpen },
  { path: "/candidate/results", label: "Results", icon: Trophy, section: "OUTCOMES" },
  { path: "/candidate/settings", label: "Settings", icon: Settings },
];

export default function CandidateLayout({ token, profile, team }: Props) {
  const [location, setLocation] = useLocation();
  const { logout } = useAuthTokens();
  const [sidebarOpen, setSidebarOpen] = useState(false);

  const currentPath =
    location === "/candidate" || location === "/candidate/" || location === "/candidate/home"
      ? "/candidate"
      : location;

  const handleLogout = () => {
    logout();
    setAuthTokenGetter(() => null);
    setLocation("/");
  };

  const renderPage = () => {
    if (currentPath === "/candidate") return <CandidateHome token={token} team={team} />;
    if (currentPath === "/candidate/submissions") return <CandidateSubmissions token={token} team={team} />;
    if (currentPath === "/candidate/live") return <CandidateLive token={token} team={team} />;
    if (currentPath === "/candidate/team") return <CandidateTeam token={token} team={team} />;
    if (currentPath === "/candidate/resources") return <CandidateResources token={token} />;
    if (currentPath === "/candidate/results") return <CandidateResults token={token} team={team} />;
    if (currentPath === "/candidate/settings") return <CandidateSettings token={token} profile={profile} team={team} />;
    return <CandidateHome token={token} team={team} />;
  };

  return (
    <div className="min-h-screen bg-background flex">
      {/* Mobile hamburger */}
      <button
        className="fixed top-4 left-4 z-50 md:hidden p-2 rounded-lg bg-background border border-border"
        onClick={() => setSidebarOpen(!sidebarOpen)}
      >
        {sidebarOpen ? <X className="w-5 h-5" /> : <Menu className="w-5 h-5" />}
      </button>

      {/* Sidebar */}
      <aside
        className={`fixed md:sticky top-0 left-0 h-screen w-64 bg-card border-r border-border flex flex-col z-40 transition-transform ${
          sidebarOpen ? "translate-x-0" : "-translate-x-full md:translate-x-0"
        }`}
      >
        {/* Header */}
        <div className="p-4 border-b border-border">
          <div className="flex items-center gap-2">
            <div className="bg-chart-4/10 p-2 rounded-lg border border-chart-4/20">
              <Shield className="w-4 h-4 text-chart-4" />
            </div>
            <div>
              <h1 className="font-mono font-bold text-sm">CANDIDATE PORTAL</h1>
              <p className="text-xs text-muted-foreground truncate">{team?.name ?? profile.label}</p>
            </div>
          </div>
          {team && (
            <Badge className="mt-2 bg-chart-4/10 text-chart-4 border-chart-4/20 text-xs">
              {team.isFinalist ? "FINALIST" : "PARTICIPANT"}
            </Badge>
          )}
        </div>

        {/* Nav */}
        <nav className="flex-1 p-3 space-y-1">
          {NAV_ITEMS.map((item, i) => {
            const isActive = currentPath === item.path;
            const Icon = item.icon;
            return (
              <div key={item.path}>
                {item.section && i > 0 && (
                  <p className="text-[10px] font-mono text-muted-foreground/50 uppercase tracking-wider mt-4 mb-2 px-3">
                    {item.section}
                  </p>
                )}
                <Link href={item.path} onClick={() => setSidebarOpen(false)}>
                  <div
                    className={`flex items-center gap-3 px-3 py-2 rounded-lg text-sm transition-colors cursor-pointer ${
                      isActive
                        ? "bg-chart-4/10 text-chart-4 font-medium"
                        : "text-muted-foreground hover:text-foreground hover:bg-muted"
                    }`}
                  >
                    <Icon className="w-4 h-4" />
                    {item.label}
                  </div>
                </Link>
              </div>
            );
          })}
        </nav>

        {/* Footer */}
        <div className="p-3 border-t border-border">
          <Button
            variant="ghost"
            size="sm"
            className="w-full justify-start gap-2 text-muted-foreground"
            onClick={handleLogout}
          >
            <LogOut className="w-4 h-4" /> Logout
          </Button>
        </div>
      </aside>

      {/* Overlay for mobile */}
      {sidebarOpen && (
        <div className="fixed inset-0 bg-black/50 z-30 md:hidden" onClick={() => setSidebarOpen(false)} />
      )}

      {/* Main Content */}
      <main className="flex-1 min-h-screen overflow-auto">
        <div className="container mx-auto px-4 md:px-8 py-8 max-w-5xl">{renderPage()}</div>
      </main>
    </div>
  );
}
