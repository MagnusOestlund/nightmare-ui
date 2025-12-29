# Canvas Library Note

## Issue
`@xyflow/svelte` requires Svelte 5, but we're using Svelte 4.

## Current Solution
Created a simple placeholder canvas that:
- Supports drag-and-drop nodes from palette
- Shows nodes on canvas
- Basic node dragging
- Simple edge rendering

## Future Upgrade
When ready to add full canvas functionality:

1. **Option 1: Upgrade to Svelte 5**
   ```bash
   npm install svelte@^5.25.0
   npm install @xyflow/svelte
   ```
   Then replace the placeholder canvas with the full @xyflow/svelte implementation.

2. **Option 2: Use React Flow with Svelte wrapper**
   - More complex but proven library
   - Works with current Svelte 4

3. **Option 3: Build custom canvas**
   - More work but full control
   - No external dependencies

## Current Status
✅ UI can run without canvas library
✅ Basic canvas placeholder works
✅ Drag-and-drop from palette functional
⏳ Full canvas features pending Svelte 5 upgrade

