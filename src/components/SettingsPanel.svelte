<script lang="ts">
  /**
   * Settings Panel Component
   * 
   * Slide-in panel for settings: theme, logs, clear chat
   * 
   * Pure Svelte 5 with runes
   */

  // Note: $state, $props are compiler magic - no import needed!

  let { 
    show = false,
    onClose = null,
    onClearChat = null
  }: {
    show?: boolean;
    onClose?: (() => void) | null;
    onClearChat?: (() => void) | null;
  } = $props();

  let theme = $state<'dark' | 'light'>('dark');
  let showLogs = $state<boolean>(false);

  function handleClose() {
    if (onClose) onClose();
  }

  function handleClearChat() {
    if (confirm('Are you sure you want to clear all chat messages?')) {
      if (onClearChat) onClearChat();
    }
  }

  function handleThemeChange() {
    // TODO: Implement theme switching
    alert('Theme switching will be implemented soon!');
  }
</script>

{#if show}
  <!-- Backdrop -->
  <div
    style="
      position: fixed;
      top: 60px;
      right: 0;
      bottom: 0;
      width: 350px;
      background: #1a1a1f;
      border-left: 1px solid #333;
      box-shadow: -4px 0 20px rgba(0, 0, 0, 0.5);
      z-index: 1500;
      display: flex;
      flex-direction: column;
      animation: slideIn 0.3s ease-out;
    "
  >
    <!-- Header -->
    <div style="padding: 15px; border-bottom: 1px solid #333; display: flex; justify-content: space-between; align-items: center;">
      <h2 style="margin: 0; color: white; font-size: 16px;">Settings</h2>
      <button
        onclick={handleClose}
        style="
          padding: 4px 8px;
          background: #25252a;
          color: white;
          border: 1px solid #333;
          border-radius: 4px;
          cursor: pointer;
          font-size: 12px;
        "
      >
        ✕
      </button>
    </div>

    <!-- Content -->
    <div style="flex: 1; overflow-y: auto; padding: 20px;">
      <!-- Theme -->
      <div style="margin-bottom: 30px;">
        <h3 style="margin: 0 0 10px 0; color: white; font-size: 14px;">Theme</h3>
        <div style="display: flex; gap: 10px;">
          <button
            onclick={() => { theme = 'dark'; handleThemeChange(); }}
            style="
              flex: 1;
              padding: 10px;
              background: {theme === 'dark' ? '#007bff' : '#25252a'};
              color: white;
              border: 1px solid {theme === 'dark' ? '#007bff' : '#333'};
              border-radius: 4px;
              cursor: pointer;
            "
          >
            Dark
          </button>
          <button
            onclick={() => { theme = 'light'; handleThemeChange(); }}
            style="
              flex: 1;
              padding: 10px;
              background: {theme === 'light' ? '#007bff' : '#25252a'};
              color: white;
              border: 1px solid {theme === 'light' ? '#007bff' : '#333'};
              border-radius: 4px;
              cursor: pointer;
            "
          >
            Light
          </button>
        </div>
      </div>

      <!-- Logs -->
      <div style="margin-bottom: 30px;">
        <h3 style="margin: 0 0 10px 0; color: white; font-size: 14px;">Logs</h3>
        <button
          onclick={() => { showLogs = !showLogs; }}
          style="
            width: 100%;
            padding: 10px;
            background: #25252a;
            color: white;
            border: 1px solid #333;
            border-radius: 4px;
            cursor: pointer;
          "
        >
          {showLogs ? 'Hide Logs' : 'Show Logs'}
        </button>
        {#if showLogs}
          <div style="
            margin-top: 10px;
            padding: 10px;
            background: #0f0f12;
            border: 1px solid #333;
            border-radius: 4px;
            max-height: 300px;
            overflow-y: auto;
            font-family: monospace;
            font-size: 11px;
            color: #888;
          ">
            <div>No logs available</div>
            <div style="margin-top: 5px; color: #666;">Logs will appear here when available</div>
          </div>
        {/if}
      </div>

      <!-- Clear Chat -->
      <div>
        <h3 style="margin: 0 0 10px 0; color: white; font-size: 14px;">Chat</h3>
        <button
          onclick={handleClearChat}
          style="
            width: 100%;
            padding: 10px;
            background: #dc3545;
            color: white;
            border: none;
            border-radius: 4px;
            cursor: pointer;
            font-weight: bold;
          "
        >
          Clear Chat
        </button>
      </div>
    </div>
  </div>
{/if}

<style>
  @keyframes slideIn {
    from {
      transform: translateX(100%);
    }
    to {
      transform: translateX(0);
    }
  }
</style>

