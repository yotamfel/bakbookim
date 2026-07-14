import { Fragment, useEffect, useState } from 'react'
import ConfirmDialog from '../../components/ConfirmDialog'
import { api } from '../../lib/api'

export default function ClustersManager() {
  const [clusters, setClusters] = useState([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState(null)
  const [mergeTarget, setMergeTarget] = useState({})
  const [noteDraft, setNoteDraft] = useState({})
  const [confirmState, setConfirmState] = useState(null) // { message, action }
  const [openReasonsFor, setOpenReasonsFor] = useState(null)
  const [reasonsByCluster, setReasonsByCluster] = useState({})
  const [reasonDraft, setReasonDraft] = useState({})
  const [dateSort, setDateSort] = useState('desc')

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

  function askMerge(source) {
    const targetId = mergeTarget[source.id]
    if (!targetId) return
    const target = clusters.find((c) => c.id === targetId)
    const crossTrackNote =
      target && target.request_type !== source.request_type
        ? ' שימו לב: המיזוג יעביר את המוצר למסלול של היעד.'
        : ''
    setConfirmState({
      message: `למזג את "${source.canonical_name}" לתוך "${target?.canonical_name}"? הפעולה בלתי הפיכה.${crossTrackNote}`,
      action: async () => {
        await api.adminMergeClusters(source.id, targetId)
        load()
      },
    })
  }

  function askChangeTrack(cluster, newType) {
    const label = newType === 'return' ? 'חזרה' : 'חדש'
    setConfirmState({
      message: `להעביר את "${cluster.canonical_name}" למסלול "${label}"? כל הבקשות שלו יעברו יחד איתו.`,
      action: async () => {
        const updated = await api.adminUpdateCluster(cluster.id, { request_type: newType })
        setClusters((prev) => prev.map((c) => (c.id === cluster.id ? updated : c)))
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

  async function toggleReasons(cluster) {
    if (openReasonsFor === cluster.id) {
      setOpenReasonsFor(null)
      return
    }
    setOpenReasonsFor(cluster.id)
    if (!reasonsByCluster[cluster.id]) {
      const data = await api.adminListClusterReasons(cluster.id)
      setReasonsByCluster((r) => ({ ...r, [cluster.id]: data }))
    }
  }

  async function saveReason(item, clusterId) {
    const text = (reasonDraft[item.request_id] ?? item.reason).trim()
    await api.adminUpdateRequest(item.request_id, { reason: text || null })
    setReasonsByCluster((r) => ({
      ...r,
      [clusterId]: text
        ? r[clusterId].map((x) => (x.request_id === item.request_id ? { ...x, reason: text } : x))
        : r[clusterId].filter((x) => x.request_id !== item.request_id),
    }))
    setReasonDraft((d) => {
      const next = { ...d }
      delete next[item.request_id]
      return next
    })
  }

  function askDeleteReason(item, clusterId) {
    setConfirmState({
      message: `למחוק את הסיבה "${item.reason}"? הבקשה עצמה תישאר, רק הסיבה תוסר מהרשימה הציבורית.`,
      action: async () => {
        await api.adminUpdateRequest(item.request_id, { reason: null })
        setReasonsByCluster((r) => ({
          ...r,
          [clusterId]: r[clusterId].filter((x) => x.request_id !== item.request_id),
        }))
      },
    })
  }

  const sortedClusters = [...clusters].sort((a, b) => {
    const diff = new Date(a.last_seen_at) - new Date(b.last_seen_at)
    return dateSort === 'asc' ? diff : -diff
  })

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
                <th className="whitespace-nowrap px-3 py-2 text-right font-medium">
                  <button
                    onClick={() => setDateSort((s) => (s === 'desc' ? 'asc' : 'desc'))}
                    className="flex items-center gap-1"
                    title="עדכון אחרון - מתי בקשה אחרונה הוגשה למוצר הזה"
                  >
                    עדכון אחרון {dateSort === 'desc' ? '↓' : '↑'}
                  </button>
                </th>
                <Th title='חזרה = מוצר שהיה בעבר בפרויקטים של הקהילה. חדש = מוצר שמעולם לא הוצע. ניתן לשנות אם מישהו סימן בטעות'>
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
                <Th title='לתיקון טעות קיבוץ של ה-AI, כולל בין מסלולים (למשל אם מוצר סומן "חדש" אבל בעצם כבר היה) - המוצר שנבחר כיעד "מנצח" וקובע את הסטטוס/מסלול הסופיים'>
                  מיזוג לתוך מוצר אחר
                </Th>
                <Th>פעולות</Th>
              </tr>
            </thead>
            <tbody>
              {sortedClusters.map((cluster) => (
                <Fragment key={cluster.id}>
                <tr className="border-t border-black/5">
                  <Td wrap>{cluster.canonical_name}</Td>
                  <Td>{cluster.category}</Td>
                  <Td>{new Date(cluster.last_seen_at).toLocaleDateString('he-IL')}</Td>
                  <Td>
                    <select
                      value={cluster.request_type}
                      onChange={(e) => askChangeTrack(cluster, e.target.value)}
                      className="rounded border border-black/10 px-2 py-1"
                    >
                      <option value="return">חזרה</option>
                      <option value="new">חדש</option>
                    </select>
                  </Td>
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
                    {(() => {
                      const others = clusters.filter((c) => c.id !== cluster.id)
                      if (others.length === 0) {
                        return <span className="text-xs text-bakfg/40">אין עוד מוצרים למיזוג</span>
                      }
                      return (
                        <div className="flex items-center gap-2">
                          <select
                            value={mergeTarget[cluster.id] || ''}
                            onChange={(e) => setMergeTarget((m) => ({ ...m, [cluster.id]: e.target.value }))}
                            className="rounded border border-black/10 px-2 py-1"
                          >
                            <option value="">בחר יעד...</option>
                            {others.map((c) => (
                              <option key={c.id} value={c.id}>
                                {c.canonical_name} ({c.request_type === 'return' ? 'חזרה' : 'חדש'})
                              </option>
                            ))}
                          </select>
                          <button onClick={() => askMerge(cluster)} className="text-sm text-red-600">
                            מזג
                          </button>
                        </div>
                      )
                    })()}
                  </Td>
                  <Td>
                    <div className="flex flex-col items-start gap-1">
                      <button onClick={() => toggleReasons(cluster)} className="text-sm text-brand">
                        {openReasonsFor === cluster.id ? 'סגור סיבות' : '💬 סיבות'}
                      </button>
                      <button onClick={() => askDeleteAllForProduct(cluster)} className="text-sm text-red-600">
                        מחק את כל הבקשות
                      </button>
                    </div>
                  </Td>
                </tr>
                {openReasonsFor === cluster.id && (
                  <tr className="border-t border-black/5 bg-bakbg-soft/50">
                    <td colSpan={9} className="px-3 py-3">
                      {!reasonsByCluster[cluster.id] && <p className="text-sm text-bakfg/60">טוען...</p>}
                      {reasonsByCluster[cluster.id]?.length === 0 && (
                        <p className="text-sm text-bakfg/50">אין סיבות למוצר הזה.</p>
                      )}
                      {reasonsByCluster[cluster.id]?.length > 0 && (
                        <div className="space-y-2">
                          {reasonsByCluster[cluster.id].map((item) => (
                            <div key={item.request_id} className="flex items-start gap-2">
                              <textarea
                                value={reasonDraft[item.request_id] ?? item.reason}
                                onChange={(e) =>
                                  setReasonDraft((d) => ({ ...d, [item.request_id]: e.target.value }))
                                }
                                rows={1}
                                className="w-full rounded border border-black/10 px-2 py-1 text-sm"
                              />
                              <button
                                onClick={() => saveReason(item, cluster.id)}
                                className="shrink-0 text-sm text-brand"
                              >
                                שמור
                              </button>
                              <button
                                onClick={() => askDeleteReason(item, cluster.id)}
                                className="shrink-0 text-sm text-red-600"
                              >
                                מחק
                              </button>
                            </div>
                          ))}
                        </div>
                      )}
                    </td>
                  </tr>
                )}
                </Fragment>
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
