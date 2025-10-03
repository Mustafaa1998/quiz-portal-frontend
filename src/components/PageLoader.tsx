export default function PageLoader({ show }: { show: boolean }) {
  if (!show) return null;
  return (
    <div className="fixed inset-0 bg-black/5 flex items-center justify-center z-50">
      <div className="animate-pulse h-4 w-4 rounded-full bg-slate-700" />
      <span className="ml-2 text-slate-700">Loading…</span>
    </div>
  );
}
