import { createContext, useContext, useEffect, useMemo, useState } from "react";
import type { ReactNode } from "react";
import { Navigate, useLocation } from "react-router-dom";

import { api, type Role, type User } from "./api";

interface AuthCtx {
  user: User | null;
  loading: boolean;
  login: (email: string, password: string) => Promise<User>;
  register: (data: {
    email: string;
    password: string;
    full_name: string;
    company?: string;
  }) => Promise<void>;
  logout: () => void;
}

const Ctx = createContext<AuthCtx>({} as AuthCtx);
export const useAuth = () => useContext(Ctx);

export function AuthProvider({ children }: { children: ReactNode }) {
  const [user, setUser] = useState<User | null>(() => {
    const raw = localStorage.getItem("kl_user");
    return raw ? (JSON.parse(raw) as User) : null;
  });
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const token = localStorage.getItem("kl_token");
    if (!token) {
      setLoading(false);
      return;
    }
    api
      .get<User>("/api/auth/me")
      .then(({ data }) => {
        setUser(data);
        localStorage.setItem("kl_user", JSON.stringify(data));
      })
      .catch(() => setUser(null))
      .finally(() => setLoading(false));
  }, []);

  const value = useMemo<AuthCtx>(
    () => ({
      user,
      loading,
      async login(email, password) {
        const body = new URLSearchParams({ username: email, password });
        const { data } = await api.post("/api/auth/login", body);
        localStorage.setItem("kl_token", data.access_token);
        localStorage.setItem("kl_user", JSON.stringify(data.user));
        setUser(data.user);
        return data.user as User;
      },
      async register(payload) {
        await api.post("/api/auth/register", payload);
      },
      logout() {
        localStorage.removeItem("kl_token");
        localStorage.removeItem("kl_user");
        setUser(null);
      },
    }),
    [user, loading]
  );

  return <Ctx.Provider value={value}>{children}</Ctx.Provider>;
}

export function RequireAuth({
  children,
  roles,
}: {
  children: ReactNode;
  roles?: Role[];
}) {
  const { user, loading } = useAuth();
  const location = useLocation();

  if (loading)
    return (
      <div className="flex min-h-[60vh] items-center justify-center text-slate-500">
        Loading…
      </div>
    );
  if (!user) return <Navigate to="/login" state={{ from: location }} replace />;
  if (roles && !roles.includes(user.role))
    return (
      <div className="container-x py-24 text-center">
        <h1 className="h2">Access restricted</h1>
        <p className="mt-3 text-slate-600">
          Your account role ({user.role}) does not have permission to view this page.
        </p>
      </div>
    );
  return <>{children}</>;
}
