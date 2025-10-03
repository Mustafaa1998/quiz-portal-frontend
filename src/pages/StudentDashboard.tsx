import { useEffect, useState } from "react";
import { Link, useNavigate } from "react-router-dom";
import PageLoader from "../components/PageLoader";
import InlineAlert from "../components/InLineAlerts";
import { useAuth } from "../auth/AuthContext";

const API = import.meta.env.VITE_API_URL ?? "http://localhost:3000";

function authHeaders() {
  const token = localStorage.getItem("token") ?? "";
  return {
    "Content-Type": "application/json",
    ...(token ? { Authorization: `Bearer ${token}` } : {}),
  };
}

type Quiz = { id: number; title: string; description?: string; createdAt?: string };

type AttemptRow = {
  id: number;
  quizId: number;
  quizTitle: string;
  score: number;
  total: number;
  startedAt: string;
};

export default function StudentDashboard() {
  const nav = useNavigate();
  const { user } = useAuth();

  const [quizzes, setQuizzes] = useState<Quiz[]>([]);
  const [attempts, setAttempts] = useState<AttemptRow[]>([]);
  const [loading, setLoading] = useState(true);
  const [attemptsMissingAPI, setAttemptsMissingAPI] = useState(false);
  const [err, setErr] = useState("");
  const [taking, setTaking] = useState<number | null>(null);

  async function getJSON<T>(path: string): Promise<T> {
    const res = await fetch(`${API}${path}`, { headers: authHeaders() });
    if (res.status === 401) {
      localStorage.removeItem("token");
      localStorage.removeItem("user");
      nav("/login", { replace: true });
      throw new Error("Unauthorized");
    }
    if (!res.ok) {
      const j = await res.json().catch(() => ({}));
      const errorObj: any = new Error(j?.message || `GET ${path} failed`);
      errorObj.status = res.status;
      throw errorObj;
    }
    return res.json() as Promise<T>;
  }

  async function postJSON<T>(path: string, body?: any): Promise<T> {
    const res = await fetch(`${API}${path}`, {
      method: "POST",
      headers: authHeaders(),
      body: body ? JSON.stringify(body) : undefined,
    });
    if (res.status === 401) {
      localStorage.removeItem("token");
      localStorage.removeItem("user");
      nav("/login", { replace: true });
      throw new Error("Unauthorized");
    }
    if (!res.ok) {
      const j = await res.json().catch(() => ({}));
      throw new Error(j?.message || `POST ${path} failed`);
    }
    return res.json() as Promise<T>;
  }

  function normalizeAttempts(raw: any): AttemptRow[] {
    if (!raw) return [];
    if (Array.isArray(raw) && raw[0]?.quiz) {
      return raw.map((a: any) => ({
        id: a.id,
        quizId: a.quiz.id,
        quizTitle: a.quiz.title,
        score: a.score,
        total: a.total,
        startedAt: a.startedAt,
      }));
    }
    if (Array.isArray(raw) && (raw[0]?.quizId || raw[0]?.quizTitle)) {
      return raw.map((a: any) => ({
        id: a.id,
        quizId: a.quizId,
        quizTitle: a.quizTitle,
        score: a.score,
        total: a.total,
        startedAt: a.startedAt,
      }));
    }
    if (Array.isArray(raw?.data)) return normalizeAttempts(raw.data);
    return [];
  }

  async function loadData() {
    setLoading(true);
    setErr("");
    setAttemptsMissingAPI(false);
    try {
      const allQuizzes = await getJSON<Quiz[]>("/quiz/all");
      setQuizzes(allQuizzes);
    } catch (e: any) {
      if (e?.message !== "Unauthorized") {
        setErr(e.message || "Failed to load quizzes");
      }
    } finally {
      setLoading(false);
    }

    try {
      const raw = await getJSON<any>("/quiz/student/attempts");
      setAttempts(normalizeAttempts(raw));
    } catch (e: any) {
      if (e?.status === 404 || e?.status === 501) {
        setAttemptsMissingAPI(true);
        setAttempts([]);
      } else if (e?.message !== "Unauthorized") {
        setErr(e.message || "Failed to load attempts");
      }
    }
  }

  async function startAttempt(quizId: number) {
    setErr("");
    try {
      setTaking(quizId);
      const attempt = await postJSON<{ id: number }>(`/quiz/${quizId}/attempts`);
      nav(`/quiz/${quizId}/attempts/${attempt.id}`);
    } catch (e: any) {
      if (e?.message !== "Unauthorized") {
        setErr(e.message || "Could not start attempt");
      }
    } finally {
      setTaking(null);
    }
  }

  useEffect(() => {
    loadData();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  return (
    // just color theming to match landing page
    <div className="min-h-screen bg-[#0b1220] text-white">
      <PageLoader show={loading || taking !== null} />

      <div className="max-w-6xl mx-auto px-4 py-8 space-y-6">
        <header className="flex items-center justify-between">
          <div>
            <h1 className="text-2xl font-semibold">
              Welcome, {user?.name || "Student"} <span aria-hidden>👋</span>
            </h1>
            <p className="text-slate-400">Take quizzes & track your progress</p>
          </div>
          <button
            onClick={loadData}
            className="px-3 py-1 rounded bg-slate-800 hover:bg-slate-700 text-white text-sm disabled:opacity-60"
            disabled={loading}
          >
            {loading ? "Loading…" : "Refresh"}
          </button>
        </header>

        {err && (
          <div>
            <InlineAlert type="error" onRetry={loadData}>
              {err}
            </InlineAlert>
          </div>
        )}

        {/* Available Quizzes */}
        <section className="p-4 rounded-2xl border border-white/10 bg-white/5">
          <h2 className="text-lg font-semibold mb-3">Available Quizzes</h2>

          {loading ? (
            <p className="text-slate-400">Loading…</p>
          ) : quizzes.length ? (
            <ul className="space-y-2">
              {quizzes.map((q) => (
                <li
                  key={q.id}
                  className="flex items-center justify-between p-4 rounded-xl border border-white/10 bg-white/5"
                >
                  <div>
                    <div className="font-medium">{q.title}</div>
                    <div className="text-sm text-slate-400">
                      {q.description || "—"}
                    </div>
                  </div>
                  <button
                    className="px-3 py-1 bg-sky-600 hover:bg-sky-500 text-white rounded disabled:opacity-60"
                    onClick={() => startAttempt(q.id)}
                    disabled={taking === q.id}
                  >
                    {taking === q.id ? "Starting…" : "Take Quiz"}
                  </button>
                </li>
              ))}
            </ul>
          ) : (
            <p className="text-slate-400">No quizzes available.</p>
          )}
        </section>

        {/* My Attempts */}
        <section className="p-4 rounded-2xl border border-white/10 bg-white/5">
          <h2 className="text-lg font-semibold mb-3">My Attempts</h2>

          {attemptsMissingAPI && (
            <p className="text-slate-400">
              Backend route missing:{" "}
              <code className="text-sky-300">GET /quiz/student/attempts</code>
            </p>
          )}

          {!attemptsMissingAPI && attempts.length === 0 && (
            <p className="text-slate-400">No attempts yet.</p>
          )}

          {attempts.length > 0 && (
            <div className="overflow-hidden rounded-xl border border-white/10">
              <table className="min-w-full divide-y divide-white/10">
                <thead className="bg-white/5 text-slate-300">
                  <tr>
                    <th className="px-4 py-2 text-left font-medium">Quiz</th>
                    <th className="px-4 py-2 font-medium">Score</th>
                    <th className="px-4 py-2 font-medium">Date</th>
                    <th className="px-4 py-2 font-medium">Action</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-white/10">
                  {attempts.map((a) => (
                    <tr key={a.id} className="hover:bg-white/5">
                      <td className="px-4 py-2">{a.quizTitle}</td>
                      <td className="px-4 py-2 text-center">
                        <span
                          className={`px-2 py-1 text-xs rounded ${
                            a.score / a.total >= 0.5
                              ? "bg-emerald-500/20 text-emerald-300"
                              : "bg-rose-500/20 text-rose-300"
                          }`}
                        >
                          {a.score}/{a.total}
                        </span>
                      </td>
                      <td className="px-4 py-2 text-center text-slate-300">
                        {new Date(a.startedAt).toLocaleDateString()}
                      </td>
                      <td className="px-4 py-2 text-center">
                        <Link
                          to={`/quiz/${a.quizId}/attempts/${a.id}/result`}
                          className="text-sky-300 hover:underline"
                        >
                          View Result
                        </Link>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </section>
      </div>
    </div>
  );
}
