import { Navigate } from "react-router-dom";
import { useAuth } from "../auth/AuthContext";

export default function RoleHome() {
  const { user, hydrating } = useAuth();

  if (hydrating) return null;
  if (!user) return <Navigate to="/login" replace />;

  if (user.role === "ADMIN") return <Navigate to="/admin" replace />;
  if (user.role === "INSTRUCTOR") return <Navigate to="/instructor" replace />;
  if (user.role === "STUDENT") return <Navigate to="/student" replace />;

  return <Navigate to="/dashboard" replace />;
}
