<script lang="ts">
  /**
   * Advanced Analytics Tab Component
   * 
   * Phase 5: Advanced Data Analytics
   * DuckDB queries, preset functions, data analysis
   */

  const API_BASE = import.meta.env.VITE_API_URL || 'http://localhost:8001';

  let query = $state<string>('-- DuckDB Query\n-- Example: SELECT * FROM invoices LIMIT 10;\n\nSELECT * FROM invoices LIMIT 10;');
  let results = $state<any[]>([]);
  let loading = $state<boolean>(false);
  let error = $state<string | null>(null);
  let presetFunctions = $state<any[]>([]);

  // Mock preset functions
  const mockPresets = [
    { id: '1', name: 'Cash Flow Forecast', description: 'Time series forecasting for cash flow' },
    { id: '2', name: 'Revenue vs Task Velocity', description: 'Compare sales data with Asana task completion' },
    { id: '3', name: 'Churn Risk Score', description: 'Calculate churn risk based on open tasks and closed deals' },
    { id: '4', name: 'Workload Heatmap', description: 'Hours per project per team visualization' },
  ];

  onMount(() => {
    presetFunctions = mockPresets;
  });

  async function runQuery() {
    loading = true;
    error = null;
    results = [];
    
    try {
      // TODO: Implement actual DuckDB query execution
      await new Promise(resolve => setTimeout(resolve, 500)); // Simulate API call
      
      // Mock results
      results = [
        { id: 1, amount: 1000, date: '2024-01-15', status: 'paid' },
        { id: 2, amount: 2500, date: '2024-01-16', status: 'pending' },
        { id: 3, amount: 1500, date: '2024-01-17', status: 'paid' },
      ];
    } catch (err: any) {
      error = err.message;
    } finally {
      loading = false;
    }
  }

  function usePreset(preset: any) {
    // TODO: Load preset query template
    alert(`Preset "${preset.name}" will be loaded. Implementation coming in Phase 5.`);
  }
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
    <h2 style="margin: 0; font-size: 18px; color: white;">Advanced Analytics</h2>
    
    <div style="flex: 1;"></div>
    
    <button
      onclick={runQuery}
      disabled={loading}
      style="
        padding: 8px 20px;
        background: #007bff;
        border: 1px solid #007bff;
        border-radius: 4px;
        color: white;
        font-size: 14px;
        cursor: pointer;
        opacity: {loading ? 0.6 : 1};
      "
    >
      {loading ? 'Running...' : 'Run Query'}
    </button>
  </div>

  <!-- Main Content -->
  <div style="
    flex: 1;
    display: flex;
    padding: 20px;
    gap: 20px;
    overflow: hidden;
  ">
    <!-- Left: Query Editor and Presets -->
    <div style="
      width: 400px;
      display: flex;
      flex-direction: column;
      gap: 20px;
      overflow-y: auto;
    ">
      <!-- Query Editor -->
      <div>
        <h3 style="margin: 0 0 10px 0; font-size: 16px; color: white;">DuckDB Query</h3>
        <textarea
          bind:value={query}
          style="
            width: 100%;
            height: 300px;
            background: #1a1a1f;
            border: 1px solid #333;
            border-radius: 6px;
            padding: 15px;
            color: #ccc;
            font-family: 'Monaco', 'Menlo', 'Ubuntu Mono', monospace;
            font-size: 14px;
            line-height: 1.6;
            resize: none;
            outline: none;
          "
          placeholder="Write your DuckDB SQL query here..."
        ></textarea>
      </div>

      <!-- Preset Functions -->
      <div>
        <h3 style="margin: 0 0 10px 0; font-size: 16px; color: white;">Preset Functions</h3>
        <div style="
          display: flex;
          flex-direction: column;
          gap: 8px;
        ">
          {#each presetFunctions as preset}
            <div
              onclick={() => usePreset(preset)}
              style="
                padding: 12px;
                background: #25252a;
                border: 1px solid #333;
                border-radius: 6px;
                cursor: pointer;
                transition: all 0.2s;
              "
              onmouseenter={(e) => {
                e.currentTarget.style.background = '#2a2a2f';
                e.currentTarget.style.borderColor = '#007bff';
              }}
              onmouseleave={(e) => {
                e.currentTarget.style.background = '#25252a';
                e.currentTarget.style.borderColor = '#333';
              }}
            >
              <div style="font-weight: bold; margin-bottom: 4px; font-size: 14px; color: white;">
                {preset.name}
              </div>
              <div style="font-size: 12px; color: #888;">
                {preset.description}
              </div>
            </div>
          {/each}
        </div>
      </div>
    </div>

    <!-- Right: Results -->
    <div style="
      flex: 1;
      display: flex;
      flex-direction: column;
      background: #1a1a1f;
      border: 1px solid #333;
      border-radius: 6px;
      padding: 20px;
      overflow-y: auto;
    ">
      <h3 style="margin: 0 0 15px 0; font-size: 16px; color: white;">Query Results</h3>
      
      {#if loading}
        <div style="color: #888; font-size: 14px;">Running query...</div>
      {:else if error}
        <div style="color: #dc3545; font-size: 14px;">Error: {error}</div>
      {:else if results.length === 0}
        <div style="color: #888; font-size: 14px; text-align: center; padding: 40px;">
          No results yet. Write a query and click "Run Query" to see results.
        </div>
      {:else}
        <table style="
          width: 100%;
          border-collapse: collapse;
          font-size: 14px;
        ">
          <thead>
            <tr style="border-bottom: 1px solid #333;">
              {#each Object.keys(results[0]) as key}
                <th style="
                  padding: 10px;
                  text-align: left;
                  color: #ccc;
                  font-weight: bold;
                ">
                  {key}
                </th>
              {/each}
            </tr>
          </thead>
          <tbody>
            {#each results as row}
              <tr style="border-bottom: 1px solid #222;">
                {#each Object.values(row) as value}
                  <td style="
                    padding: 10px;
                    color: #888;
                  ">
                    {value}
                  </td>
                {/each}
              </tr>
            {/each}
          </tbody>
        </table>
      {/if}
    </div>
  </div>
</div>


