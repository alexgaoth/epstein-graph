export interface GroupDef {
  color: string;
  label: string;
}

export interface GraphNode {
  id: string;
  label: string;
  role?: string;
  group?: string;
  gender?: 'male' | 'female';
  image?: string;
  x?: number;
  y?: number;
  size?: number;
  color?: string;
  type?: string;
}

export interface GraphEdge {
  id: string;
  source: string;
  target: string;
  connection_type:
    | 'named in document'
    | 'flight record'
    | 'testimony mention'
    | 'financial record'
    | 'photograph'
    | 'other';
  doj_link: string;
  document_title: string;
  quote_snippet?: string;
  page?: number | null;
}

export interface GraphData {
  groups?: Record<string, GroupDef>;
  nodes: GraphNode[];
  edges: GraphEdge[];
}

declare global {
  interface Window {
    turnstile?: {
      render: (container: string | HTMLElement, options: Record<string, unknown>) => string;
      remove: (widgetId: string) => void;
      reset: (widgetId: string) => void;
    };
    __addNodeToGraph?: (node: GraphNode) => void;
    __addEdgeToGraph?: (edge: GraphEdge) => void;
    __resetGraphCamera?: () => void;
    __centerOnGraphNode?: (nodeId: string) => void;
    __TURNSTILE_SITE_KEY__?: string;
  }
}
