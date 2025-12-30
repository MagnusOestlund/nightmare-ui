<script lang="ts">
  /**
   * Custom Node Component with Visible Connection Handles
   * 
   * Displays nodes with visible connection points (handles) on the sides
   * Connection points can be inputs (left side) or outputs (right side)
   */

  import { Handle, Position } from '@xyflow/svelte';

  // Connection point types
  export type ConnectionType = 'data' | 'control' | 'execution' | 'any';
  
  export interface ConnectionPoint {
    id: string;
    type: 'input' | 'output';
    connectionType: ConnectionType;
    label?: string;
    position: Position;
    required?: boolean;
  }

  interface NodeData {
    label: string;
    nodeType: string;
    color: string;
    connectionPoints?: ConnectionPoint[];
    executionStatus?: 'pending' | 'running' | 'completed' | 'failed';
  }

  let { data }: { data: NodeData } = $props();
  
  // Get status color
  function getStatusColor(status?: string): string {
    switch (status) {
      case 'running': return '#007bff';
      case 'completed': return '#28a745';
      case 'failed': return '#dc3545';
      default: return 'transparent';
    }
  }
  
  // Get status border style
  function getStatusBorder(status?: string): string {
    if (!status || status === 'pending') return 'none';
    return `3px solid ${getStatusColor(status)}`;
  }

  // Default connection points based on node type
  // Connections are vertical (down) by default - Top (output) to Bottom (input)
  function getDefaultConnectionPoints(nodeType: string): ConnectionPoint[] {
    const points: ConnectionPoint[] = [];
    
    switch (nodeType) {
      case 'start':
        // Start node: only output (bottom side)
        points.push({
          id: 'output-1',
          type: 'output',
          connectionType: 'execution',
          label: 'Out',
          position: Position.Bottom,
        });
        break;
        
      case 'branch':
        // Branch node: one input (top), two outputs (bottom - true/false)
        points.push({
          id: 'input-1',
          type: 'input',
          connectionType: 'execution',
          label: 'In',
          position: Position.Top,
        });
        points.push({
          id: 'output-true',
          type: 'output',
          connectionType: 'execution',
          label: 'True',
          position: Position.Bottom,
        });
        points.push({
          id: 'output-false',
          type: 'output',
          connectionType: 'execution',
          label: 'False',
          position: Position.Bottom,
        });
        break;
        
      case 'results':
      case 'output':
        // Results/Output nodes: only input (top side)
        points.push({
          id: 'input-1',
          type: 'input',
          connectionType: 'execution',
          label: 'In',
          position: Position.Top,
        });
        break;
        
      default:
        // Default: one input (top), one output (bottom) - vertical flow
        points.push({
          id: 'input-1',
          type: 'input',
          connectionType: 'execution',
          label: 'In',
          position: Position.Top,
        });
        points.push({
          id: 'output-1',
          type: 'output',
          connectionType: 'execution',
          label: 'Out',
          position: Position.Bottom,
        });
        break;
    }
    
    return points;
  }

  // Get connection points (use provided or generate defaults)
  const connectionPoints = $derived(
    data.connectionPoints || getDefaultConnectionPoints(data.nodeType)
  );

  // Group connection points by position
  const leftPoints = $derived(connectionPoints.filter(p => p.position === Position.Left));
  const rightPoints = $derived(connectionPoints.filter(p => p.position === Position.Right));
  const topPoints = $derived(connectionPoints.filter(p => p.position === Position.Top));
  const bottomPoints = $derived(connectionPoints.filter(p => p.position === Position.Bottom));

  // Get color for connection type
  function getConnectionTypeColor(type: ConnectionType): string {
    switch (type) {
      case 'data': return '#2ecc71'; // green
      case 'control': return '#e74c3c'; // red
      case 'execution': return '#3498db'; // blue
      default: return '#95a5a6'; // gray
    }
  }
</script>

<div 
  class="custom-node"
  data-node-type={data.nodeType}
  style="
    background: {data.color};
    border: {getStatusBorder(data.executionStatus)};
    border-radius: 8px;
    padding: 12px;
    min-width: 120px;
    min-height: 80px;
    display: flex;
    flex-direction: column;
    align-items: center;
    justify-content: center;
    position: relative;
    box-shadow: 0 2px 8px rgba(0, 0, 0, 0.3);
    {data.executionStatus === 'running' ? 'animation: pulse 1.5s ease-in-out infinite;' : ''}
  "
>
  <!-- Execution Status Indicator -->
  {#if data.executionStatus && data.executionStatus !== 'pending'}
    <div style="
      position: absolute;
      top: 4px;
      right: 4px;
      width: 12px;
      height: 12px;
      background: {getStatusColor(data.executionStatus)};
      border-radius: 50%;
      border: 2px solid white;
      box-shadow: 0 0 4px rgba(0, 0, 0, 0.5);
    "></div>
  {/if}
  <!-- Node Label -->
  <div style="
    color: white;
    font-weight: bold;
    font-size: 12px;
    text-align: center;
    margin-bottom: 4px;
    text-shadow: 0 1px 2px rgba(0, 0, 0, 0.5);
  ">
    {data.label}
  </div>

  <!-- Connection Points Container -->
  <div style="
    position: absolute;
    top: 0;
    left: 0;
    right: 0;
    bottom: 0;
    pointer-events: none;
    z-index: 10;
  ">
    <!-- Left Side (Inputs) - Centered vertically -->
    {#each leftPoints as point, idx}
      {@const totalPoints = leftPoints.length}
      {@const offset = totalPoints === 1 ? 0 : (idx - (totalPoints - 1) / 2) * 30}
      <div style="
        position: absolute;
        left: -16px;
        top: 50%;
        transform: translateY(calc(-50% + {offset}px));
        pointer-events: auto;
        display: flex;
        align-items: center;
        gap: 4px;
        z-index: 1000;
      ">
        {#if point.label}
          <span style="
            font-size: 9px;
            color: white;
            background: rgba(0, 0, 0, 0.5);
            padding: 2px 4px;
            border-radius: 3px;
            white-space: nowrap;
          ">
            {point.label}
          </span>
        {/if}
        <Handle
          type="target"
          position={Position.Left}
          id={point.id}
          style="
            width: 14px;
            height: 14px;
            background: {getConnectionTypeColor(point.connectionType)};
            border: 2px solid white;
            border-radius: 50%;
            box-shadow: 0 0 4px rgba(0, 0, 0, 0.5);
            cursor: crosshair;
            z-index: 20;
          "
        />
      </div>
    {/each}

    <!-- Right Side (Outputs) - Centered vertically -->
    {#each rightPoints as point, idx}
      {@const totalPoints = rightPoints.length}
      {@const offset = totalPoints === 1 ? 0 : (idx - (totalPoints - 1) / 2) * 30}
      <div style="
        position: absolute;
        right: -16px;
        top: 50%;
        transform: translateY(calc(-50% + {offset}px));
        pointer-events: auto;
        display: flex;
        align-items: center;
        gap: 4px;
        flex-direction: row-reverse;
        z-index: 1000;
      ">
        {#if point.label}
          <span style="
            font-size: 9px;
            color: white;
            background: rgba(0, 0, 0, 0.5);
            padding: 2px 4px;
            border-radius: 3px;
            white-space: nowrap;
          ">
            {point.label}
          </span>
        {/if}
        <Handle
          type="source"
          position={Position.Right}
          id={point.id}
          style="
            width: 14px;
            height: 14px;
            background: {getConnectionTypeColor(point.connectionType)};
            border: 2px solid white;
            border-radius: 50%;
            box-shadow: 0 0 4px rgba(0, 0, 0, 0.5);
            cursor: crosshair;
            z-index: 20;
          "
        />
      </div>
    {/each}

    <!-- Top Side - Centered horizontally -->
    {#each topPoints as point, idx}
      {@const totalPoints = topPoints.length}
      {@const offset = totalPoints === 1 ? 0 : (idx - (totalPoints - 1) / 2) * 40}
      <div style="
        position: absolute;
        top: -16px;
        left: 50%;
        transform: translateX(calc(-50% + {offset}px));
        pointer-events: auto;
        display: flex;
        flex-direction: column;
        align-items: center;
        gap: 4px;
      ">
        {#if point.label}
          <span style="
            font-size: 9px;
            color: white;
            background: rgba(0, 0, 0, 0.5);
            padding: 2px 4px;
            border-radius: 3px;
            white-space: nowrap;
          ">
            {point.label}
          </span>
        {/if}
        <Handle
          type={point.type === 'input' ? 'target' : 'source'}
          position={Position.Top}
          id={point.id}
          style="
            width: 12px;
            height: 12px;
            background: {getConnectionTypeColor(point.connectionType)};
            border: 2px solid white;
            border-radius: 50%;
            box-shadow: 0 0 4px rgba(0, 0, 0, 0.5);
          "
        />
      </div>
    {/each}

    <!-- Bottom Side - Centered horizontally -->
    {#each bottomPoints as point, idx}
      {@const totalPoints = bottomPoints.length}
      {@const offset = totalPoints === 1 ? 0 : (idx - (totalPoints - 1) / 2) * 40}
      <div style="
        position: absolute;
        bottom: -16px;
        left: 50%;
        transform: translateX(calc(-50% + {offset}px));
        pointer-events: auto;
        display: flex;
        flex-direction: column-reverse;
        align-items: center;
        gap: 4px;
      ">
        {#if point.label}
          <span style="
            font-size: 9px;
            color: white;
            background: rgba(0, 0, 0, 0.5);
            padding: 2px 4px;
            border-radius: 3px;
            white-space: nowrap;
          ">
            {point.label}
          </span>
        {/if}
        <Handle
          type={point.type === 'input' ? 'target' : 'source'}
          position={Position.Bottom}
          id={point.id}
          style="
            width: 12px;
            height: 12px;
            background: {getConnectionTypeColor(point.connectionType)};
            border: 2px solid white;
            border-radius: 50%;
            box-shadow: 0 0 4px rgba(0, 0, 0, 0.5);
          "
        />
      </div>
    {/each}
  </div>
</div>

<style>
  :global(.custom-node) {
    transition: transform 0.2s, box-shadow 0.2s, border-color 0.2s;
  }
  
  :global(.custom-node:hover) {
    transform: scale(1.05);
    box-shadow: 0 4px 12px rgba(0, 0, 0, 0.4);
  }
  
  @keyframes pulse {
    0%, 100% {
      opacity: 1;
    }
    50% {
      opacity: 0.7;
    }
  }
</style>

