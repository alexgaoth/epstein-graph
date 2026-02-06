import { useEffect, useRef, useCallback } from 'react';
import Graph from 'graphology';
import Sigma from 'sigma';
import forceAtlas2 from 'graphology-layout-forceatlas2';
import { useGraphStore } from '../store/graphStore';
import {
  COLORS,
  CAMERA,
  DEFAULT_NODE_COLOR,
  nodeSizeFromDegree,
  edgeSizeFromNodes,
  nodeColorFromGroup,
} from '../lib/graphUtils';
import type { GraphData } from '../types/graph';

/**
 * Core graph visualization component.
 * Initializes Sigma.js v2 with WebGL rendering and ForceAtlas2 layout.
 * Implements:
 *   - Force-directed layout with gentle animated settling
 *   - Degree-based node sizing (more connected = bigger)
 *   - Group-based node coloring (default white)
 *   - Edge thickness from smaller connected node
 *   - Click-to-center camera animation
 *   - Hover-only edge highlighting (node hover + edge hover)
 */
export default function GraphContainer() {
  const containerRef = useRef<HTMLDivElement>(null);
  const sigmaRef = useRef<Sigma | null>(null);
  const graphRef = useRef<Graph | null>(null);
  const layoutRunningRef = useRef(false);
  const animFrameRef = useRef<number | null>(null);

  const {
    selectedNode,
    selectedEdge,
    hoveredNode,
    hoveredEdge,
    selectNode,
    selectEdge,
    setHoveredNode,
    setHoveredEdge,
    setGraphData,
  } = useGraphStore();

  // Stable refs for state used inside sigma callbacks
  const selectedNodeRef = useRef(selectedNode);
  const hoveredNodeRef = useRef(hoveredNode);
  const selectedEdgeRef = useRef(selectedEdge);
  const hoveredEdgeRef = useRef(hoveredEdge);

  useEffect(() => { selectedNodeRef.current = selectedNode; }, [selectedNode]);
  useEffect(() => { hoveredNodeRef.current = hoveredNode; }, [hoveredNode]);
  useEffect(() => { selectedEdgeRef.current = selectedEdge; }, [selectedEdge]);
  useEffect(() => { hoveredEdgeRef.current = hoveredEdge; }, [hoveredEdge]);

  /** Compute neighbor set for a given node */
  const getNeighbors = useCallback((graph: Graph, nodeId: string): Set<string> => {
    const neighbors = new Set<string>();
    graph.forEachEdge(nodeId, (_edge, _attrs, source, target) => {
      if (source === nodeId) neighbors.add(target);
      if (target === nodeId) neighbors.add(source);
    });
    return neighbors;
  }, []);

  /** Compute connected edge keys for a given node */
  const getConnectedEdges = useCallback((graph: Graph, nodeId: string): Set<string> => {
    const edges = new Set<string>();
    graph.forEachEdge(nodeId, (edge) => {
      edges.add(edge);
    });
    return edges;
  }, []);

  /**
   * Animate camera to center on a node.
   * Uses sigma.getCamera().animate() with quadraticOut easing.
   */
  const centerOnNode = useCallback((sigma: Sigma, nodeId: string) => {
    const nodeDisplayData = sigma.getNodeDisplayData(nodeId);
    if (!nodeDisplayData) return;

    sigma.getCamera().animate(
      { x: nodeDisplayData.x, y: nodeDisplayData.y, ratio: CAMERA.focusRatio },
      { duration: CAMERA.duration, easing: CAMERA.easing },
    );
  }, []);

  /** Reset camera to overview showing the full graph */
  const resetCamera = useCallback(() => {
    const sigma = sigmaRef.current;
    if (!sigma) return;

    const epsteinData = sigma.getNodeDisplayData('epstein');
    if (epsteinData) {
      sigma.getCamera().animate(
        { x: epsteinData.x, y: epsteinData.y, ratio: CAMERA.overviewRatio },
        { duration: CAMERA.duration, easing: CAMERA.easing },
      );
    } else {
      sigma.getCamera().animate(
        { x: 0.5, y: 0.5, ratio: 1 },
        { duration: CAMERA.duration, easing: CAMERA.easing },
      );
    }
    selectNode(null);
  }, [selectNode]);

  // Expose resetCamera globally for other components
  useEffect(() => {
    (window as any).__resetGraphCamera = resetCamera;
    return () => {
      delete (window as any).__resetGraphCamera;
    };
  }, [resetCamera]);

  // Expose centerOnNode globally for search
  useEffect(() => {
    (window as any).__centerOnGraphNode = (nodeId: string) => {
      if (sigmaRef.current && graphRef.current?.hasNode(nodeId)) {
        selectNode(nodeId);
        centerOnNode(sigmaRef.current, nodeId);
      }
    };
    return () => {
      delete (window as any).__centerOnGraphNode;
    };
  }, [centerOnNode, selectNode]);

  useEffect(() => {
    if (!containerRef.current) return;

    const graph = new Graph();
    graphRef.current = graph;

    // Fetch graph data
    fetch('/data/graph.json')
      .then((r) => r.json())
      .then((data: GraphData) => {
        setGraphData(data);

        // Add nodes with initial random positions
        for (const node of data.nodes) {
          graph.addNode(node.id, {
            label: node.label,
            x: (node.x ?? (Math.random() - 0.5) * 100) + (Math.random() - 0.5) * 5,
            y: (node.y ?? (Math.random() - 0.5) * 100) + (Math.random() - 0.5) * 5,
            size: 5, // placeholder — computed after edges are added
            color: nodeColorFromGroup(node.group),
            // Store metadata
            nodeRole: node.role || '',
            nodeType: node.type || 'person',
            nodeGroup: node.group || '',
          });
        }

        // Add edges
        for (const edge of data.edges) {
          if (graph.hasNode(edge.source) && graph.hasNode(edge.target)) {
            graph.addEdgeWithKey(edge.id, edge.source, edge.target, {
              color: COLORS.edgeDefault,
              size: 0.5, // placeholder — computed after node sizes
              // Store metadata
              connectionType: edge.connection_type,
              dojLink: edge.doj_link,
              documentTitle: edge.document_title,
              quoteSnippet: edge.quote_snippet || '',
            });
          }
        }

        // Compute degree-based node sizes
        graph.forEachNode((nodeId) => {
          const degree = graph.degree(nodeId);
          graph.setNodeAttribute(nodeId, 'size', nodeSizeFromDegree(degree));
        });

        // Compute edge sizes from smaller connected node
        graph.forEachEdge((edgeId, _attrs, source, target) => {
          const sourceSize = graph.getNodeAttribute(source, 'size') as number;
          const targetSize = graph.getNodeAttribute(target, 'size') as number;
          graph.setEdgeAttribute(edgeId, 'size', edgeSizeFromNodes(sourceSize, targetSize));
        });

        // Gentler ForceAtlas2 layout — reduced shake on initial load
        const settings = forceAtlas2.inferSettings(graph);
        settings.gravity = 0.08;
        settings.scalingRatio = 6;
        settings.strongGravityMode = false;
        settings.barnesHutOptimize = true;
        settings.slowDown = 8;

        let iterations = 0;
        const maxIterations = 200;
        layoutRunningRef.current = true;

        function layoutStep() {
          if (iterations < maxIterations && layoutRunningRef.current) {
            forceAtlas2.assign(graph, { settings, iterations: 1 });
            iterations++;
            animFrameRef.current = requestAnimationFrame(layoutStep);
          } else {
            layoutRunningRef.current = false;
          }
        }

        layoutStep();

        // After layout settles, center on Epstein
        setTimeout(() => {
          if (sigmaRef.current) {
            const epsteinData = sigmaRef.current.getNodeDisplayData('epstein');
            if (epsteinData) {
              sigmaRef.current.getCamera().animate(
                { x: epsteinData.x, y: epsteinData.y, ratio: 0.8 },
                { duration: 1200, easing: 'quadraticOut' },
              );
            }
          }
        }, 2500);
      });

    // Initialize Sigma with WebGL renderer
    const sigma = new Sigma(graph, containerRef.current, {
      renderLabels: true,
      labelFont: 'Inter, system-ui, sans-serif',
      labelSize: 12,
      labelWeight: '300',
      labelColor: { color: COLORS.labelColor },
      labelRenderedSizeThreshold: 14,
      defaultNodeColor: DEFAULT_NODE_COLOR,
      defaultEdgeColor: COLORS.edgeDefault,
      defaultEdgeType: 'line',
      enableEdgeClickEvents: true,
      enableEdgeHoverEvents: true,
      minCameraRatio: 0.05,
      maxCameraRatio: 3,
      hideEdgesOnMove: false,
      hideLabelsOnMove: true,
      labelDensity: 0.3,
      labelGridCellSize: 100,
      zIndex: true,

      /**
       * Node reducer: dynamically styles each node based on current state.
       * Selection fades non-neighbors for focus.
       * Hover enlarges the hovered node and shows neighbor labels.
       */
      nodeReducer: (node, data) => {
        const res = { ...data };
        const selected = selectedNodeRef.current;
        const hovered = hoveredNodeRef.current;

        // Selection focus: fade non-neighbors (base layer)
        if (selected) {
          if (node === selected) {
            res.forceLabel = true;
            res.zIndex = 2;
            res.size = (data.size || 5) * 1.3;
          } else {
            const neighbors = getNeighbors(graph, selected);
            if (neighbors.has(node)) {
              res.forceLabel = true;
              res.zIndex = 1;
            } else {
              res.color = COLORS.nodeFaded;
              res.label = '';
              res.zIndex = 0;
            }
          }
        }

        // Hover highlights (override layer — restores faded nodes if hovered)
        if (hovered) {
          if (node === hovered) {
            res.forceLabel = true;
            res.zIndex = 2;
            res.size = (data.size || 5) * 1.3;
            res.color = data.color; // Restore original color even if faded by selection
            res.label = data.label;
          } else {
            const neighbors = getNeighbors(graph, hovered);
            if (neighbors.has(node)) {
              res.forceLabel = true;
            }
          }
        }

        // Always show label for central node
        if (node === 'epstein') {
          res.forceLabel = true;
        }

        return res;
      },

      /**
       * Edge reducer: hover-only edge highlighting.
       * - Hover node: highlight all connected edges
       * - Hover edge: highlight that single edge
       * - Selected node: fade non-connected edges (no bright highlighting)
       * - Default: standard computed sizes and colors
       */
      edgeReducer: (edge, data) => {
        const res = { ...data };
        const hovered = hoveredNodeRef.current;
        const hoveredE = hoveredEdgeRef.current;
        const selected = selectedNodeRef.current;

        // Selection-based fading (base layer)
        if (selected) {
          const connectedEdges = getConnectedEdges(graph, selected);
          if (!connectedEdges.has(edge)) {
            res.color = COLORS.edgeFaded;
          }
        }

        // Hover highlights (override layer)
        if (hovered) {
          const connectedEdges = getConnectedEdges(graph, hovered);
          if (connectedEdges.has(edge)) {
            res.color = COLORS.edgeHighlight;
            res.size = (data.size || 0.5) * 2.5;
            res.zIndex = 2;
          }
        } else if (hoveredE && edge === hoveredE) {
          res.color = COLORS.edgeHighlight;
          res.size = (data.size || 0.5) * 2.5;
          res.zIndex = 2;
        }

        return res;
      },
    });

    sigmaRef.current = sigma;

    // --- Event handlers ---

    // Click node: center camera + highlight neighbors
    sigma.on('clickNode', ({ node }) => {
      selectNode(node);
      centerOnNode(sigma, node);
    });

    // Click edge: show edge info panel
    sigma.on('clickEdge', ({ edge }) => {
      selectEdge(edge);
    });

    // Click background: deselect
    sigma.on('clickStage', () => {
      selectNode(null);
      selectEdge(null);
    });

    // Hover events for tooltip + edge highlighting
    sigma.on('enterNode', ({ node }) => {
      setHoveredNode(node);
      containerRef.current!.style.cursor = 'pointer';
      sigma.refresh();
    });

    sigma.on('leaveNode', () => {
      setHoveredNode(null);
      containerRef.current!.style.cursor = 'default';
      sigma.refresh();
    });

    sigma.on('enterEdge', ({ edge }) => {
      setHoveredEdge(edge);
      containerRef.current!.style.cursor = 'pointer';
      sigma.refresh();
    });

    sigma.on('leaveEdge', () => {
      setHoveredEdge(null);
      containerRef.current!.style.cursor = 'default';
      sigma.refresh();
    });

    // Trigger re-render when selection state changes
    const unsubscribe = useGraphStore.subscribe(() => {
      sigma.refresh();
    });

    return () => {
      unsubscribe();
      if (animFrameRef.current) cancelAnimationFrame(animFrameRef.current);
      layoutRunningRef.current = false;
      sigma.kill();
    };
  }, []); // eslint-disable-line react-hooks/exhaustive-deps

  return (
    <div
      ref={containerRef}
      className="sigma-container"
      role="application"
      aria-label="Epstein connection graph — interactive network visualization"
      tabIndex={0}
    />
  );
}
