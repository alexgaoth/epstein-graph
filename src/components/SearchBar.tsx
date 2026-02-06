import { useState, useRef, useEffect, useMemo } from 'react';
import { useGraphStore } from '../store/graphStore';

/**
 * Search bar component — find a person by name, Enter centers the first result.
 * Arrow keys step through the focused node's neighbors.
 */
export default function SearchBar() {
  const { graphData, searchQuery, setSearchQuery, selectedNode, getNeighborIds } =
    useGraphStore();
  const [isFocused, setIsFocused] = useState(false);
  const [highlightIndex, setHighlightIndex] = useState(0);
  const inputRef = useRef<HTMLInputElement>(null);

  // Filter nodes matching the search query
  const results = useMemo(() => {
    if (!graphData || searchQuery.length < 1) return [];
    const q = searchQuery.toLowerCase();
    return graphData.nodes.filter((n) => n.label.toLowerCase().includes(q));
  }, [graphData, searchQuery]);

  // Reset highlight index when results change
  useEffect(() => {
    setHighlightIndex(0);
  }, [results.length]);

  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === 'Enter') {
      if (results.length > 0) {
        const target = results[highlightIndex] || results[0];
        (window as any).__centerOnGraphNode?.(target.id);
        setSearchQuery('');
        inputRef.current?.blur();
      }
    } else if (e.key === 'ArrowDown') {
      e.preventDefault();
      setHighlightIndex((i) => Math.min(i + 1, results.length - 1));
    } else if (e.key === 'ArrowUp') {
      e.preventDefault();
      setHighlightIndex((i) => Math.max(i - 1, 0));
    } else if (e.key === 'Escape') {
      setSearchQuery('');
      inputRef.current?.blur();
    }
  };

  // Global keyboard shortcuts: arrow keys to step through neighbors when a node is selected
  useEffect(() => {
    const handler = (e: KeyboardEvent) => {
      if (document.activeElement === inputRef.current) return;

      // Ctrl+K or / to focus search
      if ((e.ctrlKey && e.key === 'k') || (e.key === '/' && !e.ctrlKey && !e.metaKey)) {
        e.preventDefault();
        inputRef.current?.focus();
        return;
      }

      // Arrow keys to navigate neighbors of selected node
      if (selectedNode && (e.key === 'ArrowLeft' || e.key === 'ArrowRight')) {
        const neighbors = Array.from(getNeighborIds(selectedNode));
        if (neighbors.length === 0) return;

        const currentIndex = neighbors.indexOf(selectedNode);
        let nextIndex: number;
        if (e.key === 'ArrowRight') {
          nextIndex = currentIndex < neighbors.length - 1 ? currentIndex + 1 : 0;
        } else {
          nextIndex = currentIndex > 0 ? currentIndex - 1 : neighbors.length - 1;
        }
        (window as any).__centerOnGraphNode?.(neighbors[nextIndex]);
      }

      // Escape to reset view
      if (e.key === 'Escape' && !isFocused) {
        (window as any).__resetGraphCamera?.();
      }
    };

    window.addEventListener('keydown', handler);
    return () => window.removeEventListener('keydown', handler);
  }, [selectedNode, getNeighborIds, isFocused]);

  return (
    <div className="fixed top-4 left-4 z-40 w-64 max-w-[calc(100vw-2rem)]">
      <div className={`relative transition-all duration-200 ${isFocused ? 'glow-accent' : ''}`}>
        <div className="absolute left-3 top-1/2 -translate-y-1/2 text-graph-text-dim pointer-events-none">
          <svg className="w-4 h-4" fill="none" viewBox="0 0 16 16" stroke="currentColor" strokeWidth="1.5">
            <circle cx="6.5" cy="6.5" r="5" />
            <path d="M10.5 10.5L14 14" />
          </svg>
        </div>
        <input
          ref={inputRef}
          type="text"
          value={searchQuery}
          onChange={(e) => setSearchQuery(e.target.value)}
          onFocus={() => setIsFocused(true)}
          onBlur={() => setTimeout(() => setIsFocused(false), 150)}
          onKeyDown={handleKeyDown}
          placeholder="Search people… (/ or Ctrl+K)"
          className="w-full pl-9 pr-3 py-2 rounded-lg bg-graph-surface/90 backdrop-blur-md border border-graph-border text-sm text-graph-text placeholder-graph-text-dim focus:outline-none focus:border-graph-accent/40 transition-colors"
          aria-label="Search for a person in the graph"
          role="combobox"
          aria-expanded={isFocused && results.length > 0}
          aria-autocomplete="list"
        />
      </div>

      {/* Search results dropdown */}
      {isFocused && results.length > 0 && searchQuery.length > 0 && (
        <div
          className="mt-1 rounded-lg bg-graph-surface/95 backdrop-blur-md border border-graph-border shadow-xl overflow-hidden fade-enter"
          role="listbox"
        >
          {results.slice(0, 8).map((node, i) => (
            <button
              key={node.id}
              className={`w-full text-left px-3 py-2 text-sm transition-colors ${
                i === highlightIndex
                  ? 'bg-graph-accent/10 text-graph-accent'
                  : 'text-graph-text hover:bg-graph-bg/60'
              }`}
              onMouseDown={(e) => {
                e.preventDefault();
                (window as any).__centerOnGraphNode?.(node.id);
                setSearchQuery('');
              }}
              role="option"
              aria-selected={i === highlightIndex}
            >
              <div className="font-medium">{node.label}</div>
              {node.role && (
                <div className="text-xs text-graph-text-dim mt-0.5 truncate">
                  {node.role}
                </div>
              )}
            </button>
          ))}
        </div>
      )}
    </div>
  );
}
