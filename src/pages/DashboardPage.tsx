
import { useEffect, useState } from "react";
import { Link, useNavigate } from "react-router-dom";
import PageLoader from "../components/PageLoader";
import InlineAlert from "../components/InLineAlerts";

type Role = "STUDENT" | "INSTRUCTOR" | "ADMIN";

type JwtPayload = {
  email: string;
  role: Role;
  exp?: number;
};

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

export default function DashboardPage() {
  const nav = useNavigate();
  const [hydrating, setHydrating] = useState(true);
  const [err, setErr] = useState("");

  useEffect(() => {
    const p = readJwt();

    if (!p) {
      nav("/login", { replace: true });
      return;
    }

    if (p.exp && Date.now() / 1000 > p.exp) {
      localStorage.removeItem("token");
      localStorage.removeItem("user");
      nav("/login", { replace: true });
      return;
    }

    if (p.role) {
      nav(roleToPath(p.role), { replace: true });
      return;
    }

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
