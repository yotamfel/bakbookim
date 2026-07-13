export default function ConfirmDialog({ message, confirmLabel = 'אישור', danger = true, onConfirm, onCancel }) {
  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 p-4" onClick={onCancel}>
      <div onClick={(e) => e.stopPropagation()} className="w-full max-w-sm rounded-2xl bg-white p-6 shadow-2xl">
        <p className="text-bakfg">{message}</p>
        <div className="mt-5 flex gap-2">
          <button
            onClick={onConfirm}
            className={`flex-1 rounded-full px-4 py-2 font-medium text-white shadow-sm transition-colors ${
              danger ? 'bg-red-600 hover:bg-red-700' : 'bg-brand hover:bg-brand-dark'
            }`}
          >
            {confirmLabel}
          </button>
          <button
            onClick={onCancel}
            className="flex-1 rounded-full border border-black/10 px-4 py-2 transition-colors hover:bg-bakbg-soft"
          >
            ביטול
          </button>
        </div>
      </div>
    </div>
  )
}
