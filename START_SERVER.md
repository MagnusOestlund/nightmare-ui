# Starting the UI Server for Network Access

## Configuration

The Vite server is configured to bind to `0.0.0.0` (all network interfaces) on port **5173**.

## Access URL

Once started, access the UI at:
- **Local**: `http://localhost:5173`
- **Network**: `http://192.168.1.199:5173` (or your server's IP)

## Starting the Server

```bash
cd /home/admin/repos/nightmare/nightmare-ui

# Install dependencies (first time only)
npm install

# Start development server
npm run dev
```

The server will start and be accessible from the network.

## Troubleshooting

If you can't access from network:

1. **Check if server is running**:
   ```bash
   netstat -tuln | grep 5173
   # or
   ss -tuln | grep 5173
   ```

2. **Check firewall**:
   ```bash
   sudo ufw status
   # If needed, allow port:
   sudo ufw allow 5173/tcp
   ```

3. **Verify binding**:
   ```bash
   # Should show 0.0.0.0:5173, not 127.0.0.1:5173
   netstat -tuln | grep 5173
   ```

4. **Check server IP**:
   ```bash
   hostname -I
   # Verify it matches 192.168.1.199
   ```


