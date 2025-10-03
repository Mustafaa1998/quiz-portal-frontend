import { Link, NavLink } from "react-router-dom";
import { useAuth } from "../auth/AuthContext";

export default function Layout({ children }: { children: React.ReactNode }) {
  const { user, signOut } = useAuth();
  const logout = signOut; // keep old naming compatible with your JSX

  return (
    <div className="min-h-screen bg-[#0b1220] text-white">
      {/* Top bar */}
      <nav className="bg-[#0a0f1c] border-b border-white/10">
        <div className="max-w-6xl mx-auto px-4 h-14 flex items-center justify-between">
          {/* Left: Brand + Role badge */}
          <div className="flex items-center gap-3">
            <Link to="/" className="font-semibold text-white">
              Quiz Portal
            </Link>

            {user?.role && (
              <span className="text-xs rounded px-2 py-1 bg-slate-800 text-white">
                {user.role}
              </span>
            )}
          </div>

          {/* Center: Student links (only when role is STUDENT) */}
          <div className="hidden sm:flex items-center gap-2">
            {user?.role === "STUDENT" && (
              <>
                <NavLink
                  to="/student"
                  className={({ isActive }) =>
                    `px-3 py-1.5 rounded text-sm ${
                      isActive ? "bg-white/10 text-white" : "text-slate-300 hover:text-white"
                    }`
                  }
                >
                  Student Dashboard
                </NavLink>

                <NavLink
                  to="/quizzes"
                  className={({ isActive }) =>
                    `px-3 py-1.5 rounded text-sm ${
                      isActive ? "bg-white/10 text-white" : "text-slate-300 hover:text-white"
                    }`
                  }
                >
                  Take Quiz
                </NavLink>
              </>
            )}

            {user?.role === "INSTRUCTOR" && (
              <NavLink
                to="/instructor"
                className={({ isActive }) =>
                  `px-3 py-1.5 rounded text-sm ${
                    isActive ? "bg-white/10 text-white" : "text-slate-300 hover:text-white"
                  }`
                }
              >
                Instructor Dashboard
              </NavLink>
            )}

            {user?.role === "ADMIN" && (
              <NavLink
                to="/admin"
                className={({ isActive }) =>
                  `px-3 py-1.5 rounded text-sm ${
                    isActive ? "bg-white/10 text-white" : "text-slate-300 hover:text-white"
                  }`
                }
              >
                Admin Dashboard
              </NavLink>
            )}
          </div>

          {/* Right: User name + Logout */}
          <div className="flex items-center gap-3">
            {user?.name && (
              <span className="hidden sm:inline text-slate-300">{user.name}</span>
            )}
            <button
              onClick={logout}
              className="px-3 py-1.5 rounded bg-rose-600 hover:bg-rose-500 text-white text-sm"
            >
              Logout
            </button>
          </div>
        </div>
      </nav>

      {/* Content */}
      <main className="max-w-6xl mx-auto px-4 py-6">{children}</main>
    </div>
  );
}
