import { useId } from 'react'

// The app mark: brand-gradient squircle with an upward "growth" trend glyph.
// Keep this in sync with scripts/generate-icons.mjs (favicon + PWA/home-screen icons).
export function LogoMark({ size = 36, className }) {
  const id = useId()
  return (
    <svg width={size} height={size} viewBox="0 0 512 512" className={className} role="img" aria-label="App logo">
      <defs>
        <linearGradient id={id} x1="0" y1="0" x2="1" y2="1">
          <stop offset="0" stopColor="#0062FF" />
          <stop offset="1" stopColor="#7C3AED" />
        </linearGradient>
      </defs>
      <rect width="512" height="512" rx="112" fill={`url(#${id})`} />
      {/* UAE Dirham symbol — a "D" with two horizontal strokes */}
      <g fill="none" stroke="#fff" strokeWidth="42" strokeLinecap="round" strokeLinejoin="round">
        <path d="M214,150 L214,362" />
        <path d="M214,150 C 366,150 366,362 214,362" />
        <line x1="150" y1="216" x2="246" y2="216" />
        <line x1="150" y1="296" x2="246" y2="296" />
      </g>
    </svg>
  )
}
