<script lang="ts">
  /**
   * Add Model Modal Component
   * 
   * Modal for adding new models from various sources
   * 
   * Pure Svelte 5 with runes
   */

  // Note: $state, $effect, $props are compiler magic - no import needed!

  let { 
    show = false,
    onClose = null,
    onAddFromLocal = null,
    onAddFromHuggingFace = null
  }: {
    show?: boolean;
    onClose?: (() => void) | null;
    onAddFromLocal?: ((path: string) => void) | null;
    onAddFromHuggingFace?: ((modelId: string) => void) | null;
  } = $props();

  // Key for forcing re-render when show changes
  let modalKey = $state<number>(0);
  let prevShow = $state<boolean>(false);
  let selectedTab = $state<'local' | 'huggingface' | 'ai-assisted'>('local');
  let localFolderPath = $state<string>('');
  let huggingFaceModelId = $state<string>('');

  // Track show prop changes with $effect
  $effect(() => {
    console.log('AddModelModal: show prop changed to:', show);
    // Update key to force re-render whenever show changes
    if (show !== prevShow) {
      modalKey++;
      prevShow = show;
      console.log('AddModelModal: modalKey updated to:', modalKey);
    }
  });

  function handleClose() {
    console.log('AddModelModal: handleClose called');
    // Reset form
    localFolderPath = '';
    huggingFaceModelId = '';
    selectedTab = 'local';
    if (onClose) onClose();
  }

  function handleBackdropClick(e: MouseEvent) {
    // Close if clicking the backdrop (not the modal content)
    if (e.target === e.currentTarget && onClose) {
      console.log('AddModelModal: backdrop clicked');
      handleClose();
    }
  }

  function handleEscape(e: KeyboardEvent) {
    if (e.key === 'Escape' && onClose) {
      console.log('AddModelModal: ESC key pressed');
      handleClose();
    }
  }

  function handleLocalFolderSelect() {
    // TODO: Implement folder picker
    // For now, show a prompt
    const path = prompt('Enter the path to the model folder:');
    if (path && onAddFromLocal) {
      onAddFromLocal(path);
      handleClose();
    }
  }

  function handleHuggingFaceInstall() {
    if (!huggingFaceModelId.trim()) {
      alert('Please enter a HuggingFace model ID (e.g., mistralai/Mistral-7B-v0.1)');
      return;
    }
    if (onAddFromHuggingFace) {
      onAddFromHuggingFace(huggingFaceModelId.trim());
      handleClose();
    }
  }

  function handleAIAssisted() {
    // TODO: Implement AI-assisted local install
    alert('AI-assisted local installation will be implemented soon!\n\nThis will help you:\n- Identify model files in a folder\n- Configure model settings\n- Set up the model for use');
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
          max-width: 700px;
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
          <h2 style="margin: 0; color: white;">Add Model</h2>
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

        <!-- Tabs -->
        <div style="padding: 15px; border-bottom: 1px solid #333; display: flex; gap: 10px; flex-shrink: 0;">
          <button
            onclick={() => selectedTab = 'local'}
            style="
              padding: 8px 16px;
              background: {selectedTab === 'local' ? '#007bff' : '#25252a'};
              color: white;
              border: 1px solid {selectedTab === 'local' ? '#007bff' : '#333'};
              border-radius: 4px;
              cursor: pointer;
              font-size: 13px;
            "
          >
            Local Folder
          </button>
          <button
            onclick={() => selectedTab = 'huggingface'}
            style="
              padding: 8px 16px;
              background: {selectedTab === 'huggingface' ? '#007bff' : '#25252a'};
              color: white;
              border: 1px solid {selectedTab === 'huggingface' ? '#007bff' : '#333'};
              border-radius: 4px;
              cursor: pointer;
              font-size: 13px;
            "
          >
            HuggingFace
          </button>
          <button
            onclick={() => selectedTab = 'ai-assisted'}
            style="
              padding: 8px 16px;
              background: {selectedTab === 'ai-assisted' ? '#007bff' : '#25252a'};
              color: white;
              border: 1px solid {selectedTab === 'ai-assisted' ? '#007bff' : '#333'};
              border-radius: 4px;
              cursor: pointer;
              font-size: 13px;
            "
          >
            AI-Assisted
          </button>
        </div>

        <!-- Tab Content -->
        <div style="flex: 1; overflow-y: auto; padding: 20px;">
          {#if selectedTab === 'local'}
            <div>
              <h3 style="margin: 0 0 10px 0; color: white;">Install from Local Folder</h3>
              <p style="margin: 0 0 20px 0; color: #888; font-size: 13px;">
                Select a folder containing all model files. The folder should include model weights, tokenizer files, and configuration files.
              </p>
              
              <div style="margin-bottom: 15px;">
                <label style="display: block; margin-bottom: 8px; color: #ccc; font-size: 13px;">
                  Model Folder Path:
                </label>
                <div style="display: flex; gap: 10px;">
                  <input
                    type="text"
                    bind:value={localFolderPath}
                    placeholder="/path/to/model/folder"
                    style="
                      flex: 1;
                      padding: 8px;
                      background: #25252a;
                      border: 1px solid #333;
                      color: white;
                      border-radius: 4px;
                      font-size: 13px;
                    "
                  />
                  <button
                    onclick={handleLocalFolderSelect}
                    style="
                      padding: 8px 16px;
                      background: #007bff;
                      color: white;
                      border: none;
                      border-radius: 4px;
                      cursor: pointer;
                      font-size: 13px;
                      white-space: nowrap;
                    "
                  >
                    Browse...
                  </button>
                </div>
              </div>

              <button
                onclick={handleLocalFolderSelect}
                disabled={!localFolderPath.trim()}
                style="
                  width: 100%;
                  padding: 10px;
                  background: {localFolderPath.trim() ? '#28a745' : '#555'};
                  color: white;
                  border: none;
                  border-radius: 4px;
                  cursor: {localFolderPath.trim() ? 'pointer' : 'not-allowed'};
                  font-size: 14px;
                  font-weight: bold;
                "
              >
                Install from Local Folder
              </button>
            </div>
          {:else if selectedTab === 'huggingface'}
            <div>
              <h3 style="margin: 0 0 10px 0; color: white;">Install from HuggingFace</h3>
              <p style="margin: 0 0 20px 0; color: #888; font-size: 13px;">
                Enter a HuggingFace model ID to download and install. The model installer will handle the download and setup automatically.
              </p>
              
              <div style="margin-bottom: 15px;">
                <label style="display: block; margin-bottom: 8px; color: #ccc; font-size: 13px;">
                  HuggingFace Model ID:
                </label>
                <input
                  type="text"
                  bind:value={huggingFaceModelId}
                  placeholder="mistralai/Mistral-7B-v0.1"
                  style="
                    width: 100%;
                    padding: 8px;
                    background: #25252a;
                    border: 1px solid #333;
                    color: white;
                    border-radius: 4px;
                    font-size: 13px;
                  "
                />
                <p style="margin: 8px 0 0 0; color: #666; font-size: 12px;">
                  Example: mistralai/Mistral-7B-v0.1, meta-llama/Llama-3-8B, Qwen/Qwen2.5-7B-Instruct
                </p>
              </div>

              <button
                onclick={handleHuggingFaceInstall}
                disabled={!huggingFaceModelId.trim()}
                style="
                  width: 100%;
                  padding: 10px;
                  background: {huggingFaceModelId.trim() ? '#28a745' : '#555'};
                  color: white;
                  border: none;
                  border-radius: 4px;
                  cursor: {huggingFaceModelId.trim() ? 'pointer' : 'not-allowed'};
                  font-size: 14px;
                  font-weight: bold;
                "
              >
                Install from HuggingFace
              </button>
            </div>
          {:else if selectedTab === 'ai-assisted'}
            <div>
              <h3 style="margin: 0 0 10px 0; color: white;">AI-Assisted Local Installation</h3>
              <p style="margin: 0 0 20px 0; color: #888; font-size: 13px;">
                Get AI assistance to identify model files, configure settings, and set up a model from a local folder. This feature will help you even if the folder structure is non-standard.
              </p>
              
              <div style="padding: 20px; background: #25252a; border-radius: 4px; border: 1px solid #333;">
                <p style="margin: 0 0 15px 0; color: #888; font-size: 13px;">
                  <strong style="color: #ccc;">Coming Soon:</strong> AI-assisted installation will help you:
                </p>
                <ul style="margin: 0; padding-left: 20px; color: #888; font-size: 13px;">
                  <li>Identify model files in a folder</li>
                  <li>Detect model type and configuration</li>
                  <li>Configure model settings automatically</li>
                  <li>Set up the model for use in Nightmare</li>
                </ul>
              </div>

              <button
                onclick={handleAIAssisted}
                style="
                  width: 100%;
                  padding: 10px;
                  margin-top: 20px;
                  background: #555;
                  color: white;
                  border: none;
                  border-radius: 4px;
                  cursor: not-allowed;
                  font-size: 14px;
                  font-weight: bold;
                "
                disabled
              >
                AI-Assisted Installation (Coming Soon)
              </button>
            </div>
          {/if}
        </div>
      </div>
    </div>
  {/if}
{/key}

