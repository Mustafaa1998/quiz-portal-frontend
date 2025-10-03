import { useEffect, useRef, useState, useCallback } from "react";
import { Link, useNavigate, useParams } from "react-router-dom";
import PageLoader from "../components/PageLoader";
import InlineAlert from "../components/InLineAlerts";

type Question = {
  id: number;
  text: string;
  options: string[];
  correctOptionIndex: number;
};

const API = import.meta.env.VITE_API_URL || "http://localhost:3000";

function authHeaders() {
  const token = localStorage.getItem("token") ?? "";
  return { "Content-Type": "application/json", Authorization: `Bearer ${token}` };
}

function logoutAndGoLogin(nav: ReturnType<typeof useNavigate>) {
  localStorage.removeItem("token");
  localStorage.removeItem("user");
  nav("/login", { replace: true });
}

async function parseError(res: Response) {
  let msg = `HTTP ${res.status}`;
  try {
    const j = await res.json();
    msg = j?.message ?? msg;
  } catch {
    const t = await res.text().catch(() => "");
    if (t) msg = t;
  }
  return msg;
}

export default function AttemptPage() {
  const { quizId, attemptId } = useParams();
  const nav = useNavigate();

  const [loading, setLoading] = useState(true);
  const [sending, setSending] = useState(false);
  const [err, setErr] = useState<string>("");

  const [questions, setQuestions] = useState<Question[]>([]);
  const [idx, setIdx] = useState(0);
  const [selected, setSelected] = useState<number | null>(null);

  const abortRef = useRef<AbortController | null>(null);

  const load = useCallback(async () => {
    setErr("");
    setLoading(true);

    abortRef.current?.abort();
    const ctrl = new AbortController();
    abortRef.current = ctrl;

    try {
      const res = await fetch(`${API}/quiz/${quizId}/questions`, {
        headers: authHeaders(),
        signal: ctrl.signal,
      });

      if (res.status === 401) {
        logoutAndGoLogin(nav);
        return;
      }
      if (!res.ok) throw new Error(await parseError(res));

      const data: Question[] = await res.json();
      setQuestions(data);
      setIdx(0);
      setSelected(null);
    } catch (e: any) {
      if (e?.name !== "AbortError") setErr(e.message || "Failed to load questions");
    } finally {
      setLoading(false);
    }
  }, [quizId, nav]);

  useEffect(() => {
    load();
    return () => abortRef.current?.abort();
  }, [load]);

  async function submitCurrent() {
    if (selected === null || sending) return;
    setSending(true);
    setErr("");
    try {
      const q = questions[idx];
      const res = await fetch(`${API}/quiz/${quizId}/attempts/${attemptId}/answers`, {
        method: "POST",
        headers: authHeaders(),
        body: JSON.stringify({ questionId: q.id, selectedOptionIndex: selected }),
      });

      if (res.status === 401) {
        logoutAndGoLogin(nav);
        return;
      }
      if (!res.ok) throw new Error(await parseError(res));

      if (idx + 1 < questions.length) {
        setIdx((i) => i + 1);
        setSelected(null);
        window.scrollTo({ top: 0, behavior: "smooth" });
      } else {
        nav(`/quiz/${quizId}/attempts/${attemptId}/result`);
      }
    } catch (e: any) {
      setErr(e.message || "Submit failed");
    } finally {
      setSending(false);
    }
  }

  useEffect(() => {
    function onKey(e: KeyboardEvent) {
      if (sending) return;
      if (e.key === "ArrowLeft" && idx > 0) setIdx((i) => i - 1);
      if (e.key === "ArrowRight" && idx < questions.length - 1) setIdx((i) => i + 1);
      if (e.key === "Enter") submitCurrent();
    }
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [idx, questions.length, sending]);

  if (loading) return <PageLoader show={true} /> as any;

  if (err)
    return (
      <div className="p-6 text-white">
        <InlineAlert type="error" onRetry={load}>
          {err}
        </InlineAlert>
        <div className="mt-4">
          <Link className="text-sky-400 hover:underline" to="/dashboard">
            ← Back to dashboard
          </Link>
        </div>
      </div>
    );

  if (!questions.length)
    return (
      <div className="p-6 text-white">
        No questions in this quiz.{" "}
        <Link className="text-sky-400 hover:underline" to="/dashboard">
          Back
        </Link>
      </div>
    );

  const q = questions[idx];
  const total = questions.length;

  return (
    <div className="min-h-screen bg-[#0b1220] text-white px-4 py-6">
      <PageLoader show={sending} />

      <div className="max-w-3xl mx-auto space-y-6">
        {/* Progress */}
        <header>
          <h1 className="text-xl font-semibold">
            Question {idx + 1} / {total}
          </h1>
          <div className="w-full h-2 bg-white/10 rounded-full mt-2">
            <div
              className="h-2 bg-sky-500 rounded-full transition-all"
              style={{
                width: `${Math.round(
                  ((idx + (selected !== null ? 1 : 0)) / total) * 100
                )}%`,
              }}
            />
          </div>
        </header>

        {/* Question */}
        <section className="p-4 rounded-xl border border-white/10 bg-white/5">
          <p className="text-lg font-medium mb-4">{q.text}</p>

          <div className="space-y-3">
            {q.options.map((opt, i) => (
              <button
                key={i}
                onClick={() => setSelected(i)}
                className={`w-full text-left px-4 py-3 rounded-lg border transition ${
                  selected === i
                    ? "bg-sky-600 border-sky-500 text-white"
                    : "bg-white/5 border-white/10 hover:bg-white/10"
                }`}
              >
                {opt}
              </button>
            ))}
          </div>
        </section>

        {/* Navigation */}
        <div className="flex justify-between items-center">
          <button
            onClick={() => {
              if (idx > 0) {
                setIdx((i) => i - 1);
                setSelected(null);
                window.scrollTo({ top: 0, behavior: "smooth" });
              }
            }}
            disabled={idx === 0 || sending}
            className="px-4 py-2 rounded-lg border border-white/10 bg-white/5 hover:bg-white/10 disabled:opacity-50"
          >
            ← Prev
          </button>

          <button
            onClick={submitCurrent}
            disabled={selected === null || sending}
            className="px-4 py-2 rounded-lg bg-sky-600 hover:bg-sky-500 text-white disabled:opacity-50"
          >
            {idx + 1 === total ? "Finish" : "Submit & Next →"}
          </button>
        </div>

        <div>
          <Link className="text-sky-400 hover:underline" to="/dashboard">
            ← Back to dashboard
          </Link>
        </div>
      </div>
    </div>
  );
}
