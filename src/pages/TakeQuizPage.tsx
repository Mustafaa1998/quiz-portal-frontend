import { useEffect, useMemo, useRef, useState, useCallback } from "react";
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

type Question = {
  id: number;
  text: string;
  options: string[];
  correctOptionIndex?: number;
};

type ResultPayload = {
  attemptId: number;
  quizId: number;
  studentId: number;
  score: number;
  total: number;
  answers: Array<{
    questionId: number;
    selectedOptionIndex: number;
    isCorrect: boolean;
  }>;
  startedAt: string;
};

export default function TakeQuizPage() {
  const { quizId: quizIdParam, attemptId: attemptIdParam } = useParams();
  const quizId = Number(quizIdParam);
  const attemptId = Number(attemptIdParam);
  const nav = useNavigate();

  const [loading, setLoading] = useState(true);
  const [err, setErr] = useState("");
  const [questions, setQuestions] = useState<Question[]>([]);
  const [current, setCurrent] = useState(0);
  const [answers, setAnswers] = useState<Record<number, number | undefined>>({});
  const [saving, setSaving] = useState(false);
  const [finished, setFinished] = useState<ResultPayload | null>(null);

  const loadAbortRef = useRef<AbortController | null>(null);

  const getJSON = useCallback(async <T,>(path: string, signal?: AbortSignal): Promise<T> => {
    const res = await fetch(`${API}${path}`, { headers: authHeaders(), signal });
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
    return res.json() as Promise<T>;
  }, [nav]);

  const postJSON = useCallback(async <T,>(path: string, body: any): Promise<T> => {
    const res = await fetch(`${API}${path}`, {
      method: "POST",
      headers: authHeaders(),
      body: JSON.stringify(body),
    });
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
    return res.json() as Promise<T>;
  }, [nav]);

  const load = useCallback(async () => {
    if (!quizId || !attemptId) {
      setErr("Invalid URL: quizId or attemptId is missing.");
      setLoading(false);
      return;
    }
    setErr("");
    setLoading(true);

    loadAbortRef.current?.abort();
    const ctrl = new AbortController();
    loadAbortRef.current = ctrl;

    try {
      const qs = await getJSON<Question[]>(`/quiz/${quizId}/questions`, ctrl.signal);
      setQuestions(qs);
      setCurrent(0);
      setAnswers({});
      setFinished(null);
    } catch (e: any) {
      if (e?.name !== "AbortError") {
        setErr(e?.message || "Failed to load quiz");
      }
    } finally {
      setLoading(false);
    }
  }, [quizId, attemptId, getJSON]);

  useEffect(() => {
    load();
    return () => loadAbortRef.current?.abort();
  }, [load]);

  const total = questions.length;
  const answeredCount = useMemo(
    () => questions.reduce((acc, q) => (typeof answers[q.id] === "number" ? acc + 1 : acc), 0),
    [questions, answers]
  );
  const progressPct = total ? Math.round((answeredCount / total) * 100) : 0;

  async function chooseOption(q: Question, optionIndex: number) {
    if (saving) return;
    setErr("");
    setSaving(true);
    const prev = answers[q.id];

    setAnswers((map) => ({ ...map, [q.id]: optionIndex }));

    try {
      await postJSON(`/quiz/${quizId}/attempts/${attemptId}/answers`, {
        questionId: q.id,
        selectedOptionIndex: optionIndex,
      });
    } catch (e: any) {
      setAnswers((map) => ({ ...map, [q.id]: prev }));
      setErr(e?.message || "Could not save answer");
    } finally {
      setSaving(false);
    }
  }

  async function finishQuiz() {
    if (saving) return;
    setErr("");
    setSaving(true);
    try {
      const r = await getJSON<ResultPayload>(`/quiz/${quizId}/attempts/${attemptId}/result`);
      setFinished(r);
    } catch (e: any) {
      setErr(e?.message || "Could not finish quiz");
    } finally {
      setSaving(false);
    }
  }

  function goto(index: number) {
    if (index < 0 || index >= total) return;
    setCurrent(index);
    window.scrollTo({ top: 0, behavior: "smooth" });
  }

  return (
    <div className="min-h-screen bg-[#0b1220] text-white p-6 space-y-6">
      <PageLoader show={loading || saving} />

      <header className="space-y-2">
        <h1 className="text-2xl font-semibold">Take Quiz</h1>

        <div
          className="w-full"
          role="progressbar"
          aria-valuemin={0}
          aria-valuemax={100}
          aria-valuenow={progressPct}
          aria-label="Quiz progress"
        >
          <p className="text-slate-300">
            Question {Math.min(current + 1, Math.max(total, 1))} of {Math.max(total, 1)}
          </p>
          <div className="w-full h-2 bg-white/10 rounded">
            <div className="h-2 bg-sky-500 rounded" style={{ width: `${progressPct}%` }} />
          </div>
          <div className="text-sm text-slate-400">{answeredCount}/{total} answered</div>
        </div>
      </header>

      {err && (
        <InlineAlert type="error" onRetry={load}>
          {err}
        </InlineAlert>
      )}

      {!loading && !err && total === 0 && (
        <div className="text-slate-300">No questions in this quiz yet.</div>
      )}

      {!loading && !err && total > 0 && (
        <>
          {/* question nav bubbles */}
          <div className="flex flex-wrap gap-2">
            {questions.map((qq, i) => {
              const done = typeof answers[qq.id] === "number";
              const isCurrent = i === current;
              return (
                <button
                  key={qq.id}
                  onClick={() => goto(i)}
                  className={`w-9 h-9 rounded-full border text-sm focus:outline-none focus:ring-2 focus:ring-sky-400
                    ${isCurrent
                      ? "bg-sky-600 text-white border-sky-600"
                      : done
                      ? "bg-emerald-500/20 text-emerald-300 border-emerald-400/30"
                      : "bg-white/5 text-slate-200 border-white/10 hover:bg-white/10"}`}
                  title={done ? "Answered" : "Unanswered"}
                  aria-current={isCurrent ? "step" : undefined}
                >
                  {i + 1}
                </button>
              );
            })}
          </div>

          {/* current question */}
          {questions[current] && (
            <section className="p-4 rounded-2xl border border-white/10 bg-white/5">
              <h2 className="text-lg font-semibold mb-3">{questions[current].text}</h2>
              <div className="space-y-2">
                {questions[current].options.map((opt, idx) => {
                  const isSelected = answers[questions[current].id] === idx;
                  return (
                    <button
                      key={idx}
                      onClick={() => chooseOption(questions[current], idx)}
                      disabled={saving}
                      className={`w-full text-left p-3 rounded border transition
                        focus:outline-none focus:ring-2 focus:ring-sky-400
                        ${isSelected
                          ? "bg-sky-600/20 border-sky-500 text-white"
                          : "bg-white/5 border-white/10 text-slate-200 hover:bg-white/10"}`}
                      aria-pressed={isSelected}
                    >
                      <span className="mr-2 inline-block w-5 text-center">
                        {isSelected ? "●" : "○"}
                      </span>
                      {opt}
                    </button>
                  );
                })}
              </div>
            </section>
          )}

          {/* nav + finish */}
          <div className="flex items-center justify-between">
            <button
              className="px-3 py-2 rounded border border-white/10 bg-white/5 text-white hover:bg-white/10 disabled:opacity-50"
              onClick={() => goto(current - 1)}
              disabled={current === 0 || saving}
            >
              ← Prev
            </button>

            <div className="flex items-center gap-2">
              <button
                className="px-3 py-2 rounded border border-white/10 bg-white/5 text-white hover:bg-white/10 disabled:opacity-50"
                onClick={() => goto(current + 1)}
                disabled={current >= total - 1 || saving}
              >
                Next →
              </button>
              <button
                className="px-3 py-2 rounded bg-emerald-600 hover:bg-emerald-500 text-white disabled:opacity-50"
                onClick={finishQuiz}
                disabled={finished !== null || saving}
                title="Finish and show your result"
              >
                Finish Quiz
              </button>
            </div>
          </div>

          {/* result */}
          {finished && (
            <section className="p-4 rounded-2xl border border-white/10 bg-white/5 space-y-3">
              <h3 className="text-lg font-semibold">Your Result</h3>
              <div>
                <span
                  className={`px-2 py-1 text-sm rounded
                    ${finished.score / finished.total >= 0.5
                      ? "bg-emerald-500/20 text-emerald-300"
                      : "bg-rose-500/20 text-rose-300"}`}
                >
                  Score: {finished.score}/{finished.total}
                </span>
              </div>

              <Link
                className="text-sky-300 hover:underline"
                to={`/quiz/${quizId}/attempts/${attemptId}/result`}
              >
                View detailed result page →
              </Link>

              <details className="mt-2">
                <summary className="cursor-pointer text-slate-200">
                  See selected answers
                </summary>
                <ul className="mt-2 space-y-2">
                  {finished.answers.map((a) => {
                    const qq = questions.find((x) => x.id === a.questionId);
                    return (
                      <li key={a.questionId} className="p-2 rounded border border-white/10 bg-white/5">
                        <div className="font-medium">{qq?.text ?? `Q${a.questionId}`}</div>
                        <div className="text-sm text-slate-300">
                          You chose: {qq?.options[a.selectedOptionIndex] ?? `#${a.selectedOptionIndex}`} —{" "}
                          {a.isCorrect ? (
                            <span className="text-emerald-300">Correct</span>
                          ) : (
                            <span className="text-rose-300">Incorrect</span>
                          )}
                        </div>
                      </li>
                    );
                  })}
                </ul>
              </details>
            </section>
          )}
        </>
      )}
    </div>
  );
}
