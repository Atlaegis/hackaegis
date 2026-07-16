import { useState, useEffect } from "react";
import { useLocation } from "wouter";
import { useAuthTokens } from "@/lib/auth";
import { setAuthTokenGetter } from "@workspace/api-client-react";
import JudgeLayout from "./JudgeLayout";
import JudgeLoginForm from "./JudgeLoginForm";

const JUDGE_TOKEN_KEY = "hackaegis_judge_token";

export default function JudgePortal() {
  const [judgeToken, setJudgeTokenState] = useState(() => localStorage.getItem(JUDGE_TOKEN_KEY) ?? "");
  const [profile, setProfile] = useState<{ id: number; label: string; domain: string | null; isJudge: boolean } | null>(null);

  const fetchProfile = async (token: string) => {
    try {
      const res = await fetch("/api/judges/me", { headers: { Authorization: `Bearer ${token}` } });
      const data = await res.json();
      if (res.ok) {
        setProfile(data);
        setAuthTokenGetter(() => localStorage.getItem(JUDGE_TOKEN_KEY));
      } else {
        localStorage.removeItem(JUDGE_TOKEN_KEY);
        setJudgeTokenState("");
      }
    } catch {
      localStorage.removeItem(JUDGE_TOKEN_KEY);
      setJudgeTokenState("");
    }
  };

  useEffect(() => {
    if (judgeToken) fetchProfile(judgeToken);
  }, [judgeToken]);

  const handleLogin = (token: string) => {
    setJudgeTokenState(token);
    fetchProfile(token);
  };

  if (!judgeToken || !profile) {
    return <JudgeLoginForm onLogin={handleLogin} />;
  }

  return <JudgeLayout token={judgeToken} profile={profile} />;
}
