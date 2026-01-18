# PWA Icon Generation Guide

This guide helps you create the required PWA icons for your application.

## Required Icons

You need to create two icon files:
- `public/icon-192.png` (192x192 pixels)
- `public/icon-512.png` (512x512 pixels)

## Option 1: Use Existing Logo (Manual)

Your project has a logo at: `src/assets/PoPLogo_color-01-01.png`

### Steps:

1. Open the logo in an image editor (Photoshop, GIMP, Figma, etc.)
2. Create two new artboards/canvases:
   - 192x192 pixels
   - 512x512 pixels
3. Center your logo on each canvas
4. Add padding/margin if needed (keep logo within 80% safe area)
5. Export as PNG:
   - `public/icon-192.png`
   - `public/icon-512.png`

## Option 2: Online Tools (Recommended)

### PWA Builder Image Generator
1. Go to: https://www.pwabuilder.com/imageGenerator
2. Upload your logo (`src/assets/PoPLogo_color-01-01.png`)
3. Download the generated icons
4. Copy `icon-192.png` and `icon-512.png` to `public/` directory

### RealFaviconGenerator
1. Go to: https://realfavicongenerator.net/
2. Upload your logo
3. Configure PWA settings
4. Download the package
5. Extract and copy the required icons to `public/`

### Favicon.io
1. Go to: https://favicon.io/favicon-converter/
2. Upload your logo
3. Generate icons
4. Download and extract
5. Rename and copy to `public/` directory

## Option 3: Using ImageMagick (Command Line)

If you have ImageMagick installed:

```bash
# Install ImageMagick first (if needed)
# macOS: brew install imagemagick
# Ubuntu/Debian: sudo apt-get install imagemagick
# Windows: Download from https://imagemagick.org/

# Generate icons
convert src/assets/PoPLogo_color-01-01.png -resize 192x192 -background white -gravity center -extent 192x192 public/icon-192.png
convert src/assets/PoPLogo_color-01-01.png -resize 512x512 -background white -gravity center -extent 512x512 public/icon-512.png
```

## Option 4: Using Sharp (Node.js)

Create a script `generate-icons.js`:

```javascript
const sharp = require('sharp');
const fs = require('fs');

async function generateIcons() {
  const logoPath = 'src/assets/PoPLogo_color-01-01.png';

  if (!fs.existsSync(logoPath)) {
    console.error('Logo file not found:', logoPath);
    return;
  }

  // Generate 192x192
  await sharp(logoPath)
    .resize(192, 192, {
      fit: 'contain',
      background: { r: 255, g: 255, b: 255, alpha: 1 }
    })
    .toFile('public/icon-192.png');

  console.log('✅ Generated: public/icon-192.png');

  // Generate 512x512
  await sharp(logoPath)
    .resize(512, 512, {
      fit: 'contain',
      background: { r: 255, g: 255, b: 255, alpha: 1 }
    })
    .toFile('public/icon-512.png');

  console.log('✅ Generated: public/icon-512.png');
}

generateIcons().catch(console.error);
```

Install and run:
```bash
npm install --save-dev sharp
node generate-icons.js
```

## Icon Design Guidelines

### Best Practices
- ✅ Use a simple, recognizable version of your logo
- ✅ Ensure the icon works on light and dark backgrounds
- ✅ Keep important elements within 80% safe area (edges may be cropped)
- ✅ Use solid backgrounds or transparency
- ✅ Test on different devices and platforms

### Avoid
- ❌ Tiny text or details (won't be readable at small sizes)
- ❌ Complex gradients (may not render well on all devices)
- ❌ Edge-to-edge designs (may be cropped by rounded corners)

## Verifying Icons

After creating the icons:

1. **Check file size**: Each icon should be under 100KB
2. **Check dimensions**:
   ```bash
   # On Unix/macOS
   file public/icon-192.png
   file public/icon-512.png
   ```
3. **Visual inspection**: Open the files to verify they look good
4. **Test PWA**: Build and test the install prompt

## Testing Installation

After adding icons:

1. Build the project: `npm run build`
2. Serve the build: `npm run preview` or deploy
3. Open in Chrome/Edge
4. Look for install button in address bar
5. Test installation on mobile devices

## Troubleshooting

### "Icons not showing in install prompt"
- Verify icon files exist in `public/` directory
- Check file names match manifest.json exactly
- Ensure icons are PNG format
- Clear browser cache and reload

### "Install prompt not appearing"
- Icons must be present
- App must be served over HTTPS (or localhost)
- Service worker must be registered
- Check browser console for errors

## Quick Start (For Testing)

If you want to test PWA functionality immediately without perfect icons:

1. Use any square PNG image
2. Resize to 192x192 and 512x512
3. Place in `public/` directory with correct names
4. This allows testing PWA features
5. Replace with proper branded icons later

## Final Checklist

- [ ] Created `public/icon-192.png` (192x192 pixels)
- [ ] Created `public/icon-512.png` (512x512 pixels)
- [ ] Icons are PNG format
- [ ] Icons are under 100KB each
- [ ] Icons look good on light and dark backgrounds
- [ ] Tested install prompt on desktop
- [ ] Tested add to home screen on mobile
- [ ] Icons appear in browser tabs/home screen

Once you've created the icons, rebuild your project:
```bash
npm run build
```

The PWA will now be fully functional with proper icons!
