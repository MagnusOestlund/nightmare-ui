<script lang="ts">
  /**
   * Workflow Canvas Component
   * 
   * Phase 2: Canvas with @xyflow/svelte (Svelte 5)
   * Dark-mode infinite canvas for building workflows
   */

  import { onMount } from 'svelte';
  import { SvelteFlow, Background, Controls, MiniMap } from '@xyflow/svelte';
  import '@xyflow/svelte/dist/style.css';

  // API base URL
  const API_BASE = import.meta.env.VITE_API_URL || 'http://localhost:8001';

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
    type?: string;
  }

  let nodes: Node[] = $state([]);
  let edges: Edge[] = $state([]);
  let loading = $state(false);
  let error: string | null = $state(null);

  // Load workflow on mount
  onMount(() => {
    // For Phase 2, start with empty canvas
    // Later: Load from API or create new workflow
  });

  // Node types configuration
  const nodeTypes = {
    // Default node type
    default: 'default',
  };

  // Edge types configuration
  const edgeTypes = {
    // Default edge type
    default: 'default',
  };

  // Handle node drop from palette
  function handleDrop(event: DragEvent) {
    event.preventDefault();
    const nodeType = event.dataTransfer?.getData('application/node-type');
    if (!nodeType) return;

    // Get drop position relative to canvas
    const rect = (event.currentTarget as HTMLElement).getBoundingClientRect();
    const position = {
      x: event.clientX - rect.left,
      y: event.clientY - rect.top,
    };

    addNode(nodeType, position);
  }

  function handleDragOver(event: DragEvent) {
    event.preventDefault();
    if (event.dataTransfer) {
      event.dataTransfer.dropEffect = 'copy';
    }
  }

  // Handle node changes (from @xyflow/svelte)
  function onNodesChange(changes: any) {
    // Update nodes when dragged or changed
    // @xyflow/svelte handles this internally, but we can add custom logic here
  }

  // Handle edge changes (from @xyflow/svelte)
  function onEdgesChange(changes: any) {
    // Update edges when changed
    // @xyflow/svelte handles this internally
  }

  // Handle node connect (when edge is created)
  function onConnect(connection: any) {
    // Add new edge
    const newEdge: Edge = {
      id: `edge-${Date.now()}`,
      source: connection.source,
      target: connection.target,
    };
    edges = [...edges, newEdge];
  }

  // Add node to canvas
  function addNode(type: string, position: { x: number; y: number }) {
    const newNode: Node = {
      id: `node-${Date.now()}`,
      type: type,
      position: position,
      data: { label: type },
    };
    nodes = [...nodes, newNode];
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
  style="width: 100%; height: 100%; position: relative; background: #0f0f12;"
  ondrop={handleDrop}
  ondragover={handleDragOver}
>
  <!-- Canvas Toolbar -->
  <div style="position: absolute; top: 10px; left: 10px; z-index: 10; display: flex; gap: 10px;">
    <button 
      onclick={saveWorkflow}
      disabled={loading}
      style="padding: 8px 16px; background: #007bff; color: white; border: none; border-radius: 4px; cursor: pointer;"
    >
      {loading ? 'Saving...' : 'Save Workflow'}
    </button>
    
    {#if error}
      <div style="padding: 8px 16px; background: #dc3545; color: white; border-radius: 4px;">
        Error: {error}
      </div>
    {/if}
  </div>

  <!-- Svelte Flow Canvas -->
  <SvelteFlow
    {nodes}
    {edges}
    on:nodeschange={onNodesChange}
    on:edgeschange={onEdgesChange}
    on:connect={onConnect}
    {nodeTypes}
    {edgeTypes}
    style="width: 100%; height: 100%;"
  >
    <Background />
    <Controls />
    <MiniMap 
      nodeColor="#007bff"
      maskColor="rgba(0, 0, 0, 0.6)"
    />
  </SvelteFlow>
</div>

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
  }
  
  :global(.svelte-flow__node:hover) {
    border-color: #007bff;
    box-shadow: 0 0 10px rgba(0, 123, 255, 0.3);
  }
  
  :global(.svelte-flow__edge) {
    stroke: #666;
  }
  
  :global(.svelte-flow__edge:hover) {
    stroke: #007bff;
  }
</style>
