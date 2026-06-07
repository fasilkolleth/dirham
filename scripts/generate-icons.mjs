// Generates the favicon + PWA / iOS home-screen PNG icons from the app mark.
// Run with:  npm run icons   (requires the `sharp` devDependency)
// Keep the glyph/gradient in sync with src/components/shared/LogoMark.jsx
import sharp from 'sharp'
import { mkdir, writeFile } from 'node:fs/promises'

const GRAD = `<linearGradient id="g" x1="0" y1="0" x2="1" y2="1">
    <stop offset="0" stop-color="#0062FF"/>
    <stop offset="1" stop-color="#7C3AED"/>
  </linearGradient>`

// UAE Dirham symbol — a "D" with two horizontal strokes through the stem.
const GLYPH = `<g fill="none" stroke="#FFFFFF" stroke-width="42" stroke-linecap="round" stroke-linejoin="round">
    <path d="M214,150 L214,362"/>
    <path d="M214,150 C 366,150 366,362 214,362"/>
    <line x1="150" y1="216" x2="246" y2="216"/>
    <line x1="150" y1="296" x2="246" y2="296"/>
  </g>`

// Full-bleed: corners filled edge-to-edge (platforms apply their own mask/rounding).
const fullBleed = `<svg xmlns="http://www.w3.org/2000/svg" width="512" height="512" viewBox="0 0 512 512">
  <defs>${GRAD}</defs>
  <rect width="512" height="512" fill="url(#g)"/>
  ${GLYPH}
</svg>`

// Rounded squircle (~22%): for the favicon / "any" icons shown un-masked.
const rounded = `<svg xmlns="http://www.w3.org/2000/svg" width="512" height="512" viewBox="0 0 512 512">
  <defs>${GRAD}</defs>
  <rect width="512" height="512" rx="112" fill="url(#g)"/>
  ${GLYPH}
</svg>`

const png = (svg, size, file) => sharp(Buffer.from(svg)).resize(size, size).png().toFile(file)

await mkdir('public/icons', { recursive: true })

// PWA "any" icons + favicon → rounded
await png(rounded, 192, 'public/icons/icon-192.png')
await png(rounded, 512, 'public/icons/icon-512.png')
await png(rounded, 32, 'public/favicon-32.png')

// Maskable (Android) + apple-touch (iOS home screen) → full-bleed, opaque
await png(fullBleed, 512, 'public/icons/maskable-512.png')
await png(fullBleed, 180, 'public/apple-touch-icon.png')

// Vector favicon (rounded)
await writeFile('public/favicon.svg', rounded.trimStart() + '\n')

console.log('✓ icons generated')
