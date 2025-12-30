<script lang="ts">
  /**
   * Projects Tab Component
   * 
   * Phase 9: Projects overview and management
   * Shows project goal/description, files, components, data sources
   * 
   * Note: Sidebar is handled separately by ProjectsSidebar component
   */

  const API_BASE = import.meta.env.VITE_API_URL || 'http://localhost:8001';

  let selectedProject = $state<any | null>(null);
  let loading = $state<boolean>(false);

  let { 
    selectedProjectId = null
  }: {
    selectedProjectId?: string | null;
  } = $props();

  // Mock data for development
  const mockProjects: Record<string, any> = {
    '1': {
      id: '1',
      name: 'Invoice Automator',
      description: 'Automatically extract VAT and totals from Swedish invoices',
      goal: 'Streamline invoice processing workflow',
      team: 'Engineering',
      created_at: '2024-01-15',
      updated_at: '2024-01-20',
      model_usage: [
        { model_name: 'Mistral-7B', tokens: 1240, node_name: 'rewrite email' },
        { model_name: 'Llama-3-8B', tokens: 856, node_name: 'extract VAT' },
      ],
    },
  };

  $effect(() => {
    if (selectedProjectId) {
      loadProject(selectedProjectId);
    } else {
      selectedProject = null;
    }
  });

  async function loadProject(projectId: string) {
    loading = true;
    
    try {
      const res = await fetch(`${API_BASE}/api/v1/projects/${projectId}`);
      if (res.ok) {
        const data = await res.json();
        selectedProject = data;
      } else {
        throw new Error(`Failed to load project: ${res.statusText}`);
      }
    } catch (err: any) {
      console.warn('Error loading project, using mock data:', err.message);
      selectedProject = mockProjects[projectId] || null;
    } finally {
      loading = false;
    }
  }
</script>

<div style="
  width: 100%;
  height: 100%;
  background: #0f0f12;
  color: white;
  padding: 30px;
  overflow-y: auto;
">
    {#if loading}
      <div style="color: #888; font-size: 14px;">Loading project...</div>
    {:else if selectedProject}
      <div>
        <h1 style="margin: 0 0 10px 0; font-size: 28px; color: white;">
          {selectedProject.name}
        </h1>
        
        <div style="margin-bottom: 30px; color: #888; font-size: 14px;">
          <div style="margin-bottom: 8px;">
            <strong style="color: #ccc;">Team:</strong> {selectedProject.team}
          </div>
          <div style="margin-bottom: 8px;">
            <strong style="color: #ccc;">Created:</strong> {selectedProject.created_at}
          </div>
          <div>
            <strong style="color: #ccc;">Last Updated:</strong> {selectedProject.updated_at}
          </div>
        </div>

        <div style="margin-bottom: 30px;">
          <h2 style="margin: 0 0 10px 0; font-size: 20px; color: white;">Goal</h2>
          <div style="
            padding: 15px;
            background: #1a1a1f;
            border: 1px solid #333;
            border-radius: 6px;
            color: #ccc;
            font-size: 14px;
          ">
            {selectedProject.goal || 'No goal set'}
          </div>
        </div>

        <div style="margin-bottom: 30px;">
          <h2 style="margin: 0 0 10px 0; font-size: 20px; color: white;">Description</h2>
          <div style="
            padding: 15px;
            background: #1a1a1f;
            border: 1px solid #333;
            border-radius: 6px;
            color: #ccc;
            font-size: 14px;
            white-space: pre-wrap;
          ">
            {selectedProject.description || 'No description available. AI-generated descriptions will appear here.'}
          </div>
        </div>

        <!-- Model Summary Section -->
        <div style="margin-bottom: 30px;">
          <h2 style="margin: 0 0 10px 0; font-size: 20px; color: white;">Model Summary</h2>
          <div style="
            padding: 15px;
            background: #1a1a1f;
            border: 1px solid #333;
            border-radius: 6px;
          ">
            {#if selectedProject.model_usage && selectedProject.model_usage.length > 0}
              <div style="display: flex; flex-direction: column; gap: 8px;">
                {#each selectedProject.model_usage as usage}
                  <div style="
                    padding: 10px;
                    background: #25252a;
                    border: 1px solid #2a2a2a;
                    border-radius: 4px;
                    font-size: 14px;
                    color: #ccc;
                  ">
                    <span style="color: #007bff; font-weight: 500;">{usage.model_name}</span>
                    {#if usage.tokens}
                      <span style="color: #888;">, {usage.tokens.toLocaleString()} tokens</span>
                    {/if}
                    {#if usage.node_name}
                      <span style="color: #666;">, used in {usage.node_name} node</span>
                    {/if}
                  </div>
                {/each}
              </div>
            {:else}
              <div style="color: #888; font-size: 14px; font-style: italic;">
                No models used yet. Models will appear here as you use them in workflows.
              </div>
            {/if}
          </div>
        </div>

        <div style="
          padding: 20px;
          background: #1a1a1f;
          border: 1px solid #333;
          border-radius: 6px;
          color: #888;
          font-size: 14px;
          text-align: center;
        ">
          <div style="margin-bottom: 10px;">📁 Files, Components, and Data Sources</div>
          <div style="font-size: 12px;">
            Coming soon: File browser, component search, and data source management
          </div>
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
      ">
        Select a project to view details
      </div>
    {/if}
</div>

