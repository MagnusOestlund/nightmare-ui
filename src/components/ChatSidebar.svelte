<script lang="ts">
  /**
   * Chat Sidebar Component
   * 
   * Phase 1.1: Stupid UI - Plain buttons, no icons, no fancy features
   * Goal: Prove it works with mock server / real backend
   */

  import ModelBrowser from './ModelBrowser.svelte';

  export let showModelBrowser: boolean = false;
  export let onCloseModelBrowser: (() => void) | null = null;
  export let onModelSelect: ((modelId: string) => void) | null = null;
  
  let selectedModelId: string | null = null;
  
  // Key for forcing re-render when showModelBrowser changes
  let browserKey = 0;
  
  // Reactive statement to ensure UI updates when prop changes
  $: {
    const _ = showModelBrowser;
    console.log('ChatSidebar: Reactive update, showModelBrowser:', showModelBrowser);
    // Update key to force re-render when showModelBrowser changes
    browserKey = showModelBrowser ? browserKey + 1 : browserKey;
    console.log('ChatSidebar: browserKey updated to:', browserKey);
  }
</script>

<div style="width: 400px; height: 100vh; border-right: 1px solid #ccc; display: flex; flex-direction: column; background: #1a1a1f; color: white;">
  {#key browserKey}
    {#if showModelBrowser}
      <!-- Model Browser View -->
      <div style="flex: 1; overflow-y: auto; display: flex; flex-direction: column;">
        <div style="padding: 10px; border-bottom: 1px solid #333; display: flex; justify-content: space-between; align-items: center;">
          <h2 style="margin: 0;">Browse Models</h2>
          <button
            onclick={() => {
              if (onCloseModelBrowser) onCloseModelBrowser();
            }}
            style="
              padding: 6px 12px;
              background: #25252a;
              color: white;
              border: 1px solid #333;
              border-radius: 4px;
              cursor: pointer;
              font-size: 12px;
            "
          >
            Close
          </button>
        </div>
        <div style="flex: 1; overflow-y: auto;">
          <ModelBrowser onModelSelect={(id) => { 
            selectedModelId = id;
            if (onModelSelect) onModelSelect(id);
            if (onCloseModelBrowser) onCloseModelBrowser();
          }} />
        </div>
      </div>
    {:else}
      <!-- Empty state when not browsing models -->
      <div style="flex: 1; display: flex; align-items: center; justify-content: center; color: #888;">
        <p>Click "Browse Models" in the Node Palette to view available models</p>
      </div>
    {/if}
  {/key}
</div>

