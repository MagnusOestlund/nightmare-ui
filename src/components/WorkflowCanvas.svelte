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
  
  // Execution state
  let isExecuting = $state(false);
  let executionRunId: string | null = $state(null);
  let nodeExecutionStatus: Map<string, 'pending' | 'running' | 'completed' | 'failed'> = $state(new Map());
  let executionTrace: Array<{
    timestamp: string;
    nodeId: string;
    status: string;
    tokens?: number;
    latency?: number;
    error?: string;
  }> = $state([]);
  let showExecutionTrace = $state(false);
  
  // Node dragging state
  let draggedNodeId: string | null = $state(null);
  let hoveredEdgeId: string | null = $state(null);
  let invalidConnectionSource: string | null = $state(null); // Track invalid connection attempts

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
          viewportProp = { x: 0, y: 0, zoom: 1 }; // Update viewportProp to sync with SvelteFlow
        } else {
          // Last resort: update viewport state directly
          zoomLevel = 1;
          viewport = { x: 0, y: 0, zoom: 1 };
          viewportProp = { x: 0, y: 0, zoom: 1 }; // Update viewportProp to sync with SvelteFlow
        }
      } catch (e) {
        console.warn('WorkflowCanvas: Error resetting zoom:', e);
        // Fallback: update viewport state
        zoomLevel = 1;
        viewport = { x: 0, y: 0, zoom: 1 };
        viewportProp = { x: 0, y: 0, zoom: 1 }; // Update viewportProp to sync with SvelteFlow
      }
    } else {
      // If no instance, just update state
      zoomLevel = 1;
      viewport = { x: 0, y: 0, zoom: 1 };
      viewportProp = { x: 0, y: 0, zoom: 1 };
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

  // Convert nodes and edges to workflow definition format
  function convertToWorkflowDefinition(): any {
    // Build node map for quick lookup
    const nodeMap = new Map(nodes.map(n => [n.id, n]));
    
    // Convert nodes to workflow steps
    const steps: any[] = [];
    const nodeIdToStepIndex = new Map<string, number>();
    
    // Find start node
    const startNode = nodes.find(n => n.data?.nodeType === 'start');
    if (!startNode) {
      throw new Error('No Start node found');
    }
    
    // Build execution order using BFS from start node
    const executionOrder: string[] = [];
    const visited = new Set<string>();
    const queue = [startNode.id];
    visited.add(startNode.id);
    
    while (queue.length > 0) {
      const currentId = queue.shift()!;
      executionOrder.push(currentId);
      
      const outgoingEdges = edges.filter(e => e.source === currentId);
      for (const edge of outgoingEdges) {
        if (!visited.has(edge.target)) {
          visited.add(edge.target);
          queue.push(edge.target);
        }
      }
    }
    
    // Convert each node to a step
    for (const nodeId of executionOrder) {
      const node = nodeMap.get(nodeId);
      if (!node) continue;
      
      const stepIndex = steps.length;
      nodeIdToStepIndex.set(nodeId, stepIndex);
      
      // Get inputs from incoming edges
      const inputs: any = {};
      const incomingEdges = edges.filter(e => e.target === nodeId);
      for (const edge of incomingEdges) {
        const sourceNode = nodeMap.get(edge.source);
        if (sourceNode) {
          // Use node output as input (simplified - in real implementation, map specific outputs)
          inputs[`from_${edge.source}`] = {
            node_id: edge.source,
            output_key: 'payload', // Default output key
          };
        }
      }
      
      // Build step based on node type
      const nodeType = node.data?.nodeType || node.type;
      let step: any = {
        type: nodeType,
        name: node.data?.label || nodeId,
        node_id: nodeId,
        inputs: inputs,
      };
      
      // Add node-specific configuration
      if (node.data?.config) {
        step.params = node.data.config;
      }
      
      steps.push(step);
    }
    
    return {
      id: `workflow-${Date.now()}`,
      name: 'Canvas Workflow',
      steps: steps,
      graph: {
        nodes: nodes.map(n => ({
          id: n.id,
          type: n.data?.nodeType || n.type,
          position: n.position,
          data: n.data,
        })),
        edges: edges.map(e => ({
          id: e.id,
          source: e.source,
          target: e.target,
          sourceHandle: e.sourceHandle,
          targetHandle: e.targetHandle,
        })),
      },
    };
  }

  // Run workflow (execute via API)
  async function runWorkflow() {
    if (nodes.length === 0) {
      alert('Please add nodes to the workflow');
      return;
    }
    
    // Find start node
    const startNode = nodes.find(n => n.data?.nodeType === 'start');
    if (!startNode) {
      alert('Please add a Start node to begin the workflow');
      return;
    }
    
    if (isExecuting) {
      alert('Workflow is already executing. Please wait for it to complete.');
      return;
    }
    
    isExecuting = true;
    error = null;
    executionTrace = [];
    nodeExecutionStatus.clear();
    
    // Initialize all nodes as pending
    for (const node of nodes) {
      nodeExecutionStatus.set(node.id, 'pending');
    }
    
    try {
      // Convert workflow to definition format
      const workflowDef = convertToWorkflowDefinition();
      
      // Call API endpoint (try /api/v1/run first, fallback to /api/v1/workflows/run)
      const requestBody = {
        workflow_id: workflowDef.id,
        inputs: {}, // Initial inputs (can be extended later)
        options: {
          sync: false, // Use async mode for better UX
          retry: 2,
          cache: true,
        },
      };
      
      let response: Response;
      let runId: string;
      
      // Try /api/v1/run (Flow Specification endpoint)
      try {
        response = await fetch(`${API_BASE}/api/v1/run`, {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
          },
          body: JSON.stringify({
            ...requestBody,
            steps: workflowDef.steps, // Include inline workflow definition
          }),
        });
        
        if (response.ok || response.status === 202) {
          const data = await response.json();
          runId = data.run_id || data.item_id || `run-${Date.now()}`;
          executionRunId = runId;
          
          // If async, start polling
          if (response.status === 202 || data.status === 'running') {
            pollExecutionStatus(runId);
          } else if (data.status === 'completed') {
            // Sync execution completed immediately
            handleExecutionComplete(data.result);
          }
        } else {
          throw new Error(`API returned ${response.status}: ${response.statusText}`);
        }
      } catch (apiError: any) {
        // Fallback to /api/v1/workflows/run (existing endpoint)
        console.warn('Failed to use /api/v1/run, trying /api/v1/workflows/run:', apiError);
        
        response = await fetch(`${API_BASE}/api/v1/workflows/run`, {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
          },
          body: JSON.stringify({
            workflow_id: workflowDef.id,
            workflow_name: workflowDef.name,
            steps: workflowDef.steps,
            context: requestBody.inputs,
          }),
        });
        
        if (!response.ok) {
          throw new Error(`Failed to start workflow: ${response.statusText}`);
        }
        
        const data = await response.json();
        runId = data.item_id || `run-${Date.now()}`;
        executionRunId = runId;
        
        // Poll for status
        pollJobStatus(runId);
      }
      
      showExecutionTrace = true;
    } catch (err: any) {
      error = err.message;
      isExecuting = false;
      alert(`Error starting workflow: ${err.message}`);
    }
  }

  // Poll execution status (for /api/v1/run endpoint)
  async function pollExecutionStatus(runId: string) {
    const maxAttempts = 300; // 5 minutes max (1 second intervals)
    let attempts = 0;
    
    const poll = async () => {
      if (attempts >= maxAttempts) {
        error = 'Execution timeout - workflow took too long';
        isExecuting = false;
        return;
      }
      
      try {
        const response = await fetch(`${API_BASE}/api/v1/results/${runId}`);
        
        if (response.status === 202) {
          // Still running, continue polling
          attempts++;
          setTimeout(poll, 1000); // Poll every second
          return;
        }
        
        if (response.ok) {
          const data = await response.json();
          if (data.status === 'completed') {
            handleExecutionComplete(data.result);
          } else if (data.status === 'failed') {
            handleExecutionFailed(data.error || 'Workflow execution failed');
          } else {
            // Update node statuses from trace
            updateNodeStatusesFromTrace(data.trace || []);
            attempts++;
            setTimeout(poll, 1000);
          }
        } else {
          throw new Error(`Failed to get execution status: ${response.statusText}`);
        }
      } catch (err: any) {
        error = err.message;
        isExecuting = false;
        console.error('Error polling execution status:', err);
      }
    };
    
    poll();
  }

  // Poll job status (for /api/v1/jobs/{id} endpoint - fallback)
  async function pollJobStatus(jobId: string) {
    const maxAttempts = 300;
    let attempts = 0;
    
    const poll = async () => {
      if (attempts >= maxAttempts) {
        error = 'Execution timeout';
        isExecuting = false;
        return;
      }
      
      try {
        const response = await fetch(`${API_BASE}/api/v1/jobs/${jobId}`);
        
        if (!response.ok) {
          throw new Error(`Failed to get job status: ${response.statusText}`);
        }
        
        const data = await response.json();
        
        if (data.status === 'SUCCESS') {
          // Get result
          const resultResponse = await fetch(`${API_BASE}/api/v1/jobs/${jobId}/result`);
          if (resultResponse.ok) {
            const result = await resultResponse.json();
            handleExecutionComplete(result);
          }
        } else if (data.status === 'FAILURE') {
          handleExecutionFailed(data.error || 'Workflow execution failed');
        } else {
          // Still running (PENDING, STARTED)
          attempts++;
          setTimeout(poll, 1000);
        }
      } catch (err: any) {
        error = err.message;
        isExecuting = false;
        console.error('Error polling job status:', err);
      }
    };
    
    poll();
  }

  // Update node statuses from execution trace
  function updateNodeStatusesFromTrace(trace: any[]) {
    for (const entry of trace) {
      if (entry.node_id) {
        nodeExecutionStatus.set(entry.node_id, entry.status || 'running');
        executionTrace.push({
          timestamp: entry.timestamp || new Date().toISOString(),
          nodeId: entry.node_id,
          status: entry.status || 'running',
          tokens: entry.tokens_used,
          latency: entry.latency_ms,
        });
      }
    }
  }

  // Handle execution completion
  function handleExecutionComplete(result: any) {
    isExecuting = false;
    
    // Mark all nodes as completed
    for (const nodeId of nodeExecutionStatus.keys()) {
      nodeExecutionStatus.set(nodeId, 'completed');
    }
    
    // Add final trace entry
    executionTrace.push({
      timestamp: new Date().toISOString(),
      nodeId: 'workflow',
      status: 'completed',
    });
    
    console.log('Workflow execution completed:', result);
    
    // Clear execution status after 5 seconds
    setTimeout(() => {
      nodeExecutionStatus.clear();
      executionPath = [];
    }, 5000);
  }

  // Handle execution failure
  function handleExecutionFailed(errorMessage: string) {
    isExecuting = false;
    error = errorMessage;
    
    // Mark nodes as failed (find the failed node if possible)
    // For now, mark all as failed
    for (const nodeId of nodeExecutionStatus.keys()) {
      const currentStatus = nodeExecutionStatus.get(nodeId);
      if (currentStatus === 'running') {
        nodeExecutionStatus.set(nodeId, 'failed');
      }
    }
    
    executionTrace.push({
      timestamp: new Date().toISOString(),
      nodeId: 'workflow',
      status: 'failed',
      error: errorMessage,
    });
    
    alert(`Workflow execution failed: ${errorMessage}`);
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

  // Edge types configuration - use straight edges for vertical connections
  // Vertical flow: connections go straight down (Top to Bottom)
  const edgeTypes = {
    default: {
      type: 'straight', // Straight vertical connections
    },
    straight: {
      type: 'straight', // Straight vertical connections
    },
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
    saveHistory();
    
    // Apply changes to nodes array
    let nodesUpdated = false;
    let newNodes = [...nodes];
    
    for (const change of changes) {
      if (change.type === 'position' && change.position) {
        const nodeIndex = newNodes.findIndex(n => n.id === change.id);
        if (nodeIndex !== -1) {
          // Snap to grid when dragging ends (not during drag for smooth movement)
          // Only snap if the drag has ended (SvelteFlow sends 'position' during drag and on end)
          const snappedPos = snapToGrid(change.position);
          
          // Update node position
          newNodes[nodeIndex] = {
            ...newNodes[nodeIndex],
            position: snappedPos,
          };
          nodesUpdated = true;
        }
      } else if (change.type === 'select') {
        selectedNodeId = change.selected ? change.id : null;
      } else if (change.type === 'remove') {
        newNodes = newNodes.filter(n => n.id !== change.id);
        nodesUpdated = true;
      } else if (change.type === 'add') {
        // New node added (shouldn't happen often, but handle it)
        if (change.item) {
          newNodes.push(change.item);
          nodesUpdated = true;
        }
      }
    }
    
    // Update nodes state if changed
    if (nodesUpdated) {
      nodes = newNodes;
    }
  }

  // Handle edge changes (from @xyflow/svelte)
  function onEdgesChange(changes: any) {
    saveHistory();
    
    // Apply changes to edges array
    // SvelteFlow provides changes like: { type: 'add', item: {...} } or { type: 'remove', id: '...' }
    let edgesUpdated = false;
    let newEdges = [...edges];
    
    for (const change of changes) {
      if (change.type === 'add') {
        // New edge added - apply styling
        const edge = change.item;
        const sourceNode = nodes.find(n => n.id === edge.source);
        const edgeColor = sourceNode ? getNodeColor(sourceNode.data?.nodeType || sourceNode.type) : '#666';
        
        // Create styled edge with dynamic style
        const tempEdge: Edge = {
          id: edge.id,
          source: edge.source,
          target: edge.target,
          sourceHandle: edge.sourceHandle,
          targetHandle: edge.targetHandle,
          type: 'straight',
          style: {},
          data: {},
        };
        const styledEdge: Edge = {
          ...tempEdge,
          type: 'straight', // Vertical connection (down) - straight line
          style: getEdgeStyle(tempEdge), // Use dynamic style (gray/dotted during drag)
          data: {
            sourceHandle: edge.sourceHandle,
            targetHandle: edge.targetHandle,
          },
        };
        
        // Add to edges array if not already present
        if (!newEdges.find(e => e.id === styledEdge.id)) {
          newEdges.push(styledEdge);
          edgesUpdated = true;
          console.log('WorkflowCanvas: Edge added via onEdgesChange', styledEdge);
        }
      } else if (change.type === 'remove') {
        // Edge removed
        newEdges = newEdges.filter(e => e.id !== change.id);
        edgesUpdated = true;
        console.log('WorkflowCanvas: Edge removed', change.id);
      } else if (change.type === 'select') {
        // Edge selection changed (optional)
      } else if (change.type === 'reset') {
        // All edges reset
        newEdges = changes.map((c: any) => c.item).filter(Boolean);
        edgesUpdated = true;
      }
    }
    
    // Update edges state if changed
    if (edgesUpdated) {
      edges = newEdges;
    }
  }
  
  // Get edge style based on state (gray/dotted during drag, normal otherwise)
  function getEdgeStyle(edge: Edge): any {
    const sourceNode = nodes.find(n => n.id === edge.source);
    const edgeColor = sourceNode ? getNodeColor(sourceNode.data?.nodeType || sourceNode.type) : '#666';
    
    // If source node is being dragged, make edge gray and dotted
    if (draggedNodeId === edge.source) {
      return {
        stroke: '#888',
        strokeWidth: 2,
        strokeDasharray: '5,5', // Dotted line
        opacity: 0.6,
      };
    }
    
    // Normal style
    return {
      stroke: edgeColor,
      strokeWidth: 2,
      opacity: 1,
    };
  }
  
  // Check if node has lost input (downstream warning)
  function hasLostInput(nodeId: string): boolean {
    const node = nodes.find(n => n.id === nodeId);
    if (!node) return false;
    
    // Check if node has input connection points
    const hasInputs = node.data?.connectionPoints?.some((p: ConnectionPoint) => p.type === 'input');
    if (!hasInputs) return false;
    
    // Check if any edges connect to this node
    const hasIncomingEdges = edges.some(e => e.target === nodeId);
    
    // If node expects inputs but has none, it's lost (unless it's a start node)
    return hasInputs && !hasIncomingEdges && node.data?.nodeType !== 'start';
  }
  
  // Get midpoint of edge for X button positioning
  function getEdgeMidPoint(edge: Edge): { x: number; y: number } {
    const sourceNode = nodes.find(n => n.id === edge.source);
    const targetNode = nodes.find(n => n.id === edge.target);
    
    if (!sourceNode || !targetNode) {
      return { x: 0, y: 0 };
    }
    
    // Calculate midpoint between source and target nodes
    const sourceX = sourceNode.position.x + NODE_WIDTH;
    const sourceY = sourceNode.position.y + NODE_HEIGHT / 2;
    const targetX = targetNode.position.x;
    const targetY = targetNode.position.y + NODE_HEIGHT / 2;
    
    return {
      x: (sourceX + targetX) / 2,
      y: (sourceY + targetY) / 2,
    };
  }

  // Handle node connect (when edge is created)
  function onConnect(connection: any) {
    console.log('WorkflowCanvas: onConnect called', connection);
    saveHistory();
    
    // Get source and target nodes to validate
    const sourceNode = nodes.find(n => n.id === connection.source);
    const targetNode = nodes.find(n => n.id === connection.target);
    
    if (!sourceNode || !targetNode) {
      console.warn('WorkflowCanvas: Source or target node not found');
      invalidConnectionSource = null;
      return; // Prevent connection by not returning connection object
    }
    
    // Validate vertical connection (target must be below source) - Connections only vertical (down) by default
    // Source handle should be Bottom (output), target handle should be Top (input)
    const sourceY = sourceNode.position.y;
    const targetY = targetNode.position.y;
    if (targetY <= sourceY) {
      console.warn('WorkflowCanvas: Connection must be vertical (down) - target must be below source');
      invalidConnectionSource = connection.source;
      setTimeout(() => { invalidConnectionSource = null; }, 1000); // Clear after 1 second
      return; // Prevent connection - no glow if invalid
    }
    
    // Validate handle positions match vertical flow (source: Bottom, target: Top)
    const sourcePoint = sourceNode?.data?.connectionPoints?.find(
      (p: ConnectionPoint) => p.id === connection.sourceHandle
    );
    const targetPoint = targetNode?.data?.connectionPoints?.find(
      (p: ConnectionPoint) => p.id === connection.targetHandle
    );
    
    if (sourcePoint && sourcePoint.position !== Position.Bottom) {
      console.warn('WorkflowCanvas: Source handle must be at Bottom for vertical flow');
      invalidConnectionSource = connection.source;
      setTimeout(() => { invalidConnectionSource = null; }, 1000);
      return;
    }
    
    if (targetPoint && targetPoint.position !== Position.Top) {
      console.warn('WorkflowCanvas: Target handle must be at Top for vertical flow');
      invalidConnectionSource = connection.source;
      setTimeout(() => { invalidConnectionSource = null; }, 1000);
      return;
    }
    
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
          invalidConnectionSource = connection.source;
          setTimeout(() => { invalidConnectionSource = null; }, 1000);
          return; // Prevent invalid connection - no glow
        }
      }
    }
    
    // Clear invalid connection state
    invalidConnectionSource = null;
    
    // Create edge immediately with proper styling (vertical connection)
    const edgeColor = getNodeColor(sourceNode.data?.nodeType || sourceNode.type);
    
    const newEdge: Edge = {
      id: `edge-${connection.source}-${connection.target}-${Date.now()}`,
      source: connection.source,
      target: connection.target,
      sourceHandle: connection.sourceHandle,
      targetHandle: connection.targetHandle,
      type: 'straight', // Vertical connection (down) - straight line
      style: {
        stroke: edgeColor,
        strokeWidth: 2,
      },
      data: {
        sourceHandle: connection.sourceHandle,
        targetHandle: connection.targetHandle,
      },
    };
    
    // Add edge to array
    edges = [...edges, newEdge];
    console.log('WorkflowCanvas: Edge created', newEdge);
    
    // Return connection to allow SvelteFlow to also track it
    return connection;
  }
  
  // Handle node drag start
  function onNodeDragStart(event: any) {
    const nodeId = event.node?.id;
    if (nodeId) {
      draggedNodeId = nodeId;
      console.log('WorkflowCanvas: Node drag started', nodeId);
    }
  }
  
  // Handle node drag
  function onNodeDrag(event: any) {
    // Update node position during drag (handled by onNodesChange)
    // Wires will be updated to gray/dotted state via getEdgeStyle
  }
  
  // Handle node drag stop
  function onNodeDragStop(event: any) {
    const nodeId = event.node?.id;
    if (nodeId) {
      const droppedNode = event.node;
      
      // Check if node was dropped on another node (prevent merge/replace - keep it Lego)
      const overlappingNode = nodes.find(n => {
        if (n.id === droppedNode.id) return false;
        const distance = Math.sqrt(
          Math.pow(n.position.x - droppedNode.position.x, 2) +
          Math.pow(n.position.y - droppedNode.position.y, 2)
        );
        return distance < NODE_WIDTH; // If nodes are too close, prevent drop
      });
      
      if (overlappingNode) {
        // Prevent drop on another node - snap away
        const snappedPos = snapToGrid(droppedNode.position);
        const safePosition = findBestRow(snappedPos);
        
        const nodeIndex = nodes.findIndex(n => n.id === nodeId);
        if (nodeIndex !== -1) {
          nodes[nodeIndex] = {
            ...nodes[nodeIndex],
            position: safePosition,
          };
          nodes = [...nodes];
        }
        
        alert('Cannot drop node on another node. Node repositioned.');
      }
      
      draggedNodeId = null;
      console.log('WorkflowCanvas: Node drag stopped', nodeId);
      // Wires will auto-reroute (edges will be updated by onEdgesChange)
    }
  }
  
  // Delete edge on hover (X button)
  function deleteEdge(edgeId: string) {
    saveHistory();
    edges = edges.filter(e => e.id !== edgeId);
    hoveredEdgeId = null;
    console.log('WorkflowCanvas: Edge deleted', edgeId);
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
    
    // Use findBestRow to find the best position (avoids overlaps, places after existing nodes)
    const finalPosition = findBestRow(position);
    
    // Get connection points for this node type
    const connectionPoints = getDefaultConnectionPoints(type);
    
    // Use UUID for node ID (as per discussion)
    const newNode: Node = {
      id: generateUUID(),
      type: 'default', // All nodes use default type (styling via CSS)
      position: finalPosition, // findBestRow already snaps to grid
      data: { 
        label: type === 'start' ? 'Start' : type === 'results' ? 'Results' : type === 'output' ? 'Output' : type.replace('model-', '').replace(/-/g, ' '),
        nodeType: type, // Store original type in data for CSS styling
        color: getNodeColor(type),
        connectionPoints: connectionPoints, // Store connection points for validation and export
      },
    };
    console.log('WorkflowCanvas: Adding new node:', newNode);
    console.log('WorkflowCanvas: Final position:', finalPosition);
    console.log('WorkflowCanvas: Existing nodes:', nodes.map(n => ({ id: n.id, pos: n.position })));
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
      disabled={isExecuting}
      style="
        padding: 8px 16px;
        background: {isExecuting ? '#6c757d' : '#28a745'};
        color: white;
        border: none;
        border-radius: 4px;
        cursor: {isExecuting ? 'not-allowed' : 'pointer'};
        font-size: 14px;
        transition: background 0.2s;
      "
      onmouseenter={(e) => { if (!isExecuting) e.currentTarget.style.background = '#218838'; }}
      onmouseleave={(e) => { if (!isExecuting) e.currentTarget.style.background = '#28a745'; }}
    >
      {isExecuting ? 'Running...' : 'Run (Ctrl+Enter)'}
    </button>
    
    {#if isExecuting && executionRunId}
      <div style="padding: 8px 16px; background: #17a2b8; color: white; border-radius: 4px; font-size: 14px;">
        Run ID: {executionRunId}
      </div>
    {/if}
    
    <button 
      onclick={() => showExecutionTrace = !showExecutionTrace}
      style="
        padding: 8px 16px;
        background: #6c757d;
        color: white;
        border: none;
        border-radius: 4px;
        cursor: pointer;
        font-size: 14px;
      "
    >
      {showExecutionTrace ? 'Hide' : 'Show'} Trace
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
        width: 28px;
        height: 80px;
        display: flex;
        align-items: center;
        justify-content: center;
        margin: 2px 0;
        position: relative;
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
        className: [
          executionPath.includes(n.id) ? 'executing' : '',
          hasLostInput(n.id) ? 'lost-input' : '',
          invalidConnectionSource === n.id ? 'invalid-connection' : '',
        ].filter(Boolean).join(' '),
        draggable: true,
        data: {
          ...n.data,
          executionStatus: nodeExecutionStatus.get(n.id) || 'pending',
          hasLostInput: hasLostInput(n.id),
        },
      }))}
      edges={edges.map(e => ({
        ...e,
        // Ensure edge has required properties with dynamic styling
        id: e.id,
        source: e.source,
        target: e.target,
        sourceHandle: e.sourceHandle,
        targetHandle: e.targetHandle,
        type: e.type || 'straight',
        style: getEdgeStyle(e), // Dynamic style (gray/dotted during drag)
        data: e.data || {},
        className: hoveredEdgeId === e.id ? 'edge-hover' : '',
      }))}
      on:nodeschange={onNodesChange}
      on:edgeschange={onEdgesChange}
      on:connect={onConnect}
      on:nodedragstart={onNodeDragStart}
      on:nodedrag={onNodeDrag}
      on:nodedragstop={onNodeDragStop}
      on:viewportchange={onViewportChange}
      on:edgeenter={(event: any) => {
        if (draggedNodeId === event.edge.source) {
          hoveredEdgeId = event.edge.id;
        }
      }}
      on:edgeleave={() => {
        hoveredEdgeId = null;
      }}
      {nodeTypes}
      {edgeTypes}
      nodesDraggable={true}
      nodesConnectable={true}
      edgesUpdatable={true}
      edgesFocusable={true}
      snapToGrid={true}
      snapGrid={[GRID_SIZE, GRID_SIZE]}
      panOnDrag={[2]}
      panOnScroll={true}
      zoomOnScroll={true}
      zoomOnPinch={true}
      minZoom={0.1}
      maxZoom={2}
      viewport={viewportProp}
      connectionMode="loose"
      connectionRadius={30}
      connectionLineStyle={{ strokeWidth: 2 }}
      selectNodesOnDrag={false}
      elementsSelectable={true}
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
    
    <!-- Edge Delete Button (X) on Hover (only when dragging source node) -->
    {#each edges as edge}
      {#if hoveredEdgeId === edge.id && draggedNodeId === edge.source}
        {@const midPoint = getEdgeMidPoint(edge)}
        <div
          style="
            position: absolute;
            left: {midPoint.x}px;
            top: {midPoint.y}px;
            transform: translate(-50%, -50%);
            z-index: 10000;
            background: #dc3545;
            color: white;
            width: 24px;
            height: 24px;
            border-radius: 50%;
            display: flex;
            align-items: center;
            justify-content: center;
            cursor: pointer;
            font-size: 16px;
            font-weight: bold;
            box-shadow: 0 2px 8px rgba(0, 0, 0, 0.5);
            border: 2px solid white;
            transition: transform 0.2s;
          "
          onclick={() => deleteEdge(edge.id)}
          onmouseenter={(e) => e.currentTarget.style.transform = 'translate(-50%, -50%) scale(1.2)'}
          onmouseleave={(e) => e.currentTarget.style.transform = 'translate(-50%, -50%) scale(1)'}
          title="Delete connection"
        >
          ×
        </div>
      {/if}
    {/each}
    
    <!-- Tooltip for nodes with lost input -->
    {#each nodes as node}
      {#if hasLostInput(node.id)}
        {@const flowX = node.position.x + NODE_WIDTH / 2}
        {@const flowY = node.position.y - 30}
        {@const scaledFontSize = Math.max(10, 12 * viewport.zoom)}
        {@const scaledPadding = `${6 * viewport.zoom}px ${12 * viewport.zoom}px`}
        <div
          style="
            position: absolute;
            left: 0;
            top: 0;
            transform: translate({flowX * viewport.zoom + viewport.x}px, {flowY * viewport.zoom + viewport.y}px) translateX(-50%);
            transform-origin: 0 0;
            z-index: 10000;
            background: #ff9800;
            color: white;
            padding: {scaledPadding};
            border-radius: {4 * viewport.zoom}px;
            font-size: {scaledFontSize}px;
            white-space: nowrap;
            box-shadow: 0 {2 * viewport.zoom}px {8 * viewport.zoom}px rgba(0, 0, 0, 0.3);
            pointer-events: none;
          "
        >
          Input lost. Reconnect or delete branch.
        </div>
      {/if}
    {/each}
    
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
    
    <!-- Execution Trace Panel -->
    {#if showExecutionTrace}
      <div style="
        position: absolute;
        bottom: 10px;
        left: 10px;
        width: 400px;
        max-height: 300px;
        background: #1a1a1f;
        border: 1px solid #333;
        border-radius: 6px;
        padding: 15px;
        z-index: 1000;
        overflow-y: auto;
        box-shadow: 0 4px 12px rgba(0, 0, 0, 0.5);
      ">
        <div style="
          display: flex;
          justify-content: space-between;
          align-items: center;
          margin-bottom: 10px;
          padding-bottom: 10px;
          border-bottom: 1px solid #333;
        ">
          <h3 style="margin: 0; color: white; font-size: 16px;">Execution Trace</h3>
          <button
            onclick={() => showExecutionTrace = false}
            style="
              background: transparent;
              border: none;
              color: white;
              cursor: pointer;
              font-size: 18px;
              padding: 0;
              width: 24px;
              height: 24px;
            "
          >
            ×
          </button>
        </div>
        
        {#if executionTrace.length === 0}
          <div style="color: #888; font-size: 14px; text-align: center; padding: 20px;">
            No execution trace yet. Run the workflow to see trace.
          </div>
        {:else}
          <div style="display: flex; flex-direction: column; gap: 8px;">
            {#each executionTrace as entry}
              <div style="
                padding: 8px;
                background: {
                  entry.status === 'completed' ? 'rgba(40, 167, 69, 0.2)' :
                  entry.status === 'failed' ? 'rgba(220, 53, 69, 0.2)' :
                  entry.status === 'running' ? 'rgba(0, 123, 255, 0.2)' :
                  'rgba(108, 117, 125, 0.2)'
                };
                border-left: 3px solid {
                  entry.status === 'completed' ? '#28a745' :
                  entry.status === 'failed' ? '#dc3545' :
                  entry.status === 'running' ? '#007bff' :
                  '#6c757d'
                };
                border-radius: 4px;
              ">
                <div style="display: flex; justify-content: space-between; align-items: start;">
                  <div style="flex: 1;">
                    <div style="color: white; font-weight: bold; font-size: 13px;">
                      {entry.nodeId}
                    </div>
                    <div style="color: #aaa; font-size: 11px; margin-top: 4px;">
                      {new Date(entry.timestamp).toLocaleTimeString()}
                    </div>
                    {#if entry.tokens !== undefined}
                      <div style="color: #888; font-size: 11px; margin-top: 2px;">
                        Tokens: {entry.tokens}
                      </div>
                    {/if}
                    {#if entry.latency !== undefined}
                      <div style="color: #888; font-size: 11px; margin-top: 2px;">
                        Latency: {entry.latency.toFixed(2)}ms
                      </div>
                    {/if}
                    {#if entry.error}
                      <div style="color: #dc3545; font-size: 12px; margin-top: 4px;">
                        Error: {entry.error}
                      </div>
                    {/if}
                  </div>
                  <div style="
                    padding: 4px 8px;
                    background: {
                      entry.status === 'completed' ? '#28a745' :
                      entry.status === 'failed' ? '#dc3545' :
                      entry.status === 'running' ? '#007bff' :
                      '#6c757d'
                    };
                    color: white;
                    border-radius: 3px;
                    font-size: 11px;
                    font-weight: bold;
                    text-transform: uppercase;
                  ">
                    {entry.status}
                  </div>
                </div>
              </div>
            {/each}
          </div>
        {/if}
      </div>
    {/if}
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
  
  /* Lost input warning (orange) */
  :global(.svelte-flow__node.lost-input) {
    box-shadow: 0 0 15px rgba(255, 152, 0, 0.6);
    border-color: #ff9800;
    border-width: 3px;
  }
  
  /* Invalid connection attempt (no glow, just visual feedback) */
  :global(.svelte-flow__node.invalid-connection) {
    opacity: 0.7;
  }
  
  :global(.svelte-flow__node:hover) {
    box-shadow: 0 0 10px rgba(0, 123, 255, 0.3);
    transform: scale(1.05);
    transition: transform 0.2s;
  }
  
  /* Bezier edges, no arrows, colors match source node */
  :global(.svelte-flow__edge) {
    stroke-width: 2;
    transition: stroke-dasharray 0.2s, opacity 0.2s, stroke-width 0.2s;
  }
  
  :global(.svelte-flow__edge:hover) {
    stroke-width: 3;
  }
  
  /* Edge hover state for delete button */
  :global(.svelte-flow__edge.edge-hover) {
    stroke-width: 3;
  }
  
  /* Remove arrow markers (as per discussion - no direction, it's a train) */
  :global(.svelte-flow__edge path) {
    marker-end: none;
  }

  /* Zoom Slider Styling (vertical, compact size) */
  .zoom-slider-vertical {
    width: 80px;
    height: 28px;
    appearance: none;
    background: transparent;
    border-radius: 0;
    outline: none;
    cursor: pointer;
    margin: 0;
    transform: rotate(-90deg);
    transform-origin: center;
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
    margin-top: -3px;
  }

  .zoom-slider-vertical::-moz-range-thumb {
    width: 10px;
    height: 10px;
    background: #007bff;
    border: 2px solid white;
    border-radius: 50%;
    cursor: pointer;
    box-shadow: 0 2px 4px rgba(0, 0, 0, 0.3);
    border: none;
  }

  .zoom-slider-vertical::-webkit-slider-runnable-track {
    width: 100%;
    height: 4px;
    background: rgba(255, 255, 255, 0.2);
    border-radius: 2px;
  }

  .zoom-slider-vertical::-moz-range-track {
    width: 100%;
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
