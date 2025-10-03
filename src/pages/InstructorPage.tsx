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

type Quiz = { id: number; title: string; description?: string; createdAt?: string };
type Question = { id: number; text: string; options: string[]; correctOptionIndex: number };

export default function InstructorPage() {
  const nav = useNavigate();

  const [quizzes, setQuizzes] = useState<Quiz[]>([]);
  const [loading, setLoading] = useState(true);
  const [selectedQuiz, setSelectedQuiz] = useState<Quiz | null>(null);
  const [questions, setQuestions] = useState<Question[]>([]);
  const [msg, setMsg] = useState("");
  const [err, setErr] = useState("");

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
      throw new Error(j?.message || `GET ${path} failed`);
    }
    return res.json() as Promise<T>;
  }

  async function postJSON<T>(path: string, body: any): Promise<T> {
    const res = await fetch(`${API}${path}`, {
      method: "POST",
      headers: authHeaders(),
      body: JSON.stringify(body),
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

  async function patchJSON<T>(path: string, body: any): Promise<T> {
    const res = await fetch(`${API}${path}`, {
      method: "PATCH",
      headers: authHeaders(),
      body: JSON.stringify(body),
    });
    if (res.status === 401) {
      localStorage.removeItem("token");
      localStorage.removeItem("user");
      nav("/login", { replace: true });
      throw new Error("Unauthorized");
    }
    if (!res.ok) {
      const j = await res.json().catch(() => ({}));
      throw new Error(j?.message || `PATCH ${path} failed`);
    }
    return res.json() as Promise<T>;
  }

  async function deleteReq(path: string) {
    const res = await fetch(`${API}${path}`, {
      method: "DELETE",
      headers: authHeaders(),
    });
    if (res.status === 401) {
      localStorage.removeItem("token");
      localStorage.removeItem("user");
      nav("/login", { replace: true });
      throw new Error("Unauthorized");
    }
    if (!res.ok) {
      const j = await res.json().catch(() => ({}));
      throw new Error(j?.message || `DELETE ${path} failed`);
    }
    return res.json();
  }

  async function loadQuizzes() {
    setLoading(true);
    setMsg("");
    setErr("");
    try {
      const all = await getJSON<Quiz[]>("/quiz/all");
      setQuizzes(all);
    } catch (e: any) {
      if (e?.message !== "Unauthorized") setErr(e.message);
    } finally {
      setLoading(false);
    }
  }

  async function loadQuestions(quizId: number) {
    setErr("");
    try {
      const qs = await getJSON<Question[]>(`/quiz/${quizId}/questions`);
      setQuestions(qs);
    } catch (e: any) {
      if (e?.message !== "Unauthorized") {
        setQuestions([]);
        setErr(e.message || "Failed to load questions");
      }
    }
  }

  async function createQuiz(title: string, description?: string) {
    setErr("");
    setMsg("");
    try {
      const q = await postJSON<Quiz>("/quiz/create", { title, description });
      setQuizzes((prev) => [q, ...prev]);
      setMsg(`Created quiz "${q.title}"`);
    } catch (e: any) {
      if (e?.message !== "Unauthorized") setErr(e.message);
    }
  }

  async function updateQuiz(quizId: number, title: string, description?: string) {
    setErr("");
    setMsg("");
    try {
      const q = await patchJSON<Quiz>(`/quiz/${quizId}`, { title, description });
      setQuizzes((prev) => prev.map((x) => (x.id === quizId ? q : x)));
      setMsg(`Updated quiz #${quizId}`);
    } catch (e: any) {
      if (e?.message !== "Unauthorized") setErr(e.message);
    }
  }

  async function deleteQuiz(quizId: number) {
    if (!confirm(`Delete quiz #${quizId}? This cannot be undone.`)) return;
    setErr("");
    setMsg("");
    try {
      await deleteReq(`/quiz/${quizId}`);
      setQuizzes((prev) => prev.filter((x) => x.id !== quizId));
      setMsg(`Deleted quiz #${quizId}`);
      if (selectedQuiz?.id === quizId) {
        setSelectedQuiz(null);
        setQuestions([]);
      }
    } catch (e: any) {
      if (e?.message !== "Unauthorized") setErr(e.message);
    }
  }

  useEffect(() => {
    loadQuizzes();
  }, []);

  return (
    <div className="min-h-screen bg-[#0b1220] text-white">
      <PageLoader show={loading} />
      <div className="max-w-6xl mx-auto px-4 py-8">
        <header>
          <h1 className="text-2xl font-semibold">Instructor Dashboard</h1>
          <p className="text-slate-400">Manage your quizzes & questions</p>
        </header>

        {err && (
          <div className="mt-4">
            <InlineAlert type="error" onRetry={loadQuizzes}>
              {err}
            </InlineAlert>
          </div>
        )}
        {msg && !err && (
          <div className="mt-4 p-3 rounded bg-emerald-500/15 text-emerald-200 border border-emerald-500/30">
            {msg}
          </div>
        )}

        <section className="mt-6 p-4 rounded-2xl border border-white/10 bg-white/5">
          <h2 className="text-lg font-semibold mb-3">Create Quiz</h2>
          <QuizForm onSave={createQuiz} />
        </section>

        <section className="mt-6">
          <h2 className="text-lg font-semibold mb-3">My Quizzes</h2>
          {!loading && quizzes.length ? (
            <div className="overflow-x-auto rounded border border-white/10">
              <table className="min-w-full">
                <thead className="bg-white/5 text-slate-300">
                  <tr>
                    <th className="py-2 px-3 text-left">Title</th>
                    <th className="py-2 px-3 text-left">Created</th>
                    <th className="py-2 px-3">Actions</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-white/10">
                  {quizzes.map((q) => (
                    <tr key={q.id}>
                      <td className="py-2 px-3">{q.title}</td>
                      <td className="py-2 px-3 text-slate-300">
                        {q.createdAt ? new Date(q.createdAt).toLocaleDateString() : "—"}
                      </td>
                      <td className="py-2 px-3 space-x-2">
                        <button
                          className="px-2 py-1 text-sm rounded bg-sky-500/20 text-sky-200 border border-sky-500/30"
                          onClick={() => {
                            setSelectedQuiz(q);
                            loadQuestions(q.id);
                          }}
                        >
                          Questions
                        </button>
                        <button
                          className="px-2 py-1 text-sm rounded bg-amber-500/20 text-amber-200 border border-amber-500/30"
                          onClick={() => {
                            const newTitle = prompt("New title:", q.title);
                            if (newTitle !== null && newTitle.trim().length > 0) {
                              updateQuiz(q.id, newTitle.trim(), q.description);
                            }
                          }}
                        >
                          Edit
                        </button>
                        <button
                          className="px-2 py-1 text-sm rounded bg-rose-500/20 text-rose-200 border border-rose-500/30"
                          onClick={() => deleteQuiz(q.id)}
                        >
                          Delete
                        </button>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          ) : !loading && <p className="text-slate-400">No quizzes yet.</p>}
        </section>

        {selectedQuiz && (
          <section className="mt-6 p-4 rounded-2xl border border-white/10 bg-white/5">
            <h2 className="text-lg font-semibold mb-3">
              Questions for {selectedQuiz.title}
            </h2>

            <QuestionForm
              quizId={selectedQuiz.id}
              onAdded={() => loadQuestions(selectedQuiz.id)}
            />

            {questions.length ? (
              <ul className="mt-4 space-y-2">
                {questions.map((q, i) => (
                  <li key={q.id} className="p-2 rounded border border-white/10 bg-white/5">
                    <strong>{i + 1}.</strong> {q.text} <br />
                    <span className="text-sm text-slate-300">
                      Correct: {q.options[q.correctOptionIndex]}
                    </span>
                  </li>
                ))}
              </ul>
            ) : (
              <p className="text-slate-400">No questions yet.</p>
            )}
          </section>
        )}
      </div>
    </div>
  );
}

function QuizForm({ onSave }: { onSave: (title: string, desc?: string) => void }) {
  const [title, setTitle] = useState("");
  const [desc, setDesc] = useState("");
  const [saving, setSaving] = useState(false);
  const [err, setErr] = useState("");

  return (
    <form
      className="space-y-2"
      onSubmit={async (e) => {
        e.preventDefault();
        setErr("");
        if (!title.trim()) return;
        try {
          setSaving(true);
          await onSave(title.trim(), desc || undefined);
          setTitle("");
          setDesc("");
        } catch (e: any) {
          setErr(e.message || "Create failed");
        } finally {
          setSaving(false);
        }
      }}
    >
      <input
        className="w-full border border-white/10 bg-white/10 placeholder:text-slate-400 text-white p-2 rounded"
        placeholder="Title"
        value={title}
        onChange={(e) => setTitle(e.target.value)}
        required
      />
      <input
        className="w-full border border-white/10 bg-white/10 placeholder:text-slate-400 text-white p-2 rounded"
        placeholder="Description (optional)"
        value={desc}
        onChange={(e) => setDesc(e.target.value)}
      />
      {err && <p className="text-rose-300 text-sm">{err}</p>}
      <button
        className="px-3 py-1 bg-sky-600 hover:bg-sky-500 text-white rounded disabled:opacity-60"
        disabled={saving}
      >
        {saving ? "Creating…" : "Create"}
      </button>
    </form>
  );
}

function QuestionForm({ quizId, onAdded }: { quizId: number; onAdded: () => void }) {
  const [text, setText] = useState("");
  const [options, setOptions] = useState("");
  const [correct, setCorrect] = useState<number | "">("");
  const [saving, setSaving] = useState(false);
  const [err, setErr] = useState("");

  async function addQuestion() {
    setErr("");
    setSaving(true);
    try {
      const res = await fetch(`${API}/quiz/${quizId}/questions`, {
        method: "POST",
        headers: authHeaders(),
        body: JSON.stringify({
          text,
          options: options
            .split(/\n|,/)
            .map((o) => o.trim())
            .filter(Boolean),
          correctOptionIndex: Number(correct),
        }),
      });
      if (!res.ok) {
        const j = await res.json().catch(() => ({}));
        throw new Error(j?.message || "Add failed");
      }
      await res.json();
      setText("");
      setOptions("");
      setCorrect("");
      onAdded();
    } catch (e: any) {
      setErr(e.message || "Add failed");
    } finally {
      setSaving(false);
    }
  }

  return (
    <form
      className="space-y-2"
      onSubmit={(e) => {
        e.preventDefault();
        if (!text.trim()) return setErr("Question text is required");
        if (!options.trim()) return setErr("At least one option is required");
        if (correct === "" || Number.isNaN(Number(correct))) return setErr("Correct index is required");
        addQuestion();
      }}
    >
      <textarea
        className="w-full border border-white/10 bg-white/10 placeholder:text-slate-400 text-white p-2 rounded"
        placeholder="Question text"
        value={text}
        onChange={(e) => setText(e.target.value)}
        required
      />
      <textarea
        className="w-full border border-white/10 bg-white/10 placeholder:text-slate-400 text-white p-2 rounded"
        placeholder="Options (one per line or comma separated)"
        value={options}
        onChange={(e) => setOptions(e.target.value)}
        required
      />
      <input
        className="w-full border border-white/10 bg-white/10 placeholder:text-slate-400 text-white p-2 rounded"
        type="number"
        placeholder="Correct option index (0-based)"
        value={correct}
        onChange={(e) => setCorrect(e.target.value === "" ? "" : Number(e.target.value))}
        required
      />
      {err && <p className="text-rose-300 text-sm">{err}</p>}
      <button
        className="px-3 py-1 bg-emerald-600 hover:bg-emerald-500 text-white rounded disabled:opacity-60"
        disabled={saving}
      >
        {saving ? "Adding…" : "Add Question"}
      </button>
    </form>
  );
}
