import { useState, useEffect } from "react";
import { useLocation } from "wouter";
import { useAuthTokens } from "@/lib/auth";
import { setAuthTokenGetter } from "@workspace/api-client-react";
import CandidateLayout from "./CandidateLayout";

const TOKEN_KEY = "hackaegis_token";

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

export default function CandidatePortal() {
  const [, setLocation] = useLocation();
  const [token, setTokenState] = useState(() => localStorage.getItem(TOKEN_KEY) ?? "");
  const [profile, setProfile] = useState<CandidateProfile | null>(null);
  const [team, setTeam] = useState<Team | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (!token) {
      setLocation("/");
      return;
    }

    const fetchData = async () => {
      try {
        const meRes = await fetch("/api/auth/me", {
          headers: { Authorization: `Bearer ${token}` },
        });
        if (!meRes.ok) {
          localStorage.removeItem(TOKEN_KEY);
          setTokenState("");
          setLocation("/");
          return;
        }
        const meData = await meRes.json();
        setProfile(meData);
        setAuthTokenGetter(() => localStorage.getItem(TOKEN_KEY));

        // Fetch team data
        try {
          const teamRes = await fetch("/api/auth/my-team", {
            headers: { Authorization: `Bearer ${token}` },
          });
          if (teamRes.ok) {
            const teamData = await teamRes.json();
            if (teamData.team) setTeam(teamData.team);
          }
        } catch {
          // Team fetch is non-critical
        }
      } catch {
        localStorage.removeItem(TOKEN_KEY);
        setTokenState("");
        setLocation("/");
      } finally {
        setLoading(false);
      }
    };

    fetchData();
  }, [token]);

  if (!token || loading) {
    return (
      <div className="min-h-screen bg-background flex items-center justify-center">
        <div className="flex items-center gap-2 text-muted-foreground">
          <div className="w-4 h-4 border-2 border-chart-4 border-t-transparent rounded-full animate-spin" />
          <span className="text-sm font-mono">Loading portal...</span>
        </div>
      </div>
    );
  }

  if (!profile) {
    return null;
  }

  return <CandidateLayout token={token} profile={profile} team={team} />;
}
