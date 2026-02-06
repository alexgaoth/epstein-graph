import { useGraphStore } from '../store/graphStore';
import { GROUP_COLORS, DEFAULT_NODE_COLOR } from '../lib/graphUtils';

/**
 * Legend in the bottom-left corner showing group color index
 * and connection type badges.
 */
export default function Legend() {
  const { graphData } = useGraphStore();

  // Build group items from graph.json groups, falling back to GROUP_COLORS
  const groupItems = graphData?.groups
    ? Object.entries(graphData.groups).map(([key, def]) => ({
        color: def.color || GROUP_COLORS[key] || DEFAULT_NODE_COLOR,
        label: def.label || key.charAt(0).toUpperCase() + key.slice(1),
      }))
    : Object.entries(GROUP_COLORS).map(([key, color]) => ({
        color,
        label: key.charAt(0).toUpperCase() + key.slice(1),
      }));

  const edgeTypes = [
    { className: 'badge-document', label: 'Named in document' },
    { className: 'badge-flight', label: 'Flight record' },
    { className: 'badge-testimony', label: 'Testimony mention' },
    { className: 'badge-financial', label: 'Financial record' },
    { className: 'badge-photo', label: 'Photograph' },
  ];

  return (
    <div className="fixed bottom-4 left-4 z-30 p-3 rounded-lg bg-graph-surface/80 backdrop-blur-md border border-graph-border/50 max-w-[220px]">
      <h3 className="text-[10px] font-medium text-graph-text-dim uppercase tracking-wider mb-2">
        Node Groups
      </h3>

      <div className="space-y-1.5 mb-3">
        {/* Default (no group) */}
        <div className="flex items-center gap-2">
          <span
            className="w-2.5 h-2.5 rounded-full flex-shrink-0"
            style={{ backgroundColor: DEFAULT_NODE_COLOR }}
          />
          <span className="text-[10px] text-graph-text-dim">Unclassified</span>
        </div>

        {groupItems.map((item) => (
          <div key={item.label} className="flex items-center gap-2">
            <span
              className="w-2.5 h-2.5 rounded-full flex-shrink-0"
              style={{ backgroundColor: item.color }}
            />
            <span className="text-[10px] text-graph-text-dim">{item.label}</span>
          </div>
        ))}
      </div>

      <h3 className="text-[10px] font-medium text-graph-text-dim uppercase tracking-wider mb-1.5">
        Connection Types
      </h3>

      <div className="space-y-1">
        {edgeTypes.map((item) => (
          <div key={item.label}>
            <span className={`badge ${item.className} !text-[9px] !px-1.5 !py-0`}>
              {item.label}
            </span>
          </div>
        ))}
      </div>
    </div>
  );
}
