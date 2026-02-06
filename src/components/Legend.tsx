/**
 * Small legend in the bottom-left corner showing node/edge color meanings.
 */
export default function Legend() {
  const items = [
    { color: '#00d4ff', label: 'Central subject' },
    { color: '#4a4a6a', label: 'Associated person' },
    { color: '#3388bb', label: 'Neighbor (when focused)' },
  ];

  const edgeTypes = [
    { className: 'badge-document', label: 'Named in document' },
    { className: 'badge-flight', label: 'Flight record' },
    { className: 'badge-testimony', label: 'Testimony mention' },
  ];

  return (
    <div className="fixed bottom-4 left-4 z-30 p-3 rounded-lg bg-graph-surface/80 backdrop-blur-md border border-graph-border/50 max-w-[200px]">
      <h3 className="text-[10px] font-medium text-graph-text-dim uppercase tracking-wider mb-2">
        Legend
      </h3>

      <div className="space-y-1.5 mb-3">
        {items.map((item) => (
          <div key={item.label} className="flex items-center gap-2">
            <span
              className="w-2.5 h-2.5 rounded-full flex-shrink-0"
              style={{ backgroundColor: item.color }}
            />
            <span className="text-[10px] text-graph-text-dim">{item.label}</span>
          </div>
        ))}
      </div>

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
