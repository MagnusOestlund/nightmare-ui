<script lang="ts">
  /**
   * Workflow Canvas Component
   * 
   * Phase 2: Canvas with @xyflow/svelte (Svelte 5)
   * Dark-mode infinite canvas for building workflows
   */

  import { onMount, onDestroy } from 'svelte';
  import { SvelteFlow, Background, Controls, MiniMap, Position } from '@xyflow/svelte';
  import '@xyflow/svelte/dist/style.css';
  import CustomNode from './CustomNode.svelte';
  import type { ConnectionPoint } from './CustomNode.svelte';

  // API base URL
  const API_BASE = import.meta.env.VITE_API_URL || 'http://localhost:8001';

  // Grid snapping constant (50 pixels as per discussion)
  const GRID_SIZE = 50; // Horizontal grid spacing
  const ROW_HEIGHT = 120; // Fixed row height for vertical alignment (node height ~80px + padding)
  const NODE_WIDTH = 200; // Standard node width
  const NODE_HEIGHT = 80; // Standard node height
  const HORIZONTAL_SPACING = 250; // Horizontal spacing between nodes in the same row

  // Node and edge types
  interface Node {
    id: string;
    type: string;
    position: { x: number; y: number };
    data: any;
  }

  interface Edge {
    id: string;
    source: string;
    target: string;
    sourceHandle?: string;
    targetHandle?: string;
    type?: string;
    style?: any;
    data?: {
      sourceHandle?: string;
      targetHandle?: string;
      connectionType?: string;
    };
  }

  let nodes: Node[] = $state([]);
  let edges: Edge[] = $state([]);
  let loading = $state(false);
  let error: string | null = $state(null);
  let selectedNodeId: string | null = $state(null);
  let executionPath: string[] = $state([]); // Nodes in execution path (for green glow)
  let history: { nodes: Node[]; edges: Edge[] }[] = $state([]); // For undo (Ctrl+Z)
  let showHelpModal = $state(false); // Show keyboard shortcuts/help modal
  let svelteFlowInstance: any = $state(null); // Reference to SvelteFlow instance for fitView
  let viewport = $state({ x: 0, y: 0, zoom: 1 }); // Track viewport state
  let zoomLevel = $state<number>(1); // Current zoom level (1 = 100%)
  let viewportProp = $state({ x: 0, y: 0, zoom: 1 }); // Viewport prop for SvelteFlow

  // Props
  let { showMinimap = $bindable(true) }: { showMinimap?: boolean } = $props();

  // Generate UUID for node IDs (as per discussion - UUID-based, not sequential)
  function generateUUID(): string {
    // Fallback UUID generator for browsers that don't support crypto.randomUUID
    if (typeof crypto !== 'undefined' && crypto.randomUUID) {
      return 'node-' + crypto.randomUUID();
    }
    // Fallback: Generate UUID v4 manually
    return 'node-' + 'xxxxxxxx-xxxx-4xxx-yxxx-xxxxxxxxxxxx'.replace(/[xy]/g, (c) => {
      const r = Math.random() * 16 | 0;
      const v = c === 'x' ? r : (r & 0x3 | 0x8);
      return v.toString(16);
    });
  }

  // Snap position to grid (50-pixel grid as per discussion)
  function snapToGrid(position: { x: number; y: number }): { x: number; y: number } {
    // Snap horizontally to grid (ensure it's a multiple of GRID_SIZE)
    const snappedX = Math.round(position.x / GRID_SIZE) * GRID_SIZE;
    
    // Snap vertically to row boundaries (fixed row height)
    // Ensure it's a multiple of ROW_HEIGHT, and align to grid as well
    const snappedY = Math.round(position.y / ROW_HEIGHT) * ROW_HEIGHT;
    
    // Ensure both coordinates are non-negative and properly aligned
    return {
      x: Math.max(0, snappedX),
      y: Math.max(0, snappedY),
    };
  }
  
  // Find the best row for a new node (avoid overlapping with existing nodes)
  function findBestRow(position: { x: number; y: number }): { x: number; y: number } {
    // Snap to nearest row first
    const targetRow = Math.round(position.y / ROW_HEIGHT);
    const snappedY = targetRow * ROW_HEIGHT;
    
    // Find all nodes in this row (within a small tolerance to account for slight misalignment)
    const ROW_TOLERANCE = ROW_HEIGHT / 2; // Allow nodes within half a row height
    const nodesInRow = nodes.filter(node => {
      const nodeRow = Math.round(node.position.y / ROW_HEIGHT);
      const nodeY = nodeRow * ROW_HEIGHT;
      return Math.abs(nodeY - snappedY) < ROW_TOLERANCE;
    });
    
    // Snap X to grid first
    let xPosition = Math.round(position.x / GRID_SIZE) * GRID_SIZE;
    
    if (nodesInRow.length > 0) {
      // Find the rightmost position in this row
      const rightmostX = Math.max(...nodesInRow.map(n => n.position.x + NODE_WIDTH));
      // Check if the new position would overlap or be too close
      const minSpacing = 50; // Minimum spacing between nodes
      if (xPosition <= rightmostX + minSpacing) {
        // Place new node after the rightmost node with proper spacing
        // Ensure it's snapped to grid
        const suggestedX = rightmostX + HORIZONTAL_SPACING;
        xPosition = Math.round(suggestedX / GRID_SIZE) * GRID_SIZE;
      } else {
        // Node is far enough, but ensure it's still on grid
        xPosition = Math.round(xPosition / GRID_SIZE) * GRID_SIZE;
      }
    } else {
      // No nodes in row, just snap to grid
      xPosition = Math.round(position.x / GRID_SIZE) * GRID_SIZE;
    }
    
    // Final snap to ensure both coordinates are on grid
    return {
      x: Math.round(xPosition / GRID_SIZE) * GRID_SIZE,
      y: snappedY,
    };
  }

  // Reset zoom to fit all nodes or reset to default
  function resetZoom() {
    if (svelteFlowInstance) {
      try {
        // Try to use fitView if nodes exist
        if (nodes.length > 0 && typeof svelteFlowInstance.fitView === 'function') {
          svelteFlowInstance.fitView({ padding: 0.2, duration: 300 });
          // Update zoom level after fitView (it will be set by onViewportChange)
        } else if (typeof svelteFlowInstance.setViewport === 'function') {
          // Fallback: set viewport directly to default
          svelteFlowInstance.setViewport({ x: 0, y: 0, zoom: 1 }, { duration: 300 });
          zoomLevel = 1;
          viewport = { x: 0, y: 0, zoom: 1 };
        } else {
          // Last resort: update viewport state directly
          zoomLevel = 1;
          viewport = { x: 0, y: 0, zoom: 1 };
        }
      } catch (e) {
        console.warn('WorkflowCanvas: Error resetting zoom:', e);
        // Fallback: update viewport state
        zoomLevel = 1;
        viewport = { x: 0, y: 0, zoom: 1 };
      }
    }
  }

  // Handle viewport changes
  function onViewportChange(event: CustomEvent) {
    if (event.detail) {
      viewport = event.detail;
      zoomLevel = event.detail.zoom || 1;
    }
  }

  // Zoom functions
  function zoomIn() {
    if (svelteFlowInstance) {
      const newZoom = Math.min(2, zoomLevel + 0.1);
      setZoom(newZoom);
    }
  }

  function zoomOut() {
    if (svelteFlowInstance) {
      const newZoom = Math.max(0.1, zoomLevel - 0.1);
      setZoom(newZoom);
    }
  }

  function setZoom(zoom: number) {
    zoomLevel = zoom;
    // Update viewport prop to trigger SvelteFlow zoom
    viewportProp = { ...viewport, zoom };
    viewport = { ...viewport, zoom };
  }

  function handleZoomSliderChange(event: Event) {
    const target = event.target as HTMLInputElement;
    const newZoom = parseFloat(target.value);
    setZoom(newZoom);
  }

  // Get node color based on type (as per discussion)
  function getNodeColor(type: string): string {
    if (type === 'start') return '#2ecc71'; // green
    if (type === 'results' || type === 'output') return '#9b59b6'; // purple
    if (type.startsWith('model-')) return '#3498db'; // blue
    if (type === 'upload' || type === 'load_duckdb' || type === 'http_request') return '#2ecc71'; // green (connector)
    return '#95a5a6'; // gray (utils)
  }

  // Get default connection points for a node type (matches CustomNode logic)
  function getDefaultConnectionPoints(nodeType: string): ConnectionPoint[] {
    const points: ConnectionPoint[] = [];
    
    switch (nodeType) {
      case 'start':
        // Start node: only output (right side)
        points.push({
          id: 'output-1',
          type: 'output',
          connectionType: 'execution',
          label: 'Out',
          position: Position.Right,
        });
        break;
        
      case 'branch':
        // Branch node: one input (left), two outputs (right - true/false)
        points.push({
          id: 'input-1',
          type: 'input',
          connectionType: 'execution',
          label: 'In',
          position: Position.Left,
        });
        points.push({
          id: 'output-true',
          type: 'output',
          connectionType: 'execution',
          label: 'True',
          position: Position.Right,
        });
        points.push({
          id: 'output-false',
          type: 'output',
          connectionType: 'execution',
          label: 'False',
          position: Position.Right,
        });
        break;
        
      case 'results':
      case 'output':
        // Results/Output nodes: only input (left side)
        points.push({
          id: 'input-1',
          type: 'input',
          connectionType: 'execution',
          label: 'In',
          position: Position.Left,
        });
        break;
        
      default:
        // Default: one input (left), one output (right)
        points.push({
          id: 'input-1',
          type: 'input',
          connectionType: 'execution',
          label: 'In',
          position: Position.Left,
        });
        points.push({
          id: 'output-1',
          type: 'output',
          connectionType: 'execution',
          label: 'Out',
          position: Position.Right,
        });
        break;
    }
    
    return points;
  }

  // Keyboard shortcuts handler
  function handleKeyDown(event: KeyboardEvent) {
    // Delete selected node
    if (event.key === 'Delete' && selectedNodeId) {
      event.preventDefault();
      deleteNode(selectedNodeId);
      selectedNodeId = null;
    }
    
    // Ctrl+Z: Undo
    if (event.ctrlKey && event.key === 'z' && !event.shiftKey) {
      event.preventDefault();
      undo();
    }
    
    // Ctrl+L: Straighten lines, snap to grid
    if (event.ctrlKey && event.key === 'l') {
      event.preventDefault();
      snapAllNodesToGrid();
    }
    
    // Ctrl+Enter: Run workflow (highlight path in green)
    if (event.ctrlKey && event.key === 'Enter') {
      event.preventDefault();
      runWorkflow();
    }
  }

  // Delete node
  function deleteNode(nodeId: string) {
    saveHistory();
    nodes = nodes.filter(n => n.id !== nodeId);
    edges = edges.filter(e => e.source !== nodeId && e.target !== nodeId);
  }

  // Undo last change
  function undo() {
    if (history.length > 0) {
      const previous = history.pop()!;
      nodes = previous.nodes;
      edges = previous.edges;
    }
  }

  // Save current state to history
  function saveHistory() {
    history = [...history, { nodes: [...nodes], edges: [...edges] }];
    // Keep only last 50 states
    if (history.length > 50) {
      history = history.slice(-50);
    }
  }

  // Snap all nodes to grid
  function snapAllNodesToGrid() {
    saveHistory();
    nodes = nodes.map(node => ({
      ...node,
      position: snapToGrid(node.position),
    }));
  }

  // Run workflow (simulate execution path)
  async function runWorkflow() {
    if (nodes.length === 0) return;
    
    // Find start node
    const startNode = nodes.find(n => n.data?.nodeType === 'start');
    if (!startNode) {
      alert('Please add a Start node to begin the workflow');
      return;
    }
    
    // Simulate execution path (in real implementation, this would come from backend)
    // For now, just highlight nodes in order
    executionPath = [startNode.id];
    
    // Simple BFS to find execution path
    const visited = new Set<string>();
    const queue = [startNode.id];
    visited.add(startNode.id);
    
    while (queue.length > 0) {
      const currentId = queue.shift()!;
      const outgoingEdges = edges.filter(e => e.source === currentId);
      
      for (const edge of outgoingEdges) {
        if (!visited.has(edge.target)) {
          visited.add(edge.target);
          queue.push(edge.target);
          executionPath.push(edge.target);
        }
      }
    }
    
    // Clear execution path after 3 seconds
    setTimeout(() => {
      executionPath = [];
    }, 3000);
  }

  // Initialize Start node (always present)
  function initializeStartNode() {
    // Check if start node already exists
    const hasStartNode = nodes.some(n => n.id === 'start' || n.data?.nodeType === 'start');
    if (!hasStartNode) {
      const startConnectionPoints = getDefaultConnectionPoints('start');
      const startNode: Node = {
        id: 'start', // Use fixed ID for start node
        type: 'start', // Keep 'start' type for SvelteFlow data-type attribute
        position: { x: 50, y: 200 }, // Left side of canvas
        data: {
          label: 'Start',
          nodeType: 'start', // Store nodeType in data for reference
          color: getNodeColor('start'),
          connectionPoints: startConnectionPoints, // Store connection points
        },
      };
      nodes = [startNode, ...nodes];
    }
  }

  // Load workflow on mount
  onMount(() => {
    // Add keyboard event listener
    window.addEventListener('keydown', handleKeyDown);
    
    // Initialize with Start node (always present)
    initializeStartNode();
    
    // Attach drop handlers to SvelteFlow pane element
    // Wait a bit for SvelteFlow to render
    const attachDropHandlers = () => {
      const pane = document.querySelector('.svelte-flow__pane') as HTMLElement;
      if (pane) {
        console.log('WorkflowCanvas: Attaching drop handlers to pane element');
        // Use capture phase to catch events before SvelteFlow handles them
        pane.addEventListener('drop', handleDrop, true);
        pane.addEventListener('dragover', handleDragOver, true);
        pane.addEventListener('dragenter', handleDragEnter, true);
        pane.addEventListener('dragleave', handleDragLeave, true);
        return true;
      }
      return false;
    };
    
    // Try immediately, then retry with delays
    if (!attachDropHandlers()) {
      setTimeout(() => {
        if (!attachDropHandlers()) {
          setTimeout(() => {
            attachDropHandlers();
          }, 1000);
        }
      }, 100);
    }
    
    // For Phase 2, start with empty canvas
    // Later: Load from API or create new workflow
  });

  onDestroy(() => {
    window.removeEventListener('keydown', handleKeyDown);
  });

  // Node types configuration - use CustomNode for all nodes
  const nodeTypes = {
    start: CustomNode,
    default: CustomNode,
  };

  // Edge types configuration
  const edgeTypes = {
    // Default edge type
    default: 'default',
  };

  // Handle node drop from palette
  function handleDrop(event: DragEvent) {
    // Prevent text selection drag-and-drop from triggering node drops
    if (!event.dataTransfer) {
      return;
    }
    
    // Check if this is a node drag by checking the dataTransfer types
    // Text drags will have 'text/plain' but NOT 'application/node-type'
    const types = Array.from(event.dataTransfer.types);
    if (!types.includes('application/node-type')) {
      // This is not a node drag (likely text selection), ignore it
      return;
    }
    
    event.preventDefault();
    event.stopPropagation();
    
    const nodeType = event.dataTransfer.getData('application/node-type');
    console.log('WorkflowCanvas: Dropped node type from dataTransfer:', nodeType);
    
    if (!nodeType) {
      console.warn('WorkflowCanvas: No node type found in dataTransfer');
      return;
    }

    // Get drop position - SvelteFlow Background provides position in flow coordinates
    // Check if event has position property (from SvelteFlow's Background component)
    let position: { x: number; y: number };
    
    if ((event as any).detail?.position) {
      // SvelteFlow Background provides position directly
      position = (event as any).detail.position;
      console.log('WorkflowCanvas: Using SvelteFlow Background position:', position);
    } else {
      // Manual coordinate conversion
      const svelteFlowPane = document.querySelector('.svelte-flow__pane') as HTMLElement;
      const svelteFlowViewport = document.querySelector('.svelte-flow__viewport') as HTMLElement;
      
      if (svelteFlowPane && svelteFlowViewport) {
        // Get pane's bounding rect
        const paneRect = svelteFlowPane.getBoundingClientRect();
        
        // Calculate position relative to pane
        const paneX = event.clientX - paneRect.left;
        const paneY = event.clientY - paneRect.top;
        
        // Get viewport transform to account for pan/zoom
        const viewportStyle = window.getComputedStyle(svelteFlowViewport);
        const transform = viewportStyle.transform;
        
        // Parse transform matrix: matrix(scaleX, skewY, skewX, scaleY, translateX, translateY)
        let scaleX = 1, scaleY = 1, translateX = 0, translateY = 0;
        
        if (transform && transform !== 'none') {
          const matrix = transform.match(/matrix\(([^)]+)\)/);
          if (matrix) {
            const values = matrix[1].split(',').map(v => parseFloat(v.trim()));
            if (values.length >= 6) {
              scaleX = values[0];
              scaleY = values[3];
              translateX = values[4];
              translateY = values[5];
            }
          }
        }
        
        // Convert pane coordinates to flow coordinates
        // SvelteFlow applies: flowPos = (panePos - translate) / scale
        const flowX = (paneX - translateX) / scaleX;
        const flowY = (paneY - translateY) / scaleY;
        
        position = {
          x: flowX,
          y: flowY,
        };
        
        console.log('WorkflowCanvas: Manual conversion - Pane pos:', { paneX, paneY });
        console.log('WorkflowCanvas: Transform:', { scaleX, scaleY, translateX, translateY });
        console.log('WorkflowCanvas: Calculated flow position:', position);
      } else {
        // Fallback: use event target
        const target = event.currentTarget as HTMLElement;
        const rect = target.getBoundingClientRect();
        position = {
          x: event.clientX - rect.left,
          y: event.clientY - rect.top,
        };
        console.log('WorkflowCanvas: Using fallback position:', position);
      }
    }

    // Snap to grid - adjust for node top-left corner (not center)
    // The position is where the cursor dropped, we want the node's top-left corner
    const nodeOffset = { x: NODE_WIDTH / 2, y: NODE_HEIGHT / 2 };
    const nodeTopLeft = {
      x: position.x - nodeOffset.x,
      y: position.y - nodeOffset.y,
    };
    const snappedPosition = snapToGrid(nodeTopLeft);
    console.log('WorkflowCanvas: Node top-left position:', nodeTopLeft);
    console.log('WorkflowCanvas: Snapped position:', snappedPosition);
    addNode(nodeType, snappedPosition);
  }

  // Handle pane drop (SvelteFlow's built-in drop handler)
  function handlePaneDrop(event: CustomEvent) {
    console.log('WorkflowCanvas: Pane drop event fired', event);
    const dragEvent = event.detail as DragEvent;
    
    if (!dragEvent || !dragEvent.dataTransfer) {
      console.warn('WorkflowCanvas: No dataTransfer in pane drop event');
      return;
    }
    
    const nodeType = dragEvent.dataTransfer.getData('application/node-type');
    console.log('WorkflowCanvas: Dropped node type:', nodeType);
    
    if (!nodeType) {
      console.warn('WorkflowCanvas: No node type in dataTransfer');
      return;
    }
    
    // Get position from event detail or calculate from dragEvent
    const position = (event.detail as any).position || {
      x: dragEvent.clientX,
      y: dragEvent.clientY,
    };
    
    console.log('WorkflowCanvas: Pane drop position:', position);
    
    addNode(nodeType, position);
  }

  function handleDragOver(event: DragEvent) {
    // Only allow drag-over if it's a node type, not text
    if (!event.dataTransfer) {
      return;
    }
    
    // Check if this is a node drag (we can't get data during dragover, but we can check types)
    const types = Array.from(event.dataTransfer.types);
    if (!types.includes('application/node-type')) {
      return; // Not a node drag, ignore
    }
    
    // CRITICAL: preventDefault() is required to allow drop
    event.preventDefault();
    event.stopPropagation();
    
    // Set dropEffect to show the correct cursor (copy, move, link, or none)
    event.dataTransfer.dropEffect = 'copy';
    
    // Return false as additional safeguard
    return false;
  }
  
  function handleDragEnter(event: DragEvent) {
    // Only allow drag-enter if it's a node type, not text
    if (!event.dataTransfer) {
      return;
    }
    
    // Check if this is a node drag
    const types = Array.from(event.dataTransfer.types);
    if (!types.includes('application/node-type')) {
      return; // Not a node drag, ignore
    }
    
    event.preventDefault();
    event.stopPropagation();
    console.log('WorkflowCanvas: Drag enter');
    
    // Set dropEffect to show the correct cursor
    if (event.dataTransfer) {
      event.dataTransfer.dropEffect = 'copy';
    }
    
    return false;
  }
  
  function handleDragLeave(event: DragEvent) {
    console.log('WorkflowCanvas: Drag leave');
    // Don't prevent default on dragleave, just log
  }

  // Handle node changes (from @xyflow/svelte)
  function onNodesChange(changes: any) {
    // Apply automatic grid snapping when nodes are moved
    let nodesUpdated = false;
    for (const change of changes) {
      if (change.type === 'position' && change.position) {
        const node = nodes.find(n => n.id === change.id);
        if (node) {
          // Snap to row-based grid
          const snappedPos = snapToGrid(change.position);
          
          // Check if this position would overlap with other nodes in the same row
          const targetRow = Math.round(snappedPos.y / ROW_HEIGHT);
          const nodesInRow = nodes.filter(n => {
            if (n.id === change.id) return false; // Exclude current node
            const nRow = Math.round(n.position.y / ROW_HEIGHT);
            return nRow === targetRow;
          });
          
          // If there's overlap, try to place it after the rightmost node in that row
          let finalX = snappedPos.x;
          if (nodesInRow.length > 0) {
            const rightmostX = Math.max(...nodesInRow.map(n => n.position.x + NODE_WIDTH));
            if (snappedPos.x <= rightmostX + 50) { // 50px minimum spacing
              finalX = Math.round((rightmostX + HORIZONTAL_SPACING) / GRID_SIZE) * GRID_SIZE;
            }
          }
          
          const finalPosition = {
            x: finalX,
            y: snappedPos.y,
          };
          
          // Only update if position actually changed (avoid infinite loops)
          if (node.position.x !== finalPosition.x || node.position.y !== finalPosition.y) {
            node.position = finalPosition;
            nodesUpdated = true;
          }
        }
      }
      if (change.type === 'select') {
        selectedNodeId = change.selected ? change.id : null;
      }
    }
    // Trigger reactivity if nodes were updated
    if (nodesUpdated) {
      nodes = [...nodes];
    }
  }

  // Handle edge changes (from @xyflow/svelte)
  function onEdgesChange(changes: any) {
    // Update edges when changed
    // @xyflow/svelte handles this internally
  }

  // Handle node connect (when edge is created)
  function onConnect(connection: any) {
    saveHistory();
    
    // Get source and target nodes to match edge color and validate connection types
    const sourceNode = nodes.find(n => n.id === connection.source);
    const targetNode = nodes.find(n => n.id === connection.target);
    
    // Validate connection types if both nodes have connection points defined
    if (sourceNode?.data?.connectionPoints && targetNode?.data?.connectionPoints) {
      const sourcePoint = sourceNode.data.connectionPoints.find(
        (p: ConnectionPoint) => p.id === connection.sourceHandle
      );
      const targetPoint = targetNode.data.connectionPoints.find(
        (p: ConnectionPoint) => p.id === connection.targetHandle
      );
      
      // Check if connection types are compatible
      if (sourcePoint && targetPoint) {
        const sourceType = sourcePoint.connectionType;
        const targetType = targetPoint.connectionType;
        
        // Allow connection if types match or either is 'any'
        if (sourceType !== 'any' && targetType !== 'any' && sourceType !== targetType) {
          console.warn(`Connection type mismatch: ${sourceType} -> ${targetType}`);
          return; // Don't create edge if types don't match
        }
      }
    }
    
    const edgeColor = sourceNode ? getNodeColor(sourceNode.data?.nodeType || sourceNode.type) : '#666';
    
    // Add new edge with bezier curve style (no arrows, color matches source)
    const newEdge: Edge = {
      id: `edge-${Date.now()}-${connection.source}-${connection.target}`,
      source: connection.source,
      target: connection.target,
      sourceHandle: connection.sourceHandle, // Store handle IDs for connection point tracking
      targetHandle: connection.targetHandle,
      type: 'smoothstep', // Bezier curve type
      style: {
        stroke: edgeColor,
        strokeWidth: 2,
      },
      // Store connection metadata for future editing
      data: {
        sourceHandle: connection.sourceHandle,
        targetHandle: connection.targetHandle,
      },
    };
    edges = [...edges, newEdge];
  }

  // Add node to canvas
  function addNode(type: string, position: { x: number; y: number }) {
    console.log('WorkflowCanvas: addNode called with type:', type, 'position:', position);
    
    // Don't allow adding another Start node if one exists
    if (type === 'start') {
      const hasStartNode = nodes.some(n => n.data?.nodeType === 'start');
      if (hasStartNode) {
        console.log('WorkflowCanvas: Start node already exists, skipping');
        return;
      }
    }
    
    saveHistory();
    
    // Ensure position is already snapped to grid (it should be from handleDrop)
    // But double-check and use findBestRow to avoid overlaps
    const snappedPos = snapToGrid(position);
    const finalPosition = findBestRow(snappedPos);
    
    // Ensure final position is also snapped (findBestRow should already do this, but be safe)
    const finalSnappedPosition = snapToGrid(finalPosition);
    
    // Get connection points for this node type
    const connectionPoints = getDefaultConnectionPoints(type);
    
    // Use UUID for node ID (as per discussion)
    const newNode: Node = {
      id: generateUUID(),
      type: 'default', // All nodes use default type (styling via CSS)
      position: finalSnappedPosition,
      data: { 
        label: type === 'start' ? 'Start' : type === 'results' ? 'Results' : type === 'output' ? 'Output' : type.replace('model-', '').replace(/-/g, ' '),
        nodeType: type, // Store original type in data for CSS styling
        color: getNodeColor(type),
        connectionPoints: connectionPoints, // Store connection points for validation and export
      },
    };
    console.log('WorkflowCanvas: Adding new node:', newNode);
    console.log('WorkflowCanvas: Final snapped position:', finalSnappedPosition);
    nodes = [...nodes, newNode];
    console.log('WorkflowCanvas: Total nodes after add:', nodes.length);
  }

  // Handle Alt+Drag for duplication
  function handleNodeDragStart(event: any, nodeId: string) {
    if (event.altKey) {
      const node = nodes.find(n => n.id === nodeId);
      if (node) {
        saveHistory();
        const newNode: Node = {
          id: generateUUID(),
          type: node.type,
          position: {
            x: node.position.x + GRID_SIZE * 2,
            y: node.position.y + GRID_SIZE * 2,
          },
          data: { ...node.data },
        };
        nodes = [...nodes, newNode];
      }
    }
  }

  // Save workflow
  async function saveWorkflow() {
    loading = true;
    error = null;
    
    try {
      // TODO: Implement workflow save to backend
      // POST /api/v1/workflows
      const workflow = {
        name: 'Untitled Workflow',
        graph_json: {
          nodes: nodes,
          edges: edges,
        },
      };
      
      const res = await fetch(`${API_BASE}/api/v1/workflows`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(workflow),
      });
      
      if (!res.ok) {
        throw new Error(`Failed to save workflow: ${res.statusText}`);
      }
      
      alert('Workflow saved successfully!');
    } catch (err: any) {
      error = err.message;
      alert(`Error: ${err.message}`);
    } finally {
      loading = false;
    }
  }

  // Load workflow
  async function loadWorkflow(workflowId: string) {
    loading = true;
    error = null;
    
    try {
      const res = await fetch(`${API_BASE}/api/v1/workflows/${workflowId}`);
      
      if (!res.ok) {
        throw new Error(`Failed to load workflow: ${res.statusText}`);
      }
      
      const data = await res.json();
      if (data.graph_json) {
        nodes = data.graph_json.nodes || [];
        edges = data.graph_json.edges || [];
      }
    } catch (err: any) {
      error = err.message;
      alert(`Error: ${err.message}`);
    } finally {
      loading = false;
    }
  }
</script>

  <div 
  style="width: 100%; height: 100%; position: relative; background: #0f0f12; display: flex; flex-direction: column;"
  ondrop={handleDrop}
  ondragover={handleDragOver}
  ondragenter={handleDragEnter}
>
  <!-- Canvas Menu Bar (Top) -->
  <div style="
    height: 50px;
    background: #1a1a1f;
    border-bottom: 1px solid #333;
    display: flex;
    align-items: center;
    padding: 0 15px;
    gap: 10px;
    flex-shrink: 0;
    z-index: 10;
  ">
    <button 
      onclick={saveWorkflow}
      disabled={loading}
      style="
        padding: 8px 16px;
        background: #007bff;
        color: white;
        border: none;
        border-radius: 4px;
        cursor: pointer;
        font-size: 14px;
        transition: background 0.2s;
      "
      onmouseenter={(e) => e.currentTarget.style.background = '#0056b3'}
      onmouseleave={(e) => e.currentTarget.style.background = '#007bff'}
    >
      {loading ? 'Saving...' : 'Save Workflow'}
    </button>
    
    <button 
      onclick={runWorkflow}
      style="
        padding: 8px 16px;
        background: #28a745;
        color: white;
        border: none;
        border-radius: 4px;
        cursor: pointer;
        font-size: 14px;
        transition: background 0.2s;
      "
      onmouseenter={(e) => e.currentTarget.style.background = '#218838'}
      onmouseleave={(e) => e.currentTarget.style.background = '#28a745'}
    >
      Run (Ctrl+Enter)
    </button>
    
    <div style="flex: 1;"></div>
    
    <button 
      onclick={() => showHelpModal = true}
      style="
        padding: 8px 16px;
        background: #6c757d;
        color: white;
        border: none;
        border-radius: 4px;
        cursor: pointer;
        font-size: 14px;
        transition: background 0.2s;
      "
      onmouseenter={(e) => e.currentTarget.style.background = '#5a6268'}
      onmouseleave={(e) => e.currentTarget.style.background = '#6c757d'}
    >
      Help & Shortcuts
    </button>
    
    {#if error}
      <div style="padding: 8px 16px; background: #dc3545; color: white; border-radius: 4px; font-size: 14px;">
        Error: {error}
      </div>
    {/if}
  </div>
  
  <!-- Canvas Area (flexible) -->
  <div style="flex: 1; position: relative; min-height: 0;" data-canvas-area>
    <!-- Zoom Control Panel (right side, above minimap) -->
    <div style="
      position: absolute;
      right: 10px;
      bottom: 200px;
      z-index: 100;
      display: flex;
      flex-direction: column;
      align-items: center;
      gap: 4px;
      padding: 6px;
      background: #1a1a1f;
      border: 1px solid #333;
      border-radius: 6px;
      box-shadow: 0 4px 12px rgba(0, 0, 0, 0.3);
      width: 40px;
    ">
      <!-- Zoom In Button -->
      <button
        onclick={zoomIn}
        disabled={zoomLevel >= 2}
        style="
          width: 28px;
          height: 28px;
          background: {zoomLevel >= 2 ? '#555' : '#25252a'};
          color: white;
          border: 1px solid {zoomLevel >= 2 ? '#666' : '#333'};
          border-radius: 4px;
          cursor: {zoomLevel >= 2 ? 'not-allowed' : 'pointer'};
          font-size: 16px;
          display: flex;
          align-items: center;
          justify-content: center;
          transition: all 0.2s;
        "
        onmouseenter={(e) => {
          if (zoomLevel < 2) {
            e.currentTarget.style.background = '#2a2a2f';
            e.currentTarget.style.borderColor = '#007bff';
          }
        }}
        onmouseleave={(e) => {
          if (zoomLevel < 2) {
            e.currentTarget.style.background = '#25252a';
            e.currentTarget.style.borderColor = '#333';
          }
        }}
        title="Zoom In"
      >
        +
      </button>

      <!-- Zoom Slider (between buttons) -->
      <div style="
        height: 80px;
        display: flex;
        align-items: center;
        justify-content: center;
        margin: 2px 0;
      ">
        <input
          type="range"
          min="0.1"
          max="2"
          step="0.01"
          value={zoomLevel}
          oninput={handleZoomSliderChange}
          class="zoom-slider-vertical"
          title="Zoom: {Math.round(zoomLevel * 100)}%"
        />
      </div>

      <!-- Zoom Out Button -->
      <button
        onclick={zoomOut}
        disabled={zoomLevel <= 0.1}
        style="
          width: 28px;
          height: 28px;
          background: {zoomLevel <= 0.1 ? '#555' : '#25252a'};
          color: white;
          border: 1px solid {zoomLevel <= 0.1 ? '#666' : '#333'};
          border-radius: 4px;
          cursor: {zoomLevel <= 0.1 ? 'not-allowed' : 'pointer'};
          font-size: 16px;
          display: flex;
          align-items: center;
          justify-content: center;
          transition: all 0.2s;
        "
        onmouseenter={(e) => {
          if (zoomLevel > 0.1) {
            e.currentTarget.style.background = '#2a2a2f';
            e.currentTarget.style.borderColor = '#007bff';
          }
        }}
        onmouseleave={(e) => {
          if (zoomLevel > 0.1) {
            e.currentTarget.style.background = '#25252a';
            e.currentTarget.style.borderColor = '#333';
          }
        }}
        title="Zoom Out"
      >
        −
      </button>

      <!-- Reset Zoom Button -->
      <button
        onclick={resetZoom}
        style="
          width: 28px;
          height: 28px;
          background: #25252a;
          color: white;
          border: 1px solid #333;
          border-radius: 4px;
          cursor: pointer;
          font-size: 12px;
          display: flex;
          align-items: center;
          justify-content: center;
          transition: all 0.2s;
          margin-top: 4px;
        "
        onmouseenter={(e) => {
          e.currentTarget.style.background = '#2a2a2f';
          e.currentTarget.style.borderColor = '#007bff';
        }}
        onmouseleave={(e) => {
          e.currentTarget.style.background = '#25252a';
          e.currentTarget.style.borderColor = '#333';
        }}
        title="Reset Zoom (Fit View)"
      >
        ⌂
      </button>
    </div>

    <!-- Svelte Flow Canvas -->
    <SvelteFlow
      bind:this={svelteFlowInstance}
      nodes={nodes.map(n => ({
        ...n,
        className: executionPath.includes(n.id) ? 'executing' : '',
        draggable: true,
      }))}
      {edges}
      on:nodeschange={onNodesChange}
      on:edgeschange={onEdgesChange}
      on:connect={onConnect}
      on:viewportchange={onViewportChange}
      {nodeTypes}
      {edgeTypes}
      nodesDraggable={true}
      nodesConnectable={true}
      snapToGrid={true}
      snapGrid={[GRID_SIZE, GRID_SIZE]}
      panOnDrag={[1, 2]}
      panOnScroll={true}
      zoomOnScroll={true}
      zoomOnPinch={true}
      minZoom={0.1}
      maxZoom={2}
      viewport={viewportProp}
      connectionMode="loose"
      connectionRadius={20}
      style="width: 100%; height: 100%;"
    >
      <Background 
        gap={GRID_SIZE} 
        size={1}
        ondrop={handleDrop}
        ondragover={handleDragOver}
        ondragenter={handleDragEnter}
        ondragleave={handleDragLeave}
      />
      <Controls />
      {#if showMinimap}
        <MiniMap 
          nodeColor="#007bff"
          maskColor="rgba(0, 0, 0, 0.6)"
        />
      {/if}
    </SvelteFlow>
    
    <!-- Fallback drop zone overlay (in case Background doesn't catch it) -->
    <div
      style="
        position: absolute;
        top: 0;
        left: 0;
        right: 0;
        bottom: 0;
        pointer-events: {executionPath.length === 0 ? 'auto' : 'none'};
        z-index: 1;
      "
      ondrop={(e) => {
        console.log('WorkflowCanvas: Fallback drop zone caught drop!');
        e.preventDefault();
        e.stopPropagation();
        handleDrop(e);
      }}
      ondragover={(e) => {
        // CRITICAL: preventDefault() is required to allow drop
        e.preventDefault();
        e.stopPropagation();
        // Set dropEffect directly to show correct cursor
        if (e.dataTransfer) {
          e.dataTransfer.dropEffect = 'copy';
        }
        return false;
      }}
      ondragenter={(e) => {
        console.log('WorkflowCanvas: Fallback drop zone drag enter');
        e.preventDefault();
        e.stopPropagation();
        // Set dropEffect to show correct cursor
        if (e.dataTransfer) {
          e.dataTransfer.dropEffect = 'copy';
        }
        return false;
      }}
    ></div>
  </div>
</div>

<!-- Help Modal (Keyboard Shortcuts & Node Documentation) -->
{#if showHelpModal}
  <div
    style="
      position: fixed;
      top: 0;
      left: 0;
      right: 0;
      bottom: 0;
      background: rgba(0, 0, 0, 0.7);
      z-index: 3000;
      display: flex;
      align-items: center;
      justify-content: center;
    "
    onclick={(e) => {
      if (e.target === e.currentTarget) {
        showHelpModal = false;
      }
    }}
  >
    <div
      style="
        width: 90%;
        max-width: 800px;
        max-height: 85vh;
        background: #1a1a1f;
        border: 1px solid #333;
        border-radius: 8px;
        display: flex;
        flex-direction: column;
        box-shadow: 0 4px 20px rgba(0, 0, 0, 0.5);
      "
      onclick={(e) => e.stopPropagation()}
    >
      <!-- Header -->
      <div style="padding: 15px; border-bottom: 1px solid #333; display: flex; justify-content: space-between; align-items: center; flex-shrink: 0;">
        <h2 style="margin: 0; color: white;">Help & Documentation</h2>
        <button
          onclick={() => showHelpModal = false}
          style="
            padding: 6px 12px;
            background: #25252a;
            color: white;
            border: 1px solid #333;
            border-radius: 4px;
            cursor: pointer;
            font-size: 14px;
          "
          onmouseenter={(e) => e.currentTarget.style.background = '#2a2a2f'}
          onmouseleave={(e) => e.currentTarget.style.background = '#25252a'}
        >
          Close
        </button>
      </div>

      <!-- Content -->
      <div style="flex: 1; overflow-y: auto; padding: 20px;">
        <!-- Keyboard Shortcuts Section -->
        <div style="margin-bottom: 30px;">
          <h3 style="color: white; margin-bottom: 15px; border-bottom: 1px solid #333; padding-bottom: 10px;">
            Keyboard Shortcuts
          </h3>
          <div style="display: grid; grid-template-columns: repeat(auto-fit, minmax(250px, 1fr)); gap: 15px;">
            <div style="background: #25252a; padding: 12px; border-radius: 4px; border: 1px solid #333;">
              <div style="color: #007bff; font-weight: bold; margin-bottom: 5px;">Delete</div>
              <div style="color: #ccc; font-size: 14px;">Remove selected node</div>
            </div>
            <div style="background: #25252a; padding: 12px; border-radius: 4px; border: 1px solid #333;">
              <div style="color: #007bff; font-weight: bold; margin-bottom: 5px;">Alt + Drag</div>
              <div style="color: #ccc; font-size: 14px;">Duplicate node</div>
            </div>
            <div style="background: #25252a; padding: 12px; border-radius: 4px; border: 1px solid #333;">
              <div style="color: #007bff; font-weight: bold; margin-bottom: 5px;">Ctrl + Z</div>
              <div style="color: #ccc; font-size: 14px;">Undo last change</div>
            </div>
            <div style="background: #25252a; padding: 12px; border-radius: 4px; border: 1px solid #333;">
              <div style="color: #007bff; font-weight: bold; margin-bottom: 5px;">Ctrl + L</div>
              <div style="color: #ccc; font-size: 14px;">Snap all nodes to grid</div>
            </div>
            <div style="background: #25252a; padding: 12px; border-radius: 4px; border: 1px solid #333;">
              <div style="color: #007bff; font-weight: bold; margin-bottom: 5px;">Ctrl + Enter</div>
              <div style="color: #ccc; font-size: 14px;">Run workflow</div>
            </div>
          </div>
        </div>

        <!-- Node Documentation Section -->
        <div>
          <h3 style="color: white; margin-bottom: 15px; border-bottom: 1px solid #333; padding-bottom: 10px;">
            Node Types & Documentation
          </h3>
          <div style="display: grid; grid-template-columns: repeat(auto-fit, minmax(300px, 1fr)); gap: 15px;">
            <!-- Start Node -->
            <div style="background: #25252a; padding: 15px; border-radius: 4px; border-left: 4px solid #ff8c00;">
              <div style="color: #ff8c00; font-weight: bold; margin-bottom: 8px; font-size: 16px;">Start</div>
              <div style="color: #ccc; font-size: 14px; margin-bottom: 10px;">
                Beginning of workflow. Empty, ready state. Every workflow starts from this node.
              </div>
              <div style="color: #888; font-size: 12px;">Category: Control</div>
            </div>

            <!-- Results Node -->
            <div style="background: #25252a; padding: 15px; border-radius: 4px; border-left: 4px solid #9b59b6;">
              <div style="color: #9b59b6; font-weight: bold; margin-bottom: 8px; font-size: 16px;">Results</div>
              <div style="color: #ccc; font-size: 14px; margin-bottom: 10px;">
                Inspect model output: view tokens, cost, JSON, and pretty print. Just a viewer - no actions taken.
              </div>
              <div style="color: #888; font-size: 12px;">Category: Utility</div>
            </div>

            <!-- Upload Node -->
            <div style="background: #25252a; padding: 15px; border-radius: 4px; border-left: 4px solid #2ecc71;">
              <div style="color: #2ecc71; font-weight: bold; margin-bottom: 8px; font-size: 16px;">Upload</div>
              <div style="color: #ccc; font-size: 14px; margin-bottom: 10px;">
                Upload files, images, or videos to the workflow.
              </div>
              <div style="color: #888; font-size: 12px;">Category: Data</div>
            </div>

            <!-- Model Nodes -->
            <div style="background: #25252a; padding: 15px; border-radius: 4px; border-left: 4px solid #3498db;">
              <div style="color: #3498db; font-weight: bold; margin-bottom: 8px; font-size: 16px;">Model Nodes</div>
              <div style="color: #ccc; font-size: 14px; margin-bottom: 10px;">
                AI model nodes from your model registry. Each model has its own settings and capabilities.
              </div>
              <div style="color: #888; font-size: 12px;">Category: Models</div>
            </div>

            <!-- Python Code Node -->
            <div style="background: #25252a; padding: 15px; border-radius: 4px; border-left: 4px solid #95a5a6;">
              <div style="color: #95a5a6; font-weight: bold; margin-bottom: 8px; font-size: 16px;">Python Code</div>
              <div style="color: #ccc; font-size: 14px; margin-bottom: 10px;">
                Execute Python code blocks. Sandboxed execution with input/output wiring.
              </div>
              <div style="color: #888; font-size: 12px;">Category: Transform</div>
            </div>

            <!-- Data Profile Node -->
            <div style="background: #25252a; padding: 15px; border-radius: 4px; border-left: 4px solid #95a5a6;">
              <div style="color: #95a5a6; font-weight: bold; margin-bottom: 8px; font-size: 16px;">Data Profile</div>
              <div style="color: #ccc; font-size: 14px; margin-bottom: 10px;">
                Statistical summary: rows, min/max, average, null count, data types.
              </div>
              <div style="color: #888; font-size: 12px;">Category: Analytics</div>
            </div>

            <!-- Loop Node -->
            <div style="background: #25252a; padding: 15px; border-radius: 4px; border-left: 4px solid #95a5a6;">
              <div style="color: #95a5a6; font-weight: bold; margin-bottom: 8px; font-size: 16px;">Loop</div>
              <div style="color: #ccc; font-size: 14px; margin-bottom: 10px;">
                For each item in array. Drop sub-nodes inside. Supports variable templating.
              </div>
              <div style="color: #888; font-size: 12px;">Category: Control</div>
            </div>

            <!-- Branch Node -->
            <div style="background: #25252a; padding: 15px; border-radius: 4px; border-left: 4px solid #95a5a6;">
              <div style="color: #95a5a6; font-weight: bold; margin-bottom: 8px; font-size: 16px;">Branch</div>
              <div style="color: #ccc; font-size: 14px; margin-bottom: 10px;">
                Conditional routing (if/else). Two outputs based on expression evaluation.
              </div>
              <div style="color: #888; font-size: 12px;">Category: Control</div>
            </div>
          </div>
        </div>

        <!-- Grid Snapping Info -->
        <div style="margin-top: 30px; padding: 15px; background: #25252a; border-radius: 4px; border: 1px solid #333;">
          <h4 style="color: white; margin-bottom: 10px;">Grid Snapping</h4>
          <div style="color: #ccc; font-size: 14px;">
            All nodes automatically snap to a 50-pixel grid when moved. This ensures clean alignment and makes workflows easier to read.
          </div>
        </div>
      </div>
    </div>
  </div>
{/if}

<style>
  :global(.svelte-flow) {
    background: #0f0f12;
  }
  
  :global(.svelte-flow__node) {
    background: #1a1a1f;
    color: white;
    border: 1px solid #333;
    border-radius: 8px;
    padding: 10px;
    width: 80px;
    height: 80px;
    display: flex;
    align-items: center;
    justify-content: center;
    text-align: center;
    font-size: 11px;
  }
  
  /* Node colors based on type (as per discussion) */
  :global(.svelte-flow__node[data-type="start"]) {
    background: #2ecc71; /* green */
    border-color: #2ecc71;
  }
  
  :global(.svelte-flow__node[data-type="results"]),
  :global(.svelte-flow__node[data-type="output"]) {
    background: #9b59b6; /* purple */
    border-color: #9b59b6;
  }
  
  :global(.svelte-flow__node[data-type^="model-"]) {
    background: #3498db; /* blue */
    border-color: #3498db;
  }
  
  :global(.svelte-flow__node[data-type="upload"]),
  :global(.svelte-flow__node[data-type="load_duckdb"]),
  :global(.svelte-flow__node[data-type="http_request"]) {
    background: #2ecc71; /* green */
    border-color: #2ecc71;
  }
  
  /* Execution path highlighting (green glow) */
  :global(.svelte-flow__node.executing) {
    box-shadow: 0 0 20px rgba(40, 167, 69, 0.8);
    border-color: #28a745;
  }
  
  :global(.svelte-flow__node:hover) {
    box-shadow: 0 0 10px rgba(0, 123, 255, 0.3);
    transform: scale(1.05);
    transition: transform 0.2s;
  }
  
  /* Bezier edges, no arrows, colors match source node */
  :global(.svelte-flow__edge) {
    stroke-width: 2;
  }
  
  :global(.svelte-flow__edge:hover) {
    stroke-width: 3;
  }
  
  /* Remove arrow markers (as per discussion - no direction, it's a train) */
  :global(.svelte-flow__edge path) {
    marker-end: none;
  }

  /* Zoom Slider Styling (vertical, compact size) */
  .zoom-slider-vertical {
    width: 28px;
    height: 80px;
    -webkit-appearance: slider-vertical;
    writing-mode: bt-lr;
    appearance: none;
    background: transparent;
    border-radius: 0;
    outline: none;
    cursor: pointer;
    margin: 0;
  }

  .zoom-slider-vertical::-webkit-slider-thumb {
    -webkit-appearance: none;
    appearance: none;
    width: 10px;
    height: 10px;
    background: #007bff;
    border: 2px solid white;
    border-radius: 50%;
    cursor: pointer;
    box-shadow: 0 2px 4px rgba(0, 0, 0, 0.3);
    margin-left: -5px;
  }

  .zoom-slider-vertical::-moz-range-thumb {
    width: 10px;
    height: 10px;
    background: #007bff;
    border: 2px solid white;
    border-radius: 50%;
    cursor: pointer;
    box-shadow: 0 2px 4px rgba(0, 0, 0, 0.3);
  }

  .zoom-slider-vertical::-webkit-slider-runnable-track {
    width: 28px;
    height: 4px;
    background: rgba(255, 255, 255, 0.2);
    border-radius: 2px;
  }

  .zoom-slider-vertical::-moz-range-track {
    width: 28px;
    height: 4px;
    background: rgba(255, 255, 255, 0.2);
    border-radius: 2px;
  }

  .zoom-slider-vertical:hover::-webkit-slider-thumb {
    background: #0056b3;
    transform: scale(1.1);
  }

  .zoom-slider-vertical:hover::-moz-range-thumb {
    background: #0056b3;
    transform: scale(1.1);
  }
</style>
