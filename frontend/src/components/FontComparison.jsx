import { FONTS } from './ProductCloud'

// Temporary: lets the same sample word be compared side-by-side across the cloud's candidate
// fonts, since judging a font from different words scattered around the cloud is hard — remove
// once a font is picked.
export default function FontComparison() {
  return (
    <div className="mx-auto mt-2 flex max-w-3xl flex-wrap items-baseline justify-center gap-x-4 gap-y-1 text-bakfg/70">
      {FONTS.map((font, i) => (
        <span key={font} className="text-sm" style={{ fontFamily: font }}>
          {i + 1}. {font}: מקאלן 18
        </span>
      ))}
    </div>
  )
}
