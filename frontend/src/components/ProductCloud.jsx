import { useEffect, useRef, useState } from 'react'
import WordCloud from 'react-d3-cloud'

// A more varied brand-derived palette — mixes the cool brand tones with a couple of warm
// wine/maroon accents for contrast between neighboring words. Kept dark/medium-saturated
// throughout — anything as light as the accent color (#b586ff) loses legibility against the
// page's own light background.
const PALETTE = ['#0b0633', '#484bdd', '#7a1f3d', '#334fb4', '#5b3a99', '#8a3a5c', '#2d2560', '#3f6b6a']

// Reserve space below the cloud for the footer link so the page never needs to scroll — just
// enough clearance to not crowd the "ניהול" link, not a large empty gap.
const BOTTOM_RESERVE = 55
const MIN_HEIGHT = 260
const MIN_FONT = 10
// Kept modest rather than dramatic — longer product names will need the horizontal room, and an
// overly large top tier leaves less margin before words start colliding/clipping as names grow.
const MAX_FONT = 40
// The top 5 ranks each get their own distinct size (#1 biggest, tapering down to #5); from rank
// 6 onward, words are sized in tiers of 5 — ranks 6-10 share a size, 11-15 the next size down,
// and so on.
const GROUP_SIZE = 5
// Rough average glyph width/height for Noto Serif Hebrew at weight 300, as a fraction of font
// size — used to estimate how much canvas area the full word list needs at nominal sizing.
// Without this, a fixed MAX_FONT tuned for a wide desktop screen can ask d3-cloud to pack far more
// "ink" than a narrow phone canvas can hold — d3-cloud doesn't shrink words to make them fit, it
// silently drops whichever ones don't find a free spot within its placement attempts.
const CHAR_WIDTH_RATIO = 0.5
const LINE_HEIGHT_RATIO = 1.3
// d3-cloud's spiral placement can't tile words edge-to-edge like a bin-packer — real achievable
// fill is well under 100% of the canvas. Conservative so words fit reliably rather than tuning for
// the smallest gap that "just barely" works.
const PACKING_EFFICIENCY = 0.35
const ABS_MIN_FONT = 8

function tierOf(rank) {
  if (rank < GROUP_SIZE) return rank
  return GROUP_SIZE + Math.floor((rank - GROUP_SIZE) / GROUP_SIZE)
}

function nominalFontSize(rank, maxTier) {
  const tier = tierOf(rank)
  const t = maxTier > 0 ? 1 - tier / maxTier : 1
  return MIN_FONT + t * (MAX_FONT - MIN_FONT)
}

// Scales the whole MIN_FONT..MAX_FONT range down together so the estimated total area of every
// word (at nominal size) fits the available canvas area — instead of only capping the single
// longest word's width, which left plenty of smaller words free to overflow the packable area.
function fontScaleForFit(width, height, data, maxTier) {
  const neededArea = data.reduce((sum, word) => {
    const fontSize = nominalFontSize(word.rank, maxTier)
    const w = word.text.length * fontSize * CHAR_WIDTH_RATIO
    const h = fontSize * LINE_HEIGHT_RATIO
    return sum + w * h
  }, 0)
  if (neededArea === 0) return 1
  const availableArea = width * height * PACKING_EFFICIENCY
  return Math.min(1, Math.sqrt(availableArea / neededArea))
}

export default function ProductCloud({ items, onSelect }) {
  const containerRef = useRef(null)
  const [size, setSize] = useState({ width: 800, height: 400 })

  useEffect(() => {
    function measure() {
      if (!containerRef.current) return
      const rect = containerRef.current.getBoundingClientRect()
      const width = containerRef.current.offsetWidth
      const height = Math.max(MIN_HEIGHT, window.innerHeight - rect.top - BOTTOM_RESERVE)
      setSize({ width, height })
    }
    // Runs after layout settles (fonts, filter card height) so the top offset is accurate.
    const raf = requestAnimationFrame(measure)
    window.addEventListener('resize', measure)
    return () => {
      cancelAnimationFrame(raf)
      window.removeEventListener('resize', measure)
    }
  }, [items])

  const n = items.length
  // Weight by rank in the already-sorted list, not the raw metric — so "biggest" always
  // tracks whatever the active sort/filter emphasizes (top requests, trending, or newest).
  const data = items.map((item, index) => ({
    text: item.canonical_name,
    value: n - index,
    rank: index,
    cluster: item,
  }))
  const maxTier = tierOf(Math.max(n - 1, 0))
  const scale = fontScaleForFit(size.width, size.height, data, maxTier)
  const effectiveMaxFont = Math.max(ABS_MIN_FONT, MAX_FONT * scale)
  const effectiveMinFont = Math.max(ABS_MIN_FONT, MIN_FONT * scale)

  return (
    <div
      ref={containerRef}
      className="product-cloud flex w-full justify-center overflow-hidden"
      style={{ height: size.height }}
    >
      <WordCloud
        data={data}
        width={size.width}
        height={size.height}
        font="Noto Serif Hebrew"
        fontWeight="300"
        fontSize={(word) => {
          const tier = tierOf(word.rank)
          const t = maxTier > 0 ? 1 - tier / maxTier : 1
          return effectiveMinFont + t * (effectiveMaxFont - effectiveMinFont)
        }}
        rotate={() => 0}
        padding={7}
        fill={(_d, i) => PALETTE[i % PALETTE.length]}
        onWordClick={(_event, word) => onSelect({ ...word.cluster, rank: word.rank + 1 })}
      />
    </div>
  )
}
