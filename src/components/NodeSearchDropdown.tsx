import { useState, useEffect, useRef, useMemo } from 'react';
import { fetchNodeList } from '../lib/api';

interface NodeSearchDropdownProps {
  value: string;
  onChange: (nodeId: string) => void;
  excludeId?: string;
  label: string;
  disabled?: boolean;
}

export default function NodeSearchDropdown({ value, onChange, excludeId, label, disabled }: NodeSearchDropdownProps) {
  const [nodes, setNodes] = useState<{ id: string; label: string }[]>([]);
  const [query, setQuery] = useState('');
  const [open, setOpen] = useState(false);
  const [highlightIndex, setHighlightIndex] = useState(0);
  const inputRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    fetchNodeList().then(setNodes).catch(() => {});
  }, []);

  const filtered = useMemo(() => {
    const q = query.toLowerCase();
    return nodes
      .filter((n) => n.id !== excludeId)
      .filter((n) => !q || n.label.toLowerCase().includes(q));
  }, [nodes, query, excludeId]);

  useEffect(() => {
    setHighlightIndex(0);
  }, [filtered.length]);

  const selectedLabel = nodes.find((n) => n.id === value)?.label || '';

  const handleSelect = (id: string) => {
    onChange(id);
    setQuery('');
    setOpen(false);
  };

  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === 'ArrowDown') {
      e.preventDefault();
      setHighlightIndex((i) => Math.min(i + 1, filtered.length - 1));
    } else if (e.key === 'ArrowUp') {
      e.preventDefault();
      setHighlightIndex((i) => Math.max(i - 1, 0));
    } else if (e.key === 'Enter' && filtered.length > 0) {
      e.preventDefault();
      handleSelect(filtered[highlightIndex].id);
    } else if (e.key === 'Escape') {
      setOpen(false);
      setQuery('');
    }
  };

  return (
    <div className="relative">
      <label className="block text-xs text-graph-text-dim mb-1">{label}</label>
      <input
        ref={inputRef}
        type="text"
        value={open ? query : selectedLabel}
        onChange={(e) => { setQuery(e.target.value); setOpen(true); }}
        onFocus={() => { setOpen(true); setQuery(''); }}
        onBlur={() => setTimeout(() => setOpen(false), 150)}
        onKeyDown={handleKeyDown}
        placeholder="Search people…"
        disabled={disabled}
        className="w-full px-3 py-2 rounded-lg bg-graph-bg/80 border border-graph-border text-sm text-graph-text placeholder-graph-text-dim focus:outline-none focus:border-graph-accent/40 disabled:opacity-50"
      />
      {open && filtered.length > 0 && (
        <div className="absolute z-50 w-full mt-1 rounded-lg bg-graph-surface/95 backdrop-blur-md border border-graph-border shadow-xl max-h-48 overflow-y-auto custom-scrollbar">
          {filtered.slice(0, 20).map((node, i) => (
            <button
              key={node.id}
              className={`w-full text-left px-3 py-2 text-sm transition-colors ${
                i === highlightIndex
                  ? 'bg-graph-accent/10 text-graph-accent'
                  : 'text-graph-text hover:bg-graph-bg/60'
              }`}
              onMouseDown={(e) => {
                e.preventDefault();
                handleSelect(node.id);
              }}
            >
              {node.label}
            </button>
          ))}
        </div>
      )}
    </div>
  );
}
