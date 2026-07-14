import { useEffect, useState } from 'react'
import ConfirmDialog from '../../components/ConfirmDialog'
import { api } from '../../lib/api'

export default function RequestsTable() {
  const [rows, setRows] = useState([])
  const [search, setSearch] = useState('')
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState(null)
  const [editingId, setEditingId] = useState(null)
  const [editDraft, setEditDraft] = useState({})
  const [confirmState, setConfirmState] = useState(null) // { message, action }
  const [dateSort, setDateSort] = useState('desc')

  function load(q = search) {
    setLoading(true)
    api
      .adminListRequests(q)
      .then(setRows)
      .catch((err) => setError(err.message))
      .finally(() => setLoading(false))
  }

  useEffect(() => {
    load('')
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [])

  function handleSearchSubmit(e) {
    e.preventDefault()
    load(search)
  }

  function startEdit(row) {
    setEditingId(row.id)
    setEditDraft({
      category: row.category,
      original_text: row.original_text,
      reason: row.reason || '',
      submitter_name: row.submitter_name || '',
      submitter_phone: row.submitter_phone || '',
    })
  }

  async function saveEdit(id) {
    const updated = await api.adminUpdateRequest(id, editDraft)
    setRows((prev) => prev.map((r) => (r.id === id ? updated : r)))
    setEditingId(null)
  }

  function askDelete(row) {
    setConfirmState({
      message: `למחוק את הבקשה "${row.original_text}"?`,
      action: async () => {
        await api.adminDeleteRequest(row.id)
        setRows((prev) => prev.filter((r) => r.id !== row.id))
      },
    })
  }

  function askDeleteAllFromSubmitter(row) {
    const label = row.submitter_phone || row.submitter_name
    setConfirmState({
      message: `למחוק את כל הבקשות של "${label}"? הפעולה בלתי הפיכה.`,
      action: async () => {
        const params = row.submitter_phone
          ? { submitter_phone: row.submitter_phone }
          : { submitter_name: row.submitter_name }
        await api.adminBulkDeleteRequests(params)
        load()
      },
    })
  }

  function askDeleteAllForProduct(row) {
    setConfirmState({
      message: `למחוק את כל הבקשות של המוצר "${row.canonical_name}"? הפעולה בלתי הפיכה.`,
      action: async () => {
        await api.adminBulkDeleteRequests({ cluster_id: row.cluster_id })
        load()
      },
    })
  }

  function handleDeleteMenu(row, action) {
    if (action === 'single') askDelete(row)
    else if (action === 'submitter') askDeleteAllFromSubmitter(row)
    else if (action === 'product') askDeleteAllForProduct(row)
  }

  async function runConfirmed() {
    const action = confirmState?.action
    setConfirmState(null)
    if (action) await action()
  }

  const sortedRows = [...rows].sort((a, b) => {
    const diff = new Date(a.created_at) - new Date(b.created_at)
    return dateSort === 'asc' ? diff : -diff
  })

  return (
    <div>
      <form onSubmit={handleSearchSubmit} className="flex gap-2">
        <input
          value={search}
          onChange={(e) => setSearch(e.target.value)}
          placeholder="חיפוש חופשי: טלפון, שם, טקסט מקורי, שם מוצר..."
          className="w-full max-w-md rounded-lg border border-black/10 px-3 py-2"
        />
        <button type="submit" className="rounded-lg bg-brand px-4 py-2 text-white">
          חיפוש
        </button>
      </form>

      {loading && <p className="mt-4 text-bakfg/60">טוען...</p>}
      {error && <p className="mt-4 text-red-600">{error}</p>}

      {!loading && !error && (
        <div className="mt-4 overflow-x-auto rounded-xl border border-black/10 bg-white">
          <table className="w-full min-w-[1100px] text-sm">
            <thead className="bg-bakbg-soft text-bakfg/70">
              <tr>
                <th className="whitespace-nowrap px-3 py-2 text-right font-medium">
                  <button
                    onClick={() => setDateSort((s) => (s === 'desc' ? 'asc' : 'desc'))}
                    className="flex items-center gap-1"
                  >
                    תאריך {dateSort === 'desc' ? '↓' : '↑'}
                  </button>
                </th>
                <Th>מוצר (canonical)</Th>
                <Th>טקסט מקורי</Th>
                <Th title='למה המשתמש רוצה את המוצר הזה (שדה אופציונלי בטופס)'>הסבר</Th>
                <Th>שם</Th>
                <Th>טלפון</Th>
                <Th title="חזרה = מוצר שהיה בעבר בפרויקטים של הקהילה. חדש = מוצר שמעולם לא הוצע">
                  סוג בקשה
                </Th>
                <Th>פעולות</Th>
              </tr>
            </thead>
            <tbody>
              {sortedRows.map((row) => {
                const isEditing = editingId === row.id
                return (
                  <tr key={row.id} className="border-t border-black/5">
                    <Td>{new Date(row.created_at).toLocaleDateString('he-IL')}</Td>
                    <Td wrap>{row.canonical_name}</Td>
                    <Td wrap>
                      {isEditing ? (
                        <input
                          value={editDraft.original_text}
                          onChange={(e) => setEditDraft((d) => ({ ...d, original_text: e.target.value }))}
                          className="w-full rounded border border-black/10 px-2 py-1"
                        />
                      ) : (
                        row.original_text
                      )}
                    </Td>
                    <Td wrap>
                      {isEditing ? (
                        <input
                          value={editDraft.reason}
                          onChange={(e) => setEditDraft((d) => ({ ...d, reason: e.target.value }))}
                          className="w-full rounded border border-black/10 px-2 py-1"
                        />
                      ) : (
                        row.reason || '—'
                      )}
                    </Td>
                    <Td>
                      {isEditing ? (
                        <input
                          value={editDraft.submitter_name}
                          onChange={(e) => setEditDraft((d) => ({ ...d, submitter_name: e.target.value }))}
                          className="w-full rounded border border-black/10 px-2 py-1"
                        />
                      ) : (
                        row.submitter_name || '—'
                      )}
                    </Td>
                    <Td>
                      {isEditing ? (
                        <input
                          value={editDraft.submitter_phone}
                          onChange={(e) => setEditDraft((d) => ({ ...d, submitter_phone: e.target.value }))}
                          className="w-full rounded border border-black/10 px-2 py-1"
                        />
                      ) : (
                        row.submitter_phone || '—'
                      )}
                    </Td>
                    <Td>{row.request_type === 'return' ? 'חזרה' : 'חדש'}</Td>
                    <Td>
                      {isEditing ? (
                        <div className="flex gap-2">
                          <button onClick={() => saveEdit(row.id)} className="text-brand">
                            שמור
                          </button>
                          <button onClick={() => setEditingId(null)} className="text-bakfg/60">
                            בטל
                          </button>
                        </div>
                      ) : (
                        <div className="flex items-center gap-2">
                          <button onClick={() => startEdit(row)} className="text-brand">
                            עריכה
                          </button>
                          <select
                            value=""
                            onChange={(e) => {
                              handleDeleteMenu(row, e.target.value)
                              e.target.value = ''
                            }}
                            className="rounded border border-black/10 px-1 py-1 text-red-600"
                          >
                            <option value="" disabled>
                              מחיקה...
                            </option>
                            <option value="single">מחק בקשה זו בלבד</option>
                            {(row.submitter_phone || row.submitter_name) && (
                              <option value="submitter">מחק הכל ממשתמש זה</option>
                            )}
                            <option value="product">מחק הכל למוצר זה</option>
                          </select>
                        </div>
                      )}
                    </Td>
                  </tr>
                )
              })}
            </tbody>
          </table>
        </div>
      )}

      {confirmState && (
        <ConfirmDialog
          message={confirmState.message}
          confirmLabel="מחיקה"
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
