import type { GraphEdge } from '../types/graph';

/** Default node color — white when no group is assigned */
export const DEFAULT_NODE_COLOR = '#e0e0e8';

/** Color palette for the dark investigative theme */
export const COLORS = {
  bg: '#06060c',
  nodeFaded: '#1c1c30',
  edgeDefault: '#2a2a44',
  edgeHighlight: '#ffffff',
  edgeFaded: '#111122',
  centralNode: '#00d4ff',
  labelColor: '#c8c8e0',
  labelFaded: '#33334d',
} as const;

/** Group colors — loaded from graph.json but with fallbacks */
export const GROUP_COLORS: Record<string, string> = {
  central: '#00d4ff',
  staff: '#f59e0b',
  associate: '#a855f7',
  accuser: '#f472b6',
  legal: '#34d399',
  aviation: '#2dd4bf',
  prosecution: '#60a5fa',
  international: '#ef4444',
};

/** Sizing: node size computed from degree (edge count) */
export const SIZING = {
  baseNodeSize: 5,
  nodeScaleFactor: 3.5,
  minNodeSize: 4,
  maxNodeSize: 28,
  baseEdgeSize: 0.4,
  edgeScaleFactor: 0.08,
  minEdgeSize: 0.3,
  maxEdgeSize: 3,
} as const;

/** Camera animation defaults */
export const CAMERA = {
  focusRatio: 0.25,
  overviewRatio: 1,
  duration: 600,
  easing: 'quadraticOut' as const,
} as const;

/** Compute node size from degree using sqrt scale */
export function nodeSizeFromDegree(degree: number): number {
  const size = SIZING.baseNodeSize + SIZING.nodeScaleFactor * Math.sqrt(degree);
  return Math.min(SIZING.maxNodeSize, Math.max(SIZING.minNodeSize, size));
}

/** Compute edge size from the smaller of two connected node sizes */
export function edgeSizeFromNodes(sizeA: number, sizeB: number): number {
  const smaller = Math.min(sizeA, sizeB);
  const size = SIZING.baseEdgeSize + SIZING.edgeScaleFactor * smaller;
  return Math.min(SIZING.maxEdgeSize, Math.max(SIZING.minEdgeSize, size));
}

/** Get node color from group, defaulting to white */
export function nodeColorFromGroup(group?: string): string {
  if (!group) return DEFAULT_NODE_COLOR;
  return GROUP_COLORS[group] || DEFAULT_NODE_COLOR;
}

/** Map connection_type to badge CSS class */
export function connectionBadgeClass(type: GraphEdge['connection_type']): string {
  switch (type) {
    case 'named in document':
      return 'badge badge-document';
    case 'flight record':
      return 'badge badge-flight';
    case 'testimony mention':
      return 'badge badge-testimony';
    case 'financial record':
      return 'badge badge-financial';
    case 'photograph':
      return 'badge badge-photo';
    default:
      return 'badge badge-other';
  }
}

/** Format connection type for display */
export function formatConnectionType(type: GraphEdge['connection_type']): string {
  return type.charAt(0).toUpperCase() + type.slice(1);
}
