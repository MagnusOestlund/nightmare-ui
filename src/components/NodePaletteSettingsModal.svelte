<script lang="ts">
  /**
   * Node Palette Settings Modal
   * 
   * Allows users to customize which sections and nodes are visible in the Node Palette
   */

  const API_BASE = import.meta.env.VITE_API_URL || 'http://localhost:8001';

  let { 
    show = false,
    onClose = null,
    categories = [],
    nodesByCategory = {},
    visibleCategories = {},
    visibleNodes = {},
    onSave = null
  }: {
    show?: boolean;
    onClose?: (() => void) | null;
    categories?: string[];
    nodesByCategory?: Record<string, any[]>;
    visibleCategories?: Record<string, boolean>;
    visibleNodes?: Record<string, boolean>;
    onSave?: ((settings: { categories: Record<string, boolean>; nodes: Record<string, boolean> }) => void) | null;
  } = $props();

  let localVisibleCategories = $state<Record<string, boolean>>({});
  let localVisibleNodes = $state<Record<string, boolean>>({});

  $effect(() => {
    if (show) {
      // Initialize local state from props
      localVisibleCategories = { ...visibleCategories };
      localVisibleNodes = { ...visibleNodes };
    }
  });

  function toggleCategory(category: string) {
    localVisibleCategories[category] = !localVisibleCategories[category];
    localVisibleCategories = { ...localVisibleCategories };
  }

  function toggleNode(nodeId: string) {
    localVisibleNodes[nodeId] = !localVisibleNodes[nodeId];
    localVisibleNodes = { ...localVisibleNodes };
  }

  function handleSave() {
    if (onSave) {
      onSave({
        categories: localVisibleCategories,
        nodes: localVisibleNodes,
      });
    }
    if (onClose) {
      onClose();
    }
  }

  function handleReset() {
    // Reset to all visible
    const allCategories: Record<string, boolean> = {};
    const allNodes: Record<string, boolean> = {};
    
    for (const category of categories) {
      allCategories[category] = true;
    }
    
    for (const category of categories) {
      const nodes = nodesByCategory[category] || [];
      for (const node of nodes) {
        allNodes[node.id] = true;
      }
    }
    
    localVisibleCategories = allCategories;
    localVisibleNodes = allNodes;
  }
</script>

{#if show}
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
    onclick={onClose}
    onkeydown={(e) => e.key === 'Escape' && onClose && onClose()}
    role="dialog"
    aria-modal="true"
    tabindex="-1"
  >
    <div
      style="
        width: 90%;
        max-width: 600px;
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
        <h2 style="margin: 0; color: white; font-size: 18px;">Node Palette Settings</h2>
        <button
          onclick={onClose}
          style="
            background: transparent;
            border: none;
            color: #888;
            font-size: 20px;
            cursor: pointer;
            padding: 0;
            width: 30px;
            height: 30px;
            display: flex;
            align-items: center;
            justify-content: center;
          "
          onmouseenter={(e) => {
            e.currentTarget.style.color = 'white';
          }}
          onmouseleave={(e) => {
            e.currentTarget.style.color = '#888';
          }}
        >
          ×
        </button>
      </div>

      <!-- Content -->
      <div style="flex: 1; overflow-y: auto; padding: 20px; color: white;">
        <p style="margin: 0 0 20px 0; color: #888; font-size: 14px;">
          Customize which sections and nodes are visible in the Node Palette. 
          Hidden items won't appear in the palette but remain available in the system.
        </p>

        {#each categories as category}
          {@const nodes = nodesByCategory[category] || []}
          {@const isCategoryVisible = localVisibleCategories[category] !== false}
          
          <div style="margin-bottom: 20px;">
            <!-- Category Toggle -->
            <div style="
              display: flex;
              align-items: center;
              justify-content: space-between;
              padding: 12px;
              background: #25252a;
              border: 1px solid #333;
              border-radius: 6px;
              margin-bottom: 10px;
              cursor: pointer;
            "
            onclick={() => toggleCategory(category)}
            >
              <div style="display: flex; align-items: center; gap: 10px;">
                <input
                  type="checkbox"
                  checked={isCategoryVisible}
                  onchange={() => toggleCategory(category)}
                  onclick={(e) => e.stopPropagation()}
                  style="
                    width: 18px;
                    height: 18px;
                    cursor: pointer;
                  "
                />
                <span style="font-weight: bold; font-size: 16px; color: white; text-transform: uppercase;">
                  {category}
                </span>
                <span style="color: #666; font-size: 12px;">
                  ({nodes.length} {nodes.length === 1 ? 'node' : 'nodes'})
                </span>
              </div>
            </div>

            <!-- Individual Nodes (only show if category is visible) -->
            {#if isCategoryVisible}
              <div style="padding-left: 20px; display: flex; flex-direction: column; gap: 8px;">
                {#each nodes as node}
                  {@const isNodeVisible = localVisibleNodes[node.id] !== false}
                  <div style="
                    display: flex;
                    align-items: center;
                    justify-content: space-between;
                    padding: 10px;
                    background: #1f1f24;
                    border: 1px solid #2a2a2a;
                    border-radius: 4px;
                    cursor: pointer;
                  "
                  onclick={() => toggleNode(node.id)}
                  >
                    <div style="display: flex; align-items: center; gap: 10px; flex: 1;">
                      <input
                        type="checkbox"
                        checked={isNodeVisible}
                        onchange={() => toggleNode(node.id)}
                        onclick={(e) => e.stopPropagation()}
                        style="
                          width: 16px;
                          height: 16px;
                          cursor: pointer;
                        "
                      />
                      <div>
                        <div style="font-size: 14px; color: white; font-weight: 500;">
                          {node.name}
                        </div>
                        {#if node.description}
                          <div style="font-size: 12px; color: #888; margin-top: 2px;">
                            {node.description}
                          </div>
                        {/if}
                      </div>
                    </div>
                  </div>
                {/each}
              </div>
            {/if}
          </div>
        {/each}
      </div>

      <!-- Footer -->
      <div style="
        padding: 15px;
        border-top: 1px solid #333;
        display: flex;
        justify-content: space-between;
        align-items: center;
        flex-shrink: 0;
      ">
        <button
          onclick={handleReset}
          style="
            padding: 8px 16px;
            background: #25252a;
            border: 1px solid #333;
            border-radius: 4px;
            color: white;
            font-size: 14px;
            cursor: pointer;
          "
          onmouseenter={(e) => {
            e.currentTarget.style.background = '#2a2a2f';
            e.currentTarget.style.borderColor = '#444';
          }}
          onmouseleave={(e) => {
            e.currentTarget.style.background = '#25252a';
            e.currentTarget.style.borderColor = '#333';
          }}
        >
          Reset to Default
        </button>
        
        <div style="display: flex; gap: 10px;">
          <button
            onclick={onClose}
            style="
              padding: 8px 16px;
              background: #25252a;
              border: 1px solid #333;
              border-radius: 4px;
              color: white;
              font-size: 14px;
              cursor: pointer;
            "
            onmouseenter={(e) => {
              e.currentTarget.style.background = '#2a2a2f';
              e.currentTarget.style.borderColor = '#444';
            }}
            onmouseleave={(e) => {
              e.currentTarget.style.background = '#25252a';
              e.currentTarget.style.borderColor = '#333';
            }}
          >
            Cancel
          </button>
          <button
            onclick={handleSave}
            style="
              padding: 8px 16px;
              background: #007bff;
              border: 1px solid #007bff;
              border-radius: 4px;
              color: white;
              font-size: 14px;
              cursor: pointer;
            "
            onmouseenter={(e) => {
              e.currentTarget.style.background = '#0056b3';
            }}
            onmouseleave={(e) => {
              e.currentTarget.style.background = '#007bff';
            }}
          >
            Save
          </button>
        </div>
      </div>
    </div>
  </div>
{/if}


