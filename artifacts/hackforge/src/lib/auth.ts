import { useEffect } from "react";
import { setAuthTokenGetter } from "@workspace/api-client-react";

const TOKEN_KEY = "hackforge_token";
const ADMIN_TOKEN_KEY = "hackforge_admin_token";
const JUDGE_TOKEN_KEY = "hackforge_judge_token";

export function useAuthTokens() {
  useEffect(() => {
    setAuthTokenGetter(() => {
      const path = window.location.pathname;
      if (path.startsWith("/admin")) {
        return localStorage.getItem(ADMIN_TOKEN_KEY);
      }
      if (path.startsWith("/judges")) {
        return localStorage.getItem(JUDGE_TOKEN_KEY);
      }
      return localStorage.getItem(TOKEN_KEY);
    });
  }, []);

  const setToken = (token: string) => {
    localStorage.setItem(TOKEN_KEY, token);
  };

  const setAdminToken = (token: string) => {
    localStorage.setItem(ADMIN_TOKEN_KEY, token);
  };

  const setJudgeToken = (token: string) => {
    localStorage.setItem(JUDGE_TOKEN_KEY, token);
  };

  const logout = () => {
    localStorage.removeItem(TOKEN_KEY);
  };

  const adminLogout = () => {
    localStorage.removeItem(ADMIN_TOKEN_KEY);
  };

  const judgeLogout = () => {
    localStorage.removeItem(JUDGE_TOKEN_KEY);
  };

  return {
    setToken,
    setAdminToken,
    setJudgeToken,
    logout,
    adminLogout,
    judgeLogout,
    getToken: () => localStorage.getItem(TOKEN_KEY),
    getAdminToken: () => localStorage.getItem(ADMIN_TOKEN_KEY),
    getJudgeToken: () => localStorage.getItem(JUDGE_TOKEN_KEY),
  };
}
