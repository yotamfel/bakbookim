import { CATEGORIES, RANGE_OPTIONS, SORT_OPTIONS } from '../lib/constants'

export default function FilterBar({ sort, setSort, category, setCategory, range, setRange }) {
  return (
    <div className="flex flex-wrap gap-3 border-b border-black/5 pb-2">
      <Select label="מיון" value={sort} onChange={setSort} options={SORT_OPTIONS} />
      <Select
        label="קטגוריה"
        value={category}
        onChange={setCategory}
        options={[{ value: '', label: 'הכל' }, ...CATEGORIES.map((c) => ({ value: c, label: c }))]}
      />
      <Select label="טווח זמן" value={range} onChange={setRange} options={RANGE_OPTIONS} />
    </div>
  )
}

function Select({ label, value, onChange, options }) {
  return (
    <label className="flex flex-col text-xs text-bakfg/60">
      {label}
      <select
        value={value}
        onChange={(e) => onChange(e.target.value)}
        className="mt-0.5 rounded-lg border border-black/10 bg-white px-2 py-1 text-sm text-bakfg"
      >
        {options.map((o) => (
          <option key={o.value} value={o.value}>
            {o.label}
          </option>
        ))}
      </select>
    </label>
  )
}
