import { useEffect, useRef, useState } from 'react'
import WordCloud from 'react-d3-cloud'

// Muted brand-derived palette so the messy/organic layout still reads as "this site", not a
// generic multicolor word cloud. Kept dark/medium-saturated throughout — anything as light as
// the accent color (#b586ff) loses legibility against the page's own light background.
const PALETTE = ['#0b0633', '#484bdd', '#334fb4', '#6b3fa0', '#5b3a99', '#2d2560', '#7a3fae']

export default function ProductCloud({ items, onSelect }) {
  const containerRef = useRef(null)
  const [width, setWidth] = useState(800)

  useEffect(() => {
    function measure() {
      if (containerRef.current) setWidth(containerRef.current.offsetWidth)
    }
    measure()
    window.addEventListener('resize', measure)
    return () => window.removeEventListener('resize', measure)
  }, [])

  const n = items.length
  // Weight by rank in the already-sorted list, not the raw metric — so "biggest" always
  // tracks whatever the active sort/filter emphasizes (top requests, trending, or newest).
  const data = items.map((item, index) => ({
    text: item.canonical_name,
    value: n - index,
    cluster: item,
  }))

  return (
    <div ref={containerRef} className="product-cloud w-full">
      <WordCloud
        data={data}
        width={width}
        height={640}
        font="Heebo"
        fontWeight="300"
        fontSize={(word) => 12 + Math.sqrt(word.value / n) * 40}
        rotate={() => 0}
        padding={6}
        fill={(_d, i) => PALETTE[i % PALETTE.length]}
        onWordClick={(_event, word) => onSelect(word.cluster)}
      />
    </div>
  )
}
