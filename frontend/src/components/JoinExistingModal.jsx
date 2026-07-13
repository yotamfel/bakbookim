import { useState } from 'react'
import { api } from '../lib/api'

export default function JoinExistingModal({ cluster, onClose, onJoined }) {
  const [name, setName] = useState('')
  const [phone, setPhone] = useState('')
  const [submitting, setSubmitting] = useState(false)
  const [error, setError] = useState(null)

  async function handleSubmit(e) {
    e.preventDefault()
    setSubmitting(true)
    setError(null)
    try {
      const result = await api.joinExisting(cluster.cluster_id, {
        submitter_name: name || null,
        submitter_phone: phone || null,
      })
      onJoined(result)
    } catch (err) {
      setError(err.message)
    } finally {
      setSubmitting(false)
    }
  }

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 p-4" onClick={onClose}>
      <form
        onClick={(e) => e.stopPropagation()}
        onSubmit={handleSubmit}
        className="w-full max-w-sm rounded-2xl bg-white p-6 shadow-2xl"
      >
        <h3 className="font-heading text-lg font-bold text-bakfg">גם אני רוצה את זה 🙋</h3>
        <p className="mt-1 text-sm text-bakfg/70">{cluster.canonical_name}</p>

        <label className="mt-4 block text-sm font-medium text-bakfg">שם (אופציונלי)</label>
        <input
          value={name}
          onChange={(e) => setName(e.target.value)}
          className="mt-1 w-full rounded-lg border border-black/10 px-3 py-2 focus:border-brand focus:outline-none focus:ring-2 focus:ring-brand/20"
        />

        <label className="mt-3 block text-sm font-medium text-bakfg">טלפון (אופציונלי)</label>
        <input
          value={phone}
          onChange={(e) => setPhone(e.target.value)}
          className="mt-1 w-full rounded-lg border border-black/10 px-3 py-2 focus:border-brand focus:outline-none focus:ring-2 focus:ring-brand/20"
        />

        {error && <p className="mt-3 text-sm text-red-600">{error}</p>}

        <div className="mt-5 flex gap-2">
          <button
            type="submit"
            disabled={submitting}
            className="flex-1 rounded-full bg-brand px-4 py-2 font-medium text-white shadow-sm transition-colors hover:bg-brand-dark disabled:opacity-50"
          >
            {submitting ? 'שולח...' : 'שלח'}
          </button>
          <button
            type="button"
            onClick={onClose}
            className="flex-1 rounded-full border border-black/10 px-4 py-2 transition-colors hover:bg-bakbg-soft"
          >
            ביטול
          </button>
        </div>
      </form>
    </div>
  )
}
