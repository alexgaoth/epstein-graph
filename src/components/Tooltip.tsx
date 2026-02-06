import { useEffect, useState } from 'react';
import { useGraphStore } from '../store/graphStore';
import { formatConnectionType } from '../lib/graphUtils';

/**
 * Floating tooltip that follows the cursor when hovering nodes or edges.
 * Shows name + role for nodes, connection_type + document title for edges.
 */
export default function Tooltip() {
  const { hoveredNode, hoveredEdge, graphData } = useGraphStore();
  const [pos, setPos] = useState({ x: 0, y: 0 });

  useEffect(() => {
    const handler = (e: MouseEvent) => {
      setPos({ x: e.clientX, y: e.clientY });
    };
    window.addEventListener('mousemove', handler, { passive: true });
    return () => window.removeEventListener('mousemove', handler);
  }, []);

  if (!graphData) return null;

  // Node tooltip
  if (hoveredNode) {
    const node = graphData.nodes.find((n) => n.id === hoveredNode);
    if (!node) return null;

    return (
      <div
        className="tooltip fixed z-[60] px-3 py-2 rounded-md bg-graph-surface/95 backdrop-blur-sm border border-graph-border shadow-lg"
        style={{
          left: pos.x + 12,
          top: pos.y - 8,
          maxWidth: 240,
        }}
        role="tooltip"
      >
        <div className="text-sm font-medium text-graph-text">{node.label}</div>
        {node.role && (
          <div className="text-xs text-graph-text-dim mt-0.5">{node.role}</div>
        )}
      </div>
    );
  }

  // Edge tooltip
  if (hoveredEdge) {
    const edge = graphData.edges.find((e) => e.id === hoveredEdge);
    if (!edge) return null;

    return (
      <div
        className="tooltip fixed z-[60] px-3 py-2 rounded-md bg-graph-surface/95 backdrop-blur-sm border border-graph-border shadow-lg"
        style={{
          left: pos.x + 12,
          top: pos.y - 8,
          maxWidth: 280,
        }}
        role="tooltip"
      >
        <div className="text-xs text-graph-accent mb-1">
          {formatConnectionType(edge.connection_type)}
        </div>
        <div className="text-xs text-graph-text-dim truncate">
          {edge.document_title}
        </div>
      </div>
    );
  }

  return null;
}
