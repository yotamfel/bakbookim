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
const MAX_FONT = 68
// Words are sized in tiers of 5 by rank — the top 5 all render at the same (largest) size,
// the next 5 all share the next size down, and so on — rather than every single item getting
// its own slightly-different size.
const GROUP_SIZE = 5

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
  const numGroups = Math.ceil(n / GROUP_SIZE)

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
        font="Heebo"
        fontWeight="300"
        fontSize={(word) => {
          const group = Math.floor(word.rank / GROUP_SIZE)
          const t = numGroups > 1 ? 1 - group / (numGroups - 1) : 1
          return MIN_FONT + t * (MAX_FONT - MIN_FONT)
        }}
        rotate={() => 0}
        padding={5}
        fill={(_d, i) => PALETTE[i % PALETTE.length]}
        onWordClick={(_event, word) => onSelect(word.cluster)}
      />
    </div>
  )
}
