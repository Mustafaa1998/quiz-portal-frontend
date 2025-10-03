import { useEffect, useState, useCallback, useRef } from "react";
import { Link, useNavigate, useParams } from "react-router-dom";
import PageLoader from "../components/PageLoader";
import InlineAlert from "../components/InLineAlerts";

type Answer = {
  questionId: number;
  selectedOptionIndex: number;
  isCorrect: boolean;
};

type Result = {
  attemptId: number;
  quizId: number;
  studentId: number;
  score: number;
  total: number;
  answers: Answer[];
  startedAt: string;
};

const API = import.meta.env.VITE_API_URL || "http://localhost:3000";

function authHeaders() {
  const token = localStorage.getItem("token") ?? "";
  return {
    "Content-Type": "application/json",
    ...(token ? { Authorization: `Bearer ${token}` } : {}),
  };
}

export default function ResultPage() {
  const { quizId, attemptId } = useParams();
  const nav = useNavigate();
  const [data, setData] = useState<Result | null>(null);
  const [err, setErr] = useState("");
  const [loading, setLoading] = useState(true);
  const abortRef = useRef<AbortController | null>(null);
  const load = useCallback(async () => {
    if (!quizId || !attemptId) {
      setErr("Invalid URL: quizId or attemptId is missing.");
      setLoading(false);
      return;
    }
    setErr("");
    setLoading(true);

    abortRef.current?.abort();
    const ctrl = new AbortController();
    abortRef.current = ctrl;

    try {
      const res = await fetch(
        `${API}/quiz/${quizId}/attempts/${attemptId}/result`,
        { headers: authHeaders(), signal: ctrl.signal }
      );
      if (!res.ok) {
        let message = `HTTP ${res.status}`;
        try {
          const j = await res.json();
          message = j?.message ?? message;
        } catch {
          const t = await res.text().catch(() => "");
          if (t) message = t;
        }
        if (res.status === 401) {
          nav("/login", { replace: true });
        }
        throw new Error(message);
      }
      const json: Result = await res.json();
      setData(json);
    } catch (e: any) {
      if (e?.name !== "AbortError") {
        setErr(e?.message ?? "Failed to load result");
        setData(null);
      }
    } finally {
      setLoading(false);
    }
  }, [quizId, attemptId, nav]);

  useEffect(() => {
    load();
    return () => abortRef.current?.abort();
  }, [load]);

  const pct =
    data && data.total > 0 ? Math.round((data.score / data.total) * 100) : 0;

  return (
    <div className="max-w-[800px] mx-auto px-4 py-6 space-y-4 text-slate-200">
      <PageLoader show={loading} />

      <h1 className="text-2xl font-semibold text-white">Result</h1>

      {err && (
        <InlineAlert type="error" onRetry={load}>
          {err}
        </InlineAlert>
      )}

      {!loading && !err && data && (
        <>
          <div className="p-4 rounded-2xl border border-slate-700 bg-slate-800 shadow-sm flex items-center justify-between">
            <div>
              <div className="text-slate-400 text-sm">
                Attempt {data.attemptId} • Quiz {data.quizId}
              </div>
              <div className="text-lg font-semibold text-white">
                Score: {data.score} / {data.total}{" "}
                <span className="text-slate-400 font-normal">({pct}%)</span>
              </div>
            </div>
            <div>
              <span
                className={`px-2 py-1 rounded text-sm ${
                  pct >= 50
                    ? "bg-emerald-200 text-emerald-900"
                    : "bg-red-200 text-red-900"
                }`}
              >
                {pct >= 50 ? "Pass" : "Needs Improvement"}
              </span>
            </div>
          </div>

          <section className="space-y-2">
            <h3 className="text-lg font-semibold text-white mt-2">Answers</h3>
            <ul className="space-y-2">
              {data.answers.map((a, i) => (
                <li
                  key={`${a.questionId}-${i}`}
                  className="p-3 rounded border border-slate-700 bg-slate-900 flex items-center justify-between"
                >
                  <div className="text-sm text-slate-200">
                    <span className="font-medium">Q{a.questionId}</span>{" "}
                    <span className="text-slate-400">
                      • selected option {a.selectedOptionIndex}
                    </span>
                  </div>
                  <div
                    className={
                      a.isCorrect ? "text-emerald-400" : "text-red-400"
                    }
                  >
                    {a.isCorrect ? "correct" : "wrong"}
                  </div>
                </li>
              ))}
            </ul>
          </section>

          <div className="pt-2">
            <Link className="text-sky-400 hover:underline" to="/dashboard">
              ← Back to dashboard
            </Link>
          </div>
        </>
      )}
    </div>
  );
}
