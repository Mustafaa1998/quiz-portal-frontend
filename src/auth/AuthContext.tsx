import { createContext, useContext, useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";
import { clearSession, readJwt, saveSession, type Role } from "./jwt";

type User = {
  userId: number;
  email: string;
  name: string;
  role: Role;
} | null;

type Ctx = {
  user: User;
  hydrating: boolean;
  signIn: (email: string, password: string) => Promise<void>;
  signOut: () => void;
  logout: () => void;
};

const API = import.meta.env.VITE_API_URL ?? "http://localhost:3000";
const AuthCtx = createContext<Ctx>(null!);

export function AuthProvider({ children }: { children: React.ReactNode }) {
  const [user, setUser] = useState<User>(null);
  const [hydrating, setHydrating] = useState(true);
  const nav = useNavigate();

  useEffect(() => {
    try {
      const rawUser = localStorage.getItem("user");
      if (rawUser) {
        const parsed = JSON.parse(rawUser);
        setUser({
          userId: parsed.userId ?? parsed.id ?? 0,
          email: parsed.email ?? "",
          name: parsed.name ?? "",
          role: parsed.role as Role,
        });
      } else {
        const payload = readJwt();
        if (payload?.exp && Date.now() / 1000 > payload.exp) {
          clearSession();
          setUser(null);
        } else if (payload?.email && payload?.role) {
          setUser({
            userId: (payload.sub as number) ?? 0,
            email: payload.email,
            name: payload.name ?? "",
            role: payload.role,
          });
        }
      }
    } catch {
    } finally {
      setHydrating(false);
    }
  }, []);

  async function signIn(email: string, password: string) {
    const res = await fetch(`${API}/auth/login`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ email, password }),
    });
    if (!res.ok) {
      const j = await res.json().catch(() => ({}));
      throw new Error(j?.message || "Login failed");
    }

    const data = await res.json();
    saveSession(data.access_token, data.user);

    let role: Role | undefined;
    let emailOut: string | undefined;
    let nameOut: string | undefined;
    let userId = 0;

    if (data?.user) {
      emailOut = data.user.email ?? "";
      nameOut = data.user.name ?? "";
      role = data.user.role as Role;
      userId = data.user.userId ?? data.user.id ?? 0;
    }

    if (!emailOut || !role) {
      const payload = readJwt();
      if (!payload) throw new Error("Invalid token");

      if (!emailOut) emailOut = payload.email;
      if (!nameOut) nameOut = payload.name ?? "";

      if (!role) role = payload.role;

      if (!userId) {
        userId =
          typeof payload.sub === "number"
            ? payload.sub
            : 0;
      }
    }

    setUser({ userId, email: emailOut!, name: nameOut ?? "", role: role! });

    switch (role) {
      case "STUDENT":
        nav("/student", { replace: true });
        break;
      case "INSTRUCTOR":
        nav("/instructor", { replace: true });
        break;
      case "ADMIN":
        nav("/admin", { replace: true });
        break;
      default:
        nav("/dashboard", { replace: true });
    }
  }

  function signOut() {
    clearSession();
    setUser(null);
    nav("/login", { replace: true });
  }

  const value: Ctx = {
    user,
    hydrating,
    signIn,
    signOut,
    logout: signOut,
  };

  return <AuthCtx.Provider value={value}>{children}</AuthCtx.Provider>;
}

export const useAuth = () => useContext(AuthCtx);
