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
  // import WorkflowCanvas from './components/WorkflowCanvas.simple.svelte';
  import WorkflowCanvas from './components/WorkflowCanvas.svelte';
  import NodePalette from './components/NodePalette.svelte';
  import ProjectsTab from './components/ProjectsTab.svelte';
  import ProjectsSidebar from './components/ProjectsSidebar.svelte';

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
  let isNodePaletteCollapsed = $state<boolean>(false); // Collapsed state for Node Palette
  let showSettingsPanel = $state<boolean>(false);
  let clearChatTrigger = $state<number>(0);
  let activeTab = $state<'projects' | 'canvas'>('canvas');
  let selectedProjectId = $state<string | null>(null);
  let isChatCollapsed = $state<boolean>(false); // Collapsed state for Chat Panel
  let chatHeight = $state<number>(20); // Chat panel height percentage (default 20%)
  let sidebarWidth = $state<number>(250); // Sidebar width in pixels (default 250px, matches Projects sidebar)
  let isResizingChat = $state<boolean>(false);
  let isResizingSidebar = $state<boolean>(false);
  let showMinimap = $state<boolean>(true); // Show minimap/overview (default: true)
  
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

  function handleTabChange(tab: 'projects' | 'canvas') {
    activeTab = tab;
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
    {activeTab}
    onTabChange={handleTabChange}
  />

  <!-- Settings Panel (slide-in from right) -->
  <SettingsPanel
    show={showSettingsPanel}
    onClose={handleOpenSettings}
    onClearChat={handleClearChat}
    bind:showMinimap={showMinimap}
  />

  <!-- Main Content Area -->
  <div style="flex: 1; display: flex; overflow: hidden;">
    <!-- Sidebar: Different for each tab -->
    {#if activeTab === 'projects'}
      <!-- Projects Sidebar -->
      <div style="position: relative; width: {sidebarWidth}px; flex-shrink: 0; display: flex;">
        <ProjectsSidebar 
          onProjectSelect={(id) => { selectedProjectId = id; }}
        />
        <!-- Resize handle -->
        <div
          style="
            width: 4px;
            background: transparent;
            cursor: col-resize;
            flex-shrink: 0;
            transition: background 0.2s;
          "
          onmouseenter={(e) => e.currentTarget.style.background = '#007bff'}
          onmouseleave={(e) => {
            if (!isResizingSidebar) {
              e.currentTarget.style.background = 'transparent';
            }
          }}
          onmousedown={(e) => {
            isResizingSidebar = true;
            e.preventDefault();
            const startX = e.clientX;
            const startWidth = sidebarWidth;
            
            function handleMouseMove(moveEvent: MouseEvent) {
              const diff = moveEvent.clientX - startX;
              const newWidth = Math.max(200, Math.min(800, startWidth + diff));
              sidebarWidth = newWidth;
            }
            
            function handleMouseUp() {
              isResizingSidebar = false;
              document.removeEventListener('mousemove', handleMouseMove);
              document.removeEventListener('mouseup', handleMouseUp);
            }
            
            document.addEventListener('mousemove', handleMouseMove);
            document.addEventListener('mouseup', handleMouseUp);
          }}
        />
      </div>
    {:else if activeTab === 'canvas'}
      <!-- Node Palette (only for Canvas tab) -->
      {#if showNodePalette}
        {#if isNodePaletteCollapsed}
          <!-- Collapsed: Just a thin vertical bar on the left -->
          <button
            type="button"
            style="
              width: 40px;
              background: #1a1a1f;
              border: none;
              border-right: 1px solid #333;
              display: flex;
              flex-direction: column;
              align-items: center;
              padding: 10px 0;
              cursor: pointer;
              transition: all 0.2s;
            "
            onclick={() => isNodePaletteCollapsed = false}
            onmouseenter={(e) => e.currentTarget.style.background = '#25252a'}
            onmouseleave={(e) => e.currentTarget.style.background = '#1a1a1f'}
            title="Expand Node Palette"
            aria-label="Expand Node Palette"
          >
            <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" style="color: #888; transform: rotate(-90deg);">
              <path d="M6 9l6 6 6-6"></path>
            </svg>
          </button>
        {:else}
          <div style="position: relative; width: {sidebarWidth}px; flex-shrink: 0; display: flex; height: 100%;">
            <NodePalette onBrowseModels={() => {
              console.log('App: onBrowseModels callback called from NodePalette');
              openModelBrowser();
            }} />
            <!-- Resize handle -->
            <div
              style="
                width: 4px;
                background: transparent;
                cursor: col-resize;
                flex-shrink: 0;
                transition: background 0.2s;
              "
              onmouseenter={(e) => e.currentTarget.style.background = '#007bff'}
              onmouseleave={(e) => {
                if (!isResizingSidebar) {
                  e.currentTarget.style.background = 'transparent';
                }
              }}
              onmousedown={(e) => {
                isResizingSidebar = true;
                e.preventDefault();
                const startX = e.clientX;
                const startWidth = sidebarWidth;
                
                function handleMouseMove(moveEvent: MouseEvent) {
                  const diff = moveEvent.clientX - startX;
                  const newWidth = Math.max(200, Math.min(800, startWidth + diff));
                  sidebarWidth = newWidth;
                }
                
                function handleMouseUp() {
                  isResizingSidebar = false;
                  document.removeEventListener('mousemove', handleMouseMove);
                  document.removeEventListener('mouseup', handleMouseUp);
                }
                
                document.addEventListener('mousemove', handleMouseMove);
                document.addEventListener('mouseup', handleMouseUp);
              }}
            />
            <!-- Collapse button -->
            <button
              onclick={() => isNodePaletteCollapsed = true}
              style="
                position: absolute;
                top: 10px;
                right: 10px;
                width: 24px;
                height: 24px;
                background: rgba(26, 26, 31, 0.9);
                border: 1px solid #333;
                border-radius: 4px;
                color: #888;
                cursor: pointer;
                display: flex;
                align-items: center;
                justify-content: center;
                z-index: 10;
                transition: all 0.2s;
              "
              onmouseenter={(e) => {
                e.currentTarget.style.background = 'rgba(37, 37, 42, 0.95)';
                e.currentTarget.style.borderColor = '#007bff';
                e.currentTarget.style.color = 'white';
              }}
              onmouseleave={(e) => {
                e.currentTarget.style.background = 'rgba(26, 26, 31, 0.9)';
                e.currentTarget.style.borderColor = '#333';
                e.currentTarget.style.color = '#888';
              }}
              title="Collapse Node Palette"
            >
              <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
                <path d="M9 18l-6-6 6-6"></path>
              </svg>
            </button>
          </div>
        {/if}
      {/if}
    {/if}
    
    <!-- Main Content -->
    <div style="flex: 1; display: flex; flex-direction: column; overflow: hidden;">
      {#if activeTab === 'projects'}
        <!-- Projects Tab -->
        <div style="flex: 1; min-height: 0; overflow: hidden;">
          <ProjectsTab {selectedProjectId} />
        </div>
      {:else if activeTab === 'canvas'}
        <!-- Canvas Area -->
        <div style="flex: {100 - chatHeight}; min-height: 0; overflow: hidden;">
          <WorkflowCanvas bind:showMinimap={showMinimap} />
        </div>
        
        <!-- Chat Panel at Bottom -->
        {#if isChatCollapsed}
          <!-- Collapsed: Just a thin horizontal bar at the bottom -->
          <button
            type="button"
            style="
              height: 40px;
              width: 100%;
              background: #1a1a1f;
              border: none;
              border-top: 1px solid #333;
              display: flex;
              align-items: center;
              justify-content: center;
              cursor: pointer;
              transition: all 0.2s;
              flex-shrink: 0;
            "
            onclick={() => isChatCollapsed = false}
            onmouseenter={(e) => e.currentTarget.style.background = '#25252a'}
            onmouseleave={(e) => e.currentTarget.style.background = '#1a1a1f'}
            title="Expand Chat"
            aria-label="Expand Chat"
          >
            <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" style="color: #888; transform: rotate(180deg);">
              <path d="M6 9l6 6 6-6"></path>
            </svg>
          </button>
        {:else}
          <div style="position: relative; height: {chatHeight}%; min-height: 200px; max-height: 600px; flex-shrink: 0; display: flex; flex-direction: column;">
            <!-- Resize handle -->
            <div
              style="
                height: 4px;
                width: 100%;
                background: transparent;
                cursor: row-resize;
                flex-shrink: 0;
                transition: background 0.2s;
              "
              onmouseenter={(e) => e.currentTarget.style.background = '#007bff'}
              onmouseleave={(e) => {
                if (!isResizingChat) {
                  e.currentTarget.style.background = 'transparent';
                }
              }}
              onmousedown={(e) => {
                isResizingChat = true;
                e.preventDefault();
                const startY = e.clientY;
                const containerHeight = (e.currentTarget.parentElement?.parentElement as HTMLElement)?.offsetHeight || 1000;
                const startHeight = chatHeight;
                
                function handleMouseMove(moveEvent: MouseEvent) {
                  const diff = moveEvent.clientY - startY;
                  const heightDiff = (diff / containerHeight) * 100;
                  const newHeight = Math.max(10, Math.min(60, startHeight - heightDiff));
                  chatHeight = newHeight;
                }
                
                function handleMouseUp() {
                  isResizingChat = false;
                  document.removeEventListener('mousemove', handleMouseMove);
                  document.removeEventListener('mouseup', handleMouseUp);
                }
                
                document.addEventListener('mousemove', handleMouseMove);
                document.addEventListener('mouseup', handleMouseUp);
              }}
            />
            <div style="flex: 1; min-height: 0; overflow: hidden;">
              <ChatPanel 
                onModelSelect={(id) => { selectedModelId = id; }}
                clearMessagesTrigger={clearChatTrigger}
              />
            </div>
            <!-- Collapse button -->
            <button
              onclick={() => isChatCollapsed = true}
              style="
                position: absolute;
                top: 10px;
                right: 10px;
                width: 24px;
                height: 24px;
                background: rgba(26, 26, 31, 0.9);
                border: 1px solid #333;
                border-radius: 4px;
                color: #888;
                cursor: pointer;
                display: flex;
                align-items: center;
                justify-content: center;
                z-index: 10;
                transition: all 0.2s;
              "
              onmouseenter={(e) => {
                e.currentTarget.style.background = 'rgba(37, 37, 42, 0.95)';
                e.currentTarget.style.borderColor = '#007bff';
                e.currentTarget.style.color = 'white';
              }}
              onmouseleave={(e) => {
                e.currentTarget.style.background = 'rgba(26, 26, 31, 0.9)';
                e.currentTarget.style.borderColor = '#333';
                e.currentTarget.style.color = '#888';
              }}
              title="Collapse Chat"
            >
              <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
                <path d="M6 9l6 6 6-6"></path>
              </svg>
            </button>
          </div>
        {/if}
      {/if}
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


