import type { GraphEdge } from '../types/graph';

/** Color palette for the dark investigative theme */
export const COLORS = {
  bg: '#06060c',
  nodeDefault: '#4a4a6a',
  nodeHighlight: '#00d4ff',
  nodeNeighbor: '#3388bb',
  nodeFaded: '#1c1c30',
  edgeDefault: '#2a2a44',
  edgeHighlight: '#00aadd',
  edgeFaded: '#111122',
  centralNode: '#00d4ff',
  labelColor: '#c8c8e0',
  labelFaded: '#33334d',
} as const;

/** Sizes */
export const SIZES = {
  centralNode: 18,
  defaultNode: 7,
  focusedNode: 14,
  neighborNode: 9,
  fadedNode: 4,
  defaultEdge: 1.2,
  highlightEdge: 2.5,
  fadedEdge: 0.4,
} as const;

/** Camera animation defaults */
export const CAMERA = {
  focusRatio: 0.25,
  overviewRatio: 1,
  duration: 600,
  easing: 'quadraticOut' as const,
} as const;

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
