<script lang="ts">
  /**
   * Node Palette Component
   * 
   * Phase 2: Sidebar with draggable node types
   * Users can drag nodes from palette to canvas
   * 
   * Features:
   * - Search by name and description
   * - Expandable/collapsible sections
   * - Drag and drop section reordering
   * - Persistent preferences
   * 
   * Pure Svelte 5 with runes - no compatibility mode
   */

  import { onMount } from 'svelte';
  import NodePaletteSettingsModal from './NodePaletteSettingsModal.svelte';
  // Note: $state, $derived, $effect are compiler magic - no import needed!

  // API base URL
  const API_BASE = import.meta.env.VITE_API_URL || 'http://localhost:8001';

  interface NodeType {
    id: string;
    name: string;
    category: 'data' | 'transform' | 'control' | 'analytics' | 'utility' | 'models';
    icon?: string;
    description: string;
  }

  interface Model {
    id: string;
    name: string;
    family?: string;
  }

  interface CategoryState {
    expanded: boolean;
    order: number;
  }

  // Base node types available in the palette
  const baseNodeTypes: NodeType[] = [
    {
      id: 'start',
      name: 'Start',
      category: 'control',
      description: 'Start node - beginning of workflow (empty, ready state)',
    },
    {
      id: 'results',
      name: 'Results',
      category: 'utility',
      description: 'Inspect model output: view tokens, cost, JSON, and pretty print. Just a viewer - no actions taken.',
    },
    {
      id: 'upload',
      name: 'Upload',
      category: 'data',
      description: 'Upload files, images, or videos',
    },
    {
      id: 'load_duckdb',
      name: 'Load DuckDB',
      category: 'data',
      description: 'Load CSV/JSON into DuckDB',
    },
    {
      id: 'python_code',
      name: 'Python Code',
      category: 'transform',
      description: 'Execute Python code block',
    },
    {
      id: 'data_profile',
      name: 'Data Profile',
      category: 'analytics',
      description: 'Statistical summary of data',
    },
    {
      id: 'query_duckdb',
      name: 'Query DuckDB',
      category: 'analytics',
      description: 'SQL query on DuckDB data',
    },
    {
      id: 'loop',
      name: 'Loop',
      category: 'control',
      description: 'For each item in array',
    },
    {
      id: 'branch',
      name: 'Branch',
      category: 'control',
      description: 'Conditional routing (if/else)',
    },
    {
      id: 'output',
      name: 'Output',
      category: 'utility',
      description: 'Send actions: Slack, email, file, webhook. Only runs if connected. Use after Results to verify output first.',
    },
  ];

  // Pure Svelte 5 runes for state
  let models = $state<Model[]>([]);
  let modelNodes = $state<NodeType[]>([]);
  
  // Initialize with base nodes immediately so they show up
  let allNodeTypes = $state<NodeType[]>([
    {
      id: 'browse-models',
      name: 'Browse Models',
      category: 'models' as const,
      description: 'Browse and select available AI models'
    },
    ...baseNodeTypes
  ]);
  
  let searchQuery = $state<string>('');
  let categoryStates = $state<Record<string, CategoryState>>({
    models: { expanded: true, order: 0 },
    data: { expanded: true, order: 1 },
    transform: { expanded: true, order: 2 },
    control: { expanded: true, order: 3 },
    analytics: { expanded: true, order: 4 },
    utility: { expanded: true, order: 5 },
  });
  let categoryOrder = $state<string[]>(['models', 'control', 'data', 'transform', 'analytics', 'utility']);
  let draggedCategory = $state<string | null>(null);
  let draggedOverCategory = $state<string | null>(null);
  let showSettingsModal = $state<boolean>(false);
  
  // Visibility settings (default: all visible)
  let visibleCategories = $state<Record<string, boolean>>({});
  let visibleNodes = $state<Record<string, boolean>>({});

  // Pure Svelte 5 props with $props()
  let { onBrowseModels = null }: { onBrowseModels?: (() => void) | null } = $props();

  // Mock models for when backend is not available
  const mockModels: Model[] = [
    { id: 'ministral-3-8b', name: 'Mistral 3 8B', family: 'Mistral' },
    { id: 'qwen-2.5-7b', name: 'Qwen 2.5 7B', family: 'Qwen' },
    { id: 'llama-3-8b', name: 'Llama 3 8B', family: 'Llama' }
  ];

  // Default category states (all expanded by default)
  const defaultCategoryStates: Record<string, CategoryState> = {
    models: { expanded: true, order: 0 },
    data: { expanded: true, order: 1 },
    transform: { expanded: true, order: 2 },
    control: { expanded: true, order: 3 },
    analytics: { expanded: true, order: 4 },
    utility: { expanded: true, order: 5 },
  };

  onMount(() => {
    loadModels();
    loadPreferences();
    loadVisibilitySettings();
  });

  async function loadModels() {
    try {
      const res = await fetch(`${API_BASE}/api/v1/models`);
      if (res.ok) {
        const data = await res.json();
        models = Array.isArray(data) ? data.map((m: any) => ({
          id: m.model_id || m.id,
          name: m.model_name || m.name,
          family: m.model_family
        })) : [];
      } else {
        models = [...mockModels];
      }
    } catch (err: any) {
      models = [...mockModels];
    }
  }

  // Load preferences from API or localStorage
  async function loadPreferences() {
    try {
      const res = await fetch(`${API_BASE}/api/v1/user/preferences/node-palette`);
      if (res.ok) {
        const data = await res.json();
        if (data.categoryOrder) {
          categoryOrder = [...data.categoryOrder];
        }
        if (data.categoryStates) {
          // Merge with defaults to ensure all categories exist
          const currentStates = { ...$state.snapshot(categoryStates) };
          Object.assign(currentStates, defaultCategoryStates);
          Object.assign(currentStates, data.categoryStates);
          categoryStates = currentStates;
        }
      } else {
        // Fallback to localStorage
        const stored = localStorage.getItem('nodePalettePreferences');
        if (stored) {
          const parsed = JSON.parse(stored);
          if (parsed.categoryOrder) {
            categoryOrder = [...parsed.categoryOrder];
          }
          if (parsed.categoryStates) {
            // Merge with defaults to ensure all categories exist
            const currentStates = { ...$state.snapshot(categoryStates) };
            Object.assign(currentStates, defaultCategoryStates);
            Object.assign(currentStates, parsed.categoryStates);
            categoryStates = currentStates;
          }
        }
      }
    } catch (err: any) {
      // Fallback to localStorage
      const stored = localStorage.getItem('nodePalettePreferences');
      if (stored) {
        const parsed = JSON.parse(stored);
        if (parsed.categoryOrder) {
          categoryOrder = [...parsed.categoryOrder];
        }
        if (parsed.categoryStates) {
          // Merge with defaults to ensure all categories exist
          const currentStates = { ...$state.snapshot(categoryStates) };
          Object.assign(currentStates, defaultCategoryStates);
          Object.assign(currentStates, parsed.categoryStates);
          categoryStates = currentStates;
        }
      }
    }
  }

  // Load visibility settings from API or localStorage
  async function loadVisibilitySettings() {
    try {
      const res = await fetch(`${API_BASE}/api/v1/user/preferences/node-palette-visibility`);
      if (res.ok) {
        const data = await res.json();
        if (data.categories) {
          visibleCategories = { ...data.categories };
        }
        if (data.nodes) {
          visibleNodes = { ...data.nodes };
        }
      }
    } catch (err: any) {
      // Fallback to localStorage
      try {
        const stored = localStorage.getItem('nodePaletteVisibility');
        if (stored) {
          const data = JSON.parse(stored);
          visibleCategories = data.categories || {};
          visibleNodes = data.nodes || {};
        }
      } catch (e) {
        // Default: all visible (empty objects means all visible)
        visibleCategories = {};
        visibleNodes = {};
      }
    }
  }

  // Save visibility settings to API and localStorage
  async function saveVisibilitySettings(settings: { categories: Record<string, boolean>; nodes: Record<string, boolean> }) {
    visibleCategories = settings.categories;
    visibleNodes = settings.nodes;
    
    try {
      await fetch(`${API_BASE}/api/v1/user/preferences/node-palette-visibility`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(settings),
      });
    } catch (err: any) {
      // Fallback to localStorage
      try {
        localStorage.setItem('nodePaletteVisibility', JSON.stringify(settings));
      } catch (e) {
        console.warn('Failed to save visibility settings:', e);
      }
    }
  }

  // Save preferences to API and localStorage
  async function savePreferences() {
    const preferences = {
      categoryOrder: $state.snapshot(categoryOrder),
      categoryStates: $state.snapshot(categoryStates)
    };

    // Save to localStorage immediately (fallback)
    localStorage.setItem('nodePalettePreferences', JSON.stringify(preferences));

    // Try to save to API (silently fail if backend is not available)
    try {
      await fetch(`${API_BASE}/api/v1/user/preferences/node-palette`, {
        method: 'PUT',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(preferences),
      });
    } catch (err: any) {
      // Silently fail - localStorage is already saved
    }
  }

  // Toggle category expanded state
  function toggleCategory(category: string) {
    console.log('toggleCategory called for:', category);
    // Ensure category state exists
    const currentStates = $state.snapshot(categoryStates);
    if (!currentStates[category]) {
      categoryStates = {
        ...currentStates,
        [category]: { expanded: true, order: categoryOrder.indexOf(category) }
      };
      return;
    }
    // Toggle expanded state - create new object to trigger reactivity
    categoryStates = {
      ...currentStates,
      [category]: {
        ...currentStates[category],
        expanded: !currentStates[category].expanded
      }
    };
    savePreferences();
  }

  // Handle drag start for category reordering
  function handleCategoryDragStart(e: DragEvent, category: string) {
    draggedCategory = category;
    if (e.dataTransfer) {
      e.dataTransfer.effectAllowed = 'move';
      e.dataTransfer.setData('text/plain', category);
    }
  }

  // Handle drag over for category reordering
  function handleCategoryDragOver(e: DragEvent, category: string) {
    e.preventDefault();
    e.stopPropagation();
    if (e.dataTransfer) {
      e.dataTransfer.dropEffect = 'move';
    }
    if (draggedCategory && draggedCategory !== category) {
      draggedOverCategory = category;
    }
  }

  // Handle drop for category reordering
  function handleCategoryDrop(e: DragEvent, targetCategory: string) {
    e.preventDefault();
    e.stopPropagation();
    console.log('handleCategoryDrop called:', draggedCategory, '->', targetCategory);
    if (draggedCategory && draggedCategory !== targetCategory) {
      const currentOrder = $state.snapshot(categoryOrder);
      const draggedIndex = currentOrder.indexOf(draggedCategory);
      const targetIndex = currentOrder.indexOf(targetCategory);
      
      console.log('Indices:', draggedIndex, targetIndex);
      
      if (draggedIndex !== -1 && targetIndex !== -1) {
        // Create new array to trigger reactivity
        const newOrder = [...currentOrder];
        // Remove dragged category
        newOrder.splice(draggedIndex, 1);
        // Insert at target position
        newOrder.splice(targetIndex, 0, draggedCategory);
        console.log('New order:', newOrder);
        // Update categoryOrder (triggers reactivity)
        categoryOrder = newOrder;
        
        // Update order in categoryStates
        const currentStates = $state.snapshot(categoryStates);
        const newStates = { ...currentStates };
        categoryOrder.forEach((cat, idx) => {
          if (!newStates[cat]) {
            newStates[cat] = { expanded: true, order: idx };
          } else {
            newStates[cat] = { ...newStates[cat], order: idx };
          }
        });
        categoryStates = newStates;
        savePreferences();
      }
    }
    draggedCategory = null;
    draggedOverCategory = null;
  }

  // Handle drag end
  function handleCategoryDragEnd() {
    draggedCategory = null;
    draggedOverCategory = null;
  }

  // Create model nodes from loaded models (reactive with Svelte 5 $effect)
  $effect(() => {
    // Access models to track it
    const currentModels = models;
    
    // Add "Browse Models" as the first node in MODELS category
    const browseModelsNode: NodeType = {
      id: 'browse-models',
      name: 'Browse Models',
      category: 'models' as const,
      description: 'Browse and select available AI models'
    };
    
    // Create model nodes from loaded models
    const newModelNodes = currentModels.map(model => ({
      id: `model-${model.id}`,
      name: model.name,
      category: 'models' as const,
      description: `AI model: ${model.name}${model.family ? ` (${model.family})` : ''}`
    }));
    
    const newModelNodesArray = [browseModelsNode, ...newModelNodes];
    
    // Only update if the model nodes actually changed (by comparing IDs)
    const currentModelNodeIds = modelNodes.map(n => n.id).sort().join(',');
    const newModelNodeIds = newModelNodesArray.map(n => n.id).sort().join(',');
    
    if (currentModelNodeIds !== newModelNodeIds) {
      modelNodes = newModelNodesArray;
      
      // Combine base nodes with model nodes (replace models category nodes)
      const baseNodesWithoutModels = baseNodeTypes.filter(n => n.category !== 'models');
      allNodeTypes = [...baseNodesWithoutModels, ...modelNodes];
      console.log('NodePalette: Nodes updated, total nodes:', allNodeTypes.length);
    }
  });

  // Group nodes by category (reactive with Svelte 5 $derived)
  // Filter by visibility: category must be visible (or not set = visible by default)
  let nodesByCategory = $derived.by(() => {
    const result: Record<string, NodeType[]> = {};
    for (const category of categoryOrder) {
      // Filter by visibility: category must be visible (or not set = visible by default)
      const isCategoryVisible = visibleCategories[category] !== false;
      if (!isCategoryVisible) {
        result[category] = [];
        continue;
      }
      
      // Filter nodes by visibility
      result[category] = allNodeTypes.filter(node => {
        if (node.category !== category) return false;
        // Node must be visible (or not set = visible by default)
        return visibleNodes[node.id] !== false;
      });
    }
    return result;
  });

  // Filter nodes based on search query (reactive with Svelte 5 $derived.by)
  let filteredNodesByCategory = $derived.by(() => {
    const query = searchQuery.toLowerCase().trim();
    const currentNodesByCategory = nodesByCategory;
    
    if (!query) {
      return currentNodesByCategory;
    }
    
    const filtered: Record<string, NodeType[]> = {};
    for (const category in currentNodesByCategory) {
      filtered[category] = currentNodesByCategory[category].filter(node => {
        const nameMatch = node.name.toLowerCase().includes(query);
        const descMatch = node.description.toLowerCase().includes(query);
        return nameMatch || descMatch;
      });
    }
    return filtered;
  });

  // Get node color for drag preview
  function getNodeColorForPreview(nodeType: string): string {
    if (nodeType === 'start') return '#2ecc71'; // green
    if (nodeType === 'results' || nodeType === 'output') return '#9b59b6'; // purple
    if (nodeType.startsWith('model-')) return '#3498db'; // blue
    if (nodeType === 'upload' || nodeType === 'load_duckdb' || nodeType === 'http_request') return '#2ecc71'; // green
    return '#95a5a6'; // gray
  }

  // Handle node drag start
  function handleDragStart(event: DragEvent, nodeType: NodeType) {
    console.log('NodePalette: Drag start for node:', nodeType.id, nodeType.name);
    // CRITICAL: Stop propagation to prevent category drag from triggering
    event.stopPropagation();
    
    if (event.dataTransfer) {
      event.dataTransfer.setData('application/node-type', nodeType.id);
      event.dataTransfer.effectAllowed = 'copy';
      
      // Create custom drag preview with connection handles
      const preview = document.createElement('div');
      const nodeColor = getNodeColorForPreview(nodeType.id);
      
      // Determine connection points based on node type
      let hasInput = true;
      let hasOutput = true;
      if (nodeType.id === 'start') {
        hasInput = false;
        hasOutput = true;
      } else if (nodeType.id === 'results' || nodeType.id === 'output') {
        hasInput = true;
        hasOutput = false;
      }
      
      preview.style.cssText = `
        width: 120px;
        height: 80px;
        background: ${nodeColor};
        border: 2px solid ${nodeColor};
        border-radius: 8px;
        padding: 12px;
        display: flex;
        flex-direction: column;
        align-items: center;
        justify-content: center;
        color: white;
        font-weight: bold;
        font-size: 12px;
        text-align: center;
        box-shadow: 0 4px 12px rgba(0, 0, 0, 0.4);
        pointer-events: none;
        position: relative;
      `;
      preview.textContent = nodeType.name;
      
      // Add connection handles to preview
      if (hasInput) {
        const inputHandle = document.createElement('div');
        inputHandle.style.cssText = `
          position: absolute;
          left: -8px;
          top: 50%;
          transform: translateY(-50%);
          width: 12px;
          height: 12px;
          background: #3498db;
          border: 2px solid white;
          border-radius: 50%;
          box-shadow: 0 0 4px rgba(0, 0, 0, 0.5);
        `;
        preview.appendChild(inputHandle);
      }
      
      if (hasOutput) {
        const outputHandle = document.createElement('div');
        outputHandle.style.cssText = `
          position: absolute;
          right: -8px;
          top: 50%;
          transform: translateY(-50%);
          width: 12px;
          height: 12px;
          background: #3498db;
          border: 2px solid white;
          border-radius: 50%;
          box-shadow: 0 0 4px rgba(0, 0, 0, 0.5);
        `;
        preview.appendChild(outputHandle);
      }
      
      // Position off-screen so it's not visible
      preview.style.position = 'absolute';
      preview.style.top = '-1000px';
      preview.style.left = '-1000px';
      document.body.appendChild(preview);
      
      // Set the drag image
      event.dataTransfer.setDragImage(preview, 60, 40); // Center of the preview
      
      // Clean up after a short delay
      setTimeout(() => {
        document.body.removeChild(preview);
      }, 0);
      
      console.log('NodePalette: Data transfer set:', nodeType.id);
    } else {
      console.error('NodePalette: dataTransfer is null!');
    }
  }
  
  // Handle node click (for special nodes like Browse Models)
  function handleNodeClick(nodeType: NodeType) {
    console.log('Node clicked:', nodeType.id, 'onBrowseModels:', onBrowseModels);
    if (nodeType.id === 'browse-models' && onBrowseModels) {
      console.log('Calling onBrowseModels callback');
      onBrowseModels();
    }
  }
</script>

<div style="width: 100%; height: 100%; border-right: 1px solid #333; background: #1a1a1f; padding: 10px; display: flex; flex-direction: column;">
  <div style="display: flex; align-items: center; justify-content: space-between; margin-bottom: 15px; flex-shrink: 0;">
    <h2 style="color: white; margin: 0;">Node Palette</h2>
    <button
      onclick={() => showSettingsModal = true}
      style="
        width: 24px;
        height: 24px;
        background: transparent;
        border: none;
        cursor: pointer;
        padding: 0;
        display: flex;
        align-items: center;
        justify-content: center;
        color: #888;
      "
      onmouseenter={(e) => {
        e.currentTarget.style.color = 'white';
      }}
      onmouseleave={(e) => {
        e.currentTarget.style.color = '#888';
      }}
      title="Node Palette Settings"
    >
      <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">
        <path d="M12.22 2h-.44a2 2 0 0 0-2 2v.18a2 2 0 0 1-1 1.73l-.43.25a2 2 0 0 1-2 0l-.15-.08a2 2 0 0 0-2.73.73l-.22.38a2 2 0 0 0 .73 2.73l.15.1a2 2 0 0 1 1 1.72v.51a2 2 0 0 1-1 1.74l-.15.09a2 2 0 0 0-.73 2.73l.22.38a2 2 0 0 0 2.73.73l.15-.08a2 2 0 0 1 2 0l.43.25a2 2 0 0 1 1 1.73V20a2 2 0 0 0 2 2h.44a2 2 0 0 0 2-2v-.18a2 2 0 0 1 1-1.73l.43-.25a2 2 0 0 1 2 0l.15.08a2 2 0 0 0 2.73-.73l.22-.39a2 2 0 0 0-.73-2.73l-.15-.08a2 2 0 0 1-1-1.74v-.5a2 2 0 0 1 1-1.74l.15-.09a2 2 0 0 0 .73-2.73l-.22-.38a2 2 0 0 0-2.73-.73l-.15.08a2 2 0 0 1-2 0l-.43-.25a2 2 0 0 1-1-1.73V4a2 2 0 0 0-2-2z"></path>
        <circle cx="12" cy="12" r="3"></circle>
      </svg>
    </button>
  </div>
  
  <!-- Search Bar -->
  <div style="margin-bottom: 15px; flex-shrink: 0;">
    <input
      type="text"
      placeholder="Search nodes..."
      bind:value={searchQuery}
      style="
        width: 100%;
        padding: 8px 12px;
        background: #25252a;
        border: 1px solid #333;
        border-radius: 4px;
        color: white;
        font-size: 14px;
      "
      onfocus={(e) => {
        e.currentTarget.style.borderColor = '#007bff';
      }}
      onblur={(e) => {
        e.currentTarget.style.borderColor = '#333';
      }}
    />
  </div>
  
  <!-- Categories (scrollable area) -->
  <div style="flex: 1; overflow-y: auto; min-height: 0;">
    {#each categoryOrder as category}
      {@const nodes = filteredNodesByCategory[category] || []}
      {@const categoryState = categoryStates[category]}
      {@const isExpanded = categoryState ? categoryState.expanded : true}
      {#if nodes.length > 0 || !searchQuery}
        <div
          style="
            margin-bottom: 15px;
            border: 1px solid {draggedOverCategory === category ? '#007bff' : '#333'};
            border-radius: 4px;
            background: {draggedOverCategory === category ? '#1a1a3a' : 'transparent'};
            transition: all 0.2s;
          "
          ondragover={(e) => {
            // Only allow category drop if dragging a category (not a node)
            const isCategoryDrag = e.dataTransfer?.types.includes('text/plain') && 
                                   e.dataTransfer?.getData('text/plain')?.startsWith('category-');
            if (isCategoryDrag) {
              handleCategoryDragOver(e, category);
            }
          }}
          ondrop={(e) => {
            const isCategoryDrag = e.dataTransfer?.types.includes('text/plain') && 
                                   e.dataTransfer?.getData('text/plain')?.startsWith('category-');
            if (isCategoryDrag) {
              handleCategoryDrop(e, category);
            }
          }}
        >
          <!-- Category Header (clickable to expand/collapse, draggable) -->
          <div
            draggable="true"
            ondragstart={(e) => {
              e.stopPropagation(); // Prevent node drag from triggering
              handleCategoryDragStart(e, category);
            }}
            ondragover={(e) => {
              e.stopPropagation();
              handleCategoryDragOver(e, category);
            }}
            ondrop={(e) => {
              e.stopPropagation();
              handleCategoryDrop(e, category);
            }}
            ondragend={(e) => {
              e.stopPropagation();
              handleCategoryDragEnd();
            }}
            style="
              padding: 10px;
              background: #25252a;
              border-bottom: {isExpanded ? '1px solid #333' : 'none'};
              cursor: move;
              display: flex;
              align-items: center;
              justify-content: space-between;
              user-select: none;
            "
            onclick={(e) => {
              e.stopPropagation();
              toggleCategory(category);
            }}
          >
            <div style="display: flex; align-items: center; gap: 8px; flex: 1;">
              <span style="color: #888; font-size: 12px; text-transform: uppercase; font-weight: bold;">
                {category}
              </span>
              <span style="color: #555; font-size: 10px;">
                ({nodes.length})
              </span>
            </div>
            <div style="display: flex; align-items: center; gap: 5px;">
              <span style="color: #666; font-size: 10px; cursor: move;" title="Drag to reorder">
                ⋮⋮
              </span>
              <span style="color: #888; font-size: 12px;">
                {isExpanded ? '▼' : '▶'}
              </span>
            </div>
          </div>
          
          <!-- Category Content (nodes) -->
          {#if isExpanded}
            <div style="padding: 10px;">
              {#each nodes as node}
                {@const isModelNode = node.id.startsWith('model-')}
                <div
                  draggable={node.id !== 'browse-models'}
                  ondragstart={(e) => {
                    if (node.id !== 'browse-models') {
                      handleDragStart(e, node);
                    } else {
                      e.preventDefault();
                    }
                  }}
                  onclick={(e) => {
                    if (node.id === 'browse-models') {
                      console.log('onclick fired for node:', node.id);
                      e.stopPropagation();
                      e.preventDefault();
                      handleNodeClick(node);
                    }
                  }}
                  onmousedown={(e) => {
                    if (node.id === 'browse-models') {
                      // Don't prevent default - allow click to work
                    }
                  }}
                  title={isModelNode ? node.description : undefined}
                  style="
                    padding: 10px;
                    margin-bottom: 8px;
                    background: #25252a;
                    border: 1px solid #333;
                    border-radius: 6px;
                    cursor: {node.id === 'browse-models' ? 'pointer' : 'grab'};
                    color: white;
                    transition: all 0.2s;
                    position: relative;
                  "
                  onmouseenter={(e) => {
                    e.currentTarget.style.borderColor = '#007bff';
                    e.currentTarget.style.background = '#2a2a2f';
                  }}
                  onmouseleave={(e) => {
                    e.currentTarget.style.borderColor = '#333';
                    e.currentTarget.style.background = '#25252a';
                  }}
                >
                  <div style="font-weight: bold; margin-bottom: 4px;">
                    {node.name}
                  </div>
                  <div style="font-size: 11px; color: #888;">
                    {node.description}
                  </div>
                </div>
              {/each}
            </div>
          {/if}
        </div>
      {/if}
    {/each}
    
    <!-- Bottom padding INSIDE scrollable area for better scrolling (enough for ~3 more nodes) -->
    <div style="height: 400px; flex-shrink: 0;"></div>
  </div>
</div>

<!-- Node Palette Settings Modal -->
<NodePaletteSettingsModal
  show={showSettingsModal}
  onClose={() => showSettingsModal = false}
  categories={categoryOrder}
  nodesByCategory={nodesByCategory}
  {visibleCategories}
  {visibleNodes}
  onSave={saveVisibilitySettings}
/>

<style>
  div[draggable="true"]:active {
    cursor: grabbing;
    opacity: 0.7;
  }
</style>
