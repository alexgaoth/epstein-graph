import { useGraphStore } from '../store/graphStore';
import { connectionBadgeClass, formatConnectionType } from '../lib/graphUtils';

/**
 * Floating info panel that appears on the right side when a node or edge is selected.
 * - Node selected: shows person name, role, and list of connections
 * - Edge selected: shows connection details, DOJ document link, and quote snippet
 */
export default function InfoPanel() {
  const {
    selectedNode,
    selectedEdge,
    infoPanelOpen,
    graphData,
    closeInfoPanel,
    getNodeById,
    getEdgeById,
  } = useGraphStore();

  if (!infoPanelOpen || !graphData) return null;

  // --- Node selected ---
  if (selectedNode) {
    const node = getNodeById(selectedNode);
    if (!node) return null;

    const connectedEdges = graphData.edges.filter(
      (e) => e.source === selectedNode || e.target === selectedNode,
    );

    return (
      <div className="panel-enter fixed right-0 top-0 h-full w-80 max-w-[90vw] z-50 flex flex-col bg-graph-surface/95 backdrop-blur-md border-l border-graph-border shadow-2xl">
        {/* Header */}
        <div className="flex items-start justify-between p-4 border-b border-graph-border">
          <div className="flex-1 min-w-0">
            <h2 className="text-base font-medium text-graph-accent truncate">
              {node.label}
            </h2>
            {node.role && (
              <p className="text-xs text-graph-text-dim mt-1 leading-relaxed">
                {node.role}
              </p>
            )}
          </div>
          <button
            onClick={closeInfoPanel}
            className="ml-3 p-1 text-graph-text-dim hover:text-graph-text transition-colors"
            aria-label="Close panel"
          >
            <svg width="16" height="16" viewBox="0 0 16 16" fill="none" stroke="currentColor" strokeWidth="1.5">
              <path d="M4 4l8 8M12 4l-8 8" />
            </svg>
          </button>
        </div>

        {/* Connections list */}
        <div className="flex-1 overflow-y-auto custom-scrollbar p-4">
          <h3 className="text-xs font-medium text-graph-text-dim uppercase tracking-wider mb-3">
            Connections ({connectedEdges.length})
          </h3>
          <div className="space-y-3">
            {connectedEdges.map((edge) => {
              const otherId = edge.source === selectedNode ? edge.target : edge.source;
              const other = getNodeById(otherId);
              return (
                <button
                  key={edge.id}
                  className="w-full text-left p-3 rounded-lg bg-graph-bg/60 border border-graph-border/50 hover:border-graph-accent/30 transition-colors group"
                  onClick={() => {
                    (window as any).__centerOnGraphNode?.(otherId);
                  }}
                  aria-label={`Navigate to ${other?.label}`}
                >
                  <div className="flex items-center justify-between mb-1">
                    <span className="text-sm text-graph-text group-hover:text-graph-accent transition-colors truncate">
                      {other?.label || otherId}
                    </span>
                    <svg className="w-3 h-3 text-graph-text-dim group-hover:text-graph-accent transition-colors flex-shrink-0 ml-2" fill="none" viewBox="0 0 12 12" stroke="currentColor" strokeWidth="1.5">
                      <path d="M4 2l4 4-4 4" />
                    </svg>
                  </div>
                  <span className={connectionBadgeClass(edge.connection_type)}>
                    {formatConnectionType(edge.connection_type)}
                  </span>
                </button>
              );
            })}
          </div>
        </div>
      </div>
    );
  }

  // --- Edge selected ---
  if (selectedEdge) {
    const edge = getEdgeById(selectedEdge);
    if (!edge) return null;

    const sourceNode = getNodeById(edge.source);
    const targetNode = getNodeById(edge.target);

    return (
      <div className="panel-enter fixed right-0 top-0 h-full w-80 max-w-[90vw] z-50 flex flex-col bg-graph-surface/95 backdrop-blur-md border-l border-graph-border shadow-2xl">
        {/* Header */}
        <div className="flex items-start justify-between p-4 border-b border-graph-border">
          <div className="flex-1 min-w-0">
            <h2 className="text-base font-medium text-graph-text">Connection</h2>
            <div className="flex items-center gap-2 mt-2 text-sm">
              <span className="text-graph-accent truncate">{sourceNode?.label}</span>
              <svg className="w-3 h-3 text-graph-text-dim flex-shrink-0" fill="none" viewBox="0 0 12 12" stroke="currentColor" strokeWidth="1.5">
                <path d="M2 6h8M7 3l3 3-3 3" />
              </svg>
              <span className="text-graph-accent truncate">{targetNode?.label}</span>
            </div>
          </div>
          <button
            onClick={closeInfoPanel}
            className="ml-3 p-1 text-graph-text-dim hover:text-graph-text transition-colors"
            aria-label="Close panel"
          >
            <svg width="16" height="16" viewBox="0 0 16 16" fill="none" stroke="currentColor" strokeWidth="1.5">
              <path d="M4 4l8 8M12 4l-8 8" />
            </svg>
          </button>
        </div>

        {/* Edge details */}
        <div className="flex-1 overflow-y-auto custom-scrollbar p-4 space-y-4">
          {/* Connection type */}
          <div>
            <h3 className="text-xs font-medium text-graph-text-dim uppercase tracking-wider mb-2">
              Type
            </h3>
            <span className={connectionBadgeClass(edge.connection_type)}>
              {formatConnectionType(edge.connection_type)}
            </span>
          </div>

          {/* Document */}
          <div>
            <h3 className="text-xs font-medium text-graph-text-dim uppercase tracking-wider mb-2">
              Source Document
            </h3>
            <p className="text-sm text-graph-text leading-relaxed">
              {edge.document_title}
            </p>
            {edge.page && (
              <p className="text-xs text-graph-text-dim mt-1">Page {edge.page}</p>
            )}
          </div>

          {/* Quote snippet */}
          {edge.quote_snippet && (
            <div>
              <h3 className="text-xs font-medium text-graph-text-dim uppercase tracking-wider mb-2">
                Excerpt
              </h3>
              <blockquote className="text-sm text-graph-text/80 leading-relaxed italic border-l-2 border-graph-accent/30 pl-3">
                &ldquo;{edge.quote_snippet}&rdquo;
              </blockquote>
              <button
                onClick={() => {
                  navigator.clipboard.writeText(edge.quote_snippet || '');
                }}
                className="mt-2 text-xs text-graph-text-dim hover:text-graph-accent transition-colors flex items-center gap-1"
                aria-label="Copy quote to clipboard"
              >
                <svg className="w-3 h-3" fill="none" viewBox="0 0 12 12" stroke="currentColor" strokeWidth="1.5">
                  <rect x="4" y="4" width="7" height="7" rx="1" />
                  <path d="M8 4V2.5A1.5 1.5 0 006.5 1H2.5A1.5 1.5 0 001 2.5v4A1.5 1.5 0 002.5 8H4" />
                </svg>
                Copy quote
              </button>
            </div>
          )}

          {/* DOJ Link */}
          <div>
            <h3 className="text-xs font-medium text-graph-text-dim uppercase tracking-wider mb-2">
              DOJ Source
            </h3>
            <a
              href={edge.doj_link}
              target="_blank"
              rel="noopener noreferrer"
              className="inline-flex items-center gap-2 px-3 py-2 rounded-lg bg-graph-accent/10 border border-graph-accent/20 text-graph-accent text-sm hover:bg-graph-accent/20 transition-colors"
              aria-label={`Open DOJ source document: ${edge.document_title}`}
            >
              <svg className="w-4 h-4" fill="none" viewBox="0 0 16 16" stroke="currentColor" strokeWidth="1.5">
                <path d="M6 2H3a1 1 0 00-1 1v10a1 1 0 001 1h10a1 1 0 001-1v-3" />
                <path d="M9 2h5v5M14 2L7 9" />
              </svg>
              Open source
            </a>
          </div>
        </div>
      </div>
    );
  }

  return null;
}
