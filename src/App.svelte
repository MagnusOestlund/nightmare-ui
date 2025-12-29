<script lang="ts">
  /**
   * Main App Component
   * 
   * Phase 1.1: Stupid UI - Plain buttons, no icons, no fancy features
   * Goal: Prove it works with mock server
   */

  import { onMount } from 'svelte';
  import ChatPanel from './components/ChatPanel.svelte';
  import MenuBar from './components/MenuBar.svelte';
  import SettingsPanel from './components/SettingsPanel.svelte';
  import ModelBrowserModal from './components/ModelBrowserModal.svelte';
  import ModelCardModal from './components/ModelCardModal.svelte';
  import AddModelModal from './components/AddModelModal.svelte';
  // Use simple canvas for now (full @xyflow/svelte canvas will be added later)
  import WorkflowCanvas from './components/WorkflowCanvas.simple.svelte';
  // import WorkflowCanvas from './components/WorkflowCanvas.svelte';
  import NodePalette from './components/NodePalette.svelte';

  // API base URL - points to mock server during development
  const API_BASE = import.meta.env.VITE_API_URL || 'http://localhost:8001';

  // Pure Svelte 5 runes for state
  let health = $state<string>('');
  let containers = $state<any[]>([]);
  let warnings = $state<any[]>([]);
  let models = $state<any[]>([]);
  let selectedModelId = $state<string | null>(null);
  let showModelBrowserModal = $state<boolean>(false);
  let showModelCardModal = $state<boolean>(false);
  let selectedModelCardId = $state<string | null>(null);
  let showAddModelModal = $state<boolean>(false);
  let showNodePalette = $state<boolean>(true);
  let showSettingsPanel = $state<boolean>(false);
  let clearChatTrigger = $state<number>(0);
  
  function openModelBrowser() {
    console.log('App.openModelBrowser called, current state:', showModelBrowserModal);
    showModelBrowserModal = true;
    console.log('App: Model browser modal state after update:', showModelBrowserModal);
  }
  
  function closeModelBrowser() {
    console.log('App.closeModelBrowser called, current state:', showModelBrowserModal);
    showModelBrowserModal = false;
    console.log('App: Model browser modal state after update:', showModelBrowserModal);
  }

  function openModelCard(modelId: string) {
    console.log('App.openModelCard called, modelId:', modelId);
    selectedModelCardId = modelId;
    showModelCardModal = true;
    console.log('App: Model card modal state after update:', showModelCardModal);
  }

  function closeModelCard() {
    console.log('App.closeModelCard called');
    showModelCardModal = false;
    selectedModelCardId = null;
  }

  function handleAddModel() {
    console.log('App.handleAddModel called');
    showAddModelModal = true;
  }

  function closeAddModelModal() {
    console.log('App.closeAddModelModal called');
    showAddModelModal = false;
  }

  function handleAddFromLocal(path: string) {
    console.log('App.handleAddFromLocal called with path:', path);
    // TODO: Implement local folder installation
    alert(`Local folder installation will be implemented soon!\n\nSelected path: ${path}\n\nThe system will:\n- Scan the folder for model files\n- Identify model type and configuration\n- Register the model in the system`);
    // After implementation, refresh models list
    loadModels();
  }

  function handleAddFromHuggingFace(modelId: string) {
    console.log('App.handleAddFromHuggingFace called with modelId:', modelId);
    // TODO: Implement HuggingFace installation
    alert(`HuggingFace installation will be implemented soon!\n\nModel ID: ${modelId}\n\nThe model installer will:\n- Download the model from HuggingFace\n- Set up the model configuration\n- Register the model in the system`);
    // After implementation, refresh models list
    loadModels();
  }

  function handleRestart() {
    if (confirm('Restart the application? This will reload the page.')) {
      window.location.reload();
    }
  }

  function handleSave() {
    // TODO: Implement save functionality
    alert('Save functionality will be implemented soon!');
  }

  function handleQuit() {
    if (confirm('Save and quit? Any unsaved changes will be lost.')) {
      handleSave();
      // In a real app, this would close the window or navigate away
      alert('Application would close here. In development, this just shows a message.');
    }
  }

  function handleTogglePalette() {
    showNodePalette = !showNodePalette;
  }

  function handleOpenSettings() {
    showSettingsPanel = !showSettingsPanel;
  }

  function handleClearChat() {
    // Trigger chat clearing by updating the trigger
    clearChatTrigger++;
  }
  
  // Track showModelBrowserModal changes with $effect (Svelte 5)
  $effect(() => {
    const _ = showModelBrowserModal;
    // Only log in development mode to avoid console spam
    if (import.meta.env.DEV) {
      console.log('App: Reactive update triggered, showModelBrowserModal:', showModelBrowserModal);
    }
  });

  // Load initial data
  onMount(() => {
    loadHealth();
    loadContainers();
    loadWarnings();
    loadModels();
  });

  async function loadHealth() {
    try {
      const res = await fetch(`${API_BASE}/api/v1/health`);
      const data = await res.json();
      health = JSON.stringify(data, null, 2);
    } catch (error: any) {
      health = `Error: ${error.message}`;
    }
  }

  async function loadContainers() {
    try {
      const res = await fetch(`${API_BASE}/api/v1/stack/containers`);
      const data = await res.json();
      containers = Array.isArray(data) ? data : [];
    } catch (error: any) {
      console.error('Error loading containers:', error);
      containers = [];
    }
  }

  async function loadWarnings() {
    try {
      const res = await fetch(`${API_BASE}/api/v1/stack/warnings`);
      const data = await res.json();
      warnings = Array.isArray(data) ? data : [];
    } catch (error: any) {
      console.error('Error loading warnings:', error);
      warnings = [];
    }
  }

  async function loadModels() {
    try {
      const res = await fetch(`${API_BASE}/api/v1/models`);
      const data = await res.json();
      const modelsList = Array.isArray(data) ? data : [];
      models = modelsList;
    } catch (error: any) {
      console.error('Error loading models:', error);
      models = [];
    }
  }

  async function restartContainer(name: string) {
    try {
      const res = await fetch(`${API_BASE}/api/v1/stack/containers/${name}/restart`, {
        method: 'POST',
      });
      const data = await res.json();
      alert(`Restart result: ${JSON.stringify(data)}`);
      loadContainers();
    } catch (error: any) {
      alert(`Error: ${error.message}`);
    }
  }

  async function restartAll() {
    try {
      const res = await fetch(`${API_BASE}/api/v1/stack/restart-all`, {
        method: 'POST',
      });
      const data = await res.json();
      alert(`Restart all result: ${JSON.stringify(data)}`);
      loadContainers();
    } catch (error: any) {
      alert(`Error: ${error.message}`);
    }
  }

  async function restartModel() {
    try {
      const res = await fetch(`${API_BASE}/api/v1/stack/restart-model`, {
        method: 'POST',
      });
      const data = await res.json();
      alert(`Restart model result: ${JSON.stringify(data)}`);
      loadContainers();
    } catch (error: any) {
      alert(`Error: ${error.message}`);
    }
  }
</script>

<div style="display: flex; flex-direction: column; height: 100vh;">
  <!-- Menu Bar -->
  <MenuBar
    onTogglePalette={handleTogglePalette}
    onRestart={handleRestart}
    onSave={handleSave}
    onQuit={handleQuit}
    onOpenSettings={handleOpenSettings}
  />

  <!-- Settings Panel (slide-in from right) -->
  <SettingsPanel
    show={showSettingsPanel}
    onClose={handleOpenSettings}
    onClearChat={handleClearChat}
  />

  <!-- Main Content Area -->
  <div style="flex: 1; display: flex; overflow: hidden;">
    <!-- Node Palette (Phase 2) - Toggleable -->
    {#if showNodePalette}
      <NodePalette onBrowseModels={() => {
        console.log('App: onBrowseModels callback called from NodePalette');
        openModelBrowser();
      }} />
    {/if}
    
    <!-- Main Content -->
    <div style="flex: 1; display: flex; flex-direction: column; overflow: hidden;">
      <!-- Canvas Area (80% height) -->
      <div style="flex: 1; min-height: 0; overflow: hidden;">
        <WorkflowCanvas />
      </div>
      
      <!-- Chat Panel at Bottom (20% height) -->
      <ChatPanel 
        onModelSelect={(id) => { selectedModelId = id; }}
        clearMessagesTrigger={clearChatTrigger}
      />
    </div>
  </div>
</div>

<!-- Model Browser Modal (outside main container for proper z-index) -->
<ModelBrowserModal
  show={showModelBrowserModal}
  onClose={closeModelBrowser}
  onModelSelect={(id) => { selectedModelId = id; }}
  onViewDetails={(id) => { openModelCard(id); }}
  onAddModel={handleAddModel}
/>

<!-- Model Card Modal (outside main container for proper z-index) -->
<ModelCardModal
  show={showModelCardModal}
  modelId={selectedModelCardId}
  onClose={closeModelCard}
/>

<!-- Add Model Modal (outside main container for proper z-index) -->
<AddModelModal
  show={showAddModelModal}
  onClose={closeAddModelModal}
  onAddFromLocal={handleAddFromLocal}
  onAddFromHuggingFace={handleAddFromHuggingFace}
/>


