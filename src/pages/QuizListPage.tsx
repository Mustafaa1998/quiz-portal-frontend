import { useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";

import PageLoader from "../components/PageLoader";
import InlineAlert from "../components/InLineAlerts";

const API = import.meta.env.VITE_API_URL ?? "http://localhost:3000";

function authHeaders() {
  const token = localStorage.getItem("token") ?? "";
  return {
    "Content-Type": "application/json",
    Authorization: `Bearer ${token}`,
  };
}

type Quiz = {
  id: number;
  title: string;
  description?: string;
  createdAt?: string;
  createdBy?: { id: number; email: string };
};

export default function QuizListPage() {
  const [quizzes, setQuizzes] = useState<Quiz[]>([]);
  const [loading, setLoading] = useState(true);
  const [err, setErr] = useState("");
  const [taking, setTaking] = useState<number | null>(null);
  const nav = useNavigate();

  async function loadQuizzes(signal?: AbortSignal) {
    setLoading(true);
    setErr("");
    try {
      const res = await fetch(`${API}/quiz/all`, { headers: authHeaders(), signal });
      if (res.status === 401) {
        localStorage.removeItem("token");
        localStorage.removeItem("user");
        nav("/login", { replace: true });
        return;
      }
      if (!res.ok) {
        const j = await res.json().catch(() => ({}));
        throw new Error(j?.message || "Failed to fetch quizzes");
      }
      const data = (await res.json()) as Quiz[];
      setQuizzes(Array.isArray(data) ? data : []);
    } catch (e: any) {
      if (e?.name !== "AbortError") setErr(e?.message || "Error loading quizzes");
    } finally {
      setLoading(false);
    }
  }

  async function startAttempt(quizId: number) {
    setErr("");
    try {
      setTaking(quizId);
      const res = await fetch(`${API}/quiz/${quizId}/attempts`, {
        method: "POST",
        headers: authHeaders(),
      });
      if (res.status === 401) {
        localStorage.removeItem("token");
        localStorage.removeItem("user");
        nav("/login", { replace: true });
        return;
      }
      if (!res.ok) {
        const j = await res.json().catch(() => ({}));
        throw new Error(j?.message || "Could not start attempt");
      }
      const attempt = await res.json();
      nav(`/quiz/${quizId}/attempts/${attempt.id}`);
    } catch (e: any) {
      setErr(e?.message || "Could not start attempt");
    } finally {
      setTaking(null);
    }
  }

  useEffect(() => {
    const ac = new AbortController();
    loadQuizzes(ac.signal);
    return () => ac.abort();
  }, []);

  return (
    <div className="min-h-screen text-white">
      <PageLoader show={loading || taking !== null} />

      <div className="max-w-6xl mx-auto px-4 py-8">
        <header className="flex items-center justify-between">
          <div>
            <h1 className="text-2xl font-semibold">All Quizzes</h1>
            <p className="text-slate-400">Browse quizzes you can take</p>
          </div>
          <button
            onClick={() => loadQuizzes()}
            className="px-3 py-1 rounded bg-slate-800 hover:bg-slate-700 text-white text-sm disabled:opacity-60"
            disabled={loading}
          >
            {loading ? "Loading…" : "Refresh"}
          </button>
        </header>

        {err && (
          <div className="mt-4">
            <InlineAlert type="error" onRetry={() => loadQuizzes()}>
              {err}
            </InlineAlert>
          </div>
        )}

        {!loading && quizzes.length > 0 && (
          <section className="mt-6 p-4 rounded-2xl border border-white/10 bg-white/5">
            <h2 className="text-lg font-semibold mb-3">All Quizzes</h2>

            <ul className="space-y-2">
              {quizzes.map((q) => (
                <li
                  key={q.id}
                  className="flex items-center justify-between p-3 rounded-lg border border-white/10 bg-white/5"
                >
                  <div>
                    <div className="font-medium">{q.title}</div>
                    <div className="text-sm text-slate-400">
                      {q.description || "—"}
                    </div>
                    <div className="text-xs text-slate-500 mt-1">
                      {q.createdAt
                        ? `Created: ${new Date(q.createdAt).toLocaleDateString()}`
                        : ""}
                      {q.createdBy?.email ? ` • by ${q.createdBy.email}` : ""}
                    </div>
                  </div>

                  <button
                    onClick={() => startAttempt(q.id)}
                    className="px-3 py-1 bg-sky-600 hover:bg-sky-500 text-white rounded text-sm disabled:opacity-60"
                    disabled={taking === q.id}
                  >
                    {taking === q.id ? "Starting…" : "Take Quiz"}
                  </button>
                </li>
              ))}
            </ul>
          </section>
        )}

        {!loading && !err && quizzes.length === 0 && (
          <div className="mt-6 text-slate-400">No quizzes found.</div>
        )}
      </div>
    </div>
  );
}
