import { useEffect, useState, useCallback, useRef } from "react";
import { Link, useParams, useNavigate } from "react-router-dom";
import PageLoader from "../components/PageLoader";
import InlineAlert from "../components/InLineAlerts";

const API = import.meta.env.VITE_API_URL ?? "http://localhost:3000";

function authHeaders() {
  const token = localStorage.getItem("token") ?? "";
  return {
    "Content-Type": "application/json",
    ...(token ? { Authorization: `Bearer ${token}` } : {}),
  };
}

type Row = {
  id: number;
  quizId: number;
  studentId: number;
  student?: { id: number; email: string };
  score?: number;
  total?: number;
  startedAt?: string;
  submittedAt?: string | null;
};

export default function QuizAttemptsAdminPage() {
  const { quizId } = useParams();
  const nav = useNavigate();

  const [rows, setRows] = useState<Row[]>([]);
  const [total, setTotal] = useState(0);
  const [page, setPage] = useState(1);
  const [pageSize] = useState(10);

  const [loading, setLoading] = useState(false);
  const [err, setErr] = useState("");

  const abortRef = useRef<AbortController | null>(null);

  const load = useCallback(async () => {
    if (!quizId) {
      setErr("Invalid URL: quizId is missing.");
      return;
    }
    setErr("");
    setLoading(true);

    abortRef.current?.abort();
    const ctrl = new AbortController();
    abortRef.current = ctrl;

    try {
      const res = await fetch(
        `${API}/quiz/${quizId}/attempts?page=${page}&limit=${pageSize}`,
        { headers: authHeaders(), signal: ctrl.signal }
      );

      if (res.status === 401) {
        localStorage.removeItem("token");
        localStorage.removeItem("user");
        nav("/login", { replace: true });
        return;
      }

      if (!res.ok) {
        let message = `HTTP ${res.status}`;
        try {
          message = (await res.json())?.message ?? message;
        } catch {}
        throw new Error(message);
      }

      const data = await res.json();
      setRows(data.items ?? []);
      setTotal(data.total ?? 0);
    } catch (e: any) {
      if (e?.name !== "AbortError")
        setErr(e?.message || "Failed to load attempts");
    } finally {
      setLoading(false);
    }
  }, [quizId, page, pageSize, nav]);

  useEffect(() => {
    load();
    return () => abortRef.current?.abort();
  }, [load]);

  const pages = Math.max(1, Math.ceil(total / pageSize));

  return (
    <div className="max-w-[1000px] mx-auto px-4 py-6 space-y-4 text-slate-200">
      <PageLoader show={loading} />

      <h1 className="text-2xl font-semibold text-white">
        Quiz Attempts (Quiz #{quizId})
      </h1>

      {err && <InlineAlert type="error" onRetry={load}>{err}</InlineAlert>}

      {!loading && !err && rows.length === 0 && (
        <p className="text-slate-400">No attempts yet.</p>
      )}

      {!loading && !err && rows.length > 0 && (
        <>
          <div className="rounded-2xl border border-slate-700 bg-slate-800 shadow-sm overflow-hidden">
            <table className="w-full text-sm text-slate-200">
              <thead className="bg-slate-900 text-slate-300">
                <tr>
                  <th className="text-left p-3">Student</th>
                  <th className="text-left p-3">Score</th>
                  <th className="text-left p-3">Started</th>
                  <th className="text-left p-3">Submitted</th>
                  <th className="text-left p-3">Actions</th>
                </tr>
              </thead>
              <tbody>
                {rows.map((r) => (
                  <tr
                    key={r.id}
                    className="border-t border-slate-700 hover:bg-slate-700/40"
                  >
                    <td className="p-3">{r.student?.email ?? r.studentId}</td>
                    <td className="p-3">
                      {typeof r.score === "number" &&
                      typeof r.total === "number"
                        ? `${r.score}/${r.total} (${Math.round(
                            (r.score / Math.max(1, r.total)) * 100
                          )}%)`
                        : "—"}
                    </td>
                    <td className="p-3">
                      {r.startedAt
                        ? new Date(r.startedAt).toLocaleString()
                        : "—"}
                    </td>
                    <td className="p-3">
                      {r.submittedAt
                        ? new Date(r.submittedAt).toLocaleString()
                        : "—"}
                    </td>
                    <td className="p-3">
                      <Link
                        className="text-sky-400 hover:underline"
                        to={`/quiz/${r.quizId}/attempts/${r.id}/detail`}
                      >
                        View →
                      </Link>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>

          <div className="flex items-center gap-2">
            <button
              className="px-3 py-1 rounded border border-slate-700 bg-slate-800 text-slate-200 hover:bg-slate-700 disabled:opacity-50"
              onClick={() => setPage((p) => Math.max(1, p - 1))}
              disabled={page <= 1 || loading}
            >
              Prev
            </button>
            <span className="text-slate-400 text-sm">
              Page {page} of {pages}
            </span>
            <button
              className="px-3 py-1 rounded border border-slate-700 bg-slate-800 text-slate-200 hover:bg-slate-700 disabled:opacity-50"
              onClick={() => setPage((p) => Math.min(pages, p + 1))}
              disabled={page >= pages || loading}
            >
              Next
            </button>
          </div>
        </>
      )}
    </div>
  );
}
