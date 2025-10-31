# Wonderchat Widget - Debugging Guide

## Quick Checks

### 1. Is the script loading?

Open browser DevTools (F12) → Network tab:
- Look for `wonderchat-seo.js`
- Status should be `200 OK`
- If you see `404` or `Failed`, the script URL might be wrong

### 2. Check Console Logs

The WonderChatWidget component logs helpful messages:

**When widget is visible:**
```
✅ Wonderchat widget visible on: /
```

**When widget is hidden:**
```
🚫 Wonderchat widget hidden on: /dentist-dashboard
```

**When widget is not found:**
```
⏳ Wonderchat widget not found yet, will retry...
```

### 3. Inspect the DOM

Open DevTools → Elements tab:
1. Press Ctrl+F (Cmd+F on Mac) to search
2. Search for "wonderchat"
3. You should see elements with wonderchat in their ID or class

### 4. Check Current Route

In the console, type:
```javascript
window.location.pathname
```

This shows your current route. Compare it with the `allowedPaths` in `WonderChatWidget.tsx`.

## Common Issues & Solutions

### Issue: "Script loads but widget doesn't appear"

**Possible causes:**
1. Widget is hidden by CSS
2. Current route is not in `allowedPaths`
3. Widget initialization is slow

**Solutions:**
1. Check console for visibility logs
2. Add your route to `allowedPaths` array
3. Wait 2-3 seconds for widget to initialize
4. Try manually showing the widget:
   ```javascript
   // In browser console
   const widget = document.querySelector('[id*="wonderchat"]');
   if (widget) widget.style.display = '';
   ```

### Issue: "Widget appears on dentist/admin pages"

**Possible causes:**
1. Route path doesn't match exclusion logic
2. Component not detecting route correctly

**Solutions:**
1. Check console logs to see what route is detected
2. Verify the route starts with `/dentist-dashboard`, `/dentist-portal`, or `/admin`
3. Update the `isDentistOrAdminRoute` logic if needed

### Issue: "Multiple widget instances"

**Possible causes:**
1. Script loaded multiple times
2. Multiple WonderChatWidget components

**Solutions:**
1. Check that script is only in `index.html` once
2. Verify WonderChatWidget is only imported once in `App.tsx`
3. Hard refresh the page (Ctrl+Shift+R)

### Issue: "Widget disappears when navigating"

**Possible causes:**
1. New route is not in `allowedPaths`
2. Component is hiding it intentionally

**Solutions:**
1. Check console logs for the new route
2. Add the route to `allowedPaths` if needed
3. Verify the route doesn't match exclusion patterns

## Manual Testing Script

Run this in the browser console to test widget visibility:

```javascript
// Find the widget
const widget = document.querySelector('[id*="wonderchat"]');

if (widget) {
  console.log('✅ Widget found!');
  console.log('Current display:', widget.style.display);
  console.log('Current route:', window.location.pathname);
  
  // Force show
  widget.style.display = '';
  console.log('Widget should now be visible');
} else {
  console.log('❌ Widget not found in DOM');
  console.log('Checking if script loaded...');
  
  const script = document.querySelector('script[data-name="wonderchat-seo"]');
  if (script) {
    console.log('✅ Script is loaded');
    console.log('Widget might still be initializing...');
  } else {
    console.log('❌ Script not found - check index.html');
  }
}
```

## Checking Widget Configuration

To verify the widget configuration:

```javascript
// In browser console
const script = document.querySelector('script[data-name="wonderchat-seo"]');
if (script) {
  console.log('Widget ID:', script.getAttribute('data-id'));
  console.log('Widget Size:', script.getAttribute('data-widget-size'));
  console.log('Button Size:', script.getAttribute('data-widget-button-size'));
  console.log('Script URL:', script.src);
}
```

Expected output:
```
Widget ID: cmh51426n0d2z65s8dwi0ascd
Widget Size: normal
Button Size: normal
Script URL: https://app.wonderchat.io/scripts/wonderchat-seo.js
```

## Network Issues

If the script fails to load:

1. **Check internet connection**
2. **Try loading the script URL directly** in a new tab:
   ```
   https://app.wonderchat.io/scripts/wonderchat-seo.js
   ```
3. **Check for CORS errors** in console
4. **Verify Wonderchat service is up** at wonderchat.io

## Still Not Working?

1. **Clear browser cache completely**:
   - Chrome: Ctrl+Shift+Delete → Clear all
   - Firefox: Ctrl+Shift+Delete → Clear all
   - Safari: Cmd+Option+E

2. **Try incognito/private mode**:
   - Rules out extension conflicts
   - Fresh browser state

3. **Try a different browser**:
   - Chrome, Firefox, Safari, Edge
   - Rules out browser-specific issues

4. **Check Wonderchat dashboard**:
   - Login to wonderchat.io
   - Verify widget ID is correct: `cmh51426n0d2z65s8dwi0ascd`
   - Check if widget is active

5. **Contact Wonderchat support**:
   - If script loads but widget doesn't work
   - Might be an issue with the widget configuration
   - Provide them with the widget ID

## Development vs Production

### Development (localhost)
- Widget should work on `http://localhost:5174`
- Check console for detailed logs
- Logs are more verbose in development

### Production
- Verify the domain is whitelisted in Wonderchat dashboard
- Some widgets are domain-restricted
- Console logs might be less verbose

## Getting Help

If you're still stuck:

1. **Gather information**:
   - Current route
   - Console logs
   - Network tab screenshot
   - Browser and version

2. **Check the code**:
   - `index.html` - script tag
   - `src/components/WonderChatWidget.tsx` - visibility logic
   - `src/App.tsx` - component integration

3. **Create an issue** with:
   - Steps to reproduce
   - Expected behavior
   - Actual behavior
   - Screenshots/logs
