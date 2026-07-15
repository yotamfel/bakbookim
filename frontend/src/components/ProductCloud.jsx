import { useEffect, useRef, useState } from 'react'
import WordCloud from 'react-d3-cloud'

// A more varied brand-derived palette — mixes the cool brand tones with a couple of warm
// wine/maroon accents for contrast between neighboring words. Kept dark/medium-saturated
// throughout — anything as light as the accent color (#b586ff) loses legibility against the
// page's own light background.
const PALETTE = ['#0b0633', '#484bdd', '#7a1f3d', '#334fb4', '#5b3a99', '#8a3a5c', '#2d2560', '#3f6b6a']

// Reserve space below the cloud for the footer link so the page never needs to scroll.
const BOTTOM_RESERVE = 95
const MIN_HEIGHT = 260
const MIN_FONT = 12
// Kept modest rather than dramatic — longer product names will need the horizontal room, and an
// overly large top tier leaves less margin before words start colliding/clipping as names grow.
const MAX_FONT = 46
// The top 5 ranks each get their own distinct size (#1 biggest, tapering down to #5); from rank
// 6 onward, words are sized in tiers of 5 — ranks 6-10 share a size, 11-15 the next size down,
// and so on.
const GROUP_SIZE = 5

// Temporary font A/B comparison — cycles through candidates by rank so several show at once.
// Word 1 = FONTS[0], word 2 = FONTS[1], etc., repeating. Fonts without a light weight fall back
// to their default (400) since Suez One / Secular One only ship one weight.
const FONTS = ['Heebo', 'Rubik', 'Frank Ruhl Libre', 'Suez One', 'Secular One']
const LIGHT_WEIGHT_FONTS = new Set(['Heebo', 'Rubik', 'Frank Ruhl Libre'])

function tierOf(rank) {
  if (rank < GROUP_SIZE) return rank
  return GROUP_SIZE + Math.floor((rank - GROUP_SIZE) / GROUP_SIZE)
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
        font={(word) => FONTS[word.rank % FONTS.length]}
        fontWeight={(word) => (LIGHT_WEIGHT_FONTS.has(FONTS[word.rank % FONTS.length]) ? '300' : '400')}
        fontSize={(word) => {
          const tier = tierOf(word.rank)
          const t = maxTier > 0 ? 1 - tier / maxTier : 1
          return MIN_FONT + t * (MAX_FONT - MIN_FONT)
        }}
        rotate={() => 0}
        padding={5}
        fill={(_d, i) => PALETTE[i % PALETTE.length]}
        onWordClick={(_event, word) => onSelect({ ...word.cluster, rank: word.rank + 1 })}
      />
    </div>
  )
}
