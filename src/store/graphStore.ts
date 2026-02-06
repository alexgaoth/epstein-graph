import { create } from 'zustand';
import type { GraphData, GraphEdge, GraphNode } from '../types/graph';

interface GraphStore {
  graphData: GraphData | null;
  selectedNode: string | null;
  selectedEdge: string | null;
  hoveredNode: string | null;
  hoveredEdge: string | null;
  searchQuery: string;
  infoPanelOpen: boolean;

  // Modal state
  addNodeModalOpen: boolean;
  addEdgeModalOpen: boolean;
  addEdgeSourceNode: string | null;

  setGraphData: (data: GraphData) => void;
  selectNode: (id: string | null) => void;
  selectEdge: (id: string | null) => void;
  setHoveredNode: (id: string | null) => void;
  setHoveredEdge: (id: string | null) => void;
  setSearchQuery: (q: string) => void;
  closeInfoPanel: () => void;

  // Modal actions
  openAddNodeModal: () => void;
  closeAddNodeModal: () => void;
  openAddEdgeModal: (sourceId: string) => void;
  closeAddEdgeModal: () => void;

  // Live graph mutation
  addNode: (node: GraphNode) => void;
  addEdge: (edge: GraphEdge) => void;

  getNodeById: (id: string) => GraphNode | undefined;
  getEdgeById: (id: string) => GraphEdge | undefined;
  getNeighborIds: (nodeId: string) => Set<string>;
  getConnectedEdgeIds: (nodeId: string) => Set<string>;
}

export const useGraphStore = create<GraphStore>((set, get) => ({
  graphData: null,
  selectedNode: null,
  selectedEdge: null,
  hoveredNode: null,
  hoveredEdge: null,
  searchQuery: '',
  infoPanelOpen: false,

  addNodeModalOpen: false,
  addEdgeModalOpen: false,
  addEdgeSourceNode: null,

  setGraphData: (data) => set({ graphData: data }),

  selectNode: (id) =>
    set({
      selectedNode: id,
      selectedEdge: null,
      infoPanelOpen: id !== null,
    }),

  selectEdge: (id) =>
    set({
      selectedEdge: id,
      selectedNode: null,
      infoPanelOpen: id !== null,
    }),

  setHoveredNode: (id) => set({ hoveredNode: id }),
  setHoveredEdge: (id) => set({ hoveredEdge: id }),
  setSearchQuery: (q) => set({ searchQuery: q }),
  closeInfoPanel: () =>
    set({ infoPanelOpen: false, selectedNode: null, selectedEdge: null }),

  openAddNodeModal: () => set({ addNodeModalOpen: true }),
  closeAddNodeModal: () => set({ addNodeModalOpen: false }),
  openAddEdgeModal: (sourceId) => set({ addEdgeModalOpen: true, addEdgeSourceNode: sourceId }),
  closeAddEdgeModal: () => set({ addEdgeModalOpen: false, addEdgeSourceNode: null }),

  addNode: (node) => {
    const data = get().graphData;
    if (!data) return;
    set({ graphData: { ...data, nodes: [...data.nodes, node] } });
    window.__addNodeToGraph?.(node);
  },

  addEdge: (edge) => {
    const data = get().graphData;
    if (!data) return;
    set({ graphData: { ...data, edges: [...data.edges, edge] } });
    window.__addEdgeToGraph?.(edge);
  },

  getNodeById: (id) => get().graphData?.nodes.find((n) => n.id === id),

  getEdgeById: (id) => get().graphData?.edges.find((e) => e.id === id),

  getNeighborIds: (nodeId) => {
    const data = get().graphData;
    if (!data) return new Set<string>();
    const neighbors = new Set<string>();
    for (const edge of data.edges) {
      if (edge.source === nodeId) neighbors.add(edge.target);
      if (edge.target === nodeId) neighbors.add(edge.source);
    }
    return neighbors;
  },

  getConnectedEdgeIds: (nodeId) => {
    const data = get().graphData;
    if (!data) return new Set<string>();
    const edgeIds = new Set<string>();
    for (const edge of data.edges) {
      if (edge.source === nodeId || edge.target === nodeId) {
        edgeIds.add(edge.id);
      }
    }
    return edgeIds;
  },
}));
