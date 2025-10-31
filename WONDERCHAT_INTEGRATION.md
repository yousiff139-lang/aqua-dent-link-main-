# Wonderchat Widget Integration

## Overview

The Wonderchat chatbot widget has been integrated into the dental-care website to provide AI-powered assistance to patients. The widget appears **only on patient-facing pages** and is hidden from dentist/admin portals.

## Implementation

### Two-Part Integration

1. **Script Loading** (`index.html`): The Wonderchat script is loaded directly in the HTML for faster initial load
2. **Visibility Control** (`WonderChatWidget.tsx`): React component controls when the widget is visible based on the current route

### Component: `WonderChatWidget.tsx`

Located at: `src/components/WonderChatWidget.tsx`

This component controls the visibility of the Wonderchat widget based on the current route. It doesn't load/unload the script (which is in index.html), but instead shows/hides the widget using CSS.

### Integration Points

1. **index.html**: Script tag loads the Wonderchat widget on page load
2. **src/App.tsx**: WonderChatWidget component controls visibility based on routes

## Where the Chatbot Appears

The chatbot widget is visible on the following patient-facing pages:

- ✅ Home page (`/`)
- ✅ Dentists listing (`/dentists`)
- ✅ Individual dentist profiles (`/dentist/:id`)
- ✅ Contact page (`/contact`)
- ✅ About page (`/about`)
- ✅ Authentication page (`/auth`)
- ✅ Patient dashboard (`/dashboard`)
- ✅ Profile settings (`/profile-settings`)

## Where the Chatbot is Hidden

The chatbot is **NOT visible** on:

- ❌ Dentist Dashboard (`/dentist-dashboard`)
- ❌ Dentist Portal (`/dentist-portal`)
- ❌ Admin Portal (`/admin`)

## Configuration

### Widget Settings

Current configuration:
- **Widget Size**: Normal
- **Button Size**: Normal
- **Widget ID**: `cmh51426n0d2z65s8dwi0ascd`

### Customization

To modify the widget appearance, edit `src/components/WonderChatWidget.tsx`:

```typescript
// Change widget size
script.setAttribute("data-widget-size", "large"); // Options: small, normal, large

// Change button size
script.setAttribute("data-widget-button-size", "small"); // Options: small, normal, large
```

### Adding/Removing Pages

To modify which pages show the chatbot, edit the `allowedPaths` array:

```typescript
const allowedPaths = [
  "/",
  "/home",
  "/dentists",
  "/dentist/",
  "/contact",
  "/about",
  // Add more paths here
];
```

## Testing

### Manual Testing Steps

1. **Start the development server**:
   ```bash
   npm run dev
   ```

2. **Test patient pages** (chatbot should appear):
   - Visit `http://localhost:5174/`
   - Visit `http://localhost:5174/dentists`
   - Visit `http://localhost:5174/contact`
   - Verify the chatbot widget appears in the bottom-right corner

3. **Test dentist/admin pages** (chatbot should NOT appear):
   - Visit `http://localhost:5174/dentist-dashboard`
   - Visit `http://localhost:5174/dentist-portal`
   - Visit `http://localhost:5174/admin`
   - Verify the chatbot widget does NOT appear

4. **Test navigation**:
   - Navigate from a patient page to a dentist portal
   - Verify the chatbot disappears
   - Navigate back to a patient page
   - Verify the chatbot reappears

### Browser Console

Check the browser console for any errors related to the Wonderchat script. The script should load without errors on allowed pages.

## Technical Details

### How It Works (Updated Implementation)

**Two-Part System:**

1. **Script Loading (index.html)**:
   - The Wonderchat script is loaded once when the page loads
   - Uses `defer` attribute for non-blocking load
   - Loads in parallel with React app initialization
   - This ensures faster initial load time

2. **Visibility Control (React Component)**:
   - The component uses React's `useEffect` hook to monitor route changes via `useLocation()`
   - On each route change, it checks if the current path is in the allowed list
   - It explicitly excludes dentist/admin routes
   - Instead of loading/unloading the script, it shows/hides the widget using CSS `display` property
   - Retries visibility checks at 500ms, 1s, and 2s to ensure the widget is found

### Why This Approach?

**Previous approach** (dynamic script loading):
- ❌ Slower initial load
- ❌ Script had to reload on every route change
- ❌ Potential race conditions

**Current approach** (static script + visibility control):
- ✅ Faster initial load (script loads immediately)
- ✅ No script reloading needed
- ✅ Smoother transitions between pages
- ✅ More reliable widget detection

### Widget Detection

The component searches for the Wonderchat widget using multiple selectors:
- `[id*="wonderchat"]` - Elements with "wonderchat" in ID
- `[class*="wonderchat"]` - Elements with "wonderchat" in class
- `iframe[src*="wonderchat"]` - Wonderchat iframes
- `[data-wonderchat]` - Elements with wonderchat data attribute

This ensures the widget is found regardless of how Wonderchat structures its DOM.

## Troubleshooting

### Chatbot Not Appearing

1. **Check the browser console** for loading messages:
   - Look for "✅ Wonderchat widget visible on: /" messages
   - Check for "⏳ Wonderchat widget not found yet" warnings

2. **Verify the script is loading**:
   - Open browser DevTools → Network tab
   - Look for `wonderchat-seo.js` in the network requests
   - Check if it loads successfully (status 200)

3. **Check the route**:
   - Verify the current route is in the `allowedPaths` array
   - Console should show which route you're on

4. **Wait a few seconds**:
   - The widget may take 2-3 seconds to initialize
   - The component retries visibility checks at 500ms, 1s, and 2s intervals

5. **Hard refresh**:
   - Press Ctrl+Shift+R (Windows) or Cmd+Shift+R (Mac)
   - This clears the cache and reloads all scripts

### Chatbot Loading Slowly

The chatbot script is now loaded directly in `index.html` which should make it faster. If it's still slow:

1. **Check your internet connection**
2. **Check Wonderchat service status** at wonderchat.io
3. **Look for console errors** that might indicate script loading issues
4. **Try a different browser** to rule out browser-specific issues

### Chatbot Appearing on Wrong Pages

1. **Check the `isDentistOrAdminRoute` logic** in `WonderChatWidget.tsx`
2. **Verify route paths** match your actual routes in `App.tsx`
3. **Check for typos** in path strings
4. **Look at console logs** to see where the widget is being shown/hidden

### Widget Not Hiding on Dentist/Admin Pages

1. **Check console logs** - should show "🚫 Wonderchat widget hidden on: /dentist-dashboard"
2. **Verify the route path** matches the exclusion logic
3. **Hard refresh the page** to ensure latest code is loaded

## Future Enhancements

Possible improvements:

1. **Role-based display**: Show/hide based on user authentication role
2. **Custom messages**: Display different chatbot messages based on the page
3. **Analytics integration**: Track chatbot usage and interactions
4. **A/B testing**: Test different widget sizes and positions
5. **Conditional loading**: Load based on user preferences or settings

## Support

For Wonderchat-specific issues, refer to:
- [Wonderchat Documentation](https://wonderchat.io/docs)
- [Wonderchat Support](https://wonderchat.io/support)

For integration issues, check the component code in `src/components/WonderChatWidget.tsx`.
