# Phase 2 Canvas Implementation Notes

## Package Installation

The canvas uses `@xyflow/svelte` for the workflow builder. If this package doesn't exist or has compatibility issues, alternatives:

1. **@xyflow/svelte** (preferred if available)
   ```bash
   npm install @xyflow/svelte
   ```

2. **svelte-flow** (alternative Svelte Flow library)
   ```bash
   npm install svelte-flow
   ```

3. **React Flow with Svelte wrapper** (fallback)
   - Use React Flow via a Svelte wrapper component
   - More complex but proven library

## Current Implementation

- Canvas component created: `src/components/WorkflowCanvas.svelte`
- Node palette created: `src/components/NodePalette.svelte`
- Drag-and-drop from palette to canvas implemented
- Save/load workflow stubbed (needs backend integration)

## Next Steps

1. **Install and Test**:
   ```bash
   cd nightmare-ui
   npm install
   npm run dev
   ```

2. **Verify Canvas**:
   - Check if canvas loads
   - Test drag-and-drop from palette
   - Verify zoom/pan controls work

3. **Backend Integration**:
   - Implement workflow save API
   - Implement workflow load API
   - Connect canvas to real backend

4. **Custom Node Types**:
   - Create custom node components for each type
   - Add node inspector panel
   - Connect to backend execution

## Known Issues

- Package `@xyflow/svelte` may need verification (check npm registry)
- Event handlers may need adjustment based on actual library API
- Node types configuration needs implementation


