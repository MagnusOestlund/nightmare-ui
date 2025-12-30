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
  
  // Track chat panel width for responsive layout
  let chatPanelWidth = $state<number>(0);
  let chatPanelRef: HTMLDivElement;
  
  // Search functionality
  let showSearch = $state<boolean>(false);
  let searchQuery = $state<string>('');
  let searchResults: number[] = $state([]);
  let currentSearchIndex = $state<number>(-1);
  let messagesContainerRef: HTMLDivElement;

  // Manual layout control (overrides automatic responsive behavior)
  let manualLayoutMode: 'auto' | 'side' | 'bottom' = $state('auto');

  // Derived: Check if chat panel should use wide layout (input at bottom)
  // If manual mode is set, use that; otherwise use automatic based on width
  let isWide = $derived(
    manualLayoutMode === 'side' ? false :
    manualLayoutMode === 'bottom' ? true :
    chatPanelWidth > 600 // Auto mode: use width-based detection
  );
  
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
    
    // Track chat panel width for responsive layout
    // Use $effect to reactively observe when chatPanelRef is set
    $effect(() => {
      if (chatPanelRef) {
        const resizeObserver = new ResizeObserver((entries) => {
          for (const entry of entries) {
            chatPanelWidth = entry.contentRect.width;
          }
        });
        resizeObserver.observe(chatPanelRef);
        
        return () => {
          resizeObserver.disconnect();
        };
      }
    });
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

  // Toggle layout between side and bottom
  function toggleLayout() {
    if (manualLayoutMode === 'auto') {
      // If currently auto, switch to opposite of current state
      manualLayoutMode = isWide ? 'side' : 'bottom';
    } else if (manualLayoutMode === 'side') {
      manualLayoutMode = 'bottom';
    } else {
      manualLayoutMode = 'side';
    }
  }

  // Search functionality
  function toggleSearch() {
    showSearch = !showSearch;
    if (!showSearch) {
      searchQuery = '';
      searchResults = [];
      currentSearchIndex = -1;
    }
  }

  function performSearch() {
    if (!searchQuery.trim()) {
      searchResults = [];
      currentSearchIndex = -1;
      return;
    }

    const query = searchQuery.toLowerCase();
    const results: number[] = [];
    
    messages.forEach((msg, idx) => {
      if (msg.content.toLowerCase().includes(query)) {
        results.push(idx);
      }
    });
    
    searchResults = results;
    currentSearchIndex = results.length > 0 ? 0 : -1;
    scrollToSearchResult();
  }

  function scrollToSearchResult() {
    if (currentSearchIndex >= 0 && currentSearchIndex < searchResults.length && messagesContainerRef) {
      const messageIndex = searchResults[currentSearchIndex];
      const messageElements = messagesContainerRef.querySelectorAll('[data-message-index]');
      const targetElement = messageElements[messageIndex] as HTMLElement;
      
      if (targetElement) {
        targetElement.scrollIntoView({ behavior: 'smooth', block: 'center' });
        // Highlight the message briefly
        targetElement.style.backgroundColor = 'rgba(0, 123, 255, 0.3)';
        setTimeout(() => {
          targetElement.style.backgroundColor = '';
        }, 1000);
      }
    }
  }

  function findNext() {
    if (searchResults.length === 0) return;
    currentSearchIndex = (currentSearchIndex + 1) % searchResults.length;
    scrollToSearchResult();
  }

  function findPrevious() {
    if (searchResults.length === 0) return;
    currentSearchIndex = currentSearchIndex <= 0 ? searchResults.length - 1 : currentSearchIndex - 1;
    scrollToSearchResult();
  }

  // React to search query changes
  $effect(() => {
    if (searchQuery.trim()) {
      performSearch();
    } else {
      searchResults = [];
      currentSearchIndex = -1;
    }
  });
</script>

<div bind:this={chatPanelRef} style="width: 100%; height: 100%; display: flex; flex-direction: column; background: #1a1a1f; color: white; border-top: 1px solid #333; flex-shrink: 0;">
  <div style="padding: 10px; padding-right: 50px; border-bottom: 1px solid #333; display: flex; gap: 10px; align-items: center; flex-shrink: 0; position: relative;">
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

    <!-- Search Button (moved to the left) -->
    <button
      onclick={toggleSearch}
      style="
        position: absolute;
        top: 10px;
        right: 90px;
        padding: 6px 12px;
        background: {showSearch ? '#007bff' : '#25252a'};
        border: 1px solid {showSearch ? '#007bff' : '#333'};
        border-radius: 4px;
        color: white;
        font-size: 12px;
        cursor: pointer;
        transition: all 0.2s;
        z-index: 10;
      "
      title="Search in chat (Ctrl+F)"
    >
      🔍
    </button>

    <!-- Layout Toggle Button (at the position where Search button was) -->
    <button
      onclick={toggleLayout}
      style="
        position: absolute;
        top: 10px;
        right: 42px;
        padding: 6px 12px;
        background: {manualLayoutMode !== 'auto' ? '#007bff' : '#25252a'};
        border: 1px solid {manualLayoutMode !== 'auto' ? '#007bff' : '#333'};
        border-radius: 4px;
        color: white;
        font-size: 12px;
        cursor: pointer;
        transition: all 0.2s;
        z-index: 10;
      "
      title={isWide ? 'Switch to side layout' : 'Switch to bottom layout'}
    >
      {isWide ? '⇄' : '⇅'}
    </button>
  </div>

  <!-- Search Bar (shown when search is active) -->
  {#if showSearch}
    <div style="padding: 8px 10px; border-bottom: 1px solid #333; background: #25252a; display: flex; gap: 8px; align-items: center; flex-shrink: 0;">
      <input
        type="text"
        bind:value={searchQuery}
        placeholder="Search messages..."
        style="
          flex: 1;
          padding: 6px 10px;
          background: #1a1a1f;
          border: 1px solid #333;
          border-radius: 4px;
          color: white;
          font-size: 12px;
        "
        onkeydown={(e) => {
          if (e.key === 'Enter' && e.shiftKey) {
            e.preventDefault();
            findPrevious();
          } else if (e.key === 'Enter') {
            e.preventDefault();
            findNext();
          } else if (e.key === 'Escape') {
            e.preventDefault();
            toggleSearch();
          }
        }}
      />
      <div style="display: flex; gap: 4px; align-items: center; color: #888; font-size: 11px;">
        {#if searchResults.length > 0}
          <span>{currentSearchIndex + 1} / {searchResults.length}</span>
        {:else if searchQuery.trim()}
          <span>No results</span>
        {/if}
      </div>
      <button
        onclick={findPrevious}
        disabled={searchResults.length === 0}
        style="
          padding: 4px 8px;
          background: {searchResults.length === 0 ? '#555' : '#007bff'};
          border: 1px solid {searchResults.length === 0 ? '#444' : '#007bff'};
          border-radius: 4px;
          color: white;
          font-size: 11px;
          cursor: {searchResults.length === 0 ? 'not-allowed' : 'pointer'};
        "
        title="Previous (Shift+Enter)"
      >
        ▲
      </button>
      <button
        onclick={findNext}
        disabled={searchResults.length === 0}
        style="
          padding: 4px 8px;
          background: {searchResults.length === 0 ? '#555' : '#007bff'};
          border: 1px solid {searchResults.length === 0 ? '#444' : '#007bff'};
          border-radius: 4px;
          color: white;
          font-size: 11px;
          cursor: {searchResults.length === 0 ? 'not-allowed' : 'pointer'};
        "
        title="Next (Enter)"
      >
        ▼
      </button>
      <button
        onclick={toggleSearch}
        style="
          padding: 4px 8px;
          background: #555;
          border: 1px solid #666;
          border-radius: 4px;
          color: white;
          font-size: 11px;
          cursor: pointer;
        "
        title="Close (Esc)"
      >
        ✕
      </button>
    </div>
  {/if}

  <!-- Responsive layout: side-by-side when narrow, stacked when wide -->
  {#if isWide}
    <!-- Wide layout: Messages full width, input at bottom -->
    <div style="flex: 1; display: flex; flex-direction: column; overflow: hidden;">
      <!-- Messages Area (full width) -->
      <div bind:this={messagesContainerRef} style="flex: 1; overflow-y: auto; padding: 10px; background: #25252a;">
        {#if messages.length === 0}
          <p style="color: #888; font-size: 12px; margin: 0;">No messages yet. Start a conversation!</p>
        {:else}
          {#each messages as msg, idx (idx)}
            <div 
              data-message-index={idx}
              style="margin-bottom: 8px; font-size: 12px; transition: background-color 0.3s;"
            >
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

      <!-- Input Area at bottom (full width) -->
      <div style="padding: 10px; border-top: 1px solid #333; background: #1a1a1f; display: flex; gap: 8px; flex-shrink: 0;">
        <textarea
          bind:value={inputMessage}
          onkeydown={(e) => {
            if (e.key === 'Enter' && !e.shiftKey) {
              e.preventDefault();
              sendMessage();
            }
          }}
          placeholder="Type your message..."
          style="flex: 1; min-height: 60px; max-height: 120px; padding: 8px; background: #25252a; border: 1px solid #333; color: white; border-radius: 4px; resize: vertical; font-size: 12px; font-family: inherit;"
        />
        <button 
          onclick={sendMessage}
          disabled={loading || !inputMessage.trim()}
          style="padding: 8px 16px; background-color: {loading || !inputMessage.trim() ? '#555' : '#007bff'}; color: white; border: none; cursor: {loading || !inputMessage.trim() ? 'not-allowed' : 'pointer'}; border-radius: 4px; font-size: 12px; align-self: flex-end;"
        >
          {loading ? 'Sending...' : 'Send'}
        </button>
      </div>
    </div>
  {:else}
    <!-- Narrow layout: Messages on left, input on right -->
    <div style="flex: 1; display: flex; overflow: hidden;">
      <!-- Messages Area -->
      <div bind:this={messagesContainerRef} style="flex: 1; overflow-y: auto; padding: 10px; border-right: 1px solid #333; background: #25252a;">
        {#if messages.length === 0}
          <p style="color: #888; font-size: 12px; margin: 0;">No messages yet. Start a conversation!</p>
        {:else}
          {#each messages as msg, idx (idx)}
            <div 
              data-message-index={idx}
              style="margin-bottom: 8px; font-size: 12px; transition: background-color 0.3s;"
            >
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
  {/if}
</div>

