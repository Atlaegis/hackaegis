import { useState, useEffect, useCallback, useRef } from "react";

const ADMIN_TOKEN_KEY = "hackaegis_admin_token";

export function useAdminFetch<T>(
  url: string
): { data: T | null; loading: boolean; refetch: () => void } {
  const [data, setData] = useState<T | null>(null);
  const [loading, setLoading] = useState(true);
  const tokenRef = useRef(localStorage.getItem(ADMIN_TOKEN_KEY));

  const load = useCallback(() => {
    tokenRef.current = localStorage.getItem(ADMIN_TOKEN_KEY);
    setLoading(true);
    fetch(url, { headers: { Authorization: `Bearer ${tokenRef.current}` } })
      .then((r) => r.json())
      .then(setData)
      .catch(() => {})
      .finally(() => setLoading(false));
  }, [url]);

  useEffect(() => {
    load();
  }, [load]);

  return { data, loading, refetch: load };
}

export function adminApi(method: string, path: string, body?: unknown) {
  const token = localStorage.getItem(ADMIN_TOKEN_KEY);
  return fetch(path, {
    method,
    headers: {
      "Content-Type": "application/json",
      Authorization: `Bearer ${token}`,
    },
    body: body ? JSON.stringify(body) : undefined,
  }).then(async (r) => {
    const d = await r.json();
    if (!r.ok) throw new Error(d.message ?? "Request failed");
    return d;
  });
}
