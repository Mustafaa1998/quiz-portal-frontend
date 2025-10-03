// src/pages/DashboardPage.tsx
import { useEffect, useState } from "react";
import { Link, useNavigate } from "react-router-dom";

import PageLoader from "../components/PageLoader";
import InlineAlert from "../components/InLineAlerts";

/** ---------- types ---------- */
type Role = "STUDENT" | "INSTRUCTOR" | "ADMIN";
type JwtPayload = {
  email: string;
  role: Role;
  exp?: number; // seconds since epoch
};

/** ---------- helpers ---------- */
const API = import.meta?.env?.VITE_API_URL ?? "http://localhost:3000";

function readJwt(): JwtPayload | null {
  const raw = localStorage.getItem("token");
  if (!raw) return null;
  try {
    const [, payload] = raw.split(".");
    const json = atob(payload.replace(/-/g, "+").replace(/_/g, "/"));
    return JSON.parse(json);
  } catch {
    return null;
  }
}

function roleToPath(role: Role): string {
  switch (role) {
    case "STUDENT":
      return "/student";
    case "INSTRUCTOR":
      return "/instructor";
    case "ADMIN":
      return "/admin";
    default:
      return "/";
  }
}

/** ---------- component ---------- */
export default function DashboardPage() {
  const nav = useNavigate();
  const [hydrating, setHydrating] = useState(true);
  const [err, setErr] = useState("");

  useEffect(() => {
    const p = readJwt();

    // Not logged in → go to login
    if (!p) {
      nav("/login", { replace: true });
      return;
    }

    // Token expired → clear and go to login
    if (p.exp && Date.now() / 1000 > p.exp) {
      localStorage.removeItem("token");
      localStorage.removeItem("user");
      nav("/login", { replace: true });
      return;
    }

    // Valid token → send to dedicated dashboard
    if (p.role) {
      nav(roleToPath(p.role), { replace: true });
      return;
    }

    // Should never happen, but just in case
    setErr("Could not determine your role. Please sign in again.");
    setHydrating(false);
  }, [nav]);

  return (
    <div className="max-w-[900px] mx-auto px-4 py-6">
      <PageLoader show={hydrating && !err} />
      {err && (
        <InlineAlert type="error">
          {err}{" "}
          <Link to="/login" className="text-sky-600 underline ml-1">
            Go to Login
          </Link>
        </InlineAlert>
      )}
    </div>
  );
}
