import { useEffect, useState } from 'react'
import { api } from '../../lib/api'

export default function ClustersManager() {
  const [clusters, setClusters] = useState([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState(null)
  const [mergeTarget, setMergeTarget] = useState({})

  function load() {
    setLoading(true)
    api
      .adminListClusters()
      .then(setClusters)
      .catch((err) => setError(err.message))
      .finally(() => setLoading(false))
  }

  useEffect(load, [])

  async function setStatus(cluster, status) {
    const updated = await api.adminUpdateCluster(cluster.id, { status })
    setClusters((prev) => prev.map((c) => (c.id === cluster.id ? updated : c)))
  }

  async function handleMerge(sourceId) {
    const targetId = mergeTarget[sourceId]
    if (!targetId) return
    if (!confirm('למזג את המוצר הזה לתוך היעד שנבחר? הפעולה בלתי הפיכה.')) return
    await api.adminMergeClusters(sourceId, targetId)
    load()
  }

  return (
    <div>
      {loading && <p className="text-bakfg/60">טוען...</p>}
      {error && <p className="text-red-600">{error}</p>}

      {!loading && !error && (
        <div className="overflow-x-auto rounded-xl border border-black/10 bg-white">
          <table className="w-full min-w-[900px] text-sm">
            <thead className="bg-bakbg-soft text-bakfg/70">
              <tr>
                <Th>שם מוצר</Th>
                <Th>קטגוריה</Th>
                <Th title="חזרה = מוצר שהיה בעבר בפרויקט. חדש = מוצר שמעולם לא הוצע">סוג בקשה</Th>
                <Th title="כמה בקשות הוגשו למוצר הזה בסך הכל (כולל אם אותו אדם ביקש כמה פעמים)">
                  סה&quot;כ בקשות
                </Th>
                <Th title="כמה אנשים שונים ביקשו את המוצר הזה (לא סופר בקשות כפולות מאותו אדם)">
                  לקוחות ייחודיים
                </Th>
                <Th title="פעיל / בקרוב (בדרך לפרויקט) / סופק (כבר הגיע)">סטטוס</Th>
                <Th>מיזוג לתוך מוצר אחר</Th>
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
                  <Td>
                    <select
                      value={cluster.status}
                      onChange={(e) => setStatus(cluster, e.target.value)}
                      className="rounded border border-black/10 px-2 py-1"
                    >
                      <option value="active">פעיל</option>
                      <option value="coming_soon">🔜 בקרוב</option>
                      <option value="fulfilled">✅ סופק</option>
                    </select>
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
                      <button onClick={() => handleMerge(cluster.id)} className="text-sm text-red-600">
                        מזג
                      </button>
                    </div>
                  </Td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
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
