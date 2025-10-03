import { useEffect, useMemo, useState } from "react";
import { Link } from "react-router-dom";

const API = import.meta.env.VITE_API_URL ?? "http://localhost:3000";

type QuizBrief = {
  id: number;
  title: string;
  description?: string | null;
  category?: string | null;
  plays?: number;
};

function fmt(n?: number) {
  if (n === undefined || n === null) return "";
  if (n >= 1_000_000) return `${(n / 1_000_000).toFixed(1)}m`;
  if (n >= 1_000) return `${(n / 1_000).toFixed(1)}k`;
  return String(n);
}

async function getJSON<T>(url: string): Promise<T> {
  const res = await fetch(url);
  if (!res.ok) {
    const j = await res.json().catch(() => ({}));
    throw new Error(j?.message || `${res.status} ${res.statusText}`);
  }
  return res.json() as Promise<T>;
}

export default function LandingPage() {
  const [loading, setLoading] = useState(true);

  const [allQuizzes, setAllQuizzes] = useState<QuizBrief[]>([]);
  const [quizzes, setQuizzes] = useState<QuizBrief[]>([]);
  const [error, setError] = useState("");

  const [query, setQuery] = useState("");
  const [searching, setSearching] = useState(false);

  useEffect(() => {
    let alive = true;

    (async () => {
      setError("");
      setLoading(true);

      try {
        let data: any[] | null = null;
        try {
          data = await getJSON<any[]>(`${API}/quiz/popular`);
        } catch {
            try {
              data = await getJSON<any[]>(`${API}/quiz/all-with-plays`);
            } catch {
                data = await getJSON<any[]>(`${API}/quiz/all`);
              }
          }

        const normalized: QuizBrief[] = (data || []).map((q: any) => ({
          id: Number(q.id ?? q.quizId ?? 0),
          title: q.title ?? "Untitled Quiz",
          description: q.description ?? "",
          category: q.category ?? q.topic ?? null,
          plays: Number(q.plays ?? 0),
        }));

        if (!alive) return;
        setAllQuizzes(normalized);
        setQuizzes(normalized);
      } catch (e: any) {
        if (!alive) return;
        setError(e?.message || "Failed to load quizzes");
        setAllQuizzes([]);
        setQuizzes([]);
      } finally {
        if (alive) setLoading(false);
      }
    })();

    return () => {
      alive = false;
    };
  }, []);

  const topThreeData = useMemo(() => quizzes.slice(0, 3), [quizzes]);

  async function runSearch(e?: React.FormEvent) {
    if (e) e.preventDefault();
    const q = query.trim();
    if (!q) {
      setQuizzes(allQuizzes);
      return;
    }

    try {
      setSearching(true);
      setError("");

      let results: QuizBrief[] | null = null;
      try {
        const res = await getJSON<any[]>(
          `${API}/quiz/search?q=${encodeURIComponent(q)}`
        );
        results = (res || []).map((r: any) => ({
          id: Number(r.id ?? r.quizId ?? 0),
          title: r.title ?? "Untitled Quiz",
          description: r.description ?? "",
          category: r.category ?? r.topic ?? null,
          plays: Number(r.plays ?? 0),
        }));
      } catch {
        const lc = q.toLowerCase();
        results = allQuizzes.filter(
          (x) =>
            x.title.toLowerCase().includes(lc) ||
            (x.category ?? "").toLowerCase().includes(lc) ||
            (x.description ?? "").toLowerCase().includes(lc)
        );
      }

      setQuizzes(results ?? []);
    } catch (err: any) {
      setError(err?.message || "Search failed");
    } finally {
      setSearching(false);
    }
  }

  function clearSearch() {
    setQuery("");
    setQuizzes(allQuizzes);
  }

  return (
    <div className="min-h-screen text-white bg-[#0b1220]">
      <header className="max-w-6xl mx-auto flex items-center justify-between py-5 px-4">
        <div className="font-bold text-lg">Quiz Portal</div>
        <nav className="flex items-center gap-6 text-sm text-slate-300">
          <Link to="/quizzes" className="hover:text-white">
            Explore Quizzes
          </Link>
          <Link to="/login" className="hover:text-white">
            Login
          </Link>
          <Link
            to="/register"
            className="px-3 py-1.5 rounded bg-sky-600 hover:bg-sky-500 text-white font-medium"
          >
            Sign Up
          </Link>
        </nav>
      </header>

      <section className="max-w-6xl mx-auto px-4 pb-14 pt-4">
        <div className="grid md:grid-cols-2 gap-8">
          <div>
            <h1 className="text-4xl md:text-5xl font-extrabold leading-tight">
              Practice. Compete. <br />
              <span className="text-sky-400">Master</span> your quizzes.
            </h1>
            <p className="mt-4 text-slate-300">
              Curated quizzes across tech, science, and the arts. Track progress,
              challenge friends, and learn with confidence — all in one place.
            </p>

            <form onSubmit={runSearch} className="mt-6 flex gap-3">
              <input
                value={query}
                onChange={(e) => setQuery(e.target.value)}
                placeholder="Search for quizzes..."
                className="flex-1 rounded-lg border border-white/10 bg-white/5 px-3 py-2 outline-none"
              />
              <button
                type="submit"
                disabled={searching}
                className="rounded-lg bg-sky-600 hover:bg-sky-500 px-4 py-2 font-medium disabled:opacity-60"
              >
                {searching ? "Searching…" : "Search"}
              </button>
              {query && (
                <button
                  type="button"
                  onClick={clearSearch}
                  className="rounded-lg bg-white/10 hover:bg-white/20 px-4 py-2 font-medium"
                >
                  Clear
                </button>
              )}
            </form>

            {!!error && (
              <div className="mt-3 text-rose-400 text-sm">{error}</div>
            )}

            <p className="mt-6 text-slate-400 text-sm">
              Trusted by <span className="text-white font-medium">students &amp; instructors</span> across campuses.
            </p>
          </div>

          <div>
            <div className="rounded-2xl border border-white/10 bg-white/5 p-4 shadow-lg">
              <div className="text-slate-300">Popular Right Now</div>

              <div className="grid grid-cols-3 gap-3 mt-4">
                {(loading ? Array.from({ length: 3 }) : topThreeData).map((q, i) =>
                  loading ? (
                    <div
                      key={`s-${i}`}
                      className="h-[90px] rounded-xl bg-white/5 border border-white/10 animate-pulse"
                    />
                  ) : (
                    <article
                      key={(q as QuizBrief).id}
                      className="rounded-xl bg-white/5 border border-white/10 p-3"
                    >
                      <div className="text-[11px] uppercase tracking-wide text-slate-400">
                        {(q as QuizBrief).category || "General"}
                      </div>
                      <div className="font-semibold text-sm mt-1 line-clamp-2">
                        {(q as QuizBrief).title}
                      </div>
                      <div className="text-[11px] mt-1 text-slate-400">
                        {fmt((q as QuizBrief).plays)} plays
                      </div>
                    </article>
                  )
                )}
              </div>

              <div className="mt-4 rounded-xl border border-white/10 bg-white/5 p-4">
                <div className="text-sky-300 text-sm">Live Challenge</div>
                <div className="font-semibold">General Knowledge Quiz</div>
                <div className="text-xs text-slate-400 mt-1">
                  Starts in 05:12 •{" "}
                  <Link to="/quizzes" className="text-sky-400 hover:underline">
                    Join now →
                  </Link>
                </div>
              </div>
            </div>
          </div>
        </div>
        
        <div className="mt-12 flex items-center justify-between">
          <h2 className="text-xl font-semibold">Popular Quizzes</h2>
          <Link to="/quizzes" className="text-sky-300 hover:underline text-sm">
            View all →
          </Link>
        </div>

        <div className="grid md:grid-cols-3 gap-5 mt-4">
          {(loading ? Array.from({ length: 6 }) : quizzes.slice(0, 6)).map((q, i) =>
            loading ? (
              <div
                key={`sk-${i}`}
                className="h-[120px] rounded-2xl bg-white/5 border border-white/10 animate-pulse"
              />
            ) : (
              <article
                key={(q as QuizBrief).id}
                className="rounded-2xl bg-white/5 border border-white/10 p-5 flex flex-col justify-between"
              >
                <div>
                  <div className="text-xs text-slate-400">
                    {(q as QuizBrief).category || "General"}
                  </div>
                  <div className="text-lg font-semibold mt-1">
                    {(q as QuizBrief).title}
                  </div>
                  <div className="text-xs text-slate-400 mt-1">
                    {fmt((q as QuizBrief).plays)} plays
                  </div>
                  <div className="text-sm text-slate-300 mt-2">
                    {(q as QuizBrief).description
                      ? ((q as QuizBrief).description as string).slice(0, 80)
                      : "Practice mode • Adaptive"}
                  </div>
                </div>
                <div className="mt-4">
                  <Link
                    to={`/quiz/${(q as QuizBrief).id}/take`}
                    className="px-3 py-1.5 rounded bg-sky-600 hover:bg-sky-500 text-sm"
                  >
                    Take Quiz
                  </Link>
                </div>
              </article>
            )
          )}
        </div>
      </section>
    </div>
  );
}
