import { useState } from 'react'
import { api } from '../lib/api'
import JoinExistingModal from './JoinExistingModal'

export default function ClusterCard({ cluster, requestType, onJoined }) {
  const [showJoin, setShowJoin] = useState(false)
  const [showReasons, setShowReasons] = useState(false)
  const [reasons, setReasons] = useState(null)
  const [loadingReasons, setLoadingReasons] = useState(false)
  const [reasonsLimit, setReasonsLimit] = useState(5)

  const isFulfilled = cluster.status === 'fulfilled'

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
    <div className="rounded-xl border border-black/10 bg-white p-4 shadow-sm">
      <div className="flex items-start justify-between gap-3">
        <div>
          <div className="flex items-center gap-2">
            <h3 className="font-heading text-lg font-bold text-bakfg">{cluster.canonical_name}</h3>
            {isFulfilled && (
              <span className="rounded-full bg-green-100 px-2 py-0.5 text-xs font-medium text-green-700">
                ✅ הגיע לפרויקט!
              </span>
            )}
          </div>
          <p className="text-sm text-bakfg/60">{cluster.category}</p>
        </div>
        <div className="shrink-0 text-left">
          <div className="text-2xl font-bold text-brand">{cluster.total_requests}</div>
          <div className="text-xs text-bakfg/50">בקשות</div>
        </div>
      </div>

      <div className="mt-3 flex flex-wrap items-center gap-2">
        <button
          onClick={() => setShowJoin(true)}
          className="rounded-lg bg-brand px-3 py-1.5 text-sm font-medium text-white"
        >
          גם אני רוצה את זה 🙋
        </button>
        {requestType === 'new' && (
          <button
            onClick={toggleReasons}
            className="rounded-lg border border-black/10 px-3 py-1.5 text-sm text-bakfg/80"
          >
            למה מבקשים את זה? 💬
          </button>
        )}
      </div>

      {showReasons && (
        <div className="mt-3 rounded-lg bg-bakbg-soft p-3 text-sm">
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
