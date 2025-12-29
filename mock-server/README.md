# Nightmare Mock API Server

Mock server for UI development that simulates the full backend API inventory. Returns fake data matching the real API response structures.

## Purpose

- **Backend-First Development**: UI can be built and tested without the actual backend running
- **Realistic Responses**: Mock data matches real API response structures exactly
- **Fast Iteration**: No need to wait for backend implementation
- **API Contract Validation**: Ensures UI matches backend API contracts

## Setup

```bash
cd ui/mock-server
npm install
npm start
```

The mock server will run on `http://localhost:8001` (same port as the real orchestrator).

## Usage

### Development Mode (with delay to simulate network latency)

```bash
npm run dev
```

This adds a 500ms delay to all responses to simulate real network conditions.

### Production Mode (instant responses)

```bash
npm start
```

## API Endpoints

The mock server simulates all endpoints documented in `VERSION_6.2.0_UI_BACKEND_API_MAPPING.md`:

### Orchestrator Endpoints
- `GET /api/v1/health` - Health check
- `GET /api/v1/status` - Orchestrator status
- `GET /api/v1/services` - List services
- `GET /api/v1/services/:name` - Get service status
- `POST /api/v1/services/:name/start` - Start service
- `POST /api/v1/services/:name/stop` - Stop service
- `POST /api/v1/services/:name/restart` - Restart service
- `POST /api/v1/jobs` - Submit job
- `GET /api/v1/jobs/:id` - Get job status
- `GET /api/v1/jobs/:id/result` - Get job result

### Stack Management Endpoints
- `GET /api/v1/stack/containers` - List containers
- `GET /api/v1/stack/containers/:name` - Get container status
- `GET /api/v1/stack/containers/:name/logs` - Get container logs
- `POST /api/v1/stack/containers/:name/restart` - Restart container
- `POST /api/v1/stack/restart-all` - Restart all containers
- `POST /api/v1/stack/restart-model` - Restart vLLM
- `GET /api/v1/stack/warnings` - Get stack warnings

### AI Service Endpoints
- `POST /generate` - Generate text (mock)
- `GET /health` - Health check
- `GET /status` - Service status
- `GET /tools` - List tools
- `POST /tools/execute` - Execute tool
- `POST /similarity/search` - Search similar conversations
- `POST /context` - Get conversation context

### Model Registry Endpoints
- `GET /api/v1/models` - List models
- `GET /api/v1/models/:id` - Get model card

### Workflow Endpoints
- `GET /api/v1/workflows` - List workflows
- `GET /api/v1/workflows/:id` - Get workflow
- `POST /api/v1/workflows` - Create workflow
- `PUT /api/v1/workflows/:id` - Update workflow
- `DELETE /api/v1/workflows/:id` - Delete workflow
- `POST /api/v1/workflows/run` - Run workflow

### Project Endpoints
- `GET /api/v1/projects` - List projects
- `GET /api/v1/projects/:id` - Get project
- `POST /api/v1/projects` - Create project
- `PUT /api/v1/projects/:id` - Update project
- `DELETE /api/v1/projects/:id` - Delete project
- `GET /api/v1/projects/:id/chat` - Get chat history
- `POST /api/v1/projects/:id/chat` - Send message

## Mock Data

Mock data is stored in `db.json` and can be edited to match your testing needs. The structure matches the real API response formats.

## Custom Middleware

The `middleware.js` file handles special endpoints that need custom logic:
- POST endpoints that create resources
- Endpoints that need dynamic responses
- Endpoints that simulate real behavior

## Switching to Real Backend

When the real backend is ready:

1. Update the UI's API base URL from `http://localhost:8001` (mock) to the real orchestrator URL
2. The UI should work without changes since it was built to match the API contracts
3. Remove the mock server from the development workflow

## Notes

- All responses match the real API response structures
- Error responses are not yet implemented (will return 404 for non-existent resources)
- Streaming responses are not yet implemented (will return full response immediately)
- WebSocket connections are not yet implemented (will need real backend)

