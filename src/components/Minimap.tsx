import { useEffect, useRef } from 'react';
import { useGraphStore } from '../store/graphStore';
import { COLORS, nodeColorFromGroup } from '../lib/graphUtils';

/**
 * Minimap (top-right) showing a small overview of all nodes.
 * Renders on a canvas element, redraws when graph data changes.
 */
export default function Minimap() {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const { graphData, selectedNode } = useGraphStore();

  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas || !graphData) return;

    const ctx = canvas.getContext('2d');
    if (!ctx) return;

    const w = canvas.width;
    const h = canvas.height;

    // Compute bounding box of all nodes
    let minX = Infinity, maxX = -Infinity, minY = Infinity, maxY = -Infinity;
    for (const node of graphData.nodes) {
      const x = node.x ?? 0;
      const y = node.y ?? 0;
      minX = Math.min(minX, x);
      maxX = Math.max(maxX, x);
      minY = Math.min(minY, y);
      maxY = Math.max(maxY, y);
    }

    const rangeX = maxX - minX || 1;
    const rangeY = maxY - minY || 1;
    const padding = 8;
    const scaleX = (w - padding * 2) / rangeX;
    const scaleY = (h - padding * 2) / rangeY;
    const scale = Math.min(scaleX, scaleY);

    const offsetX = (w - rangeX * scale) / 2;
    const offsetY = (h - rangeY * scale) / 2;

    const toScreen = (x: number, y: number) => ({
      sx: offsetX + (x - minX) * scale,
      sy: offsetY + (y - minY) * scale,
    });

    // Clear
    ctx.clearRect(0, 0, w, h);

    // Draw edges
    ctx.strokeStyle = COLORS.edgeDefault;
    ctx.lineWidth = 0.5;
    ctx.globalAlpha = 0.4;
    for (const edge of graphData.edges) {
      const src = graphData.nodes.find((n) => n.id === edge.source);
      const tgt = graphData.nodes.find((n) => n.id === edge.target);
      if (src && tgt) {
        const a = toScreen(src.x ?? 0, src.y ?? 0);
        const b = toScreen(tgt.x ?? 0, tgt.y ?? 0);
        ctx.beginPath();
        ctx.moveTo(a.sx, a.sy);
        ctx.lineTo(b.sx, b.sy);
        ctx.stroke();
      }
    }

    // Draw nodes with group colors
    ctx.globalAlpha = 1;
    for (const node of graphData.nodes) {
      const { sx, sy } = toScreen(node.x ?? 0, node.y ?? 0);
      const isCentral = node.id === 'epstein';
      const isSelected = node.id === selectedNode;

      ctx.fillStyle = isSelected
        ? '#ffffff'
        : nodeColorFromGroup(node.group);

      ctx.beginPath();
      ctx.arc(sx, sy, isSelected ? 3.5 : isCentral ? 3 : 1.8, 0, Math.PI * 2);
      ctx.fill();
    }
  }, [graphData, selectedNode]);

  return (
    <div className="fixed top-4 right-4 z-30 rounded-lg bg-graph-surface/80 backdrop-blur-md border border-graph-border/50 overflow-hidden">
      <canvas
        ref={canvasRef}
        width={140}
        height={100}
        className="block"
        aria-label="Graph minimap overview"
      />
    </div>
  );
}
