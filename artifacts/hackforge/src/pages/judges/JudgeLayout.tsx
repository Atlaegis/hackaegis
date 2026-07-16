import { useState } from "react";
import { useLocation, Link } from "wouter";
import { useAuthTokens } from "@/lib/auth";
import { setAuthTokenGetter } from "@workspace/api-client-react";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Scale, Home, Gavel, Tv, BarChart2, User, LogOut, Menu, X } from "lucide-react";
import JudgeHome from "./JudgeHome";
import JudgeScore from "./JudgeScore";
import JudgeStream from "./JudgeStream";
import JudgeLeaderboard from "./JudgeLeaderboard";
import JudgeProfile from "./JudgeProfile";

interface Props {
  token: string;
  profile: { id: number; label: string; domain: string | null; isJudge: boolean };
}

const NAV_ITEMS = [
  { path: "/judges", label: "Home", icon: Home },
  { path: "/judges/score", label: "Score", icon: Gavel, section: "WORKING" },
  { path: "/judges/stream", label: "Livestream", icon: Tv },
  { path: "/judges/leaderboard", label: "Leaderboard", icon: BarChart2 },
  { path: "/judges/profile", label: "Profile", icon: User, section: "ACCOUNT" },
];

export default function JudgeLayout({ token, profile }: Props) {
  const [location, setLocation] = useLocation();
  const { judgeLogout } = useAuthTokens();
  const [sidebarOpen, setSidebarOpen] = useState(false);

  const currentPath = location === "/judges" || location === "/judges/" || location === "/judges/home" ? "/judges" : location;

  const handleLogout = () => {
    judgeLogout();
    setAuthTokenGetter(() => null);
    setLocation("/");
  };

  const renderPage = () => {
    if (currentPath === "/judges") return <JudgeHome token={token} />;
    if (currentPath === "/judges/score") return <JudgeScore token={token} />;
    if (currentPath === "/judges/stream") return <JudgeStream token={token} profile={profile} />;
    if (currentPath === "/judges/leaderboard") return <JudgeLeaderboard token={token} />;
    if (currentPath === "/judges/profile") return <JudgeProfile token={token} />;
    return <JudgeHome token={token} />;
  };

  return (
    <div className="min-h-screen bg-background flex">
      {/* Mobile hamburger */}
      <button className="fixed top-4 left-4 z-50 md:hidden p-2 rounded-lg bg-background border border-border" onClick={() => setSidebarOpen(!sidebarOpen)}>
        {sidebarOpen ? <X className="w-5 h-5" /> : <Menu className="w-5 h-5" />}
      </button>

      {/* Sidebar */}
      <aside className={`fixed md:sticky top-0 left-0 h-screen w-64 bg-card border-r border-border flex flex-col z-40 transition-transform ${sidebarOpen ? "translate-x-0" : "-translate-x-full md:translate-x-0"}`}>
        {/* Header */}
        <div className="p-4 border-b border-border">
          <div className="flex items-center gap-2">
            <div className="bg-chart-2/10 p-2 rounded-lg border border-chart-2/20">
              <Scale className="w-4 h-4 text-chart-2" />
            </div>
            <div>
              <h1 className="font-mono font-bold text-sm">JUDGE PORTAL</h1>
              <p className="text-xs text-muted-foreground truncate">{profile.label}</p>
            </div>
          </div>
          {profile.domain && (
            <Badge className="mt-2 bg-chart-2/10 text-chart-2 border-chart-2/20 text-xs">{profile.domain}</Badge>
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
                  <p className="text-[10px] font-mono text-muted-foreground/50 uppercase tracking-wider mt-4 mb-2 px-3">{item.section}</p>
                )}
                <Link href={item.path} onClick={() => setSidebarOpen(false)}>
                  <div className={`flex items-center gap-3 px-3 py-2 rounded-lg text-sm transition-colors cursor-pointer ${isActive ? "bg-chart-2/10 text-chart-2 font-medium" : "text-muted-foreground hover:text-foreground hover:bg-muted"}`}>
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
          <Button variant="ghost" size="sm" className="w-full justify-start gap-2 text-muted-foreground" onClick={handleLogout}>
            <LogOut className="w-4 h-4" /> Logout
          </Button>
        </div>
      </aside>

      {/* Overlay for mobile */}
      {sidebarOpen && <div className="fixed inset-0 bg-black/50 z-30 md:hidden" onClick={() => setSidebarOpen(false)} />}

      {/* Main Content */}
      <main className="flex-1 min-h-screen overflow-auto">
        <div className="container mx-auto px-4 md:px-8 py-8 max-w-5xl">
          {renderPage()}
        </div>
      </main>
    </div>
  );
}
