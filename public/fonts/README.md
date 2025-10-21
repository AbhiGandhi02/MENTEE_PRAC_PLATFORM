# Font Installation Guide

## Option 1: Satoshi Font (Recommended)

### Download Satoshi Font:
1. Visit: https://www.fontshare.com/fonts/satoshi
2. Click "Download family" button
3. Extract the downloaded ZIP file
4. Copy these files to this folder (`public/fonts/`):
   - `Satoshi-Regular.woff2`
   - `Satoshi-Medium.woff2`
   - `Satoshi-Bold.woff2`

### Alternative: Use wget/curl

```bash
# From the project root directory
cd public/fonts

# Download Satoshi (if direct link available)
# Note: You may need to download manually from fontshare.com
```

## Option 2: Clash Grotesk Font

### Download Clash Grotesk:
1. Visit: https://www.fontshare.com/fonts/clash-grotesk
2. Click "Download family" button
3. Extract the downloaded ZIP file
4. Copy these files to this folder (`public/fonts/`):
   - `ClashGrotesk-Regular.woff2`
   - `ClashGrotesk-Medium.woff2`
   - `ClashGrotesk-Bold.woff2`

## Current Setup

Currently using **Inter** font from Google Fonts as a fallback.
Once you add the font files above, uncomment the local font configuration in `app/layout.tsx`.

## File Structure

```
public/
  fonts/
    Satoshi-Regular.woff2
    Satoshi-Medium.woff2
    Satoshi-Bold.woff2
    (or)
    ClashGrotesk-Regular.woff2
    ClashGrotesk-Medium.woff2
    ClashGrotesk-Bold.woff2
```

## After Adding Fonts

Run: `npm run dev` to see the changes.
