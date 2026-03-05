# PWA (Progressive Web App) Implementation

This document describes the PWA offline support added to the Pencils of Promise application.

## Overview

PWA support has been implemented as a **non-intrusive enhancement layer** that preserves all existing functionality when online. The app now:

- Works offline with cached content
- Can be installed as a standalone app on mobile and desktop
- Provides a native app-like experience
- Caches API responses for offline access

## Files Added/Modified

### New Files

1. **`/public/manifest.json`**
   - PWA manifest with app metadata
   - Defines app name, icons, theme colors, and display mode
   - Makes the app installable

2. **`/public/sw.js`**
   - Service worker with intelligent caching strategies
   - Handles offline functionality
   - Caches app shell and API responses

### Modified Files

1. **`/src/main.tsx`**
   - Added service worker registration
   - Handles service worker updates
   - Logs registration status

2. **`/index.html`**
   - Added PWA manifest link
   - Added Apple touch icon meta tags
   - Added mobile web app meta tags
   - Added MS Tile configuration

## Caching Strategies

The service worker implements three caching strategies:

### 1. Cache First Strategy (Static Assets)

Used for: JavaScript bundles, CSS files, images, fonts

- **Online**: Serves from cache, fetches from network if not cached
- **Offline**: Serves from cache
- **Files**: `/assets/*`, `.js`, `.css`, `.png`, `.jpg`, `.svg`, `.woff`, etc.

### 2. Network First Strategy (HTML/Dynamic Content)

Used for: HTML pages, dynamic content

- **Online**: Fetches from network, updates cache
- **Offline**: Falls back to cached version
- **Files**: `/index.html`, navigation routes

### 3. Network First with Cache Strategy (API Calls)

Used for: Supabase API calls, Edge Functions

- **Online**: Fetches from network, caches response with timestamp
- **Offline**: Serves cached response if less than 30 minutes old
- **Cache Duration**: 30 minutes
- **Files**: `*.supabase.co/*`, `/functions/*`

## Offline Behavior

### When Online
- **Identical behavior** to the current application
- All features work normally
- API calls go directly to the server
- Real-time updates work as expected

### When Offline
- **App shell loads** from cache (HTML, CSS, JS)
- **Previously visited pages** are accessible
- **Recent API responses** (within 30 minutes) are served from cache
- **New API calls** return a 503 error with offline indicator
- **User sees** the full UI but with cached data

### Fallback Responses

When offline and no cache is available:
- Static assets: "Offline - Resource not available" (503)
- API calls: `{"error": "Offline - No cached data available", "offline": true}` (503)
- HTML pages: Falls back to cached `/index.html`

## Installation

The app can be installed on:

- **Android**: Chrome, Edge (Add to Home Screen)
- **iOS**: Safari (Add to Home Screen)
- **Desktop**: Chrome, Edge (Install App button in address bar)

### Install Button

Browsers that support PWA installation will show an install prompt/button automatically when the app meets PWA criteria:
- HTTPS connection (or localhost)
- Valid manifest.json
- Registered service worker
- Icons in manifest

## Icons Setup

**⚠️ IMPORTANT**: You need to create PWA icons for the app to be fully installable.

### Required Icons

Create the following icon sizes from your logo:

1. **icon-192.png** (192x192 pixels)
2. **icon-512.png** (512x512 pixels)

Place these files in the `/public` directory.

### Icon Requirements

- Format: PNG
- Background: Should work on any background color
- Design: Simple, recognizable version of your logo
- Safe area: Keep important elements within 80% of the icon area

### Creating Icons

You can use the existing logo at `/src/assets/PoPLogo_color-01-01.png`:

```bash
# Example using ImageMagick (if available)
convert src/assets/PoPLogo_color-01-01.png -resize 192x192 public/icon-192.png
convert src/assets/PoPLogo_color-01-01.png -resize 512x512 public/icon-512.png
```

Or use online tools:
- https://realfavicongenerator.net/
- https://www.pwabuilder.com/imageGenerator

## Service Worker Lifecycle

### Install Phase
1. Service worker downloads and installs
2. Caches essential app shell files
3. Skips waiting to activate immediately

### Activate Phase
1. Takes control of all pages
2. Cleans up old caches from previous versions
3. Claims all clients

### Fetch Phase
1. Intercepts all network requests
2. Applies appropriate caching strategy
3. Returns cached or network response

### Update Detection

When a new service worker is available:
1. Console logs: "New service worker available. Refresh to update."
2. User can refresh to get the latest version
3. No automatic reload (preserves user state)

## Cache Management

### Cache Names
- `uhuru-ai-v1.0.0-static`: Static assets (JS, CSS, images)
- `uhuru-ai-v1.0.0-dynamic`: HTML and dynamic content
- `uhuru-ai-v1.0.0-api`: API responses

### Cache Versioning

When you update the app:
1. Change `CACHE_VERSION` in `/public/sw.js`
2. Old caches are automatically deleted on activation
3. New caches are created with the new version

### Manual Cache Clearing

To clear all caches (useful for debugging):

```javascript
// In browser console
navigator.serviceWorker.controller.postMessage({ type: 'CLEAR_CACHE' });
```

## Testing PWA Features

### Testing Offline Mode

1. **Chrome DevTools**:
   - Open DevTools (F12)
   - Go to Network tab
   - Check "Offline" checkbox
   - Reload the page

2. **Service Worker Status**:
   - Open DevTools (F12)
   - Go to Application tab
   - Click "Service Workers" in left sidebar
   - View registration status

3. **Cache Inspection**:
   - Open DevTools (F12)
   - Go to Application tab
   - Click "Cache Storage" in left sidebar
   - View cached resources

### Testing Installation

1. **Desktop (Chrome/Edge)**:
   - Look for install icon in address bar
   - Click to install as app

2. **Android**:
   - Open Chrome menu (three dots)
   - Select "Add to Home Screen"
   - Follow prompts

3. **iOS**:
   - Open in Safari
   - Tap Share button
   - Select "Add to Home Screen"

## Debugging

### Service Worker Not Registering

Check browser console for errors:
```javascript
// Should see: "Service Worker registered successfully"
```

Common issues:
- Not using HTTPS (except localhost)
- Service worker file not at root of domain
- CORS errors with service worker file

### Cache Not Working

1. Check service worker status in DevTools
2. Verify service worker is activated
3. Check Network tab to see if requests are being intercepted
4. Look for "(from ServiceWorker)" in Network tab

### Clearing Everything

To start fresh:
```javascript
// Unregister service worker
navigator.serviceWorker.getRegistrations().then(registrations => {
  registrations.forEach(registration => registration.unregister());
});

// Clear all caches
caches.keys().then(keys => {
  keys.forEach(key => caches.delete(key));
});

// Then reload the page
location.reload();
```

## Performance Impact

### Positive Impacts
- ⚡ Faster repeat visits (cached resources)
- ⚡ Instant loading of previously visited pages
- ⚡ Reduced server load
- ⚡ Works offline

### Minimal Overhead
- ~6KB service worker file (gzipped)
- ~1KB manifest file
- Negligible runtime overhead
- Caching happens in background

## Browser Support

### Full Support (Install + Offline)
- Chrome 40+ (Desktop & Android)
- Edge 17+
- Opera 27+
- Samsung Internet 4.0+

### Partial Support (Offline Only)
- Safari 11.1+ (iOS & macOS)
- Firefox 44+

### No Support
- Internet Explorer (not supported)

## Best Practices Implemented

✅ Non-intrusive enhancement (graceful degradation)
✅ Network-first for HTML (always fresh content when online)
✅ Cache-first for static assets (fast loading)
✅ Intelligent API caching (30-minute freshness)
✅ Automatic cache versioning and cleanup
✅ Proper error handling for offline scenarios
✅ No breaking changes to existing code
✅ No impact on online behavior

## Future Enhancements (Optional)

Potential improvements you could add:

1. **Update Notification UI**
   - Show toast/banner when new version available
   - "Refresh to update" button

2. **Background Sync**
   - Queue failed API requests
   - Retry when back online

3. **Push Notifications**
   - Notify users of important updates
   - Re-engage users

4. **Advanced Caching**
   - Cache conversation history
   - Cache uploaded files
   - Prefetch likely next pages

5. **Offline Indicator**
   - Visual indicator when offline
   - Disable features that require network

## Maintenance

### When Deploying Updates

1. **Optional**: Update `CACHE_VERSION` in `/public/sw.js`
   - Only needed if you want to force cache refresh
   - Format: `v1.0.1`, `v1.1.0`, etc.

2. Build and deploy normally:
   ```bash
   npm run build
   ```

3. Service worker will automatically update on user's next visit

### Monitoring

Check browser console logs for:
- Service worker registration status
- Cache hit/miss information
- Offline/online status changes
- Update notifications

## Security Considerations

✅ Service worker only works over HTTPS (except localhost)
✅ No sensitive data cached (tokens remain in memory/sessionStorage)
✅ API responses cached with expiration (30 minutes)
✅ Same-origin policy enforced
✅ No third-party API calls cached (OpenAI, Anthropic)

## Troubleshooting

### "Service Worker registration failed"
- Ensure HTTPS is enabled (or using localhost)
- Check that `/public/sw.js` exists
- Verify file permissions

### "App not showing install prompt"
- Create the required icon files (see Icons Setup section)
- Ensure HTTPS connection
- Check manifest.json is valid
- Service worker must be registered

### "Offline mode not working"
- Check service worker is activated (DevTools > Application > Service Workers)
- Verify caches exist (DevTools > Application > Cache Storage)
- Test with Network tab set to "Offline"

### "Old content showing after update"
- Update CACHE_VERSION in sw.js
- Hard refresh (Ctrl+Shift+R or Cmd+Shift+R)
- Clear site data in DevTools

## Summary

The PWA implementation adds offline support and installability to your application **without changing any existing functionality**. When online, the app behaves exactly as before. When offline, users can access previously loaded content and cached API responses. The implementation is production-ready and follows PWA best practices.

**Remember to create the icon files for full PWA functionality!**
