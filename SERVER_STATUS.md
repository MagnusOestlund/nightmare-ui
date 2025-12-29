# Server Status

## Current Status
✅ **Server is running** on port **5173**

## Access URLs
- **Local**: `http://localhost:5173`
- **Network**: `http://192.168.1.199:5173`

## Check if Server is Running

```bash
# Check if port is listening
netstat -tuln | grep 5173
# or
ss -tuln | grep 5173

# Check if process is running
ps aux | grep vite | grep -v grep

# Test server response
curl http://localhost:5173
```

## Start the Server

```bash
cd /home/admin/repos/nightmare/nightmare-ui
npm run dev
```

Or use the helper script:
```bash
./start-server.sh
```

## Stop the Server

```bash
# Find and kill the process
pkill -f "vite.*5173"
# or
lsof -ti :5173 | xargs kill
```

## Troubleshooting

If the server stops unexpectedly:

1. **Check for errors**:
   ```bash
   cd nightmare-ui
   npm run dev
   ```
   (Run in foreground to see error messages)

2. **Check port conflicts**:
   ```bash
   lsof -i :5173
   ```

3. **Restart the server**:
   ```bash
   pkill -f vite
   cd nightmare-ui
   npm run dev
   ```

4. **Check firewall** (if can't access from network):
   ```bash
   sudo ufw allow 5173/tcp
   ```

## Keep Server Running

To keep the server running in the background:

```bash
# Using nohup
nohup npm run dev > vite.log 2>&1 &

# Or using screen
screen -S nightmare-ui
npm run dev
# Press Ctrl+A then D to detach
# Reattach with: screen -r nightmare-ui

# Or using tmux
tmux new -s nightmare-ui
npm run dev
# Press Ctrl+B then D to detach
# Reattach with: tmux attach -t nightmare-ui
```

