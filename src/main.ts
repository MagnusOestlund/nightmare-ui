import './app.css';
// Real app - Svelte 5 native (no compatibility mode)
import App from './App.svelte';
import { mount } from 'svelte';

// Wait for DOM to be ready
if (document.readyState === 'loading') {
  document.addEventListener('DOMContentLoaded', mountApp);
} else {
  mountApp();
}

function mountApp() {
  const target = document.getElementById('app');
  if (!target) {
    throw new Error('Target element #app not found');
  }

  // Native Svelte 5 - use mount() function instead of new App()
  const app = mount(App, {
    target: target,
  });

  return app;
}


