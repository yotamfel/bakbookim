import { useState } from 'react'
import { api } from '../lib/api'
import JoinExistingModal from './JoinExistingModal'

export default function ClusterCard({ cluster, rank, onJoined }) {
  const [showJoin, setShowJoin] = useState(false)
  const [showReasons, setShowReasons] = useState(false)
  const [reasons, setReasons] = useState(null)
  const [loadingReasons, setLoadingReasons] = useState(false)
  const [reasonsLimit, setReasonsLimit] = useState(5)

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
    <div className="rounded-xl border border-black/5 bg-white/90 px-3 py-2.5 shadow-sm backdrop-blur-sm transition-shadow duration-200 hover:shadow-md">
      <div className="flex items-center gap-3">
        {rank && <span className="w-5 shrink-0 text-center text-sm font-bold text-bakfg/30">{rank}</span>}

        <div className="min-w-0 flex-1">
          <div className="flex flex-wrap items-center gap-1.5">
            <h3 className="font-heading text-base font-bold text-bakfg">{cluster.canonical_name}</h3>
            <span className="text-xs text-bakfg/40">· {cluster.category}</span>
            {cluster.status_note && (
              <span className="rounded-full bg-amber-100 px-2 py-0.5 text-[11px] font-medium text-amber-700">
                {cluster.status_note}
              </span>
            )}
          </div>
        </div>

        <div className="flex shrink-0 items-center gap-2">
          <div className="flex h-9 w-9 shrink-0 flex-col items-center justify-center rounded-full bg-brand/10">
            <span className="text-xs font-bold leading-none text-brand">{cluster.total_requests}</span>
            <span className="mt-0.5 text-[7px] leading-none text-brand/70">בקשות</span>
          </div>
          <button
            onClick={() => setShowJoin(true)}
            className="rounded-full bg-brand px-3 py-1 text-xs font-medium text-white shadow-sm transition-colors hover:bg-brand-dark"
          >
            🙋 גם אני רוצה את זה
          </button>
          <button
            onClick={toggleReasons}
            className="rounded-full border border-black/10 px-3 py-1 text-xs text-bakfg/70 transition-colors hover:bg-bakbg-soft"
          >
            💬 למה
          </button>
        </div>
      </div>

      {showReasons && (
        <div className="mt-2 rounded-lg bg-bakbg-soft p-2.5 text-sm">
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
