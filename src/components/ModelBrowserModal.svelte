<script lang="ts">
  /**
   * Model Browser Modal Component
   * 
   * Modal overlay for browsing and selecting models
   * 
   * Pure Svelte 5 with runes
   */

  // Note: $state, $effect, $props are compiler magic - no import needed!
  import ModelBrowser from './ModelBrowser.svelte';

  let { 
    show = false,
    onClose = null,
    onModelSelect = null,
    onViewDetails = null,
    onAddModel = null
  }: {
    show?: boolean;
    onClose?: (() => void) | null;
    onModelSelect?: ((modelId: string) => void) | null;
    onViewDetails?: ((modelId: string) => void) | null;
    onAddModel?: (() => void) | null;
  } = $props();

  // Key for forcing re-render when show changes
  let modalKey = $state<number>(0);
  let prevShow = $state<boolean>(false);

  // Track show prop changes with $effect
  $effect(() => {
    console.log('ModelBrowserModal: show prop changed to:', show, 'prevShow:', prevShow);
    // Update key to force re-render whenever show changes
    if (show !== prevShow) {
      modalKey++;
      prevShow = show;
      console.log('ModelBrowserModal: modalKey updated to:', modalKey);
    }
  });

  function handleClose() {
    console.log('ModelBrowserModal: handleClose called');
    if (onClose) onClose();
  }

  function handleBackdropClick(e: MouseEvent) {
    // Close if clicking the backdrop (not the modal content)
    if (e.target === e.currentTarget && onClose) {
      console.log('ModelBrowserModal: backdrop clicked');
      onClose();
    }
  }

  function handleEscape(e: KeyboardEvent) {
    if (e.key === 'Escape' && onClose) {
      console.log('ModelBrowserModal: ESC key pressed');
      onClose();
    }
  }
</script>

{#key modalKey}
  {#if show}
    <!-- Backdrop -->
    <div
    style="
      position: fixed;
      top: 0;
      left: 0;
      right: 0;
      bottom: 0;
      background: rgba(0, 0, 0, 0.7);
      z-index: 1000;
      display: flex;
      align-items: center;
      justify-content: center;
    "
    onclick={handleBackdropClick}
    onkeydown={handleEscape}
    role="dialog"
    aria-modal="true"
    tabindex="-1"
  >
    <!-- Modal Content -->
    <div
      style="
        width: 90%;
        max-width: 800px;
        max-height: 80vh;
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
      <div style="padding: 15px; border-bottom: 1px solid #333; display: flex; justify-content: space-between; align-items: center;">
        <h2 style="margin: 0; color: white;">Browse Models</h2>
        <button
          onclick={handleClose}
          style="
            padding: 6px 12px;
            background: #25252a;
            color: white;
            border: 1px solid #333;
            border-radius: 4px;
            cursor: pointer;
            font-size: 14px;
          "
          onmouseenter={(e) => {
            e.currentTarget.style.background = '#2a2a2f';
          }}
          onmouseleave={(e) => {
            e.currentTarget.style.background = '#25252a';
          }}
        >
          Close
        </button>
      </div>

      <!-- Model Browser Content -->
      <div style="flex: 1; overflow-y: auto; padding: 20px;">
        <ModelBrowser 
          onModelSelect={(id) => {
            if (onModelSelect) onModelSelect(id);
            if (onClose) onClose();
          }}
          onViewDetails={(id) => {
            if (onViewDetails) onViewDetails(id);
          }}
          onAddModel={() => {
            if (onAddModel) onAddModel();
          }}
        />
      </div>
    </div>
  </div>
  {/if}
{/key}

