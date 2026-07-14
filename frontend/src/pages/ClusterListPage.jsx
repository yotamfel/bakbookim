import { useEffect, useState } from 'react'
import { Link } from 'react-router-dom'
import ClusterCard from '../components/ClusterCard'
import FilterBar from '../components/FilterBar'
import { api } from '../lib/api'

export default function ClusterListPage({ requestType, title, subtitle }) {
  const [items, setItems] = useState([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState(null)
  const [sort, setSort] = useState('top')
  const [category, setCategory] = useState('')
  const [range, setRange] = useState('month')

  useEffect(() => {
    let cancelled = false
    setLoading(true)
    setError(null)
    api
      .getList(requestType, { sort, category, range })
      .then((data) => {
        if (!cancelled) setItems(data)
      })
      .catch((err) => {
        if (!cancelled) setError(err.message)
      })
      .finally(() => {
        if (!cancelled) setLoading(false)
      })
    return () => {
      cancelled = true
    }
  }, [requestType, sort, category, range])

  return (
    <div className="mx-auto max-w-3xl px-4 py-6">
      <div className="flex items-center justify-between gap-3">
        <div>
          <h1 className="font-heading text-2xl font-bold text-bakfg">{title}</h1>
          {subtitle && <p className="mt-0.5 text-sm text-bakfg/50">{subtitle}</p>}
        </div>
        <Link
          to="/request"
          className="shrink-0 rounded-full bg-brand px-5 py-2.5 text-sm font-medium text-white shadow-sm transition-colors hover:bg-brand-dark"
        >
          שליחת בקשה
        </Link>
      </div>

      <div className="mt-4 rounded-3xl bg-gradient-to-b from-panel to-brand-dark p-4 shadow-lg sm:p-6">
        <FilterBar sort={sort} setSort={setSort} category={category} setCategory={setCategory} range={range} setRange={setRange} />

        <div className="mt-4 space-y-2">
          {loading && <p className="px-1 text-white/60">טוען...</p>}
          {error && <p className="px-1 text-red-300">{error}</p>}
          {!loading && !error && items.length === 0 && (
            <div className="rounded-2xl border border-dashed border-white/20 bg-white/5 p-6 text-center text-white/60">
              אין עדיין בקשות בטווח/סינון הנבחר.
            </div>
          )}
          {items.map((cluster, index) => (
            <ClusterCard key={cluster.cluster_id} cluster={cluster} rank={index + 1} />
          ))}
        </div>
      </div>
    </div>
  )
}
