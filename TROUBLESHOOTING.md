# Troubleshooting Black Screen

## Issue
Browser shows black screen when accessing http://192.168.1.199:5173

## Possible Causes

1. **@xyflow/svelte Import Error**
   - The library might not be loading correctly
   - Solution: Temporarily using simple canvas component to test

2. **Svelte 5 Event Handler Syntax**
   - Fixed: Changed all `on:click` to `onclick` (Svelte 5 syntax)
   - Fixed: Changed all `on:drop` to `ondrop`

3. **JavaScript Runtime Error**
   - Check browser console (F12) for errors
   - Look for import/module errors

## Testing Steps

1. **Check if server is running**:
   ```bash
   netstat -tuln | grep 5173
   ```

2. **Check server logs**:
   ```bash
   cd nightmare-ui
   npm run dev
   # Look for errors in terminal
   ```

3. **Test with simple component**:
   - Currently using `WorkflowCanvas.simple.svelte` to test
   - If simple version works, issue is with @xyflow/svelte
   - If simple version also shows black, issue is more fundamental

4. **Check browser console**:
   - Open browser DevTools (F12)
   - Check Console tab for JavaScript errors
   - Check Network tab for failed requests

## Next Steps

If simple canvas works:
- Issue is with @xyflow/svelte import
- May need to check package installation
- May need to use alternative library

If simple canvas also shows black:
- Check if app is mounting at all
- Check for CSS issues
- Check for JavaScript errors in console

