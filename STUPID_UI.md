# Stupid UI - Phase 1

**Goal**: Build the worst possible UI that still works. Plain text buttons. No icons. No drag. No zoom. If it calls the mock server and says "ok" → we're golden.

## Philosophy

- **Start stupid, prove it works**
- **Fancy comes after proof**
- **Every button must call a real API endpoint**
- **No assumptions about what looks good**

## What "Stupid" Means

- Plain HTML buttons (no CSS, no icons)
- Text input fields (no fancy autocomplete)
- Simple text output (no markdown, no syntax highlighting)
- List of items (no cards, no hover effects)
- Dropdowns (native HTML select, no custom styling)
- No animations, no transitions, no fancy effects
- No drag & drop, no zoom, no pan
- No icons, no images, no logos

## What "Works" Means

- Every button calls a real API endpoint (mock server)
- Every API call shows loading state
- Every API response is displayed (even if ugly)
- Errors are shown (even if just text)
- No crashes, no broken functionality

## Phase 1 Deliverables

### 1. Chat Interface (Stupid Version)
- Text input field
- "Send" button
- Text output area (plain text, no formatting)
- Model dropdown (native HTML select)
- "Switch Model" button

**API Calls**:
- `POST /generate` - Send message
- `GET /api/v1/models` - List models
- Client-side model switching (just update state)

### 2. Stack Management (Stupid Version)
- List of containers (plain HTML list)
- Each container shows: name, status (text)
- "Restart" button next to each container
- "Restart All" button
- "Restart vLLM" button
- Warnings list (plain text)

**API Calls**:
- `GET /api/v1/stack/containers` - List containers
- `POST /api/v1/stack/containers/:name/restart` - Restart container
- `POST /api/v1/stack/restart-all` - Restart all
- `POST /api/v1/stack/restart-model` - Restart vLLM
- `GET /api/v1/stack/warnings` - Get warnings

### 3. Health Check (Stupid Version)
- "Check Health" button
- Text output showing health status

**API Calls**:
- `GET /api/v1/health` - Health check
- `GET /api/v1/status` - Status

## Success Criteria

✅ All buttons call mock server endpoints  
✅ All API responses are displayed (even if ugly)  
✅ Loading states are shown (even if just "Loading...")  
✅ Errors are shown (even if just "Error: ...")  
✅ No crashes, no broken functionality  
✅ Can switch between models  
✅ Can restart containers  
✅ Can send chat messages  

## What Comes Next (Phase 2+)

- **Phase 2**: Connect to real backend (just change API URL)
- **Phase 3**: Add real model integration
- **Phase 4**: Add real AI assistant
- **Phase 5**: Add fancy UI (drag, zoom, icons, animations)
- **Phase 6**: Polish & animations

## Git Strategy

- **Commit after Phase 1**: `[Phase 1] UI: Stupid version - plain buttons, mock server integration`
- **Branch**: `phase-1-stupid-ui`
- **Never delete**: Keep this branch forever as a safety net

If you wake up tomorrow and hate the fancy UI → `git checkout phase-1-stupid-ui`

