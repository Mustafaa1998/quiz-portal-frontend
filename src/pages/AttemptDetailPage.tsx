import { useEffect, useState, useCallback, useRef } from "react";
import { Link, useNavigate, useParams } from "react-router-dom";
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

type AttemptAnswer = {
  id: number;
  question?: {
    id: number;
    text: string;
    options?: string[];
  };
  selectedOptionIndex: number;
  isCorrect: boolean;
};

type AttemptDetail = {
  id: number;
  quizId: number;
  studentId: number;
  student?: { id: number; email?: string; name?: string };
  score: number;
  total: number;
  answers: AttemptAnswer[];
  startedAt?: string;
  submittedAt?: string;
};

export default function AttemptDetailPage() {
  const { quizId, attemptId } = useParams();
  const nav = useNavigate();

  const [data, setData] = useState<AttemptDetail | null>(null);
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
        `${API}/quiz/${quizId}/attempts/${attemptId}/detail`,
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

      const d: AttemptDetail = await res.json();
      setData(d);
    } catch (e: any) {
      if (e?.name !== "AbortError") {
        setErr(e?.message ?? "Load failed");
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

  const fmt = (s?: string) =>
    s ? new Date(s).toLocaleString() : "—";

  const studentLabel =
    data?.student?.name?.trim() ||
    data?.student?.email ||
    `#${data?.studentId}`;

  return (
    <div className="max-w-[900px] mx-auto px-4 py-6 space-y-4">
      <PageLoader show={loading} />

      <div className="flex items-center justify-between">
        <h1 className="text-2xl font-semibold">Attempt Details</h1>
        <Link
          to={`/quiz/${quizId}/attempts`}
          className="text-sky-600 hover:underline"
        >
          ← Back to attempts
        </Link>
      </div>

      {err && (
        <InlineAlert type="error" onRetry={load}>
          {err}
        </InlineAlert>
      )}

      {!loading && !err && data && (
        <>
          <div className="p-4 rounded-2xl border bg-white shadow-sm grid grid-cols-1 md:grid-cols-2 gap-3">
            <div className="space-y-1">
              <div className="text-slate-500 text-sm">Attempt #{data.id}</div>
              <div className="text-sm">
                <span className="text-slate-500">Student: </span>
                <span className="font-medium">{studentLabel}</span>
              </div>
              <div className="text-sm">
                <span className="text-slate-500">Quiz ID: </span>
                {data.quizId}
              </div>
              <div className="text-sm">
                <span className="text-slate-500">Started: </span>
                {fmt(data.startedAt)}
              </div>
              <div className="text-sm">
                <span className="text-slate-500">Submitted: </span>
                {fmt(data.submittedAt)}
              </div>
            </div>

            <div className="flex md:items-center md:justify-end">
              <div className="inline-flex items-center gap-2">
                <span
                  className={`px-3 py-1.5 rounded-lg text-sm font-medium ${
                    data.score / Math.max(1, data.total) >= 0.5
                      ? "bg-emerald-100 text-emerald-700"
                      : "bg-red-100 text-red-700"
                  }`}
                >
                  Score: {data.score} / {data.total}
                </span>
                <span className="px-3 py-1.5 rounded-lg text-sm bg-slate-100 text-slate-700">
                  {Math.round((data.score / Math.max(1, data.total)) * 100)}%
                </span>
              </div>
            </div>
          </div>
          <section className="space-y-3">
            <h3 className="text-lg font-semibold">Answers</h3>

            {data.answers?.length ? (
              <div className="overflow-hidden rounded-xl border border-slate-200 bg-white">
                <ul className="divide-y divide-slate-200">
                  {data.answers.map((a) => {
                    const q = a.question;
                    const selectedText =
                      q?.options && q.options[a.selectedOptionIndex];

                    return (
                      <li key={a.id} className="p-4">
                        <div className="flex items-start justify-between gap-3">
                          <div className="text-sm">
                            <div className="font-medium">
                              Q{q?.id ? `#${q.id}` : ""}{" "}
                              {q?.text ? (
                                <span className="text-slate-700 font-normal">
                                  — {q.text}
                                </span>
                              ) : null}
                            </div>
                            <div className="text-slate-600 mt-1">
                              Selected:{" "}
                              <code className="text-slate-800">
                                {a.selectedOptionIndex}
                              </code>
                              {selectedText ? (
                                <span className="ml-2">({selectedText})</span>
                              ) : null}
                            </div>
                          </div>

                          <div
                            className={`shrink-0 inline-flex items-center px-2.5 py-1 rounded-md text-sm ${
                              a.isCorrect
                                ? "bg-emerald-100 text-emerald-700"
                                : "bg-red-100 text-red-700"
                            }`}
                            title={a.isCorrect ? "Correct" : "Incorrect"}
                          >
                            {a.isCorrect ? "Correct" : "Wrong"}
                          </div>
                        </div>
                      </li>
                    );
                  })}
                </ul>
              </div>
            ) : (
              <div className="text-slate-600 text-sm">No answers found.</div>
            )}
          </section>

          <div className="pt-2">
            <Link className="text-sky-600 hover:underline" to={`/quiz/${quizId}/attempts`}>
              ← Back to attempts
            </Link>
          </div>
        </>
      )}
    </div>
  );
}
