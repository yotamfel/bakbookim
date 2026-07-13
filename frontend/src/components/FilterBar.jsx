import { CATEGORIES, RANGE_OPTIONS, SORT_OPTIONS } from '../lib/constants'

export default function FilterBar({ sort, setSort, category, setCategory, range, setRange }) {
  return (
    <div className="flex flex-wrap gap-4 border-b border-white/10 pb-4">
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
    <label className="flex flex-col text-sm text-white/70">
      {label}
      <select
        value={value}
        onChange={(e) => onChange(e.target.value)}
        className="mt-1 rounded-lg border border-white/10 bg-white px-2 py-1.5 text-bakfg"
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
