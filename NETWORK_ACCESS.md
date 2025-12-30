# Network Access Setup for UI Server

## Issue
The UI server needs to be accessible from `http://192.168.1.199:5173` (remote access via SSH).

## Solution Applied

✅ **Updated `vite.config.ts`** to bind to `0.0.0.0` instead of `localhost`:
```typescript
server: {
  host: '0.0.0.0',  // Bind to all interfaces for network access
  port: 5173,
  open: false  // Don't auto-open browser (we're on remote server)
}
```

## Steps to Start Server

1. **Install npm** (if not installed):
   ```bash
   sudo apt update
   sudo apt install npm
   ```

2. **Install dependencies**:
   ```bash
   cd /home/admin/repos/nightmare/nightmare-ui
   npm install
   ```

3. **Start the server**:
   ```bash
   npm run dev
   ```

4. **Access from your machine**:
   - URL: `http://192.168.1.199:5173`
   - The server will be accessible on all network interfaces

## Verify Server is Running

```bash
# Check if port is listening
netstat -tuln | grep 5173
# Should show: 0.0.0.0:5173 (not 127.0.0.1:5173)

# Or using ss
ss -tuln | grep 5173
```

## Firewall (if needed)

If you still can't access, check firewall:
```bash
# Check firewall status
sudo ufw status

# Allow port 5173 if needed
sudo ufw allow 5173/tcp
```

## Server IP Confirmed

Your server IP is: **192.168.1.199** ✅

Once npm is installed and the server is started, you should be able to access:
- **http://192.168.1.199:5173**


