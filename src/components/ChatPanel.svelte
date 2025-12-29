<script lang="ts">
  /**
   * Chat Panel Component
   * 
   * Chat interface at the bottom of the canvas (20% height)
   */

  import { onMount } from 'svelte';
  import ModelCardInspector from './ModelCardInspector.svelte';

  // Note: $state, $effect, $props are compiler magic - no import needed!

  // API base URL
  const API_BASE = import.meta.env.VITE_API_URL || 'http://localhost:8001';

  interface Message {
    role: 'user' | 'assistant';
    content: string;
    timestamp: Date;
  }

  interface Model {
    id: string;
    name: string;
    family?: string;
  }

  // Note: $state, $effect, $props are compiler magic - no import needed!
  let messages = $state<Message[]>([]);
  let inputMessage = $state<string>('');
  let selectedModel = $state<string>('');
  let models = $state<Model[]>([]);
  let loading = $state<boolean>(false);
  let selectedModelId = $state<string | null>(null);
  
  let { 
    onModelSelect = null,
    clearMessagesTrigger = 0
  }: {
    onModelSelect?: ((modelId: string) => void) | null;
    clearMessagesTrigger?: number;
  } = $props();

  // Clear messages when clearMessagesTrigger changes (Svelte 5 $effect)
  $effect(() => {
    if (clearMessagesTrigger > 0) {
      messages = [];
    }
  });

  // Load models on mount
  onMount(() => {
    loadModels();
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
        
        // Set first model as default
        if (models.length > 0 && !selectedModel) {
          selectedModel = models[0].id;
        }
      }
    } catch (error: any) {
      console.error('Error loading models:', error);
      // Fallback to mock models if API fails
      models = [
        { id: 'ministral-3-8b', name: 'Mistral 3 8B' },
        { id: 'qwen-2.5-7b', name: 'Qwen 2.5 7B' }
      ];
      if (!selectedModel) {
        selectedModel = 'ministral-3-8b';
      }
    }
  }

  async function sendMessage() {
    if (!inputMessage.trim() || !selectedModel) return;

    const userMessage: Message = {
      role: 'user',
      content: inputMessage,
      timestamp: new Date()
    };

    messages = [...messages, userMessage];
    const currentInput = inputMessage;
    inputMessage = '';
    loading = true;

    try {
      // Call generate endpoint
      const res = await fetch(`${API_BASE}/api/v1/generate`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json'
        },
        body: JSON.stringify({
          prompt: currentInput,
          model: selectedModel,
          stream: false
        })
      });

      if (res.ok) {
        const data = await res.json();
        const assistantMessage: Message = {
          role: 'assistant',
          content: data.response || data.text || 'No response',
          timestamp: new Date()
        };
        messages = [...messages, assistantMessage];
      } else {
        const errorText = await res.text();
        const errorMessage: Message = {
          role: 'assistant',
          content: `Error: ${errorText}`,
          timestamp: new Date()
        };
        messages = [...messages, errorMessage];
      }
    } catch (error: any) {
      const errorMessage: Message = {
        role: 'assistant',
        content: `Error: ${error.message}`,
        timestamp: new Date()
      };
      messages = [...messages, errorMessage];
    } finally {
      loading = false;
    }
  }

  function switchModel(modelId: string) {
    selectedModel = modelId;
    selectedModelId = modelId;
    if (onModelSelect) onModelSelect(modelId);
  }
</script>

<div style="height: 20%; min-height: 200px; max-height: 400px; display: flex; flex-direction: column; background: #1a1a1f; color: white; border-top: 1px solid #333; flex-shrink: 0;">
  <div style="padding: 10px; border-bottom: 1px solid #333; display: flex; gap: 10px; align-items: center; flex-shrink: 0;">
    <h3 style="margin: 0; font-size: 14px;">Chat</h3>
    
    <!-- Model Selector -->
    <div style="flex: 1; display: flex; align-items: center; gap: 8px;">
      <label style="font-size: 12px; color: #888;">Model:</label>
      <select 
        value={selectedModel} 
        onchange={(e) => switchModel(e.target.value)}
        style="flex: 1; max-width: 300px; padding: 6px; background: #25252a; border: 1px solid #333; color: white; border-radius: 4px; font-size: 12px;"
      >
        {#each models as model (model.id)}
          <option value={model.id}>
            {model.name}
          </option>
        {/each}
      </select>
    </div>
  </div>

  <div style="flex: 1; display: flex; overflow: hidden;">
    <!-- Messages Area -->
    <div style="flex: 1; overflow-y: auto; padding: 10px; border-right: 1px solid #333; background: #25252a;">
      {#if messages.length === 0}
        <p style="color: #888; font-size: 12px; margin: 0;">No messages yet. Start a conversation!</p>
      {:else}
        {#each messages as msg, idx (idx)}
          <div style="margin-bottom: 8px; font-size: 12px;">
            <strong style="color: {msg.role === 'user' ? '#007bff' : '#28a745'};">
              {msg.role === 'user' ? 'You' : 'Assistant'}:
            </strong>
            <p style="margin: 4px 0; white-space: pre-wrap; color: #ccc; line-height: 1.4;">
              {msg.content}
            </p>
          </div>
        {/each}
      {/if}
      {#if loading}
        <p style="color: #888; font-size: 12px;">Loading...</p>
      {/if}
    </div>

    <!-- Input Area -->
    <div style="width: 300px; padding: 10px; display: flex; flex-direction: column; gap: 8px; flex-shrink: 0;">
      <textarea
        bind:value={inputMessage}
        onkeydown={(e) => {
          if (e.key === 'Enter' && !e.shiftKey) {
            e.preventDefault();
            sendMessage();
          }
        }}
        placeholder="Type your message..."
        style="flex: 1; min-height: 60px; padding: 8px; background: #25252a; border: 1px solid #333; color: white; border-radius: 4px; resize: none; font-size: 12px; font-family: inherit;"
      />
      <button 
        onclick={sendMessage}
        disabled={loading || !inputMessage.trim()}
        style="padding: 8px; background-color: {loading || !inputMessage.trim() ? '#555' : '#007bff'}; color: white; border: none; cursor: {loading || !inputMessage.trim() ? 'not-allowed' : 'pointer'}; border-radius: 4px; font-size: 12px;"
      >
        {loading ? 'Sending...' : 'Send'}
      </button>
    </div>
  </div>
</div>

