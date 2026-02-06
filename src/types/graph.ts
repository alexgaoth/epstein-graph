export interface GraphNode {
  id: string;
  label: string;
  role?: string;
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
  nodes: GraphNode[];
  edges: GraphEdge[];
}
