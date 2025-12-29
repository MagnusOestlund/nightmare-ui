<script lang="ts">
  /**
   * Model Card Modal Component
   * 
   * Modal overlay for viewing detailed model card information
   * 
   * Pure Svelte 5 with runes
   */

  // Note: $state, $effect, $props are compiler magic - no import needed!
  import ModelCardInspector from './ModelCardInspector.svelte';

  let { 
    show = false,
    modelId = null,
    onClose = null
  }: {
    show?: boolean;
    modelId?: string | null;
    onClose?: (() => void) | null;
  } = $props();

  // Key for forcing re-render when show changes
  let modalKey = $state<number>(0);

  // Track show and modelId prop changes with $effect
  $effect(() => {
    console.log('ModelCardModal: show prop changed to:', show, 'modelId:', modelId);
    // Update key to force re-render
    if (show && modelId) {
      modalKey++;
      console.log('ModelCardModal: modalKey updated to:', modalKey);
    }
  });

  function handleClose() {
    console.log('ModelCardModal: handleClose called');
    if (onClose) onClose();
  }

  function handleBackdropClick(e: MouseEvent) {
    // Close if clicking the backdrop (not the modal content)
    if (e.target === e.currentTarget && onClose) {
      console.log('ModelCardModal: backdrop clicked');
      onClose();
    }
  }

  function handleEscape(e: KeyboardEvent) {
    if (e.key === 'Escape' && onClose) {
      console.log('ModelCardModal: ESC key pressed');
      onClose();
    }
  }
</script>

{#key modalKey}
  {#if show && modelId}
    <!-- Backdrop -->
    <div
      style="
        position: fixed;
        top: 0;
        left: 0;
        right: 0;
        bottom: 0;
        background: rgba(0, 0, 0, 0.7);
        z-index: 2000;
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
          max-width: 900px;
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
          <h2 style="margin: 0; color: white;">Model Details</h2>
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

        <!-- Model Card Inspector Content -->
        <div style="flex: 1; overflow-y: auto; padding: 20px;">
          <ModelCardInspector modelId={modelId} />
        </div>
      </div>
    </div>
  {/if}
{/key}

