// Size/prominence is driven by rank (position in the already-sorted list), not raw metric
// value — this way "biggest" always tracks whatever the active sort means (top requests,
// trending delta, or newest), without special-casing per sort mode.
const MIN_FONT = 14
const MAX_FONT = 46

export default function ProductCloud({ items, onSelect }) {
  const n = items.length

  return (
    <div className="flex flex-wrap items-center justify-center gap-x-4 gap-y-2 px-2 py-6">
      {items.map((item, index) => {
        const t = n > 1 ? 1 - index / (n - 1) : 1
        const fontSize = MIN_FONT + t * (MAX_FONT - MIN_FONT)
        const opacity = 0.5 + t * 0.5
        const weight = t > 0.55 ? 700 : 500

        return (
          <button
            key={item.cluster_id}
            type="button"
            onClick={() => onSelect(item)}
            style={{ fontSize: `${fontSize}px`, opacity, fontWeight: weight }}
            className="rounded-lg px-1 leading-tight text-white transition-transform duration-150 hover:scale-110"
            title={`${item.total_requests} בקשות`}
          >
            {item.canonical_name}
            {item.status_note && (
              <span className="mr-1 rounded-full bg-amber-300/90 px-1.5 align-middle text-[10px] font-bold text-amber-900">
                {item.status_note}
              </span>
            )}
          </button>
        )
      })}
    </div>
  )
}
