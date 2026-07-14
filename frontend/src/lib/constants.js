// Mirrors backend/app/constants.py — keep the two in sync.
export const CATEGORIES = [
  'וויסקי',
  'וודקה',
  "ג'ין",
  'רום',
  'טקילה',
  'יין',
  'מבעבעים/שמפניה',
  'בירה',
  'ליקר',
  'ברנדי/קוניאק',
  'אביזרים',
  'אחר',
]

export const RANGE_OPTIONS = [
  { value: 'week', label: 'שבוע' },
  { value: 'month', label: 'חודש' },
  { value: '3months', label: '3 חודשים' },
  { value: '6months', label: 'חצי שנה' },
  { value: 'year', label: 'שנה' },
]

export const SORT_OPTIONS = [
  { value: 'top', label: 'הכי מבוקש' },
  { value: 'trending', label: 'טרנדינג' },
  { value: 'newest', label: 'נוספו לאחרונה' },
]
