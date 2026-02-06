import { useEffect, useRef, useCallback } from 'react';
import Graph from 'graphology';
import Sigma from 'sigma';
import forceAtlas2 from 'graphology-layout-forceatlas2';
import { useGraphStore } from '../store/graphStore';
import { COLORS, SIZES, CAMERA } from '../lib/graphUtils';
import type { GraphData } from '../types/graph';

/**
 * Core graph visualization component.
 * Initializes Sigma.js v2 with WebGL rendering and ForceAtlas2 layout.
 * Implements:
 *   - Force-directed layout with animated settling
 *   - Click-to-center camera animation via sigma.getCamera().animate()
 *   - Node/edge focus highlighting with neighbor emphasis
 *   - Hover tooltips via enterNode/leaveNode events
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

  useEffect(() => {
    selectedNodeRef.current = selectedNode;
  }, [selectedNode]);
  useEffect(() => {
    hoveredNodeRef.current = hoveredNode;
  }, [hoveredNode]);
  useEffect(() => {
    selectedEdgeRef.current = selectedEdge;
  }, [selectedEdge]);

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
   * Uses sigma.getCamera().animate() with quadraticOut easing
   * for smooth, Quartz-like transitions.
   */
  const centerOnNode = useCallback((sigma: Sigma, nodeId: string) => {
    const nodeDisplayData = sigma.getNodeDisplayData(nodeId);
    if (!nodeDisplayData) return;

    // Animate camera to center the node with comfortable zoom
    sigma.getCamera().animate(
      { x: nodeDisplayData.x, y: nodeDisplayData.y, ratio: CAMERA.focusRatio },
      { duration: CAMERA.duration, easing: CAMERA.easing },
    );
  }, []);

  /** Reset camera to overview showing the full graph */
  const resetCamera = useCallback(() => {
    const sigma = sigmaRef.current;
    if (!sigma) return;

    // Center on Epstein node at overview zoom
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

        // Add nodes
        for (const node of data.nodes) {
          const isCentral = node.id === 'epstein';
          graph.addNode(node.id, {
            label: node.label,
            x: (node.x ?? (Math.random() - 0.5) * 100) + (Math.random() - 0.5) * 5,
            y: (node.y ?? (Math.random() - 0.5) * 100) + (Math.random() - 0.5) * 5,
            size: isCentral ? SIZES.centralNode : SIZES.defaultNode,
            color: isCentral ? COLORS.centralNode : COLORS.nodeDefault,
            // Store metadata
            nodeRole: node.role || '',
            nodeType: node.type || 'person',
          });
        }

        // Add edges
        for (const edge of data.edges) {
          if (graph.hasNode(edge.source) && graph.hasNode(edge.target)) {
            graph.addEdgeWithKey(edge.id, edge.source, edge.target, {
              color: COLORS.edgeDefault,
              size: SIZES.defaultEdge,
              // Store metadata
              connectionType: edge.connection_type,
              dojLink: edge.doj_link,
              documentTitle: edge.document_title,
              quoteSnippet: edge.quote_snippet || '',
            });
          }
        }

        // Run ForceAtlas2 layout iteratively for animated settling effect.
        // Each iteration modifies node positions; Sigma re-renders automatically.
        const settings = forceAtlas2.inferSettings(graph);
        settings.gravity = 0.5;
        settings.scalingRatio = 20;
        settings.strongGravityMode = true;
        settings.barnesHutOptimize = true;

        let iterations = 0;
        const maxIterations = 180;
        layoutRunningRef.current = true;

        function layoutStep() {
          if (iterations < maxIterations && layoutRunningRef.current) {
            // Run 1 iteration per frame for smooth visual settling
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
        }, 2000);
      });

    // Initialize Sigma with WebGL renderer
    const sigma = new Sigma(graph, containerRef.current, {
      renderLabels: true,
      labelFont: 'Inter, system-ui, sans-serif',
      labelSize: 12,
      labelWeight: '300',
      labelColor: { color: COLORS.labelColor },
      labelRenderedSizeThreshold: 14, // Hide labels by default (only large/focused nodes show)
      defaultNodeColor: COLORS.nodeDefault,
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
       * Node reducer: dynamically styles each node based on current focus state.
       * - Selected node: large + bright accent color + forced label
       * - Neighbor of selected: medium size + neighbor color + forced label
       * - Non-neighbor when something is selected: faded
       * - Hovered node: forced label
       * - Default: standard styling
       */
      nodeReducer: (node, data) => {
        const res = { ...data };
        const selected = selectedNodeRef.current;
        const hovered = hoveredNodeRef.current;

        if (selected) {
          if (node === selected) {
            res.size = SIZES.focusedNode;
            res.color = COLORS.nodeHighlight;
            res.forceLabel = true;
            res.zIndex = 2;
          } else {
            const neighbors = getNeighbors(graph, selected);
            if (neighbors.has(node)) {
              res.size = SIZES.neighborNode;
              res.color = COLORS.nodeNeighbor;
              res.forceLabel = true;
              res.zIndex = 1;
            } else {
              res.size = SIZES.fadedNode;
              res.color = COLORS.nodeFaded;
              res.label = '';
              res.zIndex = 0;
            }
          }
        } else if (hovered) {
          if (node === hovered) {
            res.forceLabel = true;
            res.zIndex = 2;
            res.color = COLORS.nodeHighlight;
            res.size = (data.size || SIZES.defaultNode) * 1.3;
          } else {
            const neighbors = getNeighbors(graph, hovered);
            if (neighbors.has(node)) {
              res.forceLabel = true;
              res.color = COLORS.nodeNeighbor;
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
       * Edge reducer: dynamically styles each edge based on current focus state.
       * - Edges connected to selected node: bright + thick
       * - Edges not connected when something is selected: very faded
       * - Hovered edge: highlighted
       */
      edgeReducer: (edge, data) => {
        const res = { ...data };
        const selected = selectedNodeRef.current;
        const selectedE = selectedEdgeRef.current;
        const hovered = hoveredNodeRef.current;

        if (selectedE) {
          if (edge === selectedE) {
            res.color = COLORS.edgeHighlight;
            res.size = SIZES.highlightEdge;
            res.zIndex = 2;
          } else {
            res.color = COLORS.edgeFaded;
            res.size = SIZES.fadedEdge;
          }
        } else if (selected) {
          const connectedEdges = getConnectedEdges(graph, selected);
          if (connectedEdges.has(edge)) {
            res.color = COLORS.edgeHighlight;
            res.size = SIZES.highlightEdge;
            res.zIndex = 1;
          } else {
            res.color = COLORS.edgeFaded;
            res.size = SIZES.fadedEdge;
          }
        } else if (hovered) {
          const connectedEdges = getConnectedEdges(graph, hovered);
          if (connectedEdges.has(edge)) {
            res.color = COLORS.edgeHighlight;
            res.size = SIZES.highlightEdge;
          }
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

    // Hover events for tooltip
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
    });

    sigma.on('leaveEdge', () => {
      setHoveredEdge(null);
      containerRef.current!.style.cursor = 'default';
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
