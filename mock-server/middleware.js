// Custom middleware for json-server to handle special endpoints

module.exports = (req, res, next) => {
  // Get the original URL before any rewriting
  const originalUrl = req.originalUrl || req.url;
  
  // Debug: log all requests to preferences endpoint
  if (originalUrl && originalUrl.includes('/user/preferences')) {
    console.log('Preferences request:', req.method, originalUrl, req.url);
  }
  
  // Handle user preferences - intercept BEFORE json-server processes routes
  if (originalUrl && originalUrl.match(/\/api\/v1\/user\/preferences\/.+/)) {
    const pathMatch = originalUrl.match(/\/api\/v1\/user\/preferences\/(.+)/);
    const key = pathMatch ? pathMatch[1] : originalUrl.split('/').pop();
    const preferenceId = `default:${key}`;
    const fs = require('fs');
    const path = require('path');
    const dbPath = path.join(__dirname, 'db.json');
    const db = JSON.parse(fs.readFileSync(dbPath, 'utf8'));
    
    if (req.method === 'GET') {
      const pref = db.user_preferences.find(p => p.id === preferenceId);
      if (pref) {
        // Return just the data, not the id
        const { id, ...preference } = pref;
        res.json(preference);
      } else {
        res.json({});
      }
      return;
    }
    
    if (req.method === 'PUT') {
      const existingIndex = db.user_preferences.findIndex(p => p.id === preferenceId);
      const preferenceData = { ...req.body };
      
      if (existingIndex >= 0) {
        db.user_preferences[existingIndex] = { id: preferenceId, ...preferenceData };
      } else {
        db.user_preferences.push({ id: preferenceId, ...preferenceData });
      }
      
      fs.writeFileSync(dbPath, JSON.stringify(db, null, 2));
      
      res.json({
        message: 'Preferences updated successfully',
        preference_key: key,
        preferences: preferenceData
      });
      return;
    }
  }
  // Handle POST /generate (AI Service)
  if (req.method === 'POST' && req.path === '/generate') {
    const { prompt, model = 'ministral-3-8b-instruct', temperature = 0.7, max_tokens = 2048 } = req.body;
    
    // Simulate streaming response (mock)
    res.json({
      text: `This is a mock response to: "${prompt.substring(0, 50)}..."\n\nThe AI service would generate a real response here. This is just mock data for UI development.`,
      model: model,
      tokens: Math.floor(Math.random() * 100) + 50,
      finish_reason: 'stop',
      usage: {
        prompt_tokens: prompt.length / 4,
        completion_tokens: Math.floor(Math.random() * 100) + 50,
        total_tokens: Math.floor(Math.random() * 100) + 50 + prompt.length / 4
      }
    });
    return;
  }

  // Handle POST /api/v1/jobs (Job submission)
  if (req.method === 'POST' && req.path.startsWith('/api/v1/jobs')) {
    const itemId = `job-${Date.now()}`;
    res.json({
      item_id: itemId,
      status: 'PENDING',
      created_at: new Date().toISOString()
    });
    return;
  }

  // Handle POST /api/v1/workflows/run
  if (req.method === 'POST' && req.path === '/api/v1/workflows/run') {
    const jobId = `job-${Date.now()}`;
    res.json({
      job_id: jobId,
      status: 'PENDING',
      workflow_id: req.body.workflow_id || 'wf-1',
      created_at: new Date().toISOString()
    });
    return;
  }

  // Handle POST /api/v1/stack/containers/:name/restart
  if (req.method === 'POST' && req.path.match(/\/api\/v1\/stack\/containers\/.+\/restart/)) {
    const containerName = req.path.split('/').pop().replace('/restart', '');
    res.json({
      success: true,
      message: `Container ${containerName} restarted successfully`,
      timestamp: new Date().toISOString()
    });
    return;
  }

  // Handle POST /api/v1/stack/restart-all
  if (req.method === 'POST' && req.path === '/api/v1/stack/restart-all') {
    res.json({
      success: true,
      message: 'All containers restarted successfully',
      timestamp: new Date().toISOString()
    });
    return;
  }

  // Handle POST /api/v1/stack/restart-model
  if (req.method === 'POST' && req.path === '/api/v1/stack/restart-model') {
    res.json({
      success: true,
      message: 'vLLM container restarted successfully',
      timestamp: new Date().toISOString()
    });
    return;
  }

  // Handle GET /api/v1/stack/containers/:name/logs
  if (req.method === 'GET' && req.path.match(/\/api\/v1\/stack\/containers\/.+\/logs/)) {
    const containerName = req.path.split('/').pop().replace('/logs', '');
    const container = require('./db.json').containers.find(c => c.name === containerName);
    res.json({
      logs: container ? container.logs : 'No logs available',
      container: containerName,
      timestamp: new Date().toISOString()
    });
    return;
  }

  // Handle POST /api/v1/projects/:id/chat
  if (req.method === 'POST' && req.path.match(/\/api\/v1\/projects\/.+\/chat/)) {
    const projectId = req.path.split('/')[4];
    res.json({
      success: true,
      message_id: `msg-${Date.now()}`,
      project_id: projectId,
      timestamp: new Date().toISOString()
    });
    return;
  }

  // Handle POST /tools/execute
  if (req.method === 'POST' && req.path === '/tools/execute') {
    const { tool_name, parameters } = req.body;
    res.json({
      success: true,
      tool_name: tool_name,
      result: `Mock execution result for ${tool_name} with parameters: ${JSON.stringify(parameters)}`,
      execution_time_ms: Math.floor(Math.random() * 1000) + 100
    });
    return;
  }

  // Handle POST /similarity/search
  if (req.method === 'POST' && req.path === '/similarity/search') {
    const { query, limit = 5 } = req.body;
    res.json({
      results: Array.from({ length: limit }, (_, i) => ({
        text: `Mock similar conversation ${i + 1} related to: "${query}"`,
        similarity: 0.9 - (i * 0.1),
        session_id: `session-${i + 1}`,
        timestamp: new Date(Date.now() - i * 86400000).toISOString()
      }))
    });
    return;
  }

  // Handle POST /context
  if (req.method === 'POST' && req.path === '/context') {
    const { session_id, limit = 10 } = req.body;
    res.json({
      context: Array.from({ length: limit }, (_, i) => ({
        prompt: `Mock prompt ${i + 1} from session ${session_id}`,
        response: `Mock response ${i + 1}`,
        timestamp: new Date(Date.now() - i * 3600000).toISOString()
      }))
    });
    return;
  }

  // Handle GET /api/v1/user/preferences/:key
  // Use req.url which is what json-server provides
  if (req.method === 'GET' && req.url && req.url.match(/\/api\/v1\/user\/preferences\/.+/)) {
    const pathMatch = req.url.match(/\/api\/v1\/user\/preferences\/(.+)/);
    const key = pathMatch ? pathMatch[1] : req.url.split('/').pop();
    const fs = require('fs');
    const path = require('path');
    const dbPath = path.join(__dirname, 'db.json');
    const db = JSON.parse(fs.readFileSync(dbPath, 'utf8'));
    const preferenceKey = `default:${key}`;
    const preference = (db.user_preferences && db.user_preferences[preferenceKey]) || {};
    res.json(preference);
    return;
  }

  // Handle PUT /api/v1/user/preferences/:key
  // Use req.url which is what json-server provides
  if (req.method === 'PUT' && req.url && req.url.match(/\/api\/v1\/user\/preferences\/.+/)) {
    const pathMatch = req.url.match(/\/api\/v1\/user\/preferences\/(.+)/);
    const key = pathMatch ? pathMatch[1] : req.url.split('/').pop();
    const preferenceKey = `default:${key}`;
    const fs = require('fs');
    const path = require('path');
    const dbPath = path.join(__dirname, 'db.json');
    const db = JSON.parse(fs.readFileSync(dbPath, 'utf8'));
    
    // Update the preference
    if (!db.user_preferences) {
      db.user_preferences = {};
    }
    db.user_preferences[preferenceKey] = req.body;
    
    // Write to file
    fs.writeFileSync(dbPath, JSON.stringify(db, null, 2));
    
    res.json({
      message: 'Preferences updated successfully',
      preference_key: key,
      preferences: req.body
    });
    return;
  }

  // Continue with default json-server behavior
  next();
};

