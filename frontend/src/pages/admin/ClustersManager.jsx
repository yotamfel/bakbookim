import { useEffect, useState } from 'react'
import ConfirmDialog from '../../components/ConfirmDialog'
import { api } from '../../lib/api'

export default function ClustersManager() {
  const [clusters, setClusters] = useState([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState(null)
  const [mergeTarget, setMergeTarget] = useState({})
  const [noteDraft, setNoteDraft] = useState({})
  const [confirmState, setConfirmState] = useState(null) // { message, action }

  function load() {
    setLoading(true)
    api
      .adminListClusters()
      .then(setClusters)
      .catch((err) => setError(err.message))
      .finally(() => setLoading(false))
  }

  useEffect(load, [])

  async function saveNote(cluster) {
    const status_note = (noteDraft[cluster.id] ?? cluster.status_note ?? '').trim() || null
    const updated = await api.adminUpdateCluster(cluster.id, { status_note })
    setClusters((prev) => prev.map((c) => (c.id === cluster.id ? updated : c)))
    setNoteDraft((d) => {
      const next = { ...d }
      delete next[cluster.id]
      return next
    })
  }

  function askMerge(sourceId) {
    const targetId = mergeTarget[sourceId]
    if (!targetId) return
    setConfirmState({
      message: 'למזג את המוצר הזה לתוך היעד שנבחר? הפעולה בלתי הפיכה.',
      action: async () => {
        await api.adminMergeClusters(sourceId, targetId)
        load()
      },
    })
  }

  function askDeleteAllForProduct(cluster) {
    setConfirmState({
      message: `למחוק את כל הבקשות של המוצר "${cluster.canonical_name}"? הפעולה בלתי הפיכה.`,
      action: async () => {
        await api.adminBulkDeleteRequests({ cluster_id: cluster.id })
        load()
      },
    })
  }

  async function runConfirmed() {
    const action = confirmState?.action
    setConfirmState(null)
    if (action) await action()
  }

  return (
    <div>
      {loading && <p className="text-bakfg/60">טוען...</p>}
      {error && <p className="text-red-600">{error}</p>}

      {!loading && !error && (
        <div className="overflow-x-auto rounded-xl border border-black/10 bg-white">
          <table className="w-full min-w-[1100px] text-sm">
            <thead className="bg-bakbg-soft text-bakfg/70">
              <tr>
                <Th>שם מוצר</Th>
                <Th>קטגוריה</Th>
                <Th title="חזרה = מוצר שהיה בעבר בפרויקטים של הקהילה. חדש = מוצר שמעולם לא הוצע">
                  סוג בקשה
                </Th>
                <Th title="כמה בקשות הוגשו למוצר הזה בסך הכל (כולל אם אותו אדם ביקש כמה פעמים)">
                  סה&quot;כ בקשות
                </Th>
                <Th title="כמה אנשים שונים ביקשו את המוצר הזה (לא סופר בקשות כפולות מאותו אדם)">
                  לקוחות ייחודיים
                </Th>
                <Th title='טקסט חופשי שיוצג ברשימה הציבורית ליד המוצר, למשל "בקרוב" או "סופק בפרויקט קיץ 2026". ריק = לא מוצג כלום'>
                  הודעה לציבור
                </Th>
                <Th>מיזוג לתוך מוצר אחר</Th>
                <Th>פעולות</Th>
              </tr>
            </thead>
            <tbody>
              {clusters.map((cluster) => (
                <tr key={cluster.id} className="border-t border-black/5">
                  <Td wrap>{cluster.canonical_name}</Td>
                  <Td>{cluster.category}</Td>
                  <Td>{cluster.request_type === 'return' ? 'חזרה' : 'חדש'}</Td>
                  <Td>{cluster.total_requests}</Td>
                  <Td>{cluster.unique_submitters}</Td>
                  <Td wrap>
                    <div className="flex items-center gap-2">
                      <input
                        value={noteDraft[cluster.id] ?? cluster.status_note ?? ''}
                        onChange={(e) => setNoteDraft((d) => ({ ...d, [cluster.id]: e.target.value }))}
                        placeholder="בקרוב / סופק בפרויקט..."
                        className="w-full min-w-[160px] rounded border border-black/10 px-2 py-1"
                      />
                      <button onClick={() => saveNote(cluster)} className="shrink-0 text-sm text-brand">
                        שמור
                      </button>
                    </div>
                  </Td>
                  <Td>
                    <div className="flex items-center gap-2">
                      <select
                        value={mergeTarget[cluster.id] || ''}
                        onChange={(e) => setMergeTarget((m) => ({ ...m, [cluster.id]: e.target.value }))}
                        className="rounded border border-black/10 px-2 py-1"
                      >
                        <option value="">בחר יעד...</option>
                        {clusters
                          .filter((c) => c.id !== cluster.id && c.request_type === cluster.request_type)
                          .map((c) => (
                            <option key={c.id} value={c.id}>
                              {c.canonical_name}
                            </option>
                          ))}
                      </select>
                      <button onClick={() => askMerge(cluster.id)} className="text-sm text-red-600">
                        מזג
                      </button>
                    </div>
                  </Td>
                  <Td>
                    <button onClick={() => askDeleteAllForProduct(cluster)} className="text-sm text-red-600">
                      מחק את כל הבקשות
                    </button>
                  </Td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}

      {confirmState && (
        <ConfirmDialog
          message={confirmState.message}
          confirmLabel="אישור"
          onConfirm={runConfirmed}
          onCancel={() => setConfirmState(null)}
        />
      )}
    </div>
  )
}

function Th({ children, title }) {
  return (
    <th className="whitespace-nowrap px-3 py-2 text-right font-medium" title={title}>
      {children}
    </th>
  )
}
function Td({ children, wrap = false }) {
  return <td className={`px-3 py-2 ${wrap ? 'max-w-xs' : 'whitespace-nowrap'}`}>{children}</td>
}
