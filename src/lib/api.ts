import type { GraphData, GraphNode, GraphEdge } from '../types/graph';

export async function fetchGraph(): Promise<GraphData> {
  const res = await fetch('/api/graph');
  if (!res.ok) throw new Error('Failed to fetch graph');
  return res.json();
}

export async function fetchNodeList(): Promise<{ id: string; label: string }[]> {
  const res = await fetch('/api/nodes');
  if (!res.ok) throw new Error('Failed to fetch nodes');
  return res.json();
}

export async function createNode(formData: FormData): Promise<GraphNode> {
  const res = await fetch('/api/nodes', { method: 'POST', body: formData });
  if (!res.ok) {
    const data = await res.json().catch(() => ({}));
    throw new Error(data.error || 'Failed to create node');
  }
  return res.json();
}

export async function createEdge(payload: {
  source: string;
  target: string;
  connection_type: string;
  doj_link?: string;
  document_title?: string;
  quote_snippet?: string;
  turnstileToken?: string;
}): Promise<GraphEdge> {
  const res = await fetch('/api/edges', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(payload),
  });
  if (!res.ok) {
    const data = await res.json().catch(() => ({}));
    throw new Error(data.error || 'Failed to create edge');
  }
  return res.json();
}
