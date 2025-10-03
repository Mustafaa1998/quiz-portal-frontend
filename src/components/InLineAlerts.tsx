type Props = {
  type?: "info" | "success" | "error" | "warning";
  children: React.ReactNode;
  onRetry?: () => void;
};

export default function InlineAlert({ type = "info", children, onRetry }: Props) {
  const colors: Record<string, string> = {
    info: "bg-sky-50 text-sky-700 border-sky-200",
    success: "bg-emerald-50 text-emerald-700 border-emerald-200",
    error: "bg-red-50 text-red-700 border-red-200",
    warning: "bg-amber-50 text-amber-700 border-amber-200",
  };

  return (
    <div
      className={`p-3 rounded border flex items-center justify-between ${colors[type]}`}
    >
      <div>{children}</div>
      {onRetry && (
        <button
          onClick={onRetry}
          className="ml-4 px-2 py-1 rounded bg-white/50 hover:bg-white/70 text-sm font-medium"
        >
          Retry
        </button>
      )}
    </div>
  );
}
