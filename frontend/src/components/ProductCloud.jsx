import { useEffect, useRef, useState } from 'react'
import WordCloud from 'react-d3-cloud'

// Muted brand-derived palette so the messy/organic layout still reads as "this site", not a
// generic multicolor word cloud. Kept dark/medium-saturated throughout — anything as light as
// the accent color (#b586ff) loses legibility against the page's own light background.
const PALETTE = ['#0b0633', '#484bdd', '#334fb4', '#6b3fa0', '#5b3a99', '#2d2560', '#7a3fae']

// Reserve space below the cloud for the footer link so the page never needs to scroll.
const BOTTOM_RESERVE = 95
const MIN_HEIGHT = 260

export default function ProductCloud({ items, onSelect }) {
  const containerRef = useRef(null)
  const [size, setSize] = useState({ width: 800, height: 400 })

  useEffect(() => {
    function measure() {
      if (!containerRef.current) return
      const rect = containerRef.current.getBoundingClientRect()
      setSize({
        width: containerRef.current.offsetWidth,
        height: Math.max(MIN_HEIGHT, window.innerHeight - rect.top - BOTTOM_RESERVE),
      })
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
    cluster: item,
  }))

  return (
    <div ref={containerRef} className="product-cloud w-full overflow-hidden">
      <WordCloud
        data={data}
        width={size.width}
        height={size.height}
        font="Heebo"
        fontWeight="300"
        fontSize={(word) => 10 + Math.sqrt(word.value / n) * (size.height > 400 ? 34 : 24)}
        rotate={() => 0}
        padding={5}
        fill={(_d, i) => PALETTE[i % PALETTE.length]}
        onWordClick={(_event, word) => onSelect(word.cluster)}
      />
    </div>
  )
}
