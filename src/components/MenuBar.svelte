<script lang="ts">
  /**
   * Menu Bar Component
   * 
   * Top menu bar with hamburger, logo, canvas tab, settings, and power button
   * 
   * Pure Svelte 5 with runes
   */

  let { 
    onTogglePalette = null,
    onRestart = null,
    onSave = null,
    onQuit = null,
    onOpenSettings = null
  }: {
    onTogglePalette?: (() => void) | null;
    onRestart?: (() => void) | null;
    onSave?: (() => void) | null;
    onQuit?: (() => void) | null;
    onOpenSettings?: (() => void) | null;
  } = $props();

  function handleRestart() {
    if (onRestart) {
      onRestart();
    }
  }

  function handleSave() {
    if (onSave) {
      onSave();
    }
  }

  function handleQuit() {
    if (onQuit) {
      onQuit();
    }
  }

  function handleTogglePalette() {
    if (onTogglePalette) {
      onTogglePalette();
    }
  }

  function handleSettings() {
    if (onOpenSettings) {
      onOpenSettings();
    }
  }
</script>

<div style="
  height: 60px;
  width: 100%;
  background: #1a1a1f;
  border-bottom: 1px solid #333;
  display: flex;
  align-items: center;
  padding: 0 15px;
  flex-shrink: 0;
">
  <!-- Left: Hamburger Menu -->
  <button
    onclick={handleTogglePalette}
    style="
      width: 40px;
      height: 40px;
      background: transparent;
      border: 1px solid #333;
      border-radius: 4px;
      cursor: pointer;
      display: flex;
      align-items: center;
      justify-content: center;
      margin-right: 15px;
      color: white;
    "
    onmouseenter={(e) => {
      e.currentTarget.style.background = '#25252a';
      e.currentTarget.style.borderColor = '#444';
    }}
    onmouseleave={(e) => {
      e.currentTarget.style.background = 'transparent';
      e.currentTarget.style.borderColor = '#333';
    }}
    title="Toggle Node Palette"
  >
    <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
      <line x1="3" y1="6" x2="21" y2="6"></line>
      <line x1="3" y1="12" x2="21" y2="12"></line>
      <line x1="3" y1="18" x2="21" y2="18"></line>
    </svg>
  </button>

  <!-- Center-Left: Nightmare Logo -->
  <div
    onclick={handleRestart}
    style="
      cursor: pointer;
      user-select: none;
      margin-right: 30px;
      display: flex;
      align-items: center;
    "
    onmouseenter={(e) => {
      e.currentTarget.style.opacity = '0.8';
    }}
    onmouseleave={(e) => {
      e.currentTarget.style.opacity = '1';
    }}
    title="Restart App"
  >
    <span style="font-size: 18px; font-weight: bold; color: white; letter-spacing: 1px;">
      NIGHTMARE
    </span>
  </div>

  <!-- Center: Canvas Tab -->
  <div style="
    padding: 8px 20px;
    background: #25252a;
    border: 1px solid #333;
    border-radius: 4px;
    color: white;
    font-size: 14px;
    margin-right: auto;
  ">
    Canvas
  </div>

  <!-- Right: Settings and Power -->
  <div style="display: flex; align-items: center; gap: 10px;">
    <!-- Settings Button -->
    <button
      onclick={handleSettings}
      style="
        width: 40px;
        height: 40px;
        background: transparent;
        border: 1px solid #333;
        border-radius: 4px;
        cursor: pointer;
        display: flex;
        align-items: center;
        justify-content: center;
        color: white;
      "
      onmouseenter={(e) => {
        e.currentTarget.style.background = '#25252a';
        e.currentTarget.style.borderColor = '#444';
      }}
      onmouseleave={(e) => {
        e.currentTarget.style.background = 'transparent';
        e.currentTarget.style.borderColor = '#333';
      }}
      title="Settings"
    >
      <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
        <circle cx="12" cy="12" r="3"></circle>
        <path d="M12 1v6m0 6v6m9-9h-6m-6 0H3m15.364 6.364l-4.243-4.243m-4.242 0L5.636 17.364m12.728 0l-4.243-4.243m-4.242 0L5.636 6.636"></path>
      </svg>
    </button>

    <!-- Power Button (Save/Quit) -->
    <button
      onclick={handleQuit}
      style="
        width: 40px;
        height: 40px;
        background: transparent;
        border: 1px solid #333;
        border-radius: 4px;
        cursor: pointer;
        display: flex;
        align-items: center;
        justify-content: center;
        color: white;
      "
      onmouseenter={(e) => {
        e.currentTarget.style.background = '#25252a';
        e.currentTarget.style.borderColor = '#dc3545';
      }}
      onmouseleave={(e) => {
        e.currentTarget.style.background = 'transparent';
        e.currentTarget.style.borderColor = '#333';
      }}
      title="Save and Quit"
    >
      <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
        <path d="M18.36 6.64a9 9 0 1 1-12.73 0"></path>
        <line x1="12" y1="2" x2="12" y2="12"></line>
        <line x1="12" y1="12" x2="16" y2="12"></line>
      </svg>
    </button>
  </div>
</div>

