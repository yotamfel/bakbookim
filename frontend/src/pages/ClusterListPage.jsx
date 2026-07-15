import { useEffect, useState } from 'react'
import { Link, useNavigate, useParams } from 'react-router-dom'
import FilterBar from '../components/FilterBar'
import ProductCloud from '../components/ProductCloud'
import ProductSidePanel from '../components/ProductSidePanel'
import { api } from '../lib/api'

const TRACK_INFO = {
  return: {
    label: 'התגעגענו אליהם',
    emoji: '🍾',
    title: 'מוצרים שהתגעגענו אליהם',
    subtitle: 'מוצרים שכבר היו בפרויקטים של הקהילה בעבר ואתם רוצים שיחזרו',
  },
  new: {
    label: 'בא לנו לנסות',
    emoji: '✨',
    title: 'מוצרים שבא לנו לנסות',
    subtitle: 'מוצרים שמעולם לא הוצעו בפרויקטים של הקהילה',
  },
}

export default function ClusterListPage() {
  const { requestType: paramType } = useParams()
  const navigate = useNavigate()
  const requestType = paramType === 'new' ? 'new' : 'return'

  const [items, setItems] = useState([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState(null)
  const [sort, setSort] = useState('top')
  const [category, setCategory] = useState('')
  const [range, setRange] = useState('month')
  const [selected, setSelected] = useState(null)

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

  function refreshList() {
    api.getList(requestType, { sort, category, range }).then(setItems)
  }

  const info = TRACK_INFO[requestType]

  return (
    <div className="px-4 py-3">
      <div className="mx-auto flex max-w-3xl items-center justify-between gap-3">
        <div>
          <h1 className="font-heading text-xl font-bold text-bakfg">{info.title}</h1>
          <p className="mt-0.5 text-xs text-bakfg/50">{info.subtitle}</p>
        </div>
        <Link
          to={`/request/${requestType}`}
          className="shrink-0 rounded-full bg-brand px-5 py-2 text-sm font-medium text-white shadow-sm transition-colors hover:bg-brand-dark"
        >
          שליחת בקשה
        </Link>
      </div>

      <div className="mx-auto mt-3 max-w-3xl rounded-3xl bg-white/60 p-3 shadow-sm backdrop-blur-sm sm:p-4">
        <div className="flex gap-1 rounded-full bg-black/5 p-1">
          {Object.entries(TRACK_INFO).map(([key, t]) => (
            <button
              key={key}
              type="button"
              onClick={() => navigate(`/${key}`)}
              className={`flex-1 rounded-full px-4 py-1.5 text-sm font-medium transition-colors ${
                requestType === key ? 'bg-brand text-white shadow-sm' : 'text-bakfg/60 hover:bg-black/5'
              }`}
            >
              {t.emoji} {t.label}
            </button>
          ))}
        </div>

        <div className="mt-3">
          <FilterBar
            sort={sort}
            setSort={setSort}
            category={category}
            setCategory={setCategory}
            range={range}
            setRange={setRange}
          />
        </div>
      </div>

      <div className="mt-2">
        {loading && <p className="mx-auto max-w-3xl px-1 text-bakfg/50">טוען...</p>}
        {error && <p className="mx-auto max-w-3xl px-1 text-red-600">{error}</p>}
        {!loading && !error && items.length === 0 && (
          <div className="mx-auto mt-4 max-w-3xl rounded-2xl border border-dashed border-black/10 bg-white/40 p-6 text-center text-bakfg/50">
            אין עדיין בקשות בטווח/סינון הנבחר.
          </div>
        )}
        {!loading && !error && items.length > 0 && (
          // The page's own top-level div has no max-width, so the cloud (a direct child of the
          // unconstrained `mt-2` wrapper above) is naturally full-width — no vw-based breakout
          // needed. That trick (`w-screen` / `50vw`) measures the *full* viewport including the
          // scrollbar's reserved width on non-overlay-scrollbar systems (Windows Chrome/Edge),
          // which overshot by the scrollbar's width and caused a persistent horizontal scrollbar.
          <ProductCloud items={items} onSelect={setSelected} />
        )}
      </div>

      {selected && (
        <ProductSidePanel cluster={selected} onClose={() => setSelected(null)} onJoined={refreshList} />
      )}
    </div>
  )
}
