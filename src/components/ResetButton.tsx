/**
 * "Reset view" button that returns the camera to the Epstein-centered overview.
 */
export default function ResetButton() {
  const handleReset = () => {
    (window as any).__resetGraphCamera?.();
  };

  return (
    <button
      onClick={handleReset}
      className="fixed bottom-4 right-4 z-30 px-3 py-1.5 rounded-lg bg-graph-surface/80 backdrop-blur-md border border-graph-border/50 text-xs text-graph-text-dim hover:text-graph-text hover:border-graph-accent/30 transition-colors"
      aria-label="Reset graph view to overview"
    >
      <span className="flex items-center gap-1.5">
        <svg className="w-3.5 h-3.5" fill="none" viewBox="0 0 16 16" stroke="currentColor" strokeWidth="1.5">
          <path d="M2 8a6 6 0 0111.47-2.5M14 8a6 6 0 01-11.47 2.5" />
          <path d="M14 2v4h-4M2 14v-4h4" />
        </svg>
        Reset view
      </span>
    </button>
  );
}
