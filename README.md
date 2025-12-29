# Nightmare UI

**Phase 1.1: Svelte + Vite (Zero Config)** - Plain buttons, mock server integration. Proof it works.

## Philosophy

- **Start stupid, prove it works**
- **Fancy comes after proof**
- **Every button calls a real API endpoint**
- **No assumptions about what looks good**

## Setup

```bash
# Install dependencies (includes @xyflow/svelte for canvas)
npm install

# Start mock server (in another terminal, optional)
cd mock-server
npm install
npm start

# Start UI dev server
npm run dev
```

**Note**: After installing dependencies, the canvas will be available. If @xyflow/svelte is not available, you may need to use an alternative like `svelte-flow` or React Flow with a Svelte wrapper.

Open [http://localhost:5173](http://localhost:5173)

**Note**: Port 3000 is used by Grafana, so the UI uses port 5173 (Vite's default port).

## Framework

- **Svelte 4**: Reactivity without framework bloat — zero runtime overhead
- **Vite**: Zero config bundler, instant refresh, fast HMR
- **TypeScript**: Type safety
- **Result**: Code is the app. Refresh browser → instant. Fast. Clean. No waiting for JavaScript

## Phase 1.1-2 Features

- ✅ Health check button
- ✅ Chat interface (plain text input + send button)
- ✅ Model switching (dropdown)
- ✅ Model card inspector (tabs: docs, specs, VRAM, settings, benchmarks)
- ✅ Stack management (list of containers + restart buttons)
- ✅ Warnings display
- ✅ **Phase 2**: Workflow canvas with @xyflow/svelte
- ✅ **Phase 2**: Node palette with drag-and-drop

**Backend Connection**: 
- Default: Connects to orchestrator at `http://localhost:8001`
- Mock server: Available at `http://localhost:8001` (if mock server is running)
- To use real backend: Ensure orchestrator is running on port 8001
- To use mock server: Start mock server with `cd mock-server && npm start`

**Phase 2 Canvas**:
- Dark-mode infinite canvas
- Drag-and-drop nodes from palette
- Zoom, pan, minimap controls
- Save/load workflow (backend integration pending)

## Project Structure

```
nightmare-ui/
├── src/
│   ├── components/
│   │   ├── ChatSidebar.svelte      # Chat interface
│   │   └── ModelCardInspector.svelte # Model details viewer
│   ├── App.svelte                   # Main app component
│   ├── main.ts                      # Entry point
│   └── app.css                      # Global styles
├── mock-server/                     # json-server mock API
├── index.html                       # HTML entry point
├── vite.config.ts                   # Vite configuration
├── svelte.config.js                 # Svelte configuration
└── package.json
```

## Development

```bash
# Development mode (with HMR)
npm run dev

# Build for production
npm run build

# Preview production build
npm run preview

# Type checking
npm run check
```

## Git Strategy

- **Phase 1 Commit**: `[Phase 1.1] UI: Svelte + Vite - plain buttons, mock server integration`
- **Branch**: `phase-1.1-svelte-ui`
- **Never delete**: Keep this branch forever as a safety net

If you wake up tomorrow and hate the fancy UI → `git checkout phase-1.1-svelte-ui`

## Next Phases

- **Phase 2**: Connect to real backend (just change API URL)
- **Phase 3**: Add real model integration
- **Phase 4**: Add real AI assistant
- **Phase 5**: Add canvas with @xyflow/svelte (drag, zoom, icons, animations)
- **Phase 6**: Polish & animations

See `STUPID_UI.md` for detailed Phase 1 requirements.
