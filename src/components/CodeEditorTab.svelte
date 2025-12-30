<script lang="ts">
  /**
   * Code Editor Tab Component
   * 
   * Phase 6.4.0: Code Editor Integration
   * Python node editor (Simple and Advanced/Cursor mode)
   */

  const API_BASE = import.meta.env.VITE_API_URL || 'http://localhost:8001';

  let codeNodes = $state<any[]>([]);
  let selectedNode = $state<any | null>(null);
  let code = $state<string>('# Python Code Node\n# Write your code here\n\ndef process(input_data):\n    # Your code here\n    return input_data');
  let mode = $state<'simple' | 'advanced'>('simple');
  let loading = $state<boolean>(false);
</script>

<div style="
  width: 100%;
  height: 100%;
  display: flex;
  flex-direction: column;
  background: #0f0f12;
  color: white;
">
  <!-- Header -->
  <div style="
    height: 50px;
    background: #1a1a1f;
    border-bottom: 1px solid #333;
    display: flex;
    align-items: center;
    padding: 0 20px;
    gap: 15px;
  ">
    <h2 style="margin: 0; font-size: 18px; color: white;">Code Editor</h2>
    
    <div style="flex: 1;"></div>
    
    <!-- Mode Toggle -->
    <div style="display: flex; gap: 8px;">
      <button
        onclick={() => mode = 'simple'}
        style="
          padding: 6px 16px;
          background: {mode === 'simple' ? '#007bff' : '#25252a'};
          border: 1px solid {mode === 'simple' ? '#007bff' : '#333'};
          border-radius: 4px;
          color: white;
          font-size: 14px;
          cursor: pointer;
        "
      >
        Simple
      </button>
      <button
        onclick={() => mode = 'advanced'}
        style="
          padding: 6px 16px;
          background: {mode === 'advanced' ? '#007bff' : '#25252a'};
          border: 1px solid {mode === 'advanced' ? '#007bff' : '#333'};
          border-radius: 4px;
          color: white;
          font-size: 14px;
          cursor: pointer;
        "
      >
        Advanced (Cursor Mode)
      </button>
    </div>
  </div>

  <!-- Main Content -->
  <div style="
    flex: 1;
    padding: 20px;
    overflow-y: auto;
  ">
    {#if mode === 'simple'}
      <div style="
        width: 100%;
        height: 100%;
        display: flex;
        flex-direction: column;
      ">
        <div style="
          flex: 1;
          background: #1a1a1f;
          border: 1px solid #333;
          border-radius: 6px;
          padding: 15px;
        ">
          <textarea
            bind:value={code}
            style="
              width: 100%;
              height: 100%;
              background: #0f0f12;
              border: none;
              color: #ccc;
              font-family: 'Monaco', 'Menlo', 'Ubuntu Mono', monospace;
              font-size: 14px;
              line-height: 1.6;
              resize: none;
              outline: none;
            "
            placeholder="Write your Python code here..."
          ></textarea>
        </div>
        
        <div style="
          margin-top: 15px;
          padding: 15px;
          background: #1a1a1f;
          border: 1px solid #333;
          border-radius: 6px;
          color: #888;
          font-size: 14px;
        ">
          <strong style="color: #ccc;">Simple Mode:</strong> Basic code editor for Python nodes. 
          Advanced mode (Cursor integration) coming in 6.4.0.
        </div>
      </div>
    {:else}
      <div style="
        display: flex;
        align-items: center;
        justify-content: center;
        height: 100%;
        color: #888;
        font-size: 16px;
        text-align: center;
        flex-direction: column;
        gap: 15px;
      ">
        <div style="font-size: 48px;">🔧</div>
        <div>
          <strong style="color: #ccc;">Advanced Mode (Cursor Integration)</strong>
        </div>
        <div style="font-size: 14px; max-width: 500px;">
          Advanced code editor with Cursor mode integration will be available in version 6.4.0.
          This will open the Python node in Cursor for full IDE features.
        </div>
      </div>
    {/if}
  </div>
</div>


