import { useState } from 'react'
import { api } from '../lib/api'
import JoinExistingModal from './JoinExistingModal'

export default function ClusterCard({ cluster, onJoined }) {
  const [showJoin, setShowJoin] = useState(false)
  const [showReasons, setShowReasons] = useState(false)
  const [reasons, setReasons] = useState(null)
  const [loadingReasons, setLoadingReasons] = useState(false)
  const [reasonsLimit, setReasonsLimit] = useState(5)

  const isFulfilled = cluster.status === 'fulfilled'
  const isComingSoon = cluster.status === 'coming_soon'

  async function toggleReasons() {
    if (showReasons) {
      setShowReasons(false)
      return
    }
    setShowReasons(true)
    if (!reasons) await loadReasons(5)
  }

  async function loadReasons(limit) {
    setLoadingReasons(true)
    try {
      const data = await api.getClusterReasons(cluster.cluster_id, limit)
      setReasons(data)
      setReasonsLimit(limit)
    } finally {
      setLoadingReasons(false)
    }
  }

  return (
    <div className="rounded-2xl border border-black/5 bg-white/90 p-4 shadow-sm backdrop-blur-sm transition-shadow duration-200 hover:shadow-lg">
      <div className="flex items-start justify-between gap-3">
        <div>
          <div className="flex flex-wrap items-center gap-2">
            <h3 className="font-heading text-lg font-bold text-bakfg">{cluster.canonical_name}</h3>
            {isFulfilled && (
              <span className="rounded-full bg-green-100 px-2 py-0.5 text-xs font-medium text-green-700">
                ✅ הגיע לפרויקט!
              </span>
            )}
            {isComingSoon && (
              <span className="rounded-full bg-amber-100 px-2 py-0.5 text-xs font-medium text-amber-700">
                🔜 בקרוב!
              </span>
            )}
          </div>
          <p className="text-sm text-bakfg/50">{cluster.category}</p>
        </div>
        <div className="flex h-14 w-14 shrink-0 flex-col items-center justify-center rounded-full bg-brand/10">
          <span className="text-lg font-bold leading-none text-brand">{cluster.total_requests}</span>
          <span className="mt-0.5 text-[10px] text-brand/70">בקשות</span>
        </div>
      </div>

      <div className="mt-4 flex flex-wrap items-center gap-2">
        <button
          onClick={() => setShowJoin(true)}
          className="rounded-full bg-brand px-4 py-1.5 text-sm font-medium text-white shadow-sm transition-colors hover:bg-brand-dark"
        >
          גם אני רוצה את זה 🙋
        </button>
        <button
          onClick={toggleReasons}
          className="rounded-full border border-black/10 px-4 py-1.5 text-sm text-bakfg/80 transition-colors hover:bg-bakbg-soft"
        >
          למה מבקשים את זה? 💬
        </button>
      </div>

      {showReasons && (
        <div className="mt-3 rounded-xl bg-bakbg-soft p-3 text-sm">
          {loadingReasons && !reasons && <p className="text-bakfg/60">טוען...</p>}
          {reasons && (
            <>
              {reasons.ai_summary_note && <p className="font-medium text-bakfg">{reasons.ai_summary_note}</p>}
              <ul className="mt-2 space-y-1 text-bakfg/70">
                {reasons.recent_reasons.map((r, i) => (
                  <li key={i}>“{r}”</li>
                ))}
              </ul>
              {reasons.recent_reasons.length === 0 && <p className="text-bakfg/50">עדיין אין סיבות שצוינו.</p>}
              {reasons.recent_reasons.length >= reasonsLimit && (
                <button
                  onClick={() => loadReasons(reasonsLimit + 5)}
                  className="mt-2 text-brand underline"
                  disabled={loadingReasons}
                >
                  טען עוד
                </button>
              )}
            </>
          )}
        </div>
      )}

      {showJoin && (
        <JoinExistingModal
          cluster={cluster}
          onClose={() => setShowJoin(false)}
          onJoined={(result) => {
            setShowJoin(false)
            onJoined?.(result)
          }}
        />
      )}
    </div>
  )
}
