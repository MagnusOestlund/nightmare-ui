<script lang="ts">
  /**
   * Minimal test app to verify Svelte is working
   */
  
  let count = $state(0);
  
  function increment() {
    count++;
  }
</script>

<div style="padding: 40px; background: white; color: black; min-height: 100vh;">
  <h1 style="color: red; font-size: 48px;">✅ SVELTE IS WORKING!</h1>
  <p style="font-size: 24px;">If you see this, the app is loading correctly.</p>
  <button 
    onclick={increment}
    style="padding: 20px; font-size: 24px; background: blue; color: white; border: none; cursor: pointer;"
  >
    Click me! Count: {count}
  </button>
  <p style="margin-top: 20px;">Count: {count}</p>
</div>

