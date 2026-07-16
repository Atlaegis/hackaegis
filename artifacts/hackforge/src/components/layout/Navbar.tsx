import { useState } from "react";
import { Link, useLocation } from "wouter";
import { useGetEventStatus, useLogout, useGetMe } from "@workspace/api-client-react";
import { useAuthTokens } from "@/lib/auth";
import { Button } from "@/components/ui/button";
import { Terminal, LogOut, LayoutDashboard, Trophy, Tv, Menu, X, Scale } from "lucide-react";

export function Navbar() {
  const [location, setLocation] = useLocation();
  const { data: eventStatus } = useGetEventStatus();
  const { data: me } = useGetMe();
  const { logout, adminLogout, judgeLogout, getAdminToken, getToken, getJudgeToken } = useAuthTokens();
  const logoutMutation = useLogout();
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);

  const hasAdminToken = !!getAdminToken();
  const hasParticipantToken = !!getToken();
  const hasJudgeToken = !!getJudgeToken();

  const handleLogout = () => {
    logoutMutation.mutate(undefined, {
      onSuccess: () => {
        logout();
        adminLogout();
        judgeLogout();
        setLocation("/");
      },
      onError: () => {
        logout();
        adminLogout();
        judgeLogout();
        setLocation("/");
      },
    });
  };

  const navLinks: { href: string; label: string; icon: React.ReactNode }[] = [
    { href: "/", label: "Home", icon: <Terminal className="w-4 h-4 mr-2" /> },
    { href: "/results", label: "Results", icon: <Trophy className="w-4 h-4 mr-2" /> },
  ];

  if (hasParticipantToken || me?.participantCode) navLinks.push({ href: "/watch", label: "Watch Live", icon: <Tv className="w-4 h-4 mr-2" /> });
  if (hasAdminToken || me?.isAdmin) navLinks.push({ href: "/admin", label: "Admin", icon: <LayoutDashboard className="w-4 h-4 mr-2" /> });
  if (hasJudgeToken || (me as unknown as Record<string, unknown>)?.isJudge) navLinks.push({ href: "/judges", label: "Judge Portal", icon: <Scale className="w-4 h-4 mr-2" /> });

  const anyToken = hasParticipantToken || hasAdminToken || hasJudgeToken;

  return (
    <nav className="sticky top-0 z-50 w-full border-b border-border/40 bg-background/80 backdrop-blur supports-[backdrop-filter]:bg-background/50">
      <div className="container mx-auto px-4 h-16 flex items-center justify-between">
        <Link href="/" className="flex items-center gap-2 transition-transform duration-300 hover:scale-[1.03]">
          <div className="bg-primary/20 p-1.5 rounded-md text-primary shadow-[0_0_24px_hsl(var(--primary)/0.15)]">
            <Terminal className="w-5 h-5" />
          </div>
          <span className="font-mono font-bold text-lg tracking-tight">HACK<span className="text-primary">AEGIS</span></span>
        </Link>

        <div className="hidden md:flex items-center gap-6">
          <div className="flex items-center gap-4">
            {navLinks.map((link) => (
              <Link
                key={link.href}
                href={link.href}
                className={`text-sm font-medium transition-all duration-300 hover:text-primary hover:-translate-y-0.5 flex items-center ${location === link.href ? "text-primary" : "text-muted-foreground"}`}
              >
                {link.icon}
                {link.label}
              </Link>
            ))}
          </div>

          {anyToken && (
            <div className="flex items-center gap-4 pl-4 border-l border-border">
              {me?.participantCode && <span className="text-xs font-mono text-muted-foreground bg-muted px-2 py-1 rounded-sm">{me.participantCode}</span>}
              <Button variant="ghost" size="sm" onClick={handleLogout} className="text-muted-foreground hover:text-destructive transition-all duration-300 hover:-translate-y-0.5">
                <LogOut className="w-4 h-4 mr-2" />
                Disconnect
              </Button>
            </div>
          )}
        </div>

        <div className="md:hidden flex items-center">
          <Button variant="ghost" size="icon" onClick={() => setMobileMenuOpen(!mobileMenuOpen)}>
            {mobileMenuOpen ? <X className="w-5 h-5" /> : <Menu className="w-5 h-5" />}
          </Button>
        </div>
      </div>

      {mobileMenuOpen && (
        <div className="md:hidden border-b border-border bg-card/95 backdrop-blur">
          <div className="container mx-auto px-4 py-4 flex flex-col gap-4">
            {navLinks.map((link) => (
              <Link
                key={link.href}
                href={link.href}
                onClick={() => setMobileMenuOpen(false)}
                className={`text-sm font-medium transition-all duration-300 hover:text-primary hover:translate-x-1 flex items-center py-2 ${location === link.href ? "text-primary" : "text-muted-foreground"}`}
              >
                {link.icon}
                {link.label}
              </Link>
            ))}
            {anyToken && (
              <Button variant="outline" size="sm" onClick={handleLogout} className="justify-start text-muted-foreground hover:text-destructive mt-2 w-full">
                <LogOut className="w-4 h-4 mr-2" />
                Disconnect
              </Button>
            )}
          </div>
        </div>
      )}
    </nav>
  );
}
