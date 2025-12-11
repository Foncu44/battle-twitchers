import { useCallback, useEffect, useMemo, useState } from "react";

type AuthState = {
  accessToken?: string;
  refreshToken?: string;
  expiresIn?: number;
  scope?: string[];
};

const AUTH_URL = "/auth/twitch";

export function useTwitchAuth() {
  const [state, setState] = useState<AuthState>({});
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const login = useCallback(() => {
    window.location.href = AUTH_URL;
  }, []);

  // Handle OAuth callback code in SPA
  useEffect(() => {
    const params = new URLSearchParams(window.location.search);
    const code = params.get("code");
    if (!code) return;
    setLoading(true);
    fetch(`/auth/callback?code=${code}`)
      .then(async (res) => {
        if (!res.ok) throw new Error("oauth failed");
        return res.json();
      })
      .then((data: any) => {
        setState({
          accessToken: data.access_token,
          refreshToken: data.refresh_token,
          expiresIn: data.expires_in,
          scope: data.scope,
        });
        setError(null);
      })
      .catch((err) => setError(err.message))
      .finally(() => setLoading(false));
  }, []);

  const logout = useCallback(() => {
    setState({});
  }, []);

  return useMemo(
    () => ({
      ...state,
      loading,
      error,
      login,
      logout,
      isAuthenticated: Boolean(state.accessToken),
    }),
    [state, loading, error, login, logout],
  );
}

