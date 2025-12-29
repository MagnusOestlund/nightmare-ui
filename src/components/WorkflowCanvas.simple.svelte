<script lang="ts">
  /**
   * Simple Workflow Canvas - Test version without @xyflow/svelte
   * Use this to test if the black screen is due to @xyflow/svelte import issues
   */

  let nodes: any[] = $state([]);
  let loading = $state(false);
</script>

<div style="width: 100%; height: 100%; position: relative; background: #0f0f12; color: white; padding: 20px;">
  <h1>Workflow Canvas (Simple Test)</h1>
  <p>If you see this, the app is loading correctly.</p>
  <p>Nodes: {nodes.length}</p>
  <button onclick={() => { nodes = [...nodes, { id: Date.now() }]; }}>
    Add Node (Test)
  </button>
</div>

