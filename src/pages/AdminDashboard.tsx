import { useEffect, useMemo, useState } from "react";
import PageLoader from "../components/PageLoader";
import InlineAlert from "../components/InLineAlerts";

// ---------- API helpers ----------
const API = import.meta.env.VITE_API_URL ?? "http://localhost:3000";

function authHeaders() {
  const token = localStorage.getItem("token") ?? "";
  return {
    "Content-Type": "application/json",
    Authorization: `Bearer ${token}`,
  };
}

async function getStrict<T>(path: string): Promise<T> {
  const res = await fetch(`${API}${path}`, { headers: authHeaders() });
  if (res.status === 401) {
    localStorage.removeItem("token");
    localStorage.removeItem("user");
    window.location.assign("/login");
    throw new Error("Unauthorized");
  }
  if (!res.ok) {
    let msg = `${res.status}`;
    try {
      const j = await res.json();
      msg = j?.message || msg;
    } catch {}
    const err: any = new Error(msg);
    err.status = res.status;
    throw err;
  }
  return res.json() as Promise<T>;
}

async function sendJSON<T>(
  path: string,
  method: "POST" | "PUT" | "DELETE",
  body?: unknown
): Promise<T> {
  const res = await fetch(`${API}${path}`, {
    method,
    headers: authHeaders(),
    body: body ? JSON.stringify(body) : undefined,
  });
  if (res.status === 401) {
    localStorage.removeItem("token");
    localStorage.removeItem("user");
    window.location.assign("/login");
    throw new Error("Unauthorized");
  }
  if (!res.ok) {
    let msg = `${res.status}`;
    try {
      const j = await res.json();
      msg = j?.message || msg;
    } catch {}
    const err: any = new Error(msg);
    err.status = res.status;
    throw err;
  }
  return (res.status === 204 ? (null as any) : (res.json() as Promise<T>));
}

// ---------- Types ----------
type SummaryDTO = { users: number; quizzes: number; attempts: number };
type Quiz = {
  id: number | string;
  title?: string;
  description?: string;
  category?: string | null;
  createdAt?: string;
  attemptsCount?: number;
};
type AttemptsPerDayPoint = { date: string; attempts: number };
type UserRow = { id: number; email: string; name?: string | null; role?: string };

// ---------- Small UI bits ----------
function Card({
  children,
  className = "",
}: {
  children: React.ReactNode;
  className?: string;
}) {
  return (
    <div className={`rounded-2xl border border-white/10 bg-white/5 ${className}`}>
      {children}
    </div>
  );
}
function CardHeader({
  title,
  subtitle,
  right,
}: {
  title: string;
  subtitle?: string;
  right?: React.ReactNode;
}) {
  return (
    <div className="p-4 border-b border-white/10 flex items-center justify-between">
      <div>
        <h3 className="text-lg font-semibold">{title}</h3>
        {subtitle ? <p className="text-sm text-slate-300">{subtitle}</p> : null}
      </div>
      {right}
    </div>
  );
}
function Stat({ label, value }: { label: string; value: number | string }) {
  return (
    <Card>
      <div className="p-5">
        <div className="text-slate-300 text-sm">{label}</div>
        <div className="mt-1 text-3xl font-bold text-white">{value}</div>
      </div>
    </Card>
  );
}

// ---------- Tiny SVG line chart ----------
function LineChart({ data }: { data: AttemptsPerDayPoint[] }) {
  const width = 640;
  const height = 220;
  const padding = 32;

  const maxY = Math.max(10, ...data.map((d) => d.attempts));
  const minY = 0;

  const x = (i: number) => padding + (i * (width - 2 * padding)) / Math.max(1, data.length - 1);
  const y = (v: number) =>
    height - padding - ((v - minY) * (height - 2 * padding)) / (maxY - minY || 1);

  const path = useMemo(() => {
    if (!data.length) return "";
    return data
      .map((d, i) => `${i === 0 ? "M" : "L"} ${x(i).toFixed(1)} ${y(d.attempts).toFixed(1)}`)
      .join(" ");
  }, [data]);

  const ticksY = 4;
  const grid = Array.from({ length: ticksY + 1 }).map((_, i) => {
    const v = (i * maxY) / ticksY;
    return { v, y: y(v) };
  });

  return (
    <svg viewBox={`0 0 ${width} ${height}`} className="w-full h-[240px]">
      {grid.map((g, i) => (
        <g key={i}>
          <line x1={padding} x2={width - padding} y1={g.y} y2={g.y} stroke="#1f2937" />
          <text x={8} y={g.y + 4} fontSize="10" fill="#94a3b8">
            {Math.round(g.v)}
          </text>
        </g>
      ))}
      <line x1={padding} x2={padding} y1={padding} y2={height - padding} stroke="#64748b" />
      <line x1={padding} x2={width - padding} y1={height - padding} y2={height - padding} stroke="#64748b" />
      <path d={path} fill="none" stroke="#38bdf8" strokeWidth="2" />
      {data.map((d, i) => (
        <circle key={d.date} cx={x(i)} cy={y(d.attempts)} r="3" fill="#38bdf8" />
      ))}
      {data.map((d, i) =>
        i % Math.ceil(data.length / 6 || 1) === 0 ? (
          <text
            key={`lbl-${d.date}`}
            x={x(i)}
            y={height - padding + 14}
            fontSize="10"
            textAnchor="middle"
            fill="#94a3b8"
          >
            {d.date?.slice(5)}
          </text>
        ) : null
      )}
    </svg>
  );
}

// ======================================================================
// Admin Dashboard – overview + users + quizzes, dark full-width
// ======================================================================
export default function AdminDashboard() {
  // analytics
  const [loading, setLoading] = useState(true);
  const [err, setErr] = useState("");
  const [totals, setTotals] = useState<SummaryDTO>({ users: 0, quizzes: 0, attempts: 0 });
  const [series, setSeries] = useState<AttemptsPerDayPoint[]>([]);
  const [recent, setRecent] = useState<Quiz[]>([]);
  const [top, setTop] = useState<Quiz[]>([]);
  const [lastUpdated, setLastUpdated] = useState("");

  // management tabs
  const [tab, setTab] = useState<"overview" | "users" | "quizzes">("overview");

  // users
  const [users, setUsers] = useState<UserRow[]>([]);
  const [userQuery, setUserQuery] = useState("");
  const [userPage, setUserPage] = useState(1);
  const [userTotal, setUserTotal] = useState(0);
  const userPageSize = 10;
  const [usersUnavailable, setUsersUnavailable] = useState(false);

  // quizzes
  const [qrows, setQrows] = useState<Quiz[]>([]);
  const [qQuery, setQQuery] = useState("");
  const [qPage, setQPage] = useState(1);
  const [qTotal, setQTotal] = useState(0);
  const qPageSize = 10;
  const [quizForm, setQuizForm] = useState<{
    id?: number | string;
    title: string;
    description: string;
    category: string;
  }>({
    title: "",
    description: "",
    category: "",
  });
  const [showQuizModal, setShowQuizModal] = useState<"create" | "edit" | null>(null);
  const [quizzesUnavailable, setQuizzesUnavailable] = useState(false);

  async function loadOverview() {
    setLoading(true);
    setErr("");
    try {
      const [summary, recentQ, topQ, perDay] = await Promise.all([
        getStrict<SummaryDTO>("/quiz/admin/summary"),
        getStrict<Quiz[]>("/quiz/admin/recent-quizzes"),
        getStrict<any[]>("/quiz/admin/top-quizzes").then((raw) =>
          (raw ?? []).map((r) => ({
            id: r.id ?? r.quizId ?? "—",
            title: r.title ?? `Quiz ${r.id ?? r.quizId ?? "—"}`,
            attemptsCount: r.attemptsCount ?? r.attempts ?? 0,
          }))
        ),
        getStrict<any[]>(`/quiz/admin/attempts-per-day?days=14`).then((raw) =>
          (raw ?? []).map((r) => ({ date: r.date ?? r.day ?? "", attempts: r.attempts ?? r.count ?? 0 }))
        ),
      ]);
      setTotals(summary);
      setRecent(recentQ);
      setTop(topQ as Quiz[]);
      setSeries(perDay);
      setLastUpdated(new Date().toLocaleString());
    } catch (e: any) {
      if (e?.message !== "Unauthorized") setErr(e.message || "Failed to load admin metrics");
    } finally {
      setLoading(false);
    }
  }

  async function loadUsers() {
    setUsersUnavailable(false);
    try {
      const data = await getStrict<any>(
        `/users?query=${encodeURIComponent(userQuery)}&page=${userPage}&limit=${userPageSize}`
      );
      const items: UserRow[] = Array.isArray(data) ? data : data.items ?? [];
      const total: number = Array.isArray(data) ? items.length : data.total ?? items.length;
      setUsers(items);
      setUserTotal(total);
    } catch (e: any) {
      if (e?.status === 404 || e?.status === 501) {
        setUsersUnavailable(true);
        setUsers([]);
        setUserTotal(0);
      } else if (e?.message !== "Unauthorized") {
        setErr(e.message || "Failed to load users");
      }
    }
  }
  async function deleteUser(id: number) {
    if (!confirm("Delete this user? This cannot be undone.")) return;
    try {
      await sendJSON<void>(`/users/${id}`, "DELETE");
      await loadUsers();
      await loadOverview();
    } catch (e: any) {
      alert(e?.message || "Delete failed");
    }
  }

  async function loadQuizzes() {
    setQuizzesUnavailable(false);
    try {
      const data = await getStrict<any>(
        `/quiz?query=${encodeURIComponent(qQuery)}&page=${qPage}&limit=${qPageSize}`
      );
      const items: Quiz[] = Array.isArray(data) ? data : data.items ?? [];
      const total: number = Array.isArray(data) ? items.length : data.total ?? items.length;
      setQrows(items);
      setQTotal(total);
    } catch (e: any) {
      if (e?.status === 404 || e?.status === 501) {
        setQuizzesUnavailable(true);
        setQrows([]);
        setQTotal(0);
      } else if (e?.message !== "Unauthorized") {
        // ignore
      } else {
        setErr(e.message || "Failed to load quizzes");
      }
    }
  }
  async function createQuiz() {
    try {
      await sendJSON<Quiz>("/quiz", "POST", {
        title: quizForm.title,
        description: quizForm.description,
        category: quizForm.category || null,
      });
      setShowQuizModal(null);
      setQuizForm({ title: "", description: "", category: "" });
      await loadQuizzes();
      await loadOverview();
    } catch (e: any) {
      alert(e?.message || "Create failed");
    }
  }
  async function startEdit(q: Quiz) {
    setQuizForm({
      id: q.id,
      title: q.title ?? "",
      description: q.description ?? "",
      category: q.category ?? "",
    });
    setShowQuizModal("edit");
  }
  async function saveEdit() {
    try {
      await sendJSON<Quiz>(`/quiz/${quizForm.id}`, "PUT", {
        title: quizForm.title,
        description: quizForm.description,
        category: quizForm.category || null,
      });
    } catch (e: any) {
      alert(e?.message || "Update failed");
      return;
    }
    setShowQuizModal(null);
    setQuizForm({ title: "", description: "", category: "" });
    await loadQuizzes();
    await loadOverview();
  }
  async function deleteQuiz(id: number | string) {
    if (!confirm("Delete this quiz and its questions/attempts?")) return;
    try {
      await sendJSON<void>(`/quiz/${id}`, "DELETE");
      await loadQuizzes();
      await loadOverview();
    } catch (e: any) {
      alert(e?.message || "Delete failed");
    }
  }

  useEffect(() => {
    loadOverview();
  }, []);
  useEffect(() => {
    if (tab === "users") loadUsers();
  }, [tab, userPage]); // eslint-disable-line
  useEffect(() => {
    if (tab === "quizzes") loadQuizzes();
  }, [tab, qPage]); // eslint-disable-line

  const userPages = Math.max(1, Math.ceil(userTotal / userPageSize));
  const quizPages = Math.max(1, Math.ceil(qTotal / qPageSize));

  return (
    <div className="min-h-screen bg-[#0b1220] text-white">
      <PageLoader show={loading} />
      <div className="max-w-6xl mx-auto px-4 py-8">
        {/* header */}
        <header className="flex items-center justify-between">
          <div>
            <h1 className="text-2xl font-semibold">Admin Dashboard</h1>
            <p className="text-slate-400">Full administration — analytics & management</p>
          </div>
          <div className="flex items-center gap-3">
            {lastUpdated && <span className="text-xs text-slate-400">Updated: {lastUpdated}</span>}
            <button
              onClick={loadOverview}
              className="px-3 py-1.5 rounded bg-slate-800 hover:bg-slate-700 text-white text-sm disabled:opacity-50"
              disabled={loading}
            >
              {loading ? "Refreshing…" : "Refresh"}
            </button>
          </div>
        </header>

        {/* tabs */}
        <div className="mt-4 flex gap-2">
          {(["overview", "users", "quizzes"] as const).map((t) => (
            <button
              key={t}
              onClick={() => setTab(t)}
              className={`px-3 py-1.5 rounded border text-sm ${
                tab === t ? "bg-slate-800 text-white border-white/10" : "bg-white/5 hover:bg-white/10 border-white/10"
              }`}
            >
              {t === "overview" ? "Overview" : t === "users" ? "Manage Users" : "Manage Quizzes"}
            </button>
          ))}
        </div>

        {err && tab === "overview" && (
          <div className="mt-4">
            <InlineAlert type="error" onRetry={loadOverview}>
              {err}
            </InlineAlert>
          </div>
        )}

        {/* OVERVIEW */}
        {tab === "overview" && (
          <>
            <section className="mt-6 grid gap-4 grid-cols-1 sm:grid-cols-2 lg:grid-cols-3">
              <Stat label="Total Users" value={totals.users} />
              <Stat label="Total Quizzes" value={totals.quizzes} />
              <Stat label="Total Attempts" value={totals.attempts} />
            </section>

            {/* add vertical gap here */}
            <Card className="mt-6">
              <CardHeader title="Attempts per day" subtitle="Last 14 days" />
              <div className="p-4">
                {series.length ? (
                  <LineChart data={series} />
                ) : (
                  <div className="text-slate-400">No data for this period yet.</div>
                )}
              </div>
            </Card>

            <section className="mt-6 grid gap-4 grid-cols-1 lg:grid-cols-2">
              <Card>
                <CardHeader title="Recent Quizzes" subtitle="Newest first" />
                <div className="p-4 overflow-x-auto">
                  <table className="min-w-full text-sm">
                    <thead className="text-slate-300">
                      <tr className="text-left">
                        <th className="py-2 pr-4">Title</th>
                        <th className="py-2 pr-4">Created</th>
                        <th className="py-2 pr-4">Attempts</th>
                      </tr>
                    </thead>
                    <tbody>
                      {recent.map((q) => (
                        <tr key={q.id} className="border-t border-white/10">
                          <td className="py-2 pr-4 font-medium text-white">{q.title || `Quiz ${q.id}`}</td>
                          <td className="py-2 pr-4 text-slate-300">
                            {q.createdAt ? new Date(q.createdAt).toLocaleDateString() : "—"}
                          </td>
                          <td className="py-2 pr-4 text-slate-300">{q.attemptsCount ?? 0}</td>
                        </tr>
                      ))}
                      {!recent.length && !loading && (
                        <tr>
                          <td className="py-3 text-slate-400" colSpan={3}>
                            No quizzes yet.
                          </td>
                        </tr>
                      )}
                    </tbody>
                  </table>
                </div>
              </Card>

              <Card>
                <CardHeader title="Top Quizzes by Attempts" subtitle="All time" />
                <div className="p-4">
                  <ol className="space-y-2 list-decimal list-inside">
                    {top.map((q) => (
                      <li key={q.id} className="flex items-center justify-between">
                        <span className="font-medium text-white">{q.title || `Quiz ${q.id}`}</span>
                        <span className="text-slate-300">{q.attemptsCount ?? 0} attempts</span>
                      </li>
                    ))}
                    {!top.length && !loading && <li className="text-slate-400">No data yet.</li>}
                  </ol>
                </div>
              </Card>
            </section>
          </>
        )}

        {/* USERS */}
        {tab === "users" && (
          <Card className="mt-6">
            <CardHeader
              title="Users"
              subtitle="Search, paginate, and delete users"
              right={
                <div className="flex items-center gap-2">
                  <input
                    value={userQuery}
                    onChange={(e) => setUserQuery(e.target.value)}
                    placeholder="Search by email or name…"
                    className="px-3 py-1.5 text-sm rounded border border-white/10 bg-white/10 placeholder:text-slate-400 text-white"
                  />
                  <button
                    className="px-3 py-1.5 rounded bg-slate-800 text-white text-sm"
                    onClick={() => {
                      setUserPage(1);
                      loadUsers();
                    }}
                  >
                    Search
                  </button>
                </div>
              }
            />
            <div className="p-4">
              {usersUnavailable ? (
                <div className="text-slate-300">
                  This backend doesn’t expose <code className="text-sky-300">/users</code> admin endpoints yet. Add:
                  <code className="text-sky-300"> GET /users</code>, <code className="text-sky-300"> DELETE /users/:id</code>.
                </div>
              ) : (
                <>
                  <div className="overflow-x-auto rounded border border-white/10">
                    <table className="w-full text-sm">
                      <thead className="bg-white/5 text-slate-300">
                        <tr>
                          <th className="text-left p-3">Email</th>
                          <th className="text-left p-3">Name</th>
                          <th className="text-left p-3">Role</th>
                          <th className="text-left p-3">Actions</th>
                        </tr>
                      </thead>
                      <tbody className="divide-y divide-white/10">
                        {users.map((u) => (
                          <tr key={u.id}>
                            <td className="p-3">{u.email}</td>
                            <td className="p-3 text-slate-300">{u.name ?? "—"}</td>
                            <td className="p-3 text-slate-300">{u.role ?? "—"}</td>
                            <td className="p-3">
                              <button
                                onClick={() => deleteUser(u.id)}
                                className="px-2 py-1 rounded bg-rose-600 hover:bg-rose-500 text-white text-xs"
                              >
                                Delete
                              </button>
                            </td>
                          </tr>
                        ))}
                        {!users.length && (
                          <tr>
                            <td className="p-3 text-slate-400" colSpan={4}>
                              {userQuery ? "No matches." : "No users to display."}
                            </td>
                          </tr>
                        )}
                      </tbody>
                    </table>
                  </div>

                  <div className="flex items-center gap-2 mt-3">
                    <button
                      className="px-3 py-1 rounded border border-white/10 bg-white/5 disabled:opacity-50"
                      onClick={() => setUserPage((p) => Math.max(1, p - 1))}
                      disabled={userPage <= 1}
                    >
                      Prev
                    </button>
                    <span className="text-slate-300 text-sm">
                      Page {userPage} of {userPages}
                    </span>
                    <button
                      className="px-3 py-1 rounded border border-white/10 bg-white/5 disabled:opacity-50"
                      onClick={() => setUserPage((p) => Math.min(userPages, p + 1))}
                      disabled={userPage >= userPages}
                    >
                      Next
                    </button>
                  </div>
                </>
              )}
            </div>
          </Card>
        )}

        {/* QUIZZES */}
        {tab === "quizzes" && (
          <Card className="mt-6">
            <CardHeader
              title="Quizzes"
              subtitle="Create, edit, delete, and inspect attempts"
              right={
                <div className="flex items-center gap-2">
                  <input
                    value={qQuery}
                    onChange={(e) => setQQuery(e.target.value)}
                    placeholder="Search by title…"
                    className="px-3 py-1.5 text-sm rounded border border-white/10 bg-white/10 placeholder:text-slate-400 text-white"
                  />
                  <button
                    className="px-3 py-1.5 rounded bg-slate-800 text-white text-sm"
                    onClick={() => {
                      setQPage(1);
                      loadQuizzes();
                    }}
                  >
                    Search
                  </button>
                  <button
                    className="px-3 py-1.5 rounded bg-sky-600 text-white text-sm"
                    onClick={() => {
                      setQuizForm({ title: "", description: "", category: "" });
                      setShowQuizModal("create");
                    }}
                  >
                    + New Quiz
                  </button>
                </div>
              }
            />
            <div className="p-4">
              {quizzesUnavailable ? (
                <div className="text-slate-300">
                  This backend doesn’t expose admin quiz endpoints yet. Add:
                  <code className="text-sky-300"> GET /quiz?query=&page=&limit=</code>,
                  <code className="text-sky-300"> POST /quiz</code>,
                  <code className="text-sky-300"> PUT /quiz/:id</code>,
                  <code className="text-sky-300"> DELETE /quiz/:id</code>.
                </div>
              ) : (
                <>
                  <div className="overflow-x-auto rounded border border-white/10">
                    <table className="w-full text-sm">
                      <thead className="bg-white/5 text-slate-300">
                        <tr>
                          <th className="text-left p-3">Title</th>
                          <th className="text-left p-3">Category</th>
                          <th className="text-left p-3">Created</th>
                          <th className="text-left p-3">Attempts</th>
                          <th className="text-left p-3">Actions</th>
                        </tr>
                      </thead>
                      <tbody className="divide-y divide-white/10">
                        {qrows.map((q) => (
                          <tr key={q.id}>
                            <td className="p-3">{q.title || `Quiz ${q.id}`}</td>
                            <td className="p-3 text-slate-300">{q.category || "—"}</td>
                            <td className="p-3 text-slate-300">
                              {q.createdAt ? new Date(q.createdAt).toLocaleDateString() : "—"}
                            </td>
                            <td className="p-3 text-slate-300">{q.attemptsCount ?? 0}</td>
                            <td className="p-3 flex gap-2">
                              <a
                                href={`/quiz/${q.id}/attempts`}
                                className="px-2 py-1 rounded bg-slate-800 text-white text-xs"
                              >
                                Attempts
                              </a>
                              <button
                                onClick={() => startEdit(q)}
                                className="px-2 py-1 rounded bg-amber-600 text-white text-xs"
                              >
                                Edit
                              </button>
                              <button
                                onClick={() => deleteQuiz(q.id)}
                                className="px-2 py-1 rounded bg-rose-600 text-white text-xs"
                              >
                                Delete
                              </button>
                            </td>
                          </tr>
                        ))}
                        {!qrows.length && (
                          <tr>
                            <td className="p-3 text-slate-400" colSpan={5}>
                              {qQuery ? "No matches." : "No quizzes to display."}
                            </td>
                          </tr>
                        )}
                      </tbody>
                    </table>
                  </div>

                  <div className="flex items-center gap-2 mt-3">
                    <button
                      className="px-3 py-1 rounded border border-white/10 bg-white/5 disabled:opacity-50"
                      onClick={() => setQPage((p) => Math.max(1, p - 1))}
                      disabled={qPage <= 1}
                    >
                      Prev
                    </button>
                    <span className="text-slate-300 text-sm">
                      Page {qPage} of {quizPages}
                    </span>
                    <button
                      className="px-3 py-1 rounded border border-white/10 bg-white/5 disabled:opacity-50"
                      onClick={() => setQPage((p) => Math.min(quizPages, p + 1))}
                      disabled={qPage >= quizPages}
                    >
                      Next
                    </button>
                  </div>
                </>
              )}
            </div>

            {/* Create / Edit modal */}
            {showQuizModal && (
              <div className="fixed inset-0 bg-black/50 backdrop-blur-sm flex items-center justify-center z-50">
                <div className="bg-[#0f172a] text-white rounded-2xl shadow-xl w-full max-w-lg border border-white/10">
                  <div className="p-4 border-b border-white/10">
                    <div className="text-lg font-semibold">
                      {showQuizModal === "create" ? "Create Quiz" : "Edit Quiz"}
                    </div>
                  </div>
                  <div className="p-4 space-y-3">
                    <div className="space-y-1">
                      <label className="text-sm text-slate-300">Title</label>
                      <input
                        className="w-full rounded border border-white/10 bg-white/10 px-3 py-2 text-white placeholder:text-slate-400"
                        value={quizForm.title}
                        onChange={(e) => setQuizForm((f) => ({ ...f, title: e.target.value }))}
                      />
                    </div>
                    <div className="space-y-1">
                      <label className="text-sm text-slate-300">Category</label>
                      <input
                        className="w-full rounded border border-white/10 bg-white/10 px-3 py-2 text-white placeholder:text-slate-400"
                        value={quizForm.category}
                        onChange={(e) => setQuizForm((f) => ({ ...f, category: e.target.value }))}
                      />
                    </div>
                    <div className="space-y-1">
                      <label className="text-sm text-slate-300">Description</label>
                      <textarea
                        className="w-full rounded border border-white/10 bg-white/10 px-3 py-2 text-white placeholder:text-slate-400"
                        rows={3}
                        value={quizForm.description}
                        onChange={(e) => setQuizForm((f) => ({ ...f, description: e.target.value }))}
                      />
                    </div>
                  </div>
                  <div className="p-4 border-t border-white/10 flex items-center justify-end gap-2">
                    <button
                      className="px-3 py-1.5 rounded border border-white/10 bg-white/5"
                      onClick={() => {
                        setShowQuizModal(null);
                        setQuizForm({ title: "", description: "", category: "" });
                      }}
                    >
                      Cancel
                    </button>
                    {showQuizModal === "create" ? (
                      <button
                        onClick={createQuiz}
                        className="px-3 py-1.5 rounded bg-sky-600 hover:bg-sky-500 text-white"
                        disabled={!quizForm.title.trim()}
                      >
                        Create
                      </button>
                    ) : (
                      <button
                        onClick={saveEdit}
                        className="px-3 py-1.5 rounded bg-amber-600 hover:bg-amber-500 text-white"
                        disabled={!quizForm.title.trim()}
                      >
                        Save
                      </button>
                    )}
                  </div>
                </div>
              </div>
            )}
          </Card>
        )}
      </div>
    </div>
  );
}
