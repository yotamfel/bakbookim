import { useEffect, useState } from 'react'
import { Link } from 'react-router-dom'
import ClusterCard from '../components/ClusterCard'
import FilterBar from '../components/FilterBar'
import { api } from '../lib/api'

export default function ClusterListPage({ requestType, title }) {
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
        <h1 className="font-heading text-2xl font-bold text-bakfg">{title}</h1>
        <Link
          to={`/request/${requestType}`}
          className="shrink-0 rounded-lg bg-brand px-4 py-2 text-sm font-medium text-white"
        >
          שליחת בקשה
        </Link>
      </div>

      <div className="mt-4">
        <FilterBar sort={sort} setSort={setSort} category={category} setCategory={setCategory} range={range} setRange={setRange} />
      </div>

      <div className="mt-4 space-y-3">
        {loading && <p className="text-bakfg/60">טוען...</p>}
        {error && <p className="text-red-600">{error}</p>}
        {!loading && !error && items.length === 0 && (
          <p className="text-bakfg/60">אין עדיין בקשות בטווח/סינון הנבחר.</p>
        )}
        {items.map((cluster) => (
          <ClusterCard key={cluster.cluster_id} cluster={cluster} requestType={requestType} />
        ))}
      </div>
    </div>
  )
}
