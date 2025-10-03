import { Navigate } from "react-router-dom";
import { useAuth } from "./AuthContext";
import React from "react";

type Role = "STUDENT" | "INSTRUCTOR" | "ADMIN";

interface PrivateRouteProps {
  children: React.ReactNode;
  roles?: Role[];
}

export default function PrivateRoute({ children, roles }: PrivateRouteProps) {
  const { user, hydrating } = useAuth();
  const token = localStorage.getItem("token");

  if (hydrating) return null;

  if (!user || !token) return <Navigate to="/login" replace />;

  if (roles && !roles.includes(user.role)) return <Navigate to="/dashboard" replace />;

  return <>{children}</>;
}
