import { useEffect, useState } from 'react'
import { useNavigate, useParams } from 'react-router-dom'
import { CATEGORIES } from '../lib/constants'
import { api } from '../lib/api'

const OTHER = '__other__'

const emptyItem = () => ({
  category: CATEGORIES[0],
  mode: 'catalog', // 'catalog' = pick an existing product (no AI needed) | 'free' = type it out
  brand: '',
  brands: [],
  brandsLoaded: false,
  cluster_id: '',
  products: [],
  productsLoaded: false,
  original_text: '',
  reason: '',
})

export default function RequestForm() {
  const { requestType: paramType } = useParams() // optional pre-selection: 'return' | 'new'
  const navigate = useNavigate()

  const [selectedType, setSelectedType] = useState(paramType || null)
  const isNew = selectedType === 'new'

  const [items, setItems] = useState([emptyItem()])
  const [name, setName] = useState('')
  const [phone, setPhone] = useState('')
  const [submitting, setSubmitting] = useState(false)
  const [error, setError] = useState(null)
  const [done, setDone] = useState(null)

  function patchItem(index, patch) {
    setItems((prev) => prev.map((it, i) => (i === index ? { ...it, ...patch } : it)))
  }

  async function loadBrands(index, category) {
    patchItem(index, { brands: [], brandsLoaded: false })
    const brands = await api.getCatalogBrands(selectedType, category)
    // Nothing to pick from yet — skip straight to free text instead of showing an empty dropdown.
    if (brands.length === 0) {
      patchItem(index, { brands: [], brandsLoaded: true, mode: 'free' })
      return
    }
    patchItem(index, { brands, brandsLoaded: true })
  }

  // Handles both entry paths: picking a track from the in-page buttons below, and arriving
  // directly at /request/return or /request/new (selectedType already set from the URL param,
  // so the buttons' onClick never fires).
  useEffect(() => {
    if (selectedType && !items[0].brandsLoaded && items[0].mode === 'catalog') {
      loadBrands(0, items[0].category)
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [selectedType])

  async function loadProducts(index, category, brand) {
    patchItem(index, { products: [], productsLoaded: false })
    const products = await api.getCatalogProducts(selectedType, category, brand)
    patchItem(index, { products, productsLoaded: true })
  }

  function onCategoryChange(index, category) {
    patchItem(index, {
      category,
      mode: 'catalog',
      brand: '',
      brands: [],
      brandsLoaded: false,
      cluster_id: '',
      products: [],
      productsLoaded: false,
    })
    loadBrands(index, category)
  }

  function onBrandChange(index, value, category) {
    if (value === OTHER) {
      patchItem(index, { mode: 'free', brand: '', cluster_id: '' })
      return
    }
    patchItem(index, { brand: value, cluster_id: '', products: [], productsLoaded: false })
    loadProducts(index, category, value)
  }

  function onProductChange(index, value) {
    if (value === OTHER) {
      patchItem(index, { mode: 'free', cluster_id: '' })
      return
    }
    patchItem(index, { cluster_id: value })
  }

  function switchToCatalog(index, category) {
    patchItem(index, { mode: 'catalog', original_text: '', brand: '', cluster_id: '', brandsLoaded: false })
    loadBrands(index, category)
  }

  function addItem() {
    setItems((prev) => [...prev, emptyItem()])
    const index = items.length
    loadBrands(index, CATEGORIES[0])
  }

  function removeItem(index) {
    setItems((prev) => prev.filter((_, i) => i !== index))
  }

  function updateReason(index, value) {
    patchItem(index, { reason: value })
  }

  function updateFreeText(index, value) {
    patchItem(index, { original_text: value })
  }

  function itemIsComplete(item) {
    return item.mode === 'catalog' ? Boolean(item.cluster_id) : Boolean(item.original_text.trim())
  }

  async function handleSubmit(e) {
    e.preventDefault()
    if (!items.every(itemIsComplete)) {
      setError(isNew ? 'יש לבחור או לכתוב מוצר לכל פריט' : 'יש לבחור או לכתוב מוצר לכל פריט')
      return
    }
    setSubmitting(true)
    setError(null)
    try {
      const payload = {
        request_type: selectedType,
        submitter_name: name || null,
        submitter_phone: phone || null,
        items: items.map((it) =>
          it.mode === 'catalog'
            ? { category: it.category, cluster_id: it.cluster_id, reason: it.reason || null }
            : { category: it.category, original_text: it.original_text, reason: it.reason || null }
        ),
      }
      const result = await api.submitRequests(payload)
      setDone(result)
    } catch (err) {
      setError(err.message)
    } finally {
      setSubmitting(false)
    }
  }

  // Step 1: which track is this request for? (SPEC.md section 2 — the two tracks never mix,
  // but there's a single entry point and the split happens right here, inside the form.)
  if (!selectedType) {
    return (
      <div className="mx-auto max-w-xl px-4 py-10">
        <h1 className="text-center font-heading text-2xl font-bold text-bakfg">על איזה מוצר מדובר?</h1>
        <div className="mt-6 grid gap-4 sm:grid-cols-2">
          <button
            type="button"
            onClick={() => setSelectedType('return')}
            className="rounded-2xl border border-black/5 bg-white/90 p-6 text-center shadow-sm backdrop-blur-sm transition-shadow hover:shadow-lg"
          >
            <div className="mx-auto mb-3 flex h-14 w-14 items-center justify-center rounded-full bg-brand/10 text-2xl">
              🍾
            </div>
            <h2 className="font-heading text-lg font-bold text-bakfg">בקשה למוצר שהיה</h2>
            <p className="mt-1 text-sm text-bakfg/60">מוצר שכבר היה בפרויקט בעבר ואתם רוצים שיחזור</p>
          </button>

          <button
            type="button"
            onClick={() => setSelectedType('new')}
            className="rounded-2xl border border-black/5 bg-white/90 p-6 text-center shadow-sm backdrop-blur-sm transition-shadow hover:shadow-lg"
          >
            <div className="mx-auto mb-3 flex h-14 w-14 items-center justify-center rounded-full bg-brand/10 text-2xl">
              ✨
            </div>
            <h2 className="font-heading text-lg font-bold text-bakfg">בקשה למוצר חדש</h2>
            <p className="mt-1 text-sm text-bakfg/60">מוצר שמעולם לא הוצע בפרויקט</p>
          </button>
        </div>
        <p className="mt-4 text-center text-xs text-bakfg/40">לא בטוחים? אין בעיה — אם המוצר כבר היה, נשים לב לזה בשבילכם.</p>
      </div>
    )
  }

  if (done) {
    const redirectedItems = done.results.filter((r) => r.redirected_to_return)
    return (
      <div className="mx-auto max-w-xl px-4 py-10 text-center">
        <div className="mx-auto mb-4 flex h-16 w-16 items-center justify-center rounded-full bg-brand/10 text-3xl">
          🙌
        </div>
        <h1 className="font-heading text-2xl font-bold text-bakfg">תודה! הבקשה נקלטה</h1>
        <p className="mt-2 text-bakfg/70">היא כבר שויכה לרשימה הציבורית המתאימה.</p>

        {redirectedItems.length > 0 && (
          <div className="mt-4 rounded-xl bg-bakbg-soft p-4 text-sm text-bakfg/80">
            שמנו לב ש
            {redirectedItems.map((r, i) => (
              <span key={r.request_id} className="font-medium text-brand">
                {i > 0 && ', '}
                {r.canonical_name}
              </span>
            ))}{' '}
            כבר היו בפרויקט בעבר — הוספנו את הבקשה שלכם לרשימת &quot;התגעגענו אליהם&quot; במקום.
          </div>
        )}

        <button
          onClick={() => navigate(isNew ? '/new' : '/return')}
          className="mt-6 rounded-full bg-brand px-5 py-2.5 font-medium text-white shadow-sm transition-colors hover:bg-brand-dark"
        >
          חזרה לרשימה
        </button>
      </div>
    )
  }

  return (
    <form onSubmit={handleSubmit} className="mx-auto max-w-xl px-4 py-6">
      <button
        type="button"
        onClick={() => setSelectedType(null)}
        className="mb-2 text-sm text-brand hover:underline"
      >
        ← החלפת סוג בקשה
      </button>
      <h1 className="font-heading text-2xl font-bold text-bakfg">
        {isNew ? 'בקשה למוצר חדש' : 'בקשה למוצר שהיה'}
      </h1>

      {items.map((item, index) => (
        <div key={index} className="mt-4 rounded-2xl border border-black/5 bg-white/90 p-4 shadow-sm backdrop-blur-sm">
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
            onChange={(e) => onCategoryChange(index, e.target.value)}
            className="mt-1 w-full rounded-lg border border-black/10 bg-white px-3 py-2 focus:border-brand focus:outline-none focus:ring-2 focus:ring-brand/20"
          >
            {CATEGORIES.map((c) => (
              <option key={c} value={c}>
                {c}
              </option>
            ))}
          </select>

          {item.mode === 'catalog' ? (
            <>
              <label className="mt-3 block text-sm text-bakfg/70">מותג</label>
              {!item.brandsLoaded ? (
                <p className="mt-1 text-sm text-bakfg/50">טוען...</p>
              ) : (
                <select
                  value={item.brand}
                  onChange={(e) => onBrandChange(index, e.target.value, item.category)}
                  className="mt-1 w-full rounded-lg border border-black/10 bg-white px-3 py-2 focus:border-brand focus:outline-none focus:ring-2 focus:ring-brand/20"
                >
                  <option value="" disabled>
                    בחרו מותג...
                  </option>
                  {item.brands.map((b) => (
                    <option key={b} value={b}>
                      {b}
                    </option>
                  ))}
                  <option value={OTHER}>המותג שלי לא ברשימה — אכתוב בעצמי</option>
                </select>
              )}

              {item.brand && (
                <>
                  <label className="mt-3 block text-sm text-bakfg/70">דגם</label>
                  {!item.productsLoaded ? (
                    <p className="mt-1 text-sm text-bakfg/50">טוען...</p>
                  ) : (
                    <select
                      value={item.cluster_id}
                      onChange={(e) => onProductChange(index, e.target.value)}
                      className="mt-1 w-full rounded-lg border border-black/10 bg-white px-3 py-2 focus:border-brand focus:outline-none focus:ring-2 focus:ring-brand/20"
                    >
                      <option value="" disabled>
                        בחרו דגם...
                      </option>
                      {item.products.map((p) => (
                        <option key={p.cluster_id} value={p.cluster_id}>
                          {p.canonical_variant || p.canonical_name}
                        </option>
                      ))}
                      <option value={OTHER}>הדגם שלי לא ברשימה — אכתוב בעצמי</option>
                    </select>
                  )}
                </>
              )}
            </>
          ) : (
            <>
              <label className="mt-3 block text-sm text-bakfg/70">
                {isNew ? 'איזה מוצר תרצו שנביא?' : 'איזה מוצר תרצו שיחזור?'}
              </label>
              <input
                required
                value={item.original_text}
                onChange={(e) => updateFreeText(index, e.target.value)}
                placeholder="לדוגמה: מקאלן 18 / Macallan 18"
                className="mt-1 w-full rounded-lg border border-black/10 bg-white px-3 py-2 focus:border-brand focus:outline-none focus:ring-2 focus:ring-brand/20"
              />
              <button
                type="button"
                onClick={() => switchToCatalog(index, item.category)}
                className="mt-1 text-xs text-brand hover:underline"
              >
                בחרו מהמאגר הקיים במקום
              </button>
            </>
          )}

          <label className="mt-3 block text-sm text-bakfg/70">למה אתם רוצים את המוצר הזה? (אופציונלי)</label>
          <textarea
            value={item.reason}
            onChange={(e) => updateReason(index, e.target.value)}
            placeholder={
              isNew
                ? 'נשמח שתכתבו למה אתם רוצים את המוצר הזה — זה עוזר לשאר חברי הקהילה להכיר מוצרים חדשים 😊'
                : 'נשמח שתכתבו למה אתם רוצים שהמוצר הזה יחזור — זה עוזר לשאר חברי הקהילה 😊'
            }
            className="mt-1 w-full rounded-lg border border-black/10 bg-white px-3 py-2 focus:border-brand focus:outline-none focus:ring-2 focus:ring-brand/20"
            rows={3}
          />
        </div>
      ))}

      <button
        type="button"
        onClick={addItem}
        className="mt-3 w-full rounded-xl border border-dashed border-black/20 px-4 py-2 text-sm text-bakfg/70 transition-colors hover:border-brand hover:bg-brand/5 hover:text-brand"
      >
        + הוסף מוצר נוסף
      </button>

      <div className="mt-6 rounded-2xl border border-black/5 bg-white/90 p-4 shadow-sm backdrop-blur-sm">
        <label className="block text-sm text-bakfg/70">שם (אופציונלי)</label>
        <input
          value={name}
          onChange={(e) => setName(e.target.value)}
          className="mt-1 w-full rounded-lg border border-black/10 bg-white px-3 py-2 focus:border-brand focus:outline-none focus:ring-2 focus:ring-brand/20"
        />
        <label className="mt-3 block text-sm text-bakfg/70">טלפון (אופציונלי)</label>
        <input
          value={phone}
          onChange={(e) => setPhone(e.target.value)}
          className="mt-1 w-full rounded-lg border border-black/10 bg-white px-3 py-2 focus:border-brand focus:outline-none focus:ring-2 focus:ring-brand/20"
        />
      </div>

      {error && <p className="mt-3 text-red-600">{error}</p>}

      <button
        type="submit"
        disabled={submitting}
        className="mt-6 w-full rounded-full bg-brand px-4 py-3 font-medium text-white shadow-sm transition-colors hover:bg-brand-dark disabled:opacity-50"
      >
        {submitting ? 'שולח...' : 'שליחת הבקשה'}
      </button>
    </form>
  )
}
