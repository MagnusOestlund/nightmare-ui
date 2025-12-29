<script lang="ts">
  /**
   * Model Card Inspector Component
   * 
   * Phase 1.1: Stupid UI - Plain text, no icons, no fancy features
   * Displays model card information when a model node is selected.
   */

  import { onMount } from 'svelte';

  // API base URL
  const API_BASE = import.meta.env.VITE_API_URL || 'http://localhost:8001';

  interface ModelCard {
    model_id: string;
    model_name: string;
    model_family: string;
    description: string;
    purpose?: string;
    capabilities?: string[];
    use_cases?: string[];
    limitations?: string[];
    license?: string;
    vram_requirements?: any;
    benchmarks?: any;
    status: string;
  }

  export let modelId: string | null = null;

  let modelCard: ModelCard | null = null;
  let loading = false;
  let error: string | null = null;
  let activeTab: 'docs' | 'specs' | 'vram' | 'settings' | 'benchmarks' = 'docs';

  $: {
    if (modelId) {
      loadModelCard(modelId);
    } else {
      modelCard = null;
    }
  }

  // Mock model cards for when backend is not available
  const mockModelCards: Record<string, ModelCard> = {
    'ministral-3-8b': {
      model_id: 'ministral-3-8b',
      model_name: 'Mistral 3 8B',
      model_family: 'Mistral',
      description: 'Mistral 3 8B is a general-purpose language model optimized for a wide range of tasks including text generation, question answering, and code completion.',
      purpose: 'General purpose AI assistant',
      capabilities: ['Text generation', 'Question answering', 'Code completion', 'Translation'],
      use_cases: ['Chatbots', 'Content generation', 'Code assistance', 'Documentation'],
      limitations: ['Context window: 8K tokens', 'May require fine-tuning for specific domains'],
      license: 'Apache 2.0',
      vram_requirements: {
        base_vram_gb: 8,
        quantization_multiplier: 0.5,
        recommended_vram_gb: 12
      },
      benchmarks: {
        'MMLU': '65.2',
        'HellaSwag': '82.1',
        'TruthfulQA': '48.3'
      },
      status: 'available'
    },
    'qwen-2.5-7b': {
      model_id: 'qwen-2.5-7b',
      model_name: 'Qwen 2.5 7B',
      model_family: 'Qwen',
      description: 'Qwen 2.5 7B is optimized for reasoning tasks and mathematical problem solving, with strong performance in code generation.',
      purpose: 'Reasoning and code generation',
      capabilities: ['Mathematical reasoning', 'Code generation', 'Logical analysis', 'Problem solving'],
      use_cases: ['Code generation', 'Math tutoring', 'Data analysis', 'Technical Q&A'],
      limitations: ['Smaller context window than larger models', 'May struggle with very complex reasoning'],
      license: 'Apache 2.0',
      vram_requirements: {
        base_vram_gb: 7,
        quantization_multiplier: 0.5,
        recommended_vram_gb: 10
      },
      benchmarks: {
        'MMLU': '68.5',
        'GSM8K': '78.2',
        'HumanEval': '45.1'
      },
      status: 'available'
    },
    'llama-3-8b': {
      model_id: 'llama-3-8b',
      model_name: 'Llama 3 8B',
      model_family: 'Llama',
      description: 'Meta Llama 3 8B is a versatile language model with strong performance across multiple benchmarks and use cases.',
      purpose: 'General purpose AI assistant',
      capabilities: ['Text generation', 'Conversation', 'Instruction following', 'Multi-language support'],
      use_cases: ['Chatbots', 'Content creation', 'Customer support', 'Educational tools'],
      limitations: ['Context window: 8K tokens', 'May require prompt engineering for best results'],
      license: 'Llama 3 Community License',
      vram_requirements: {
        base_vram_gb: 8,
        quantization_multiplier: 0.5,
        recommended_vram_gb: 12
      },
      benchmarks: {
        'MMLU': '66.8',
        'HellaSwag': '80.5',
        'ARC': '76.2'
      },
      status: 'available'
    }
  };

  async function loadModelCard(id: string) {
    loading = true;
    error = null;
    
    try {
      const res = await fetch(`${API_BASE}/api/v1/models/${id}`);
      if (res.ok) {
        const data = await res.json();
        modelCard = data;
      } else {
        // Try mock data if API fails
        if (mockModelCards[id]) {
          modelCard = mockModelCards[id];
          error = 'Backend not available. Showing mock data.';
        } else {
          error = `Failed to load model: ${res.statusText}`;
        }
      }
    } catch (err: any) {
      // Use mock data as fallback
      if (mockModelCards[id]) {
        modelCard = mockModelCards[id];
        error = 'Backend not available. Showing mock data.';
      } else {
        error = `Error: ${err.message}`;
      }
    } finally {
      loading = false;
    }
  }
</script>

{#if !modelId}
  <div style="padding: 20px;">
    <p>No model selected. Select a model node to view details.</p>
  </div>
{:else if loading}
  <div style="padding: 20px;">
    <p>Loading model card...</p>
  </div>
{:else if error}
  <div style="padding: 20px;">
    <p style="color: red;">Error: {error}</p>
  </div>
{:else if !modelCard}
  <div style="padding: 20px;">
    <p>Model not found.</p>
  </div>
{:else}
  <div style="padding: 20px; max-width: 600px;">
    <h2>{modelCard.model_name}</h2>
    <p>ID: {modelCard.model_id}</p>
    <p>Family: {modelCard.model_family}</p>
    <p>Status: {modelCard.status}</p>

    <!-- Tabs -->
    <div style="margin-top: 20px; border-bottom: 1px solid #ccc;">
      <button 
        onclick={() => activeTab = 'docs'}
        style="padding: 10px; margin-right: 5px; background-color: {activeTab === 'docs' ? '#007bff' : '#f0f0f0'}; color: {activeTab === 'docs' ? 'white' : 'black'}; border: none; cursor: pointer;"
      >
        Documentation
      </button>
      <button 
        onclick={() => activeTab = 'specs'}
        style="padding: 10px; margin-right: 5px; background-color: {activeTab === 'specs' ? '#007bff' : '#f0f0f0'}; color: {activeTab === 'specs' ? 'white' : 'black'}; border: none; cursor: pointer;"
      >
        Specifications
      </button>
      <button 
        onclick={() => activeTab = 'vram'}
        style="padding: 10px; margin-right: 5px; background-color: {activeTab === 'vram' ? '#007bff' : '#f0f0f0'}; color: {activeTab === 'vram' ? 'white' : 'black'}; border: none; cursor: pointer;"
      >
        VRAM
      </button>
      <button 
        onclick={() => activeTab = 'settings'}
        style="padding: 10px; margin-right: 5px; background-color: {activeTab === 'settings' ? '#007bff' : '#f0f0f0'}; color: {activeTab === 'settings' ? 'white' : 'black'}; border: none; cursor: pointer;"
      >
        Settings
      </button>
      <button 
        onclick={() => activeTab = 'benchmarks'}
        style="padding: 10px; background-color: {activeTab === 'benchmarks' ? '#007bff' : '#f0f0f0'}; color: {activeTab === 'benchmarks' ? 'white' : 'black'}; border: none; cursor: pointer;"
      >
        Benchmarks
      </button>
    </div>

    <!-- Tab Content -->
    <div style="margin-top: 20px;">
      {#if activeTab === 'docs'}
        <div>
          <h3>Description</h3>
          <p>{modelCard.description}</p>
          
          {#if modelCard.purpose}
            <h3>Purpose</h3>
            <p>{modelCard.purpose}</p>
          {/if}
          
          {#if modelCard.capabilities && modelCard.capabilities.length > 0}
            <h3>Capabilities</h3>
            <ul>
              {#each modelCard.capabilities as cap}
                <li>{cap}</li>
              {/each}
            </ul>
          {/if}
          
          {#if modelCard.use_cases && modelCard.use_cases.length > 0}
            <h3>Use Cases</h3>
            <ul>
              {#each modelCard.use_cases as uc}
                <li>{uc}</li>
              {/each}
            </ul>
          {/if}
          
          {#if modelCard.limitations && modelCard.limitations.length > 0}
            <h3>Limitations</h3>
            <ul>
              {#each modelCard.limitations as lim}
                <li>{lim}</li>
              {/each}
            </ul>
          {/if}
        </div>
      {:else if activeTab === 'specs'}
        <div>
          <h3>Model Specifications</h3>
          <p>Family: {modelCard.model_family}</p>
          <p>Status: {modelCard.status}</p>
          {#if modelCard.license}
            <p>License: {modelCard.license}</p>
          {/if}
        </div>
      {:else if activeTab === 'vram' && modelCard.vram_requirements}
        <div>
          <h3>VRAM Requirements</h3>
          <p>Base VRAM: {modelCard.vram_requirements.base_vram_gb} GB</p>
          <p>Per Token: {modelCard.vram_requirements.per_token_mb} MB</p>
          <p>Quantization: {modelCard.vram_requirements.quantization_multiplier}</p>
          
          {#if modelCard.vram_requirements.context_sizes}
            <h4>Context Sizes</h4>
            <ul>
              {#each Object.entries(modelCard.vram_requirements.context_sizes || {}) as [size, info]}
                {@const infoObj = info as any}
                <li>
                  {size}: {infoObj.vram_gb} GB {infoObj.tested ? '(tested)' : '(estimated)'}
                </li>
              {/each}
            </ul>
          {/if}
        </div>
      {:else if activeTab === 'settings'}
        <div>
          <h3>Model Settings</h3>
          <p>Settings will be loaded here (Phase 1.1 - basic implementation)</p>
          <p>Model ID: {modelCard.model_id}</p>
        </div>
      {:else if activeTab === 'benchmarks' && modelCard.benchmarks}
        <div>
          <h3>Benchmarks</h3>
          {#if modelCard.benchmarks.latency_ms}
            <p>Latency: {modelCard.benchmarks.latency_ms} ms</p>
          {/if}
          {#if modelCard.benchmarks.tokens_per_second}
            <p>Tokens/Second: {modelCard.benchmarks.tokens_per_second}</p>
          {/if}
          {#if modelCard.benchmarks.accuracy}
            <p>Accuracy: {(modelCard.benchmarks.accuracy * 100).toFixed(1)}%</p>
          {/if}
        </div>
      {/if}
    </div>
  </div>
{/if}

