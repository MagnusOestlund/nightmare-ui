<script lang="ts">
  /**
   * Model Browser Component
   * 
   * Displays a list of all available models with their details
   */

  import { onMount } from 'svelte';

  // API base URL
  const API_BASE = import.meta.env.VITE_API_URL || 'http://localhost:8001';

  interface Model {
    id: string;
    name: string;
    family?: string;
    description?: string;
    status?: string;
    source?: 'local' | 'default' | 'online'; // Model source: local (installed), default (server-controlled), online (HuggingFace, etc.)
    install_path?: string; // For default models, the controlled download path
  }

  // Note: $state, $derived, $props are compiler magic - no import needed!

  let { 
    onModelSelect = null,
    onViewDetails = null,
    onAddModel = null
  }: {
    onModelSelect?: ((modelId: string) => void) | null;
    onViewDetails?: ((modelId: string) => void) | null;
    onAddModel?: (() => void) | null;
  } = $props();

  let models = $state<Model[]>([]);
  let loading = $state<boolean>(false);
  let error = $state<string | null>(null);
  let searchQuery = $state<string>('');
  
  // Filter models based on search query (reactive with $derived)
  let filteredModels = $derived.by(() => {
    const query = searchQuery.toLowerCase().trim();
    if (!query) {
      return models;
    }
    return models.filter(model => {
      const nameMatch = model.name.toLowerCase().includes(query);
      const familyMatch = model.family?.toLowerCase().includes(query);
      const descMatch = model.description?.toLowerCase().includes(query);
      return nameMatch || familyMatch || descMatch;
    });
  });
  
  // Separate filtered models into Local and Default (reactive with $derived)
  let localModels = $derived.by(() => {
    return filteredModels.filter(model => {
      return model.source === 'local' || 
             (!model.source && (model.status === 'available' || model.status === 'installed' || !model.status));
    });
  });
  
  let defaultModels = $derived.by(() => {
    return filteredModels.filter(model => {
      return model.source === 'default' || 
             model.status === 'default' || 
             model.install_path !== undefined;
    });
  });

  // Mock models for when backend is not available
  const mockModels: Model[] = [
    {
      id: 'ministral-3-8b',
      name: 'Mistral 3 8B',
      family: 'Mistral',
      description: 'Mistral 3 8B model for general purpose AI tasks',
      status: 'available',
      source: 'local' // Installed on this machine
    },
    {
      id: 'qwen-2.5-7b',
      name: 'Qwen 2.5 7B',
      family: 'Qwen',
      description: 'Qwen 2.5 7B model optimized for reasoning',
      status: 'available',
      source: 'local' // Installed on this machine
    },
    {
      id: 'llama-3-8b',
      name: 'Llama 3 8B',
      family: 'Llama',
      description: 'Meta Llama 3 8B model',
      status: 'available',
      source: 'default', // Server-controlled, pre-packaged
      install_path: 'https://models.nightmare.ai/default/llama-3-8b'
    }
  ];

  onMount(() => {
    loadModels();
  });

  async function loadModels() {
    loading = true;
    error = null;
    
    try {
      const res = await fetch(`${API_BASE}/api/v1/models`);
      if (res.ok) {
        const data = await res.json();
        const mappedModels = Array.isArray(data) ? data.map((m: any) => ({
          id: m.model_id || m.id,
          name: m.model_name || m.name,
          family: m.model_family,
          description: m.description,
          status: m.status || 'available',
          source: m.source || (m.install_path ? 'default' : 'local'), // Infer source from install_path
          install_path: m.install_path
        })) : [];
        models = mappedModels;
        console.log('Loaded models from API:', models.length);
      } else {
        // Use mock models if API fails
        models = [...mockModels];
        console.log('Using mock models (API not OK):', models.length);
      }
    } catch (err: any) {
      console.error('Error loading models:', err);
      // Use mock models as fallback
      models = [...mockModels];
      error = `Backend not available. Showing mock models.`;
      console.log('Using mock models due to error:', models.length);
    } finally {
      loading = false;
      console.log('Models loaded, total:', models.length);
    }
  }

  function handleModelClick(modelId: string) {
    if (onModelSelect) {
      onModelSelect(modelId);
    }
  }

  function handleViewDetails(e: MouseEvent, modelId: string) {
    e.stopPropagation(); // Prevent triggering the model selection
    if (onViewDetails) {
      onViewDetails(modelId);
    }
  }

</script>

<div style="padding: 20px; height: 100%; overflow-y: auto; background: #1a1a1f; color: white;">
  <div style="display: flex; justify-content: space-between; align-items: center; margin-bottom: 20px;">
    <h2 style="margin: 0;">Model Browser</h2>
    <button
      onclick={() => {
        if (onAddModel) onAddModel();
      }}
      style="
        padding: 8px 16px;
        background: #28a745;
        color: white;
        border: none;
        border-radius: 4px;
        cursor: pointer;
        font-size: 14px;
        font-weight: bold;
      "
      onmouseenter={(e) => {
        e.currentTarget.style.background = '#218838';
      }}
      onmouseleave={(e) => {
        e.currentTarget.style.background = '#28a745';
      }}
      title="Add a model from local folder, HuggingFace, or other online sources"
    >
      + Add Model
    </button>
  </div>
  
  <div style="margin-bottom: 15px; padding: 10px; background: #25252a; border-radius: 4px; font-size: 12px; color: #888;">
    <strong style="color: #ccc;">Model Sources:</strong>
    <ul style="margin: 5px 0 0 20px; padding: 0;">
      <li><strong>Local:</strong> Models downloaded and installed on this machine</li>
      <li><strong>Default:</strong> Server-controlled models with pre-packaged installs (compatible, controlled download path)</li>
      <li><strong>Online:</strong> Browse and install models from HuggingFace or other online sources</li>
    </ul>
  </div>
  
  <!-- Search -->
  <div style="margin-bottom: 20px;">
    <input
      type="text"
      placeholder="Search models..."
      bind:value={searchQuery}
      style="width: 100%; padding: 8px; background: #25252a; border: 1px solid #333; color: white; border-radius: 4px;"
    />
  </div>

  <!-- Error message -->
  {#if error}
    <div style="padding: 10px; background: #ff6b6b; color: white; border-radius: 4px; margin-bottom: 20px;">
      {error}
    </div>
  {/if}

  <!-- Loading -->
  {#if loading}
    <div style="padding: 20px; text-align: center;">
      <p>Loading models...</p>
    </div>
  {:else if localModels.length === 0 && defaultModels.length === 0}
    <div style="padding: 20px; text-align: center;">
      <p>No models found. (Total: {models.length}, Filter: "{searchQuery}")</p>
      <button 
        onclick={loadModels}
        style="margin-top: 10px; padding: 8px 16px; background: #007bff; color: white; border: none; border-radius: 4px; cursor: pointer;"
      >
        Retry
      </button>
    </div>
  {:else}
    <!-- Local Models Section -->
    {#if localModels.length > 0}
      <div style="margin-bottom: 30px;">
        <h3 style="margin: 0 0 8px 0; font-size: 14px; text-transform: uppercase; color: #888; letter-spacing: 1px;">
          Local ({localModels.length})
        </h3>
        <p style="margin: 0 0 15px 0; font-size: 12px; color: #666;">
          Models downloaded and installed on this machine
        </p>
        <div style="display: flex; flex-direction: column; gap: 12px;">
          {#each localModels as model (model.id)}
        <div
          onclick={() => handleModelClick(model.id)}
          style="
            padding: 16px;
            background: #25252a;
            border: 1px solid #333;
            border-radius: 8px;
            cursor: pointer;
            transition: all 0.2s;
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
          <div style="display: flex; justify-content: space-between; align-items: start; margin-bottom: 8px;">
            <div style="flex: 1;">
              <h3 style="margin: 0 0 4px 0; font-size: 16px; font-weight: bold;">
                {model.name}
              </h3>
              <p style="margin: 0; font-size: 12px; color: #888;">
                ID: {model.id}
                {#if model.family}
                  | Family: {model.family}
                {/if}
              </p>
            </div>
            <div style="display: flex; gap: 8px; align-items: center;">
              {#if model.status}
                <span style="
                  padding: 4px 8px;
                  background: {model.status === 'available' ? '#28a745' : '#ffc107'};
                  color: white;
                  border-radius: 4px;
                  font-size: 11px;
                ">
                  {model.status}
                </span>
              {/if}
              <button
                onclick={(e) => handleViewDetails(e, model.id)}
                style="
                  padding: 6px 12px;
                  background: #007bff;
                  color: white;
                  border: none;
                  border-radius: 4px;
                  cursor: pointer;
                  font-size: 12px;
                  white-space: nowrap;
                "
                onmouseenter={(e) => {
                  e.currentTarget.style.background = '#0056b3';
                }}
                onmouseleave={(e) => {
                  e.currentTarget.style.background = '#007bff';
                }}
              >
                View Details
              </button>
            </div>
          </div>
          {#if model.description}
            <p style="margin: 8px 0 0 0; font-size: 13px; color: #ccc;">
              {model.description}
            </p>
          {/if}
        </div>
        {/each}
        </div>
      </div>
    {/if}

    <!-- Default Models Section -->
    {#if defaultModels.length > 0}
      <div style="margin-bottom: 30px;">
        <h3 style="margin: 0 0 8px 0; font-size: 14px; text-transform: uppercase; color: #888; letter-spacing: 1px;">
          Default ({defaultModels.length})
        </h3>
        <p style="margin: 0 0 15px 0; font-size: 12px; color: #666;">
          Server-controlled models with pre-packaged installs, known to be compatible
        </p>
        <div style="display: flex; flex-direction: column; gap: 12px;">
          {#each defaultModels as model (model.id)}
            <div
              onclick={() => handleModelClick(model.id)}
              style="
                padding: 16px;
                background: #25252a;
                border: 1px solid #333;
                border-radius: 8px;
                cursor: pointer;
                transition: all 0.2s;
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
              <div style="display: flex; justify-content: space-between; align-items: start; margin-bottom: 8px;">
                <div style="flex: 1;">
                  <h3 style="margin: 0 0 4px 0; font-size: 16px; font-weight: bold;">
                    {model.name}
                  </h3>
                  <p style="margin: 0; font-size: 12px; color: #888;">
                    ID: {model.id}
                    {#if model.family}
                      | Family: {model.family}
                    {/if}
                  </p>
                </div>
                <div style="display: flex; gap: 8px; align-items: center;">
                  {#if model.status}
                    <span style="
                      padding: 4px 8px;
                      background: {model.status === 'available' ? '#28a745' : '#ffc107'};
                      color: white;
                      border-radius: 4px;
                      font-size: 11px;
                    ">
                      {model.status}
                    </span>
                  {/if}
                  <button
                    onclick={(e) => handleViewDetails(e, model.id)}
                    style="
                      padding: 6px 12px;
                      background: #007bff;
                      color: white;
                      border: none;
                      border-radius: 4px;
                      cursor: pointer;
                      font-size: 12px;
                      white-space: nowrap;
                    "
                    onmouseenter={(e) => {
                      e.currentTarget.style.background = '#0056b3';
                    }}
                    onmouseleave={(e) => {
                      e.currentTarget.style.background = '#007bff';
                    }}
                  >
                    View Details
                  </button>
                </div>
              </div>
              {#if model.description}
                <p style="margin: 8px 0 0 0; font-size: 13px; color: #ccc;">
                  {model.description}
                </p>
              {/if}
            </div>
          {/each}
        </div>
      </div>
    {/if}
  {/if}

  <!-- Refresh button -->
  <div style="margin-top: 20px; text-align: center;">
    <button
      onclick={loadModels}
      disabled={loading}
      style="
        padding: 10px 20px;
        background: #007bff;
        color: white;
        border: none;
        border-radius: 4px;
        cursor: pointer;
        width: 100%;
      "
    >
      {loading ? 'Loading...' : 'Refresh Models'}
    </button>
  </div>
</div>

