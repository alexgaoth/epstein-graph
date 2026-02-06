import { useGraphStore } from '../store/graphStore';

export default function AddNodeButton() {
  const openAddNodeModal = useGraphStore((s) => s.openAddNodeModal);

  return (
    <button
      onClick={openAddNodeModal}
      className="fixed bottom-14 right-4 z-30 px-3 py-1.5 rounded-lg bg-graph-surface/80 backdrop-blur-md border border-graph-border/50 text-xs text-graph-text-dim hover:text-graph-accent hover:border-graph-accent/30 transition-colors"
      aria-label="Add a new person to the graph"
    >
      <span className="flex items-center gap-1.5">
        <svg className="w-3.5 h-3.5" fill="none" viewBox="0 0 16 16" stroke="currentColor" strokeWidth="1.5">
          <circle cx="8" cy="5" r="3" />
          <path d="M2 14c0-3.3 2.7-6 6-6s6 2.7 6 6" />
          <path d="M13 3v4M11 5h4" />
        </svg>
        Add person
      </span>
    </button>
  );
}
