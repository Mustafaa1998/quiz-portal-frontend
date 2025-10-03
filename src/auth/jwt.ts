export type Role = "STUDENT" | "INSTRUCTOR" | "ADMIN";

export type JwtPayload = {
  sub?: number;
  email: string;
  name:string
  role: Role;
  exp?: number;
};

function decodeBase64UrlJSON<T = any>(b64url: string): T {
  const b64 = b64url.replace(/-/g, "+").replace(/_/g, "/");
  const json = atob(b64);
  return JSON.parse(json) as T;
}

export function readJwt(): JwtPayload | null {
  const raw = localStorage.getItem("token");
  if (!raw) return null;
  try {
    const parts = raw.split(".");
    if (parts.length < 2) return null;
    const payload = decodeBase64UrlJSON<JwtPayload>(parts[1]);
    if (payload?.exp && Date.now() / 1000 > payload.exp) return null;
    return payload;
  } catch {
    return null;
  }
}

export function isExpired(payload: JwtPayload | null): boolean {
  if (!payload?.exp) return false;
  return Date.now() / 1000 > payload.exp;
}

export function saveSession(token: string, user?: any) {
  localStorage.setItem("token", token);
  if (user) localStorage.setItem("user", JSON.stringify(user));
}

export function clearSession() {
  localStorage.removeItem("token");
  localStorage.removeItem("user");
}

export function authHeaders() {
  const token = localStorage.getItem("token") ?? "";
  return token ? { Authorization: `Bearer ${token}` } : {};
}
