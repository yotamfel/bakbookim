import { useState } from 'react'
import { useNavigate, useParams } from 'react-router-dom'
import { CATEGORIES } from '../lib/constants'
import { api } from '../lib/api'

const emptyItem = () => ({ category: CATEGORIES[0], original_text: '', reason: '' })

export default function RequestForm() {
  const { requestType } = useParams() // 'return' | 'new'
  const navigate = useNavigate()
  const isNew = requestType === 'new'

  const [items, setItems] = useState([emptyItem()])
  const [name, setName] = useState('')
  const [phone, setPhone] = useState('')
  const [submitting, setSubmitting] = useState(false)
  const [error, setError] = useState(null)
  const [done, setDone] = useState(null)

  function updateItem(index, field, value) {
    setItems((prev) => prev.map((it, i) => (i === index ? { ...it, [field]: value } : it)))
  }

  function addItem() {
    setItems((prev) => [...prev, emptyItem()])
  }

  function removeItem(index) {
    setItems((prev) => prev.filter((_, i) => i !== index))
  }

  async function handleSubmit(e) {
    e.preventDefault()
    setSubmitting(true)
    setError(null)
    try {
      const payload = {
        request_type: requestType,
        submitter_name: name || null,
        submitter_phone: phone || null,
        items: items.map((it) => ({
          category: it.category,
          original_text: it.original_text,
          reason: isNew ? it.reason || null : null,
        })),
      }
      const result = await api.submitRequests(payload)
      setDone(result)
    } catch (err) {
      setError(err.message)
    } finally {
      setSubmitting(false)
    }
  }

  if (done) {
    return (
      <div className="mx-auto max-w-xl px-4 py-10 text-center">
        <h1 className="font-heading text-2xl font-bold text-bakfg">תודה! הבקשה נקלטה 🙌</h1>
        <p className="mt-2 text-bakfg/70">היא כבר שויכה לרשימה הציבורית המתאימה.</p>
        <button
          onClick={() => navigate(isNew ? '/new' : '/return')}
          className="mt-6 rounded-lg bg-brand px-5 py-2 font-medium text-white"
        >
          חזרה לרשימה
        </button>
      </div>
    )
  }

  return (
    <form onSubmit={handleSubmit} className="mx-auto max-w-xl px-4 py-6">
      <h1 className="font-heading text-2xl font-bold text-bakfg">
        {isNew ? 'בקשה למוצר חדש' : 'בקשה להחזרת מוצר'}
      </h1>

      {items.map((item, index) => (
        <div key={index} className="mt-4 rounded-xl border border-black/10 bg-white p-4">
          <div className="flex items-center justify-between">
            <span className="text-sm font-medium text-bakfg/70">מוצר {index + 1}</span>
            {items.length > 1 && (
              <button type="button" onClick={() => removeItem(index)} className="text-sm text-red-600">
                הסר
              </button>
            )}
          </div>

          <label className="mt-2 block text-sm text-bakfg/70">קטגוריה</label>
          <select
            value={item.category}
            onChange={(e) => updateItem(index, 'category', e.target.value)}
            className="mt-1 w-full rounded-lg border border-black/10 px-3 py-2"
          >
            {CATEGORIES.map((c) => (
              <option key={c} value={c}>
                {c}
              </option>
            ))}
          </select>

          <label className="mt-3 block text-sm text-bakfg/70">
            {isNew ? 'איזה מוצר תרצו שנביא?' : 'איזה מוצר תרצו שיחזור?'}
          </label>
          <input
            required
            value={item.original_text}
            onChange={(e) => updateItem(index, 'original_text', e.target.value)}
            placeholder="לדוגמה: מקאלן 18 / Macallan 18"
            className="mt-1 w-full rounded-lg border border-black/10 px-3 py-2"
          />

          {isNew && (
            <>
              <label className="mt-3 block text-sm text-bakfg/70">למה אתם רוצים את המוצר הזה? (אופציונלי)</label>
              <textarea
                value={item.reason}
                onChange={(e) => updateItem(index, 'reason', e.target.value)}
                placeholder="נשמח שתכתבו למה אתם רוצים את המוצר הזה — זה עוזר לשאר חברי הקהילה להכיר מוצרים חדשים 😊"
                className="mt-1 w-full rounded-lg border border-black/10 px-3 py-2"
                rows={3}
              />
            </>
          )}
        </div>
      ))}

      <button
        type="button"
        onClick={addItem}
        className="mt-3 w-full rounded-lg border border-dashed border-black/20 px-4 py-2 text-sm text-bakfg/70"
      >
        + הוסף מוצר נוסף
      </button>

      <div className="mt-6 rounded-xl border border-black/10 bg-white p-4">
        <label className="block text-sm text-bakfg/70">שם (אופציונלי)</label>
        <input
          value={name}
          onChange={(e) => setName(e.target.value)}
          className="mt-1 w-full rounded-lg border border-black/10 px-3 py-2"
        />
        <label className="mt-3 block text-sm text-bakfg/70">טלפון (אופציונלי)</label>
        <input
          value={phone}
          onChange={(e) => setPhone(e.target.value)}
          className="mt-1 w-full rounded-lg border border-black/10 px-3 py-2"
        />
      </div>

      {error && <p className="mt-3 text-red-600">{error}</p>}

      <button
        type="submit"
        disabled={submitting}
        className="mt-6 w-full rounded-lg bg-brand px-4 py-3 font-medium text-white disabled:opacity-50"
      >
        {submitting ? 'שולח...' : 'שליחת הבקשה'}
      </button>
    </form>
  )
}
