import { NavLink, Link, useNavigate } from "react-router-dom";
import { useAuth } from "../auth/AuthContext";
import { readJwt } from "../auth/jwt";

function navClasses(isActive: boolean) {
  return [
    "px-3 py-2 rounded-md text-sm font-medium",
    isActive
      ? "bg-white/10 text-white"
      : "text-white/80 hover:text-white hover:bg-white/10",
  ].join(" ");
}

export default function Navbar() {
  const { user, signOut } = useAuth();
  const nav = useNavigate();

  const me =
    user ??
    (() => {
      const p = readJwt();
      return p
        ? { userId: p.sub ?? 0, email: p.email, name: p.name ?? "", role: p.role }
        : null;
    })();

  function handleLogout() {
    signOut();
    nav("/login");
  }

  const brandHref =
    me?.role === "ADMIN"
      ? "/admin"
      : me?.role === "INSTRUCTOR"
      ? "/instructor"
      : me?.role === "STUDENT"
      ? "/student"
      : "/";

  return (
    <nav className="w-full" style={{ background: "#0f172a", color: "white" }}>
      <div
        className="mx-auto"
        style={{
          maxWidth: 1200,
          padding: "10px 16px",
          display: "flex",
          alignItems: "center",
          justifyContent: "space-between",
          gap: 12,
        }}
      >
        <div style={{ display: "flex", alignItems: "center", gap: 12 }}>
          <Link
            to={brandHref}
            style={{
              fontWeight: 700,
              fontSize: 18,
              color: "white",
              textDecoration: "none",
            }}
          >
            Quiz Portal
          </Link>
          {me?.role && (
            <span
              style={{
                fontSize: 12,
                padding: "2px 8px",
                borderRadius: 999,
                background: "rgba(255,255,255,0.08)",
              }}
            >
              {me.role}
            </span>
          )}
        </div>

        <div style={{ display: "flex", alignItems: "center", gap: 8 }}>
          {me?.role === "STUDENT" && (
            <>
              <NavLink
                to="/student"
                className={({ isActive }) => navClasses(isActive)}
              >
                Student Dashboard
              </NavLink>
              <NavLink
                to="/quizzes"
                className={({ isActive }) => navClasses(isActive)}
              >
                Take Quiz
              </NavLink>
            </>
          )}
          {me?.role === "INSTRUCTOR" && (
            <NavLink
              to="/instructor"
              className={({ isActive }) => navClasses(isActive)}
            >
              Instructor Dashboard
            </NavLink>
          )}
          {me?.role === "ADMIN" && (
            <NavLink
              to="/admin"
              className={({ isActive }) => navClasses(isActive)}
            >
              Admin Dashboard
            </NavLink>
          )}
        </div>

        <div style={{ display: "flex", alignItems: "center", gap: 10 }}>
          {me ? (
            <>
              <span
                style={{
                  fontSize: 14,
                  color: "rgba(255,255,255,0.9)",
                  maxWidth: 200,
                  textOverflow: "ellipsis",
                  whiteSpace: "nowrap",
                  overflow: "hidden",
                }}
              >
                {me.name || me.email}
              </span>
              <button
                onClick={handleLogout}
                style={{
                  padding: "8px 12px",
                  background: "#ef4444",
                  color: "white",
                  border: "none",
                  borderRadius: 8,
                  cursor: "pointer",
                  fontSize: 14,
                  fontWeight: 600,
                }}
              >
                Logout
              </button>
            </>
          ) : (
            <>
              <NavLink to="/login" className={({ isActive }) => navClasses(isActive)}>
                Login
              </NavLink>
              <NavLink
                to="/register"
                className={({ isActive }) => navClasses(isActive)}
              >
                Register
              </NavLink>
            </>
          )}
        </div>
      </div>
    </nav>
  );
}
