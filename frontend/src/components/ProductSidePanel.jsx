import { useEffect, useState } from 'react'
import { api } from '../lib/api'

export default function ProductSidePanel({ cluster, onClose, onJoined }) {
  const [reasons, setReasons] = useState(null)
  const [loadingReasons, setLoadingReasons] = useState(true)
  const [reasonsLimit, setReasonsLimit] = useState(5)

  const [name, setName] = useState('')
  const [phone, setPhone] = useState('')
  const [submitting, setSubmitting] = useState(false)
  const [error, setError] = useState(null)
  const [joined, setJoined] = useState(false)

  useEffect(() => {
    let cancelled = false
    setReasons(null)
    setLoadingReasons(true)
    setReasonsLimit(5)
    setJoined(false)
    setError(null)
    api
      .getClusterReasons(cluster.cluster_id, 5)
      .then((data) => {
        if (!cancelled) setReasons(data)
      })
      .finally(() => {
        if (!cancelled) setLoadingReasons(false)
      })
    return () => {
      cancelled = true
    }
  }, [cluster.cluster_id])

  async function loadMoreReasons() {
    const nextLimit = reasonsLimit + 5
    setLoadingReasons(true)
    try {
      const data = await api.getClusterReasons(cluster.cluster_id, nextLimit)
      setReasons(data)
      setReasonsLimit(nextLimit)
    } finally {
      setLoadingReasons(false)
    }
  }

  async function handleJoin(e) {
    e.preventDefault()
    setSubmitting(true)
    setError(null)
    try {
      await api.joinExisting(cluster.cluster_id, {
        submitter_name: name || null,
        submitter_phone: phone || null,
      })
      setJoined(true)
      onJoined?.()
    } catch (err) {
      setError(err.message)
    } finally {
      setSubmitting(false)
    }
  }

  return (
    <div className="fixed inset-y-0 right-0 z-50 flex w-full max-w-sm flex-col overflow-y-auto bg-white p-5 shadow-2xl">
      <div className="flex items-start justify-between gap-2">
        <div>
          <h3 className="font-heading text-lg font-bold text-bakfg">{cluster.canonical_name}</h3>
          <p className="text-sm text-bakfg/50">
            {cluster.category} · {cluster.total_requests} בקשות
            {cluster.rank && ` · מקום ${cluster.rank} ברשימה`}
          </p>
        </div>
        <button onClick={onClose} className="text-2xl leading-none text-bakfg/40 hover:text-bakfg">
          ×
        </button>
      </div>

      {cluster.status_note && (
        <span className="mt-2 inline-block w-fit rounded-full bg-amber-100 px-2 py-0.5 text-xs font-medium text-amber-700">
          {cluster.status_note}
        </span>
      )}

      <div className="mt-5">
        <h4 className="text-sm font-bold text-bakfg">💬 למה מבקשים את זה</h4>
        {loadingReasons && !reasons && <p className="mt-2 text-sm text-bakfg/50">טוען...</p>}
        {reasons && (
          <>
            <ul className="mt-2 space-y-1.5 text-sm text-bakfg/70">
              {reasons.recent_reasons.map((r, i) => (
                <li key={i}>&ldquo;{r}&rdquo;</li>
              ))}
            </ul>
            {reasons.recent_reasons.length === 0 && (
              <p className="mt-2 text-sm text-bakfg/50">עדיין אין סיבות שצוינו.</p>
            )}
            {reasons.recent_reasons.length >= reasonsLimit && (
              <button
                onClick={loadMoreReasons}
                disabled={loadingReasons}
                className="mt-2 text-sm text-brand underline"
              >
                טען עוד
              </button>
            )}
          </>
        )}
      </div>

      <div className="mt-6 border-t border-black/5 pt-5">
        <h4 className="text-sm font-bold text-bakfg">🙋 גם אני רוצה את זה</h4>
        {joined ? (
          <p className="mt-2 text-sm text-brand">תודה! נרשמתם בהצלחה 🙌</p>
        ) : (
          <form onSubmit={handleJoin} className="mt-3">
            <label className="block text-sm text-bakfg/70">שם (אופציונלי)</label>
            <input
              value={name}
              onChange={(e) => setName(e.target.value)}
              className="mt-1 w-full rounded-lg border border-black/10 px-3 py-2 focus:border-brand focus:outline-none focus:ring-2 focus:ring-brand/20"
            />
            <label className="mt-3 block text-sm text-bakfg/70">טלפון (אופציונלי)</label>
            <input
              value={phone}
              onChange={(e) => setPhone(e.target.value)}
              className="mt-1 w-full rounded-lg border border-black/10 px-3 py-2 focus:border-brand focus:outline-none focus:ring-2 focus:ring-brand/20"
            />
            {error && <p className="mt-2 text-sm text-red-600">{error}</p>}
            <button
              type="submit"
              disabled={submitting}
              className="mt-4 w-full rounded-full bg-brand px-4 py-2 font-medium text-white shadow-sm transition-colors hover:bg-brand-dark disabled:opacity-50"
            >
              {submitting ? 'שולח...' : 'שלח'}
            </button>
          </form>
        )}
      </div>
    </div>
  )
}
