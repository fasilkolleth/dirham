// Brand-coloured monograms for common UAE banks — a recognizable badge without
// embedding trademarked logo artwork.
//
// To show a REAL logo instead: drop the licensed image into /public/banks/
// (e.g. /public/banks/enbd.png) and add `logo: '/banks/enbd.png'` to that bank's
// entry below. BankLogo uses the image when present and falls back to the
// monogram automatically if the file is missing.
const BRANDS = [
  { match: ['emirates nbd', 'enbd'],            short: 'NBD',  bg: '#0C2D5A', logo: '/banks/enbd.webp' },
  { match: ['dubai islamic', 'dib'],            short: 'DIB',  bg: '#1B7A3D', logo: '/banks/dib.jpg' },
  { match: ['abu dhabi commercial', 'adcb'],    short: 'ADCB', bg: '#B01E2E' },
  { match: ['first abu dhabi', 'fab'],          short: 'FAB',  bg: '#0C3C7C' },
  { match: ['abu dhabi islamic', 'adib'],       short: 'ADIB', bg: '#1F2937' },
  { match: ['mashreq'],                         short: 'MQ',   bg: '#D2541A' },
  { match: ['commercial bank of dubai', 'cbd'], short: 'CBD',  bg: '#0E3A53' },
  { match: ['rakbank', 'rak bank'],             short: 'RAK',  bg: '#C8102E' },
  { match: ['united arab bank', 'uab'],         short: 'UAB',  bg: '#5B2B6B' },
]

export function getBankBrand(name = '') {
  const n = String(name).toLowerCase().trim()
  const hit = BRANDS.find(b => b.match.some(m => n.includes(m)))
  if (hit) return { logo: null, ...hit }
  // Unknown bank → initials from its words, neutral styling.
  const short = (n.split(/\s+/).filter(Boolean).map(w => w[0]).join('') || 'bk').slice(0, 3).toUpperCase()
  return { short, bg: null, logo: null }
}
